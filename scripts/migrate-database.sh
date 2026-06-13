#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-local}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT/workers"

case "$ENVIRONMENT" in
  local)
    pnpm exec wrangler d1 migrations apply brainmail-db --local
    ;;
  staging)
    pnpm exec wrangler d1 migrations apply brainmail-db-staging --env staging --remote
    ;;
  production)
    pnpm exec wrangler d1 migrations apply brainmail-db-production --env production --remote
    ;;
  *)
    echo "Usage: $0 [local|staging|production]" >&2
    exit 1
    ;;
esac

echo "Applied D1 migrations for ${ENVIRONMENT}."
