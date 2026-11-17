terraform {
  required_version = ">= 1.11, < 2.0"
  backend "gcs" {
    prefix = "kings-road/production"
  }
  required_providers {
    googleanalytics = {
      source  = "breymander/google-analytics"
      version = "= 0.1.0"
    }
    github = {
      source  = "integrations/github"
      version = "~> 6.13"
    }
  }
}
provider "googleanalytics" {}
provider "github" {
  owner = split("/", var.github_repository)[0]
}
