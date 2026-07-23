#!/usr/bin/env bash
set -e

echo "Starting isolated test database..."
docker compose -f docker-compose.test.yml up -d

# Wait for database to be ready
echo "Waiting for postgres to accept connections..."
until docker compose -f docker-compose.test.yml exec -T test-db pg_isready -U ricton_test_user -d ricton_test_db; do
  sleep 1
done

sleep 2

export DATABASE_URL="postgresql://ricton_test_user:ricton_test_password@127.0.0.1:5433/ricton_test_db?schema=public"

echo "Running Prisma migrations against test database..."
npm run migrate --workspace=@ricton/db

export NODE_ENV=test

echo "Building workspaces..."
npm run build --workspaces --if-present

echo "Running Integration Tests..."
# --runInBand ensures tests run sequentially so they don't corrupt each other's DB state
npm run test --workspaces --if-present -- --runInBand

TEST_EXIT_CODE=$?

echo "Tearing down test database..."
docker compose -f docker-compose.test.yml down -v

exit $TEST_EXIT_CODE
