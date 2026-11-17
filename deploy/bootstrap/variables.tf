variable "project_id" {
  description = "Optional globally unique ID for the NEW project. Omit to generate app_slug plus a stable random suffix."
  type        = string
  default     = null
  validation {
    condition     = var.project_id == null || can(regex("^[a-z][a-z0-9-]{4,28}[a-z0-9]$", var.project_id))
    error_message = "Use a valid, unused Google Cloud project ID, or omit it."
  }
}
variable "project_name" {
  type    = string
  default = "Kings Road"
}
variable "billing_account_id" {
  description = "Billing account authorized to pay for the new project's state storage."
  type        = string
  validation {
    condition     = can(regex("^[A-Fa-f0-9]{6}-[A-Fa-f0-9]{6}-[A-Fa-f0-9]{6}$", var.billing_account_id))
    error_message = "Use the billing account ID in XXXXXX-XXXXXX-XXXXXX format."
  }
}
variable "organization_id" {
  description = "Optional numeric organization ID; omit for a personal No organization project."
  type        = string
  default     = null
}
variable "folder_id" {
  description = "Optional numeric folder ID instead of organization_id."
  type        = string
  default     = null
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
