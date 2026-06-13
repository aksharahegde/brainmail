#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

cd "$ROOT_DIR/workers"

WRANGLER=(pnpm exec wrangler)

if ! "${WRANGLER[@]}" whoami >/dev/null 2>&1; then
  echo "Run 'wrangler login' before deploying."
  exit 1
fi

"${WRANGLER[@]}" deploy --env "$ENVIRONMENT"

echo "Deployed brainmail-api to $ENVIRONMENT"
