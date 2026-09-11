#!/usr/bin/env bash
# build.sh — Build all Ricton Docker images.
#
# Usage:
#   ./build.sh           # incremental (uses cache)
#   ./build.sh --fresh   # full rebuild (--no-cache)
#
# The base image (ricton-base) is built first so that npm ci runs ONCE.
# All service images then use FROM ricton-base and only do service-specific steps.

set -euo pipefail

NO_CACHE=""
if [[ "${1:-}" == "--fresh" ]]; then
  NO_CACHE="--no-cache"
  echo "🔄  Fresh build (no cache)"
fi

echo "📦  Building shared base image (ricton-base)..."
docker build $NO_CACHE -f Dockerfile.base -t ricton-base .

echo ""
echo "🏗️   Building service images..."
docker compose build $NO_CACHE

echo ""
echo "✅  All images built successfully."
echo "    Run:  docker compose up"
