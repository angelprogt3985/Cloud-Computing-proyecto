terraform {
  required_version = ">= 1.6, < 2.0"
  required_providers {
    google = {
      source = "hashicorp/google", version = "~> 7.0"
    }
  }
}
provider "google" {
  project = var.project_id
  region  = var.region
}
resource "google_project_service" "apis" {
  for_each           = toset(["run.googleapis.com", "sqladmin.googleapis.com", "firestore.googleapis.com", "storage.googleapis.com", "secretmanager.googleapis.com", "artifactregistry.googleapis.com", "iam.googleapis.com", "iamcredentials.googleapis.com", "sts.googleapis.com", "logging.googleapis.com", "monitoring.googleapis.com"])
  service            = each.value
  disable_on_destroy = false
}
resource "google_artifact_registry_repository" "images" {
  location               = var.region
  repository_id          = "glacierquest"
  format                 = "DOCKER"
  cleanup_policy_dry_run = false
  cleanup_policies {
    id     = "keep-recent"
    action = "KEEP"
    most_recent_versions {
      keep_count = 3
    }
  }
  cleanup_policies {
    id     = "delete-old"
    action = "DELETE"
    condition {
      older_than = "604800s"
    }
  }
  depends_on = [google_project_service.apis]
}
resource "google_secret_manager_secret" "session" {
  secret_id = "glacierquest-session"
  replication {
    auto {
    }
  }
  depends_on = [google_project_service.apis]
}
resource "google_secret_manager_secret" "demo" {
  secret_id = "glacierquest-demo-code"
  replication {
    auto {
    }
  }
  depends_on = [google_project_service.apis]
}
# Secret values are added with gcloud, never stored in Terraform state.

resource "google_secret_manager_secret" "db" {
  count     = var.enable_database ? 1 : 0
  secret_id = "glacierquest-db-password"
  replication {
    auto {}
  }
  depends_on = [google_project_service.apis]
}
