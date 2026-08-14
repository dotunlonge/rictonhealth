#!/usr/bin/env bash

# ==============================================================================
# Ricton Microservices AWS ECR Build & Push Automation Script
# ==============================================================================
# Usage:
#   AWS_ACCOUNT_ID=123456789012 AWS_REGION=us-east-1 ./scripts/aws-ecr-push.sh
# ==============================================================================

set -e

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
REGISTRY_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "❌ Error: AWS_ACCOUNT_ID environment variable is required."
  echo "Usage: AWS_ACCOUNT_ID=<your-aws-account-id> AWS_REGION=us-east-1 ./scripts/aws-ecr-push.sh"
  exit 1
fi

echo "🚀 Authenticating Docker with AWS ECR ($AWS_REGION)..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY_URL"

SERVICES=(
  "auth"
  "user"
  "appointment"
  "prescription"
  "telemedicine"
  "address"
  "analytics"
  "pharmacy"
  "payment"
  "wallet"
  "notification"
  "messaging"
  "subscription"
  "rewards"
  "admin"
  "docs"
)

echo "📦 Building and Pushing ${#SERVICES[@]} Microservice Docker Images..."

for SERVICE in "${SERVICES[@]}"; do
  REPO_NAME="ricton-${SERVICE}"
  IMAGE_TAG="${REGISTRY_URL}/${REPO_NAME}:latest"

  echo "--------------------------------------------------------"
  echo "🔨 Processing service: ${SERVICE} -> ${REPO_NAME}"
  echo "--------------------------------------------------------"

  # Ensure ECR repository exists
  aws ecr describe-repositories --repository-names "$REPO_NAME" --region "$AWS_REGION" > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$REPO_NAME" --region "$AWS_REGION"

  # Build Docker Image from monorepo root context
  docker build -t "$REPO_NAME:latest" -f "services/${SERVICE}/Dockerfile" .

  # Tag and Push to ECR
  docker tag "$REPO_NAME:latest" "$IMAGE_TAG"
  docker push "$IMAGE_TAG"

  echo "✅ Successfully pushed ${IMAGE_TAG}"
done

echo "========================================================"
echo "🎉 All Ricton microservice Docker images successfully deployed to AWS ECR!"
echo "========================================================"
