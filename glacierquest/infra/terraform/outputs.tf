output "url" {
  value = var.deploy_app ? google_cloud_run_v2_service.game[0].uri : null
}
output "workload_identity_provider" {
  value = google_iam_workload_identity_pool_provider.github.name
}
output "deploy_service_account" {
  value = google_service_account.deploy.email
}
output "asset_bucket" {
  value = google_storage_bucket.assets.name
}
output "image_repository" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.images.repository_id}"
}
