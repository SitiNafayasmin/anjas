#!/usr/bin/env bash
set -euo pipefail

WEB_URL="${WEB_URL:-https://yourdomain.com}"
API_URL="${API_URL:-https://api.yourdomain.com}"

curl -fsS "${WEB_URL}" >/dev/null
curl -fsS "${API_URL}/health" >/dev/null
curl -fsS "${API_URL}/v1/models" -H "Authorization: Bearer ${SMOKE_API_KEY:-ak_live_invalid_for_401_check}" >/dev/null || true

echo "healthcheck complete"
