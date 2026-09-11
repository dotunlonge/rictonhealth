#!/usr/bin/env bash
# Generate production secrets into .env.production (gitignored — never commit).
# Managed environments (AWS Secrets Manager, ESO, Vault) should inject these
# as environment variables instead; this script is for Compose-based staging.
set -Eeuo pipefail

ENV_FILE="${1:-.env.production}"

rand_hex() {
  # $1 = bytes
  openssl rand -hex "$1"
}

need() {
  local var="$1" value="$2"
  if grep -q "^${var}=" "$ENV_FILE" 2>/dev/null; then
    echo "keep  $var (already set)"
  else
    echo "${var}=${value}" >> "$ENV_FILE"
    echo "wrote $var"
  fi
}

touch "$ENV_FILE"
chmod 600 "$ENV_FILE"

need JWT_SECRET "$(rand_hex 32)"
need REFRESH_SECRET "$(rand_hex 32)"
need OTP_SECRET "$(rand_hex 32)"
need TOTP_ENCRYPTION_KEY "$(rand_hex 32)"
need INTERNAL_API_SECRET "$(rand_hex 32)"
need REDIS_PASSWORD "$(rand_hex 24)"

echo "done: $ENV_FILE (mode 600). Fill in DATABASE_URL, provider keys, and frontend URL manually."
