# No CDN/load balancer: Cloud Run provides the HTTPS endpoint.
resource "google_storage_bucket" "assets" {
  name                        = "${var.project_id}-glacierquest-assets"
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false
  soft_delete_policy {
    retention_duration_seconds = 0
  }
  depends_on = [google_project_service.apis]
}
resource "google_storage_bucket_object" "banner" {
  name          = "glacier-banner.svg"
  bucket        = google_storage_bucket.assets.name
  source        = "${path.module}/../../assets/glacier-banner.svg"
  content_type  = "image/svg+xml"
  cache_control = "private, max-age=300"
}
resource "google_storage_bucket_iam_member" "runtime" {
  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.runtime.email}"
}
resource "google_storage_bucket_iam_member" "deploy" {
  bucket = google_storage_bucket.assets.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.deploy.email}"
}
