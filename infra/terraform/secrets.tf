# Application secrets live in AWS Secrets Manager. Services consume them via
# External Secrets Operator (or Vault Agent); nothing secret is committed.
# Values are placeholders — set real ones with:
#   aws secretsmanager put-secret-value --secret-id ricton/prod/app \
#     --secret-string file://prod-app-secrets.json
resource "aws_secretsmanager_secret" "db_master" {
  name                    = "ricton/${var.environment}/db-master"
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "db_master" {
  secret_id = aws_secretsmanager_secret.db_master.id
  secret_string = jsonencode({
    username = var.db_username
    # Rotate immediately after first apply:
    # aws secretsmanager rotate-secret --secret-id ricton/prod/db-master
    password = "ROTATE_ME_ON_FIRST_APPLY_32_CHARS_MIN_xxxxxxxx"
  })
  lifecycle {
    ignore_changes = [secret_string]
  }
}

resource "aws_secretsmanager_secret" "app" {
  name                    = "ricton/${var.environment}/app"
  recovery_window_in_days = 30
}

resource "aws_secretsmanager_secret_version" "app" {
  secret_id = aws_secretsmanager_secret.app.id
  secret_string = jsonencode({
    DATABASE_URL         = "postgres://${var.db_username}:ROTATE_ME@${aws_db_instance.main.address}:5432/ricton?schema=public"
    REDIS_URL            = "rediss://${aws_elasticache_replication_group.main.primary_endpoint_address}:6379"
    REDIS_PASSWORD       = "ROTATE_ME_32_CHARS_MIN_xxxxxxxxxxxxxxxx"
    JWT_SECRET           = "ROTATE_ME_32_CHARS_MIN_xxxxxxxxxxxxxxxx"
    REFRESH_SECRET       = "ROTATE_ME_32_CHARS_MIN_xxxxxxxxxxxxxxxx"
    OTP_SECRET           = "ROTATE_ME_32_CHARS_MIN_xxxxxxxxxxxxxxxx"
    TOTP_ENCRYPTION_KEY  = "ROTATE_ME_32_CHARS_MIN_xxxxxxxxxxxxxxxx"
    INTERNAL_API_SECRET  = "ROTATE_ME_32_CHARS_MIN_xxxxxxxxxxxxxxxx"
    PAYSTACK_SECRET_KEY  = ""
    TWILIO_ACCOUNT_SID   = ""
    TWILIO_AUTH_TOKEN    = ""
    TWILIO_PHONE_NUMBER  = ""
    SENDGRID_API_KEY     = ""
    SENDGRID_FROM_EMAIL  = ""
  })
  lifecycle {
    ignore_changes = [secret_string]
  }
}
