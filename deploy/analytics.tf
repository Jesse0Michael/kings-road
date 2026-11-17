resource "googleanalytics_property" "game" {
  account_id    = var.analytics_account_id
  display_name  = var.display_name
  time_zone     = var.time_zone
  currency_code = "USD"
  lifecycle {
    prevent_destroy = true
  }
}
resource "googleanalytics_data_stream" "web" {
  parent       = googleanalytics_property.game.name
  type         = "WEB_DATA_STREAM"
  display_name = "${var.display_name} web"
  default_uri  = var.site_url
  lifecycle {
    prevent_destroy = true
  }
}
locals {
  dimensions = {
    human_role     = "Human role"
    actor_role     = "Acting role"
    controller     = "Human or computer"
    winner_role    = "Winning role"
    rules_version  = "Rules version"
    ai_version     = "AI version"
    screen_name    = "App screen"
    timing_partial = "Partial timing history"
    human_won      = "Human won"
  }
  metrics = {
    total_rounds        = "Total rounds"
    round               = "Current round"
    active_seconds      = "Active playing seconds"
    builder_score       = "Builder score"
    army_score          = "Army score"
    runner_score        = "Runner score"
    roll_total          = "Dice total"
    walls_built         = "Walls built"
    soldiers_deployed   = "Soldiers deployed"
    walls_destroyed     = "Walls destroyed"
    soldiers_sacrificed = "Soldiers sacrificed"
    castle_arrivals     = "Castle arrivals"
    coins_collected     = "Coins collected"
    soldiers_defeated   = "Soldiers defeated"
    moves               = "Moves"
    soldiers_held       = "Soldiers held"
  }
}
resource "googleanalytics_custom_dimension" "game" {
  for_each       = local.dimensions
  parent         = googleanalytics_property.game.name
  parameter_name = each.key
  display_name   = each.value
  scope          = "EVENT"
}
resource "googleanalytics_custom_metric" "game" {
  for_each         = local.metrics
  parent           = googleanalytics_property.game.name
  parameter_name   = each.key
  display_name     = each.value
  scope            = "EVENT"
  measurement_unit = each.key == "active_seconds" ? "SECONDS" : "STANDARD"
}
resource "googleanalytics_key_event" "completion" {
  parent          = googleanalytics_property.game.name
  event_name      = "game_completed"
  counting_method = "ONCE_PER_EVENT"
}
resource "googleanalytics_data_retention_settings" "game" {
  parent                          = googleanalytics_property.game.name
  event_data_retention            = "FOURTEEN_MONTHS"
  reset_user_data_on_new_activity = true
}
# The community provider lacks this Admin API resource. Reconcile it on creation
# or declared-setting/script changes; ordinary provider refresh cannot detect
# console edits to these fields. The helper is also safe to rerun manually.
locals {
  enhanced_measurement = {
    streamEnabled           = true
    scrollsEnabled          = true
    outboundClicksEnabled   = true
    siteSearchEnabled       = true
    videoEngagementEnabled  = true
    fileDownloadsEnabled    = true
    pageChangesEnabled      = true
    formInteractionsEnabled = true
  }
}
resource "terraform_data" "enhanced_measurement" {
  triggers_replace = [
    googleanalytics_data_stream.web.name,
    jsonencode(local.enhanced_measurement),
    filesha256("${path.module}/../scripts/analytics-admin.py"),
  ]
  provisioner "local-exec" {
    command = "python3 ../scripts/analytics-admin.py configure"
    environment = {
      GA_STREAM   = googleanalytics_data_stream.web.name
      GA_SETTINGS = jsonencode(local.enhanced_measurement)
    }
  }
}
