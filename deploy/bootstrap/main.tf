terraform {
  required_version = ">= 1.11, < 2.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7"
    }
  }
}
provider "google" {}

# The suffix stays in Terraform state, so later applies keep the same project.
resource "random_id" "project_suffix" {
  byte_length = 3
}
resource "google_project" "game" {
  project_id          = coalesce(var.project_id, "${var.app_slug}-${random_id.project_suffix.hex}")
  name                = var.project_name
  billing_account     = var.billing_account_id
  org_id              = var.organization_id
  folder_id           = var.folder_id
  auto_create_network = false
  deletion_policy     = "PREVENT"
  lifecycle {
    prevent_destroy = true
    precondition {
      condition     = var.organization_id == null || var.folder_id == null
      error_message = "Set either organization_id or folder_id, not both."
    }
  }
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
  project            = google_project.game.project_id
  service            = each.value
  disable_on_destroy = false
}
resource "google_storage_bucket" "state" {
  project                     = google_project.game.project_id
  name                        = "${google_project.game.project_id}-tfstate"
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
  project      = google_project.game.project_id
  account_id   = "${var.app_slug}-deployer"
  display_name = "${var.app_slug} infrastructure automation"
  depends_on   = [google_project_service.api]
}
resource "google_project_iam_member" "quota" {
  project = google_project.game.project_id
  role    = "roles/serviceusage.serviceUsageConsumer"
  member  = google_service_account.deployer.member
}
resource "google_storage_bucket_iam_member" "state" {
  bucket = google_storage_bucket.state.name
  role   = "roles/storage.objectAdmin"
  member = google_service_account.deployer.member
}
resource "google_iam_workload_identity_pool" "github" {
  project                   = google_project.game.project_id
  workload_identity_pool_id = "${var.app_slug}-github"
  display_name              = var.app_slug
  depends_on                = [google_project_service.api]
}
resource "google_iam_workload_identity_pool_provider" "github" {
  project                            = google_project.game.project_id
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
