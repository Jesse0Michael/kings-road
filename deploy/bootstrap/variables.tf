variable "project_id" {
  description = "Existing Google Cloud project (can be shared with prayer-deck)."
  type        = string
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Use the Google Cloud project ID, not a display name or Analytics account ID."
  }
}
variable "app_slug" {
  type    = string
  default = "kings-road"
  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,19}$", var.app_slug))
    error_message = "Use a lowercase slug of 2–20 characters."
  }
}
variable "github_repository" {
  type    = string
  default = "Jesse0Michael/kings-road"
  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "Use owner/repository with no spaces or shell characters."
  }
}
variable "analytics_account_id" {
  type    = string
  default = "25334252"
  validation {
    condition     = can(regex("^[0-9]+$", var.analytics_account_id))
    error_message = "Use the numeric Analytics account ID."
  }
}
variable "region" {
  type    = string
  default = "us-central1"
}
