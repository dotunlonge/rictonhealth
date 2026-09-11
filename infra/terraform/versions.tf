terraform {
  required_version = ">= 1.9.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.60"
    }
  }
  # Remote state is mandatory for team use. Bootstrap once, e.g.:
  #   aws s3api create-bucket --bucket ricton-tfstate-PROD --region eu-west-2
  #   aws dynamodb create-table --table-name ricton-tfstate-locks \
  #     --attribute-definitions AttributeName=LockID,AttributeType=S \
  #     --key-schema AttributeName=LockID,KeyType=HASH --billing-mode PAY_PER_REQUEST
  backend "s3" {}
}
