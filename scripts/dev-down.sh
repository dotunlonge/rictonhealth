#!/usr/bin/env bash
# Stop everything started by scripts/dev-up.sh (Ricton ports only).
set -u
cd "$(dirname "$0")/.." 2>/dev/null || true

PORTS="3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 3011 3012 3013 3014 3015 3016 3017 8000 8081 19000 19006"
for p in $PORTS; do
  for pid in $(lsof -ti "tcp:$p" 2>/dev/null || true); do
    name=$(ps -p "$pid" -o comm= 2>/dev/null || echo unknown)
    echo "port $p <- killing pid $pid ($name)"
    kill -9 "$pid" 2>/dev/null || true
  done
done
pkill -f "expo run:ios" 2>/dev/null || true
pkill -f "bin/concurrently" 2>/dev/null || true
echo "Ricton stack stopped."
