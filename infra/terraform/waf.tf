# Edge abuse containment: managed rules + account-level rate cap in front of
# the ALB that fronts Kong. Associate by passing the ALB ARN (alb_arn).
resource "aws_wafv2_web_acl" "edge" {
  name        = "ricton-${var.environment}"
  description = "Edge protection for the Ricton API gateway"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 1
    override_action {
      none {}
    }
    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ricton-${var.environment}-common"
      sampled_requests_enabled   = true
    }
  }

  rule {
    name     = "BurstRateCap"
    priority = 2
    action {
      block {}
    }
    statement {
      rate_based_statement {
        limit              = 2000
        aggregate_key_type = "IP"
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "ricton-${var.environment}-burst"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "ricton-${var.environment}-edge"
    sampled_requests_enabled   = true
  }

  tags = { Name = "ricton-${var.environment}" }
}

resource "aws_wafv2_web_acl_association" "edge" {
  # #94 WAF must always be attached in front of the ALB — no conditional
  # count. Pass a real alb_arn in every environment.
  resource_arn = var.alb_arn
  web_acl_arn  = aws_wafv2_web_acl.edge.arn
}
