# Managed Redis: Multi-AZ replication group with transit encryption and AUTH.
resource "aws_security_group" "redis" {
  name        = "ricton-${var.environment}-redis"
  description = "Redis access from application subnets only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Redis from app subnets"
    from_port   = 6379
    to_port     = 6379
    protocol    = "tcp"
    cidr_blocks = var.allowed_app_subnet_cidrs
  }
}

resource "aws_elasticache_subnet_group" "main" {
  name       = "ricton-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_elasticache_replication_group" "main" {
  replication_group_id = "ricton-${var.environment}"
  description          = "Ricton session/cache/pubsub"
  engine               = "redis"
  engine_version       = "7.1"
  node_type            = "cache.r6g.large"
  num_cache_clusters   = 2
  port                 = 6379

  subnet_group_name  = aws_elasticache_subnet_group.main.name
  security_group_ids = [aws_security_group.redis.id]

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true
  auth_token                 = jsondecode(aws_secretsmanager_secret_version.app.secret_string)["REDIS_PASSWORD"]
  automatic_failover_enabled = true
  multi_az_enabled           = true
  snapshot_retention_limit   = 7

  tags = { Name = "ricton-${var.environment}" }
}
