variable "enable_firestore" {
  type    = bool
  default = false
}

resource "google_firestore_database" "game" {
  count                             = var.enable_firestore ? 1 : 0
  project                           = var.project_id
  name                              = "(default)"
  location_id                       = var.region
  type                              = "FIRESTORE_NATIVE"
  deletion_policy                   = "ABANDON"
  delete_protection_state           = "DELETE_PROTECTION_ENABLED"
  point_in_time_recovery_enablement = "POINT_IN_TIME_RECOVERY_DISABLED"
  depends_on                        = [google_project_service.apis]
}

resource "google_project_iam_member" "firestore" {
  count   = var.enable_firestore ? 1 : 0
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.runtime.email}"
}
