locals {
  repository_name = split("/", var.github_repository)[1]
}
resource "github_repository_pages" "site" {
  repository = local.repository_name
  build_type = "workflow"
  lifecycle {
    prevent_destroy = true
  }
}
resource "github_repository_environment" "pages" {
  repository  = local.repository_name
  environment = "github-pages"
  lifecycle {
    prevent_destroy = true
    # Adopt the existing environment without removing its approval/branch rules.
    ignore_changes = [reviewers, deployment_branch_policy, wait_timer, prevent_self_review, can_admins_bypass]
  }
}
resource "github_actions_variable" "measurement_id" {
  repository    = local.repository_name
  variable_name = "GA_MEASUREMENT_ID"
  value         = googleanalytics_data_stream.web.measurement_id
}
# Pages already exists for this repository. New projects can disable adoption.
import {
  for_each = var.adopt_existing_pages ? toset([local.repository_name]) : toset([])
  to       = github_repository_pages.site
  id       = each.value
}
import {
  for_each = var.adopt_existing_pages ? toset([local.repository_name]) : toset([])
  to       = github_repository_environment.pages
  id       = "${each.value}:github-pages"
}
