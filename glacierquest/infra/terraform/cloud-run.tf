resource "google_cloud_run_v2_service" "game" {
  count               = var.deploy_app ? 1 : 0
  name                = "glacierquest"
  location            = var.region
  deletion_protection = false
  ingress             = "INGRESS_TRAFFIC_ALL"
  scaling {
    min_instance_count = 0
    max_instance_count = 2
  }
  template {
    service_account                  = google_service_account.runtime.email
    timeout                          = "30s"
    max_instance_request_concurrency = 40
    scaling {
      min_instance_count = 0
      max_instance_count = 2
    }
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.game[0].connection_name]
      }
    }
    containers {
      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
      env {
        name  = "DB_HOST"
        value = "/cloudsql/${google_sql_database_instance.game[0].connection_name}"
      }
      env {
        name  = "DB_NAME"
        value = "glacierquest"
      }
      env {
        name  = "DB_USER"
        value = "glacierquest"
      }
      env {
        name = "DB_PASSWORD"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.db.secret_id
            version = var.db_secret_version
          }
        }
      }
      image = var.image
      ports {
        container_port = 8080
      }
      resources {
        limits = {
          cpu = "1", memory = "512Mi"
        }
        cpu_idle          = true
        startup_cpu_boost = false
      }
      env {
        name  = "NODE_ENV"
        value = "production"
      }
      env {
        name  = "STORE"
        value = "postgres"
      }
      env {
        name  = "GOOGLE_CLOUD_PROJECT"
        value = var.project_id
      }
      env {
        name  = "ASSET_BUCKET"
        value = google_storage_bucket.assets.name
      }
      env {
        name = "SESSION_SECRET"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.session.secret_id
            version = var.session_secret_version
          }
        }
      }
      env {
        name = "DEMO_CODE"
        value_source {
          secret_key_ref {
            secret  = google_secret_manager_secret.demo.secret_id
            version = var.demo_secret_version
          }
        }
      }
    }
  }
  lifecycle {
    ignore_changes = [template[0].containers[0].image]
    precondition {
      condition     = !var.deploy_app || (length(var.image) > 0 && var.enable_database)
      error_message = "Provide an uploaded image and enable_database=true before deploying the app."
    }
  }
  depends_on = [google_project_service.apis, google_project_iam_member.database, google_secret_manager_secret_iam_member.session, google_secret_manager_secret_iam_member.db, google_secret_manager_secret_iam_member.demo, google_storage_bucket_iam_member.runtime]
}
resource "google_cloud_run_v2_service_iam_member" "public" {
  count    = var.deploy_app ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.game[0].name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
resource "google_cloud_run_v2_service_iam_member" "deploy" {
  count    = var.deploy_app ? 1 : 0
  project  = var.project_id
  location = var.region
  name     = google_cloud_run_v2_service.game[0].name
  role     = "roles/run.developer"
  member   = "serviceAccount:${google_service_account.deploy.email}"
}
