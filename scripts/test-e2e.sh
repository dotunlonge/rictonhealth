#!/usr/bin/env bash
set -Eeuo pipefail

reset_test_database() {
  docker compose -f docker-compose.test.yml down -v
}

cleanup() {
  echo "Tearing down test database..."
  reset_test_database
}

trap cleanup EXIT

echo "Starting isolated test database..."
reset_test_database
docker compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "Waiting for postgres to accept connections..."
until docker compose -f docker-compose.test.yml exec -T test-db pg_isready -U ricton_test_user -d ricton_test_db; do
  sleep 1
done

echo "Waiting for isolated Redis to accept authenticated connections..."
until docker compose -f docker-compose.test.yml exec -T test-redis redis-cli -a ricton_test_redis_password ping; do
  sleep 1
done

export DATABASE_URL="postgresql://ricton_test_user:ricton_test_password@127.0.0.1:5435/ricton_test_db?schema=public"
export REDIS_URL="redis://127.0.0.1:6382"
export REDIS_PASSWORD="ricton_test_redis_password"

echo "Replaying Prisma migrations on a fresh database..."
npx prisma migrate deploy --schema=packages/db/prisma/schema.prisma
npx prisma generate --schema=packages/db/prisma/schema.prisma

export NODE_ENV=test

echo "Typechecking backend workspaces..."
npm run typecheck

echo "Running Integration Tests..."
# --runInBand ensures tests run sequentially so they don't corrupt each other's DB state
npm run test:integration
