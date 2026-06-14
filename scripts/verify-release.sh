#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

case "$ENVIRONMENT" in
  local)
    HEALTH_URL="${HEALTH_URL:-http://localhost:8787/health}"
    ;;
  staging)
    HEALTH_URL="${HEALTH_URL:-https://brainmail-api-staging.akshara-dt.workers.dev/health}"
    ;;
  production)
    HEALTH_URL="${HEALTH_URL:-https://brainmail-api-production.akshara-dt.workers.dev/health}"
    ;;
  *)
    echo "Usage: $0 [local|staging|production]" >&2
    exit 1
    ;;
esac

echo "Verifying release health for $ENVIRONMENT"
echo "Health URL: $HEALTH_URL"

cd "$ROOT"
pnpm typecheck
pnpm --filter @brainmail/workers typecheck
pnpm --filter @brainmail/workers exec wrangler deploy --dry-run >/dev/null

HEALTH_JSON="$(curl -fsS "$HEALTH_URL")"
echo "$HEALTH_JSON" | node -e "
const fs = require('fs');
const payload = JSON.parse(fs.readFileSync(0, 'utf8'));
if (!payload.ok) {
  console.error('Health check failed:', JSON.stringify(payload));
  process.exit(1);
}
console.log('Health OK:', payload.service, payload.environment, payload.version ?? 'unknown');
"

echo "Release verification passed for $ENVIRONMENT"
