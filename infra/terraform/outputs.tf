output "postgres_endpoint" {
  description = "RDS writer endpoint for DATABASE_URL"
  value       = aws_db_instance.main.address
}

output "postgres_reader_note" {
  description = "Reader endpoint pattern for read replicas (add aws_db_instance read replicas as needed)"
  value       = replace(aws_db_instance.main.address, "ricton-", "ricton-*-ro-")
}

output "redis_endpoint" {
  description = "ElastiCache primary endpoint for REDIS_URL (rediss://)"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "app_secret_arn" {
  description = "Secrets Manager ARN consumed by External Secrets Operator"
  value       = aws_secretsmanager_secret.app.arn
}

output "waf_acl_arn" {
  description = "Edge WAF WebACL ARN"
  value       = aws_wafv2_web_acl.edge.arn
}
