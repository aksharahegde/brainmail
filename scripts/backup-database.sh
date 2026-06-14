#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TIMESTAMP="$(date -u +"%Y%m%dT%H%M%SZ")"
BACKUP_DIR="$ROOT/backups"
OUTPUT_FILE="$BACKUP_DIR/brainmail-${ENVIRONMENT}-${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

cd "$ROOT/workers"

case "$ENVIRONMENT" in
  local)
    pnpm exec wrangler d1 export brainmail-db --local --output "$OUTPUT_FILE"
    ;;
  staging)
    pnpm exec wrangler d1 export brainmail-db-staging --env staging --remote --output "$OUTPUT_FILE"
    ;;
  production)
    pnpm exec wrangler d1 export brainmail-db-production --env production --remote --output "$OUTPUT_FILE"
    ;;
  *)
    echo "Usage: $0 [local|staging|production]" >&2
    exit 1
    ;;
esac

echo "Database backup written to $OUTPUT_FILE"
