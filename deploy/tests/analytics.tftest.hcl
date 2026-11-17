mock_provider "googleanalytics" {}
mock_provider "github" {}
variables {
  analytics_account_id = "25334252"
}
run "fresh_property_and_complete_schema" {
  command = plan
  assert {
    condition     = googleanalytics_property.game.account_id == "25334252"
    error_message = "The new property must be created under the chosen account."
  }
  assert {
    condition     = length(googleanalytics_custom_dimension.game) == 9 && length(googleanalytics_custom_metric.game) == 16
    error_message = "Keep the complete gameplay schema in Terraform."
  }
  assert {
    condition     = googleanalytics_custom_metric.game["active_seconds"].measurement_unit == "SECONDS"
    error_message = "Playing time is seconds, not a raw count."
  }
  assert {
    condition     = googleanalytics_key_event.completion.event_name == "game_completed" && googleanalytics_key_event.completion.counting_method == "ONCE_PER_EVENT"
    error_message = "Each completed game should count, including multiple games in a session."
  }
}
