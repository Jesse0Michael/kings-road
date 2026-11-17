output "measurement_id" {
  value = googleanalytics_data_stream.web.measurement_id
}
output "property_name" {
  value = googleanalytics_property.game.name
}
output "stream_name" {
  value = googleanalytics_data_stream.web.name
}
output "site_hostname" {
  value = split("/", var.site_url)[2]
}
output "site_url" {
  value = var.site_url
}
