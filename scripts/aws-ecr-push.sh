#!/usr/bin/env bash

# ==============================================================================
# Ricton Microservices AWS ECR Build & Push Automation Script
# ==============================================================================
# Usage:
#   AWS_ACCOUNT_ID=123456789012 AWS_REGION=eu-west-2 ./scripts/aws-ecr-push.sh
# ==============================================================================

set -e

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-}"
AWS_REGION="${AWS_REGION:-eu-west-2}"
IMAGE_TAG="${IMAGE_TAG:-$(git rev-parse --verify HEAD)}"
NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-}"
NEXT_PUBLIC_GOOGLE_CLIENT_ID="${NEXT_PUBLIC_GOOGLE_CLIENT_ID:-${GOOGLE_CLIENT_ID:-}}"
NEXT_PUBLIC_APPLE_CLIENT_ID="${NEXT_PUBLIC_APPLE_CLIENT_ID:-${APPLE_CLIENT_ID:-}}"
REGISTRY_URL="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

if [ -z "$AWS_ACCOUNT_ID" ]; then
  echo "❌ Error: AWS_ACCOUNT_ID environment variable is required."
  echo "Usage: AWS_ACCOUNT_ID=<your-aws-account-id> AWS_REGION=eu-west-2 ./scripts/aws-ecr-push.sh"
  exit 1
fi

if [ -z "$NEXT_PUBLIC_API_URL" ]; then
  echo "❌ Error: NEXT_PUBLIC_API_URL is required to build the browser client."
  exit 1
fi

if [ -z "$NEXT_PUBLIC_GOOGLE_CLIENT_ID" ]; then
  echo "❌ Error: NEXT_PUBLIC_GOOGLE_CLIENT_ID (or GOOGLE_CLIENT_ID) is required for Google Sign-In."
  exit 1
fi

if [[ ! "$IMAGE_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9_.-]{6,127}$ ]]; then
  echo "❌ Error: IMAGE_TAG must be an immutable Docker-compatible release identifier."
  exit 1
fi

echo "🚀 Authenticating Docker with AWS ECR ($AWS_REGION)..."

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
  "smartguard"
  "docs"
)

push_image() {
  local repo_name="$1"
  local dockerfile="$2"
  shift 2
  local image_tag="${REGISTRY_URL}/${repo_name}:${IMAGE_TAG}"
  local local_tag="${repo_name}:${IMAGE_TAG}"

  echo "--------------------------------------------------------"
  echo "🔨 Processing ${repo_name} -> ${image_tag}"
  echo "--------------------------------------------------------"

  aws ecr describe-repositories --repository-names "$repo_name" --region "$AWS_REGION" > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$repo_name" --region "$AWS_REGION"

  docker build "$@" -t "$local_tag" -f "$dockerfile" .

  docker tag "$local_tag" "$image_tag"
  docker push "$image_tag"

  echo "✅ Successfully pushed ${image_tag}"

  docker image rm "$local_tag" "$image_tag" || true
  docker builder prune -f || true
}

echo "📦 Building and Pushing ${#SERVICES[@]} Microservice Docker Images..."

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY_URL"

echo "📦 Building shared base image (ricton-base) — every service Dockerfile builds FROM it..."
docker build -f Dockerfile.base -t ricton-base .

for SERVICE in "${SERVICES[@]}"; do
  push_image "ricton-${SERVICE}" "services/${SERVICE}/Dockerfile"
done

echo "📦 Building and Pushing DB migration image..."
push_image "ricton-db" "packages/db/Dockerfile"

echo "📦 Building and Pushing web frontend image..."
push_image "ricton-web" "apps/web/Dockerfile" \
  --build-arg "NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}" \
  --build-arg "NEXT_PUBLIC_GOOGLE_CLIENT_ID=${NEXT_PUBLIC_GOOGLE_CLIENT_ID}" \
  --build-arg "NEXT_PUBLIC_APPLE_CLIENT_ID=${NEXT_PUBLIC_APPLE_CLIENT_ID}" \
  --build-arg "DEPLOYMENT_VERSION=${IMAGE_TAG}"

echo "========================================================"
echo "🎉 All Ricton microservice Docker images successfully deployed to AWS ECR!"
echo "========================================================"
