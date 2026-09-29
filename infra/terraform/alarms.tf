# #104 minimal CloudWatch alarm stubs (ALB 5xx rate + p95 latency).
# The ALB itself is managed outside this stack; pass its ARN via alb_arn
# (see variables.tf). Dimensions need the LB full-name suffix
# (app/<name>/<id>); the local below best-efforts it from the ARN — verify
# against the real ALB before relying on these in prod.
locals {
  alb_suffix = try(regex("app/.*", var.alb_arn), "app/PLACEHOLDER/PLACEHOLDER")
}

resource "aws_sns_topic" "alarms" {
  name = "ricton-${var.environment}-alarms"
  tags = { Name = "ricton-${var.environment}-alarms" }
}

resource "aws_cloudwatch_metric_alarm" "alb_5xx_rate" {
  alarm_name          = "ricton-${var.environment}-alb-5xx-rate"
  alarm_description   = "ALB HTTP 5xx count breaching error budget (stub thresholds)."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  statistic           = "Sum"
  threshold           = 50
  treat_missing_data  = "notBreaching"
  dimensions          = { LoadBalancer = local.alb_suffix }
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
  tags                = { Name = "ricton-${var.environment}-alb-5xx-rate" }
}

resource "aws_cloudwatch_metric_alarm" "alb_p95_latency" {
  alarm_name          = "ricton-${var.environment}-alb-p95-latency"
  alarm_description   = "ALB p95 target response time above SLO (stub thresholds)."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name         = "TargetResponseTime"
  namespace           = "AWS/ApplicationELB"
  period              = 300
  extended_statistic  = "p95"
  threshold           = 1.5
  treat_missing_data  = "notBreaching"
  dimensions          = { LoadBalancer = local.alb_suffix }
  alarm_actions       = [aws_sns_topic.alarms.arn]
  ok_actions          = [aws_sns_topic.alarms.arn]
  tags                = { Name = "ricton-${var.environment}-alb-p95-latency" }
}
