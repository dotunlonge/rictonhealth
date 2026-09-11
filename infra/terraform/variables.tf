variable "region" {
  description = "AWS region for the production data plane"
  type        = string
  default     = "eu-west-2"
}

variable "environment" {
  description = "Deployment environment name (prod, staging)"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.20.0.0/16"
}

variable "db_username" {
  description = "Master username for RDS Postgres"
  type        = string
  default     = "ricton"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.r6g.large"
}

variable "alb_arn" {
  description = "ALB ARN to associate the WAF WebACL with (empty skips association)"
  type        = string
  default     = ""
}

variable "allowed_app_subnet_cidrs" {
  description = "CIDRs allowed to reach Postgres/Redis (EKS pod + worker subnets)"
  type        = list(string)
  default     = []
}
