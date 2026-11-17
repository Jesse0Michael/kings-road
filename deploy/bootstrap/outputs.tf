output "state_bucket" {
  value = google_storage_bucket.state.name
}
output "deployer_service_account" {
  description = "Add this identity as Editor in the Google Analytics ACCOUNT before the first deployment."
  value       = google_service_account.deployer.email
}
output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}
output "github_variables" {
  value = <<-EOT
    gh variable set GCP_PROJECT_ID --repo '${var.github_repository}' --body '${var.project_id}'
    gh variable set TF_STATE_BUCKET --repo '${var.github_repository}' --body '${google_storage_bucket.state.name}'
    gh variable set WIF_PROVIDER --repo '${var.github_repository}' --body '${google_iam_workload_identity_pool_provider.github.name}'
    gh variable set DEPLOYER_SERVICE_ACCOUNT --repo '${var.github_repository}' --body '${google_service_account.deployer.email}'
    gh variable set GA_ACCOUNT_ID --repo '${var.github_repository}' --body '${var.analytics_account_id}'
  EOT
}
