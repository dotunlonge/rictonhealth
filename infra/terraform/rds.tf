# Managed Multi-AZ Postgres with encryption, PITR, and deletion protection.
# Application credentials live in Secrets Manager (see secrets.tf); the
# services consume them via ESO/Vault sidecars, never via committed files.
resource "aws_db_subnet_group" "main" {
  name       = "ricton-${var.environment}"
  subnet_ids = aws_subnet.private[*].id
  tags       = { Name = "ricton-${var.environment}" }
}

resource "aws_security_group" "postgres" {
  name        = "ricton-${var.environment}-postgres"
  description = "Postgres access from application subnets only"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "Postgres from app subnets"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = var.allowed_app_subnet_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_db_instance" "main" {
  identifier             = "ricton-${var.environment}"
  engine                 = "postgres"
  engine_version         = "16.4"
  instance_class         = var.db_instance_class
  allocated_storage      = 100
  max_allocated_storage  = 500
  storage_encrypted      = true
  storage_type           = "gp3"

  multi_az               = true
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.postgres.id]
  publicly_accessible    = false

  db_name  = "ricton"
  username = var.db_username
  password = jsondecode(aws_secretsmanager_secret_version.db_master.secret_string)["password"]

  backup_retention_period = 7
  backup_window           = "02:00-03:00"
  maintenance_window      = "sun:03:00-sun:04:00"
  copy_tags_to_snapshot   = true
  deletion_protection     = true
  delete_automated_backups = false
  performance_insights_enabled = true

  tags = { Name = "ricton-${var.environment}" }
}
