variable "project_id" {
  type = string
}
variable "region" {
  type    = string
  default = "us-central1"
}
variable "deploy_app" {
  type    = bool
  default = false
}
variable "image" {
  type    = string
  default = ""
}
variable "session_secret_version" {
  type    = string
  default = "1"
}
variable "demo_secret_version" {
  type    = string
  default = "1"
}
variable "github_repository" {
  type        = string
  description = "Exact OWNER/REPOSITORY"
}
variable "github_repository_id" {
  type = string
}
variable "github_owner_id" {
  type = string
}
variable "github_branch" {
  type        = string
  default     = "codex/preentrega-iam-actions"
  description = "Only this branch can run the cloud identity verification workflow."
}

variable "enable_database" {
  type    = bool
  default = false
}
variable "sql_activation_policy" {
  type    = string
  default = "ALWAYS"
  validation {
    condition     = contains(["ALWAYS", "NEVER"], var.sql_activation_policy)
    error_message = "Use ALWAYS or NEVER."
  }
}
variable "db_secret_version" {
  type    = string
  default = "1"
}
