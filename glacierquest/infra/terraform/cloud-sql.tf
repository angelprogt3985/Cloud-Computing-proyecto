# Enable only when the team is ready for the billed database stage.
resource "google_sql_database_instance" "game" {
  count               = var.enable_database ? 1 : 0
  name                = "glacierquest-db"
  region              = var.region
  database_version    = "POSTGRES_16"
  deletion_protection = true
  settings {
    tier              = "db-f1-micro"
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"
    disk_type         = "PD_SSD"
    disk_size         = 10
    disk_autoresize   = false
    activation_policy = var.sql_activation_policy
    ip_configuration {
      ipv4_enabled = true
      # No authorized networks; use Cloud SQL connector/proxy and IAM.
    }
    backup_configuration {
      enabled                        = false
      point_in_time_recovery_enabled = false
    }
  }
  depends_on = [google_project_service.apis]
}
resource "google_sql_database" "game" {
  count    = var.enable_database ? 1 : 0
  name     = "glacierquest"
  instance = google_sql_database_instance.game[0].name
}
# Create the SQL login with psql/gcloud; do not place its password in tfstate.
