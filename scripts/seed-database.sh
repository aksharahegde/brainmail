#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-local}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SEED_FILE="$ROOT/packages/db/seed.sql"

if [[ ! -f "$SEED_FILE" ]]; then
  echo "Seed file not found: $SEED_FILE" >&2
  exit 1
fi

cd "$ROOT/workers"

case "$ENVIRONMENT" in
  local)
    pnpm exec wrangler d1 execute brainmail-db --local --file="$SEED_FILE"
    ;;
  staging)
    pnpm exec wrangler d1 execute brainmail-db-staging --env staging --remote --file="$SEED_FILE"
    ;;
  production)
    pnpm exec wrangler d1 execute brainmail-db-production --env production --remote --file="$SEED_FILE"
    ;;
  *)
    echo "Usage: $0 [local|staging|production]" >&2
    exit 1
    ;;
esac

echo "Seeded D1 database for ${ENVIRONMENT}."
