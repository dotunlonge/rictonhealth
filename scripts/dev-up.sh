#!/usr/bin/env bash
# Ricton one-command local stack.
# Usage: bash scripts/dev-up.sh [--skip-mobile-build]
#
# Frees our ports first (so they are always available), then starts, in order:
# Docker Desktop, local Postgres/Redis, all 15 backend services, the
# dev-gateway shim (:8000), web (:3000), Metro, iOS simulator + dev client.
# Logs: /tmp/ricton-{services,gateway,web,mobile,ios}.log
set -Eeuo pipefail
cd "$(dirname "$0")/.."

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
  echo "== Postgres + Redis =="
  if pg_isready -h /tmp -p 5432 >/dev/null 2>&1 || pg_isready -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    echo "   postgres: up"
  else
    echo "   starting postgres (brew)..."
    brew services start postgresql@18 >/dev/null 2>&1 || true
  fi
  if redis-cli -p 6379 ping >/dev/null 2>&1; then
    echo "   redis :6379: up"
  else
    echo "   starting redis :6379..."
    redis-server --port 6379 --daemonize yes --save '' --appendonly no >/dev/null 2>&1 || true
  fi
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
nohup npm run start -w apps/mobile -- --non-interactive > /tmp/ricton-mobile.log 2>&1 &

echo "== iOS simulator =="
if ! xcrun simctl list devices 2>/dev/null | grep -q "(Booted)"; then
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
  fi
  open -a Simulator >/dev/null 2>&1 || true
else
  echo "   simulator already booted"
fi

if [ "$SKIP_MOBILE_BUILD" = "0" ]; then
  echo "== Mobile dev client (builds first time, then launches) =="
  nohup npx expo run:ios --non-interactive > /tmp/ricton-ios.log 2>&1 &
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
