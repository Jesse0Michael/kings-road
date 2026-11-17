variable "analytics_account_id" {
  description = "Existing numeric Google Analytics account ID, not a property or Measurement ID."
  type        = string
  validation {
    condition     = can(regex("^[0-9]+$", var.analytics_account_id))
    error_message = "Use the numeric account ID from GA Admin → Account details."
  }
}
variable "github_repository" {
  type    = string
  default = "Jesse0Michael/kings-road"
  validation {
    condition     = can(regex("^[^/]+/[^/]+$", var.github_repository))
    error_message = "Use owner/repository."
  }
}
variable "site_url" {
  type    = string
  default = "https://jesse0michael.github.io/kings-road/"
  validation {
    condition     = can(regex("^https://[^/]+/", var.site_url))
    error_message = "Use the public HTTPS URL including its trailing slash."
  }
}
variable "display_name" {
  type    = string
  default = "King’s Road"
}
variable "time_zone" {
  type    = string
  default = "America/Phoenix"
}
variable "adopt_existing_pages" {
  description = "Import the existing Pages site/environment; false for a new repository with no Pages setup."
  type        = bool
  default     = true
}
