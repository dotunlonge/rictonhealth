#!/usr/bin/env bash
# Ricton one-command local stack.
# Usage: bash scripts/dev-up.sh [--skip-mobile-build]
#
# Frees our ports first (so they are always available), then starts, in order:
# Docker Desktop + Compose Postgres/Redis, all 15 backend services, the
# dev-gateway shim (:8000), web (:3000), Metro, iOS simulator + dev client.
# Logs: /tmp/ricton-{services,gateway,web,mobile,ios}.log
set -Eeuo pipefail
cd "$(dirname "$0")/.."

# Docker Redis requires authentication. Services load REDIS_URL from .env, but
# ioredis receives the password separately; exporting the local default here
# keeps `yarn dev:all` usable without asking every developer to duplicate a
# secret in their personal .env. An explicitly supplied value always wins.
export REDIS_PASSWORD="${REDIS_PASSWORD:-ricton-secure-redis-2026}"

PORTS="3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016 3017 8000 8081 19000 19006"
SKIP_MOBILE_BUILD="0"
for arg in "$@"; do
  case "$arg" in
    --skip-mobile-build) SKIP_MOBILE_BUILD="1" ;;
  esac
done

free_ports() {
  echo "== Freeing Ricton ports =="
  for p in $PORTS; do
    for pid in $(lsof -ti "tcp:$p" 2>/dev/null || true); do
      name=$(ps -p "$pid" -o comm= 2>/dev/null || echo unknown)
      echo "   port $p <- killing pid $pid ($name)"
      kill -9 "$pid" 2>/dev/null || true
    done
  done
  sleep 2
  # A previous launcher tree would otherwise keep (re)spawning children.
  pkill -f "bin/concurrently" 2>/dev/null || true
  sleep 1
}

ensure_docker() {
  echo "== Docker Desktop =="
  if docker info >/dev/null 2>&1; then
    echo "   already running"
    return
  fi
  echo "   launching Docker Desktop..."
  open -a Docker
  for _ in $(seq 1 60); do
    docker info >/dev/null 2>&1 && { echo "   docker is up"; return; }
    sleep 2
  done
  echo "   WARNING: docker still not responding; continuing without it"
}

ensure_infra() {
  echo "== Docker Postgres + Redis =="

  # This stack owns its local infrastructure through docker-compose.yml. Do
  # not start Homebrew services here: a native process on 5432/6379 would make
  # the Compose ports unavailable and leave Prisma pointing at the wrong DB.
  if ! docker compose up -d postgres redis; then
    echo "   ERROR: unable to start local Postgres/Redis containers"
    return 1
  fi

  for _ in $(seq 1 60); do
    if docker compose ps --status running postgres 2>/dev/null | grep -q postgres \
      && docker compose exec -T postgres pg_isready -U ricton -d ricton >/dev/null 2>&1 \
      && docker compose exec -T redis redis-cli -a "${REDIS_PASSWORD:-ricton-secure-redis-2026}" ping 2>/dev/null | grep -q PONG; then
      echo "   postgres + redis: ready"
      return 0
    fi
    sleep 1
  done

  echo "   ERROR: local Postgres/Redis containers did not become ready"
  docker compose ps postgres redis || true
  return 1
}

wait_healthy() {
  # wait_healthy <port> <name> [timeout_s]
  local port="$1" name="$2" timeout="${3:-120}" i code
  for _ in $(seq 1 "$timeout"); do
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:$port/health" 2>/dev/null || echo 000)
    if [ "$code" = "200" ]; then echo "   $name :$port OK"; return 0; fi
    sleep 1
  done
  echo "   $name :$port NOT healthy (last=$code) — see logs"
  return 1
}

free_ports
ensure_docker
ensure_infra

echo "== Prisma client + migrations =="
if npx prisma generate --schema packages/db/prisma/schema.prisma > /tmp/ricton-migrate.log 2>&1; then
  echo "   prisma generate OK"
else
  echo "   WARNING: prisma generate failed — see /tmp/ricton-migrate.log"
fi
if npx prisma migrate deploy --schema packages/db/prisma/schema.prisma >> /tmp/ricton-migrate.log 2>&1; then
  echo "   migrate deploy OK"
else
  echo "   WARNING: migrate deploy failed (fresh DB?) — see /tmp/ricton-migrate.log"
  echo "   Run manually once: npm run db:migrate"
fi

echo "== Backend services (15) =="
nohup npx concurrently -c "auto" \
  "npm run dev -w @ricton/auth-service" \
  "npm run dev -w @ricton/user-service" \
  "npm run dev -w @ricton/prescription-service" \
  "npm run dev -w @ricton/appointment-service" \
  "npm run dev -w @ricton/analytics-service" \
  "npm run dev -w @ricton/payment-service" \
  "npm run dev -w @ricton/wallet-service" \
  "npm run dev -w @ricton/subscription-service" \
  "npm run dev -w @ricton/admin-service" \
  "npm run dev -w @ricton/rewards-service" \
  "npm run dev -w @ricton/messaging-service" \
  "npm run dev -w @ricton/telemedicine-service" \
  "npm run dev -w @ricton/pharmacy-service" \
  "npm run dev -w @ricton/address-service" \
  "npm run dev -w @ricton/notification-service" \
  > /tmp/ricton-services.log 2>&1 &
for p in 3001 3002 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016; do
  wait_healthy "$p" "svc" 150 || true
done

echo "== Gateway shim :8000 =="
nohup node scripts/dev-gateway.mjs > /tmp/ricton-gateway.log 2>&1 &
wait_healthy 8000 "gateway" 30 || true

echo "== Web :3000 =="
nohup npm run dev -w apps/web -- --port 3000 > /tmp/ricton-web.log 2>&1 &
for _ in $(seq 1 150); do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:3000/" 2>/dev/null || echo 000)
  [ "$code" = "200" ] && { echo "   web :3000 OK"; break; }
  sleep 2
done

echo "== Mobile Metro =="
nohup env CI=1 npm run start -w apps/mobile > /tmp/ricton-mobile.log 2>&1 &
for _ in $(seq 1 60); do
  curl -fsS --max-time 2 http://127.0.0.1:8081/status >/dev/null 2>&1 && break
  sleep 1
done

# A Simulator can reach the host on the active LAN interface. Fall back to
# loopback for setups without one.
METRO_HOST=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 127.0.0.1)
METRO_URL="http://${METRO_HOST}:8081?disableOnboarding=1"

echo "== iOS simulator =="
SIMULATOR_UDID=$(xcrun simctl list devices booted -j 2>/dev/null | node -e "
let raw = '';
process.stdin.on('data', (chunk) => { raw += chunk; });
process.stdin.on('end', () => {
  try {
    const devices = Object.values(JSON.parse(raw).devices || {}).flat();
    const booted = devices.find((device) => device.state === 'Booted');
    if (booted) process.stdout.write(booted.udid);
  } catch (_) {}
});
" || true)

if [ -z "${SIMULATOR_UDID:-}" ]; then
  UDID=$(xcrun simctl list devices available -j 2>/dev/null | python3 -c "
import sys, json
d = json.load(sys.stdin)['devices']
for runtime in d.values():
    for dev in runtime:
        if 'iPhone' in dev.get('name', '') and dev.get('isAvailable'):
            print(dev['udid']); sys.exit(0)
" || true)
  if [ -n "${UDID:-}" ]; then
    echo "   booting $UDID..."
    xcrun simctl boot "$UDID" >/dev/null 2>&1 || true
    # Opening Simulator is asynchronous. Wait for the device runtime before
    # asking Expo to install/launch the dev client into it.
    xcrun simctl bootstatus "$UDID" -b >/dev/null 2>&1 || true
    SIMULATOR_UDID="$UDID"
  fi
  open -a Simulator >/dev/null 2>&1 || true
else
  echo "   simulator already booted ($SIMULATOR_UDID)"
fi

if [ "$SKIP_MOBILE_BUILD" = "0" ]; then
  echo "== Mobile dev client (builds first time, then launches) =="
  # Expo's run:ios device selector can misclassify Xcode 26 simulators as
  # physical devices and request signing certificates. Build the simulator
  # target explicitly, then install/launch it via simctl instead.
  nohup env SIMULATOR_UDID="$SIMULATOR_UDID" PROJECT_ROOT="$PWD" METRO_URL="$METRO_URL" bash -c '
    set -Eeuo pipefail
    MOBILE_ROOT="$PROJECT_ROOT/apps/mobile"
    DERIVED_DATA="$MOBILE_ROOT/.expo/ios-derived-data"
    APP_PATH="$DERIVED_DATA/Build/Products/Debug-iphonesimulator/RictonHealth.app"

    cd "$MOBILE_ROOT"
    xcodebuild -quiet \
      -workspace ios/RictonHealth.xcworkspace \
      -scheme RictonHealth \
      -configuration Debug \
      -sdk iphonesimulator \
      -destination "platform=iOS Simulator,id=$SIMULATOR_UDID" \
      -derivedDataPath "$DERIVED_DATA" \
      build
    xcrun simctl install "$SIMULATOR_UDID" "$APP_PATH"
    xcrun simctl launch "$SIMULATOR_UDID" com.ricton.health --initialUrl "$METRO_URL"
  ' > /tmp/ricton-ios.log 2>&1 &
  echo "   building/installing in background — tail with: tail -f /tmp/ricton-ios.log"
else
  echo "   (--skip-mobile-build: Metro only)"
fi

cat <<'EOF'

=============================================================
 Ricton stack is up:
   Gateway (shim)  http://localhost:8000  (/health)
   Web             http://localhost:3000
   Metro           http://localhost:8081  (/status)
   Services        :3001-:3016           (/health each)
 Logs: /tmp/ricton-{services,gateway,web,mobile,ios}.log
 Stop everything:  bash scripts/dev-down.sh
=============================================================
EOF
