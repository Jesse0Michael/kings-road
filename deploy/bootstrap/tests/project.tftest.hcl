mock_provider "google" {
  mock_resource "google_service_account" {
    defaults = {
      name   = "projects/kings-road-a1b2c3/serviceAccounts/kings-road-deployer@kings-road-a1b2c3.iam.gserviceaccount.com"
      email  = "kings-road-deployer@kings-road-a1b2c3.iam.gserviceaccount.com"
      member = "serviceAccount:kings-road-deployer@kings-road-a1b2c3.iam.gserviceaccount.com"
    }
  }
  mock_resource "google_iam_workload_identity_pool" {
    defaults = {
      name = "projects/123456789/locations/global/workloadIdentityPools/kings-road-github"
    }
  }
}
mock_provider "random" {}
override_resource {
  target          = random_id.project_suffix
  override_during = plan
  values = {
    hex = "a1b2c3"
  }
}
variables {
  billing_account_id = "000000-000000-000000"
}
run "create_dedicated_project" {
  command = plan
  assert {
    condition     = output.project_id == "kings-road-a1b2c3"
    error_message = "A new project ID must be generated without any existing-project input."
  }
  assert {
    condition = alltrue([
      google_storage_bucket.state.project == output.project_id,
      google_service_account.deployer.project == output.project_id,
      google_project_iam_member.quota.project == output.project_id,
      google_iam_workload_identity_pool.github.project == output.project_id,
      google_iam_workload_identity_pool_provider.github.project == output.project_id,
    ]) && alltrue([for service in google_project_service.api : service.project == output.project_id])
    error_message = "Every bootstrap resource must belong to the dedicated project, never the credentials' default project."
  }
  assert {
    condition     = google_project.game.billing_account == var.billing_account_id && google_project.game.deletion_policy == "PREVENT" && !google_project.game.auto_create_network
    error_message = "Link the selected billing account, protect the project, and avoid an unused default network."
  }
}
run "allow_explicit_new_project_id" {
  command = plan
  variables {
    project_id = "kings-road-custom-id"
  }
  assert {
    condition     = output.project_id == "kings-road-custom-id" && google_storage_bucket.state.project == "kings-road-custom-id"
    error_message = "An explicit unused project ID must be applied to the new project and its resources."
  }
}
run "reject_ambiguous_parent" {
  command = plan
  variables {
    organization_id = "123456789"
    folder_id       = "987654321"
  }
  expect_failures = [google_project.game]
}
