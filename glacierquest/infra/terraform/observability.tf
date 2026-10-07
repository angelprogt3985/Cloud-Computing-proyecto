resource "google_monitoring_dashboard" "game" {
  dashboard_json = jsonencode({
    displayName = "Glacier Quest service evidence"
    gridLayout = {
      columns = 2, widgets = [
        {
          title = "Cloud Run requests by response class", xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_count\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"glacierquest\""
                  aggregation = {
                    alignmentPeriod = "60s", perSeriesAligner = "ALIGN_RATE", crossSeriesReducer = "REDUCE_SUM", groupByFields = ["metric.label.response_code_class"]
                  }
                }
              }
              }
            ]
          }
        }
        ,
        {
          title = "Cloud Run latency p95", xyChart = {
            dataSets = [{
              timeSeriesQuery = {
                timeSeriesFilter = {
                  filter = "metric.type=\"run.googleapis.com/request_latencies\" resource.type=\"cloud_run_revision\" resource.label.service_name=\"glacierquest\""
                  aggregation = {
                    alignmentPeriod = "60s", perSeriesAligner = "ALIGN_DELTA", crossSeriesReducer = "REDUCE_PERCENTILE_95"
                  }
                }
              }
              }
            ]
          }
        }
      ]
    }
    }
  )
  depends_on = [google_project_service.apis]
}
