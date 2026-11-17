terraform {
  required_version = ">= 1.11, < 2.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.11"
    }
  }
}
provider "google" {
  project = var.project_id
}
locals {
  apis = toset([
    "cloudresourcemanager.googleapis.com", "iam.googleapis.com",
    "iamcredentials.googleapis.com", "sts.googleapis.com",
    "storage.googleapis.com", "analyticsadmin.googleapis.com",
  ])
}
resource "google_project_service" "api" {
  for_each           = local.apis
  project            = var.project_id
  service            = each.value
  disable_on_destroy = false
}
resource "google_storage_bucket" "state" {
  name                        = "${var.project_id}-${var.app_slug}-tfstate"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  versioning {
    enabled = true
  }
  lifecycle {
    prevent_destroy = true
  }
  depends_on = [google_project_service.api]
}
resource "google_service_account" "deployer" {
  account_id   = "${var.app_slug}-deployer"
  display_name = "${var.app_slug} infrastructure automation"
  depends_on   = [google_project_service.api]
}
resource "google_project_iam_member" "quota" {
  project = var.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = google_service_account.deployer.member
}
resource "google_storage_bucket_iam_member" "state" {
  bucket = google_storage_bucket.state.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.deployer.member
}
resource "google_iam_workload_identity_pool" "github" {
  workload_identity_pool_id = "${var.app_slug}-github"
  display_name              = var.app_slug
  depends_on                = [google_project_service.api]
}
resource "google_iam_workload_identity_pool_provider" "github" {
  workload_identity_pool_id          = google_iam_workload_identity_pool.github.workload_identity_pool_id
  workload_identity_pool_provider_id = "github"
  attribute_mapping = {
    "google.subject"       = "assertion.sub"
    "attribute.repository" = "assertion.repository"
  }
  # Production credentials are unavailable to PRs, forks, and other branches.
  attribute_condition = "assertion.repository == '${var.github_repository}' && assertion.ref == 'refs/heads/main'"
  oidc {
    issuer_uri = "https://token.actions.githubusercontent.com"
  }
}
resource "google_service_account_iam_member" "github" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = "principalSet://iam.googleapis.com/${google_iam_workload_identity_pool.github.name}/attribute.repository/${var.github_repository}"
}
