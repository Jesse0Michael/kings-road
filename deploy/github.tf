# Stop managing GitHub settings without deleting an existing Pages site,
# environment, or variable if an earlier configuration was already applied.
# These state-only removals do not require a GitHub token.
removed {
  from = github_repository_pages.site
  lifecycle {
    destroy = false
  }
}
removed {
  from = github_repository_environment.pages
  lifecycle {
    destroy = false
  }
}
removed {
  from = github_actions_variable.measurement_id
  lifecycle {
    destroy = false
  }
}
