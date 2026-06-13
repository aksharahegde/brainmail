#!/usr/bin/env bash
set -euo pipefail

ENVIRONMENT="${1:-staging}"

if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
  echo "Usage: $0 [staging|production]"
  exit 1
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKERS_DIR="$ROOT_DIR/workers"
WRANGLER_JSONC="$WORKERS_DIR/wrangler.jsonc"

cd "$WORKERS_DIR"

WRANGLER=(pnpm exec wrangler)

if ! "${WRANGLER[@]}" whoami >/dev/null 2>&1; then
  echo "Run 'wrangler login' before provisioning."
  exit 1
fi

create_if_missing() {
  local description="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    echo "Created $description"
  else
    echo "Exists or skipped: $description"
  fi
}

D1_NAME="brainmail-db-${ENVIRONMENT}"
R2_NAME="brainmail-attachments-${ENVIRONMENT}"
VECTORIZE_NAME="brainmail-embeddings-${ENVIRONMENT}"
DLQ_NAME="brainmail-dead-letter-${ENVIRONMENT}"

PIPELINE_QUEUES=(
  email-ingestion
  classification
  entity-extraction
  attachment-processing
  embedding-generation
  automation-execution
  insight-generation
)

echo "Provisioning Cloudflare resources for environment: $ENVIRONMENT"

create_if_missing "D1 database $D1_NAME" "${WRANGLER[@]}" d1 create "$D1_NAME"
create_if_missing "R2 bucket $R2_NAME" "${WRANGLER[@]}" r2 bucket create "$R2_NAME"
create_if_missing "Vectorize index $VECTORIZE_NAME" \
  "${WRANGLER[@]}" vectorize create "$VECTORIZE_NAME" --preset @cf/baai/bge-base-en-v1.5
create_if_missing "Dead-letter queue $DLQ_NAME" "${WRANGLER[@]}" queues create "$DLQ_NAME"

for queue in "${PIPELINE_QUEUES[@]}"; do
  queue_name="brainmail-${queue}-${ENVIRONMENT}"
  create_if_missing "Queue $queue_name" "${WRANGLER[@]}" queues create "$queue_name"
done

D1_ID="$("${WRANGLER[@]}" d1 list --json 2>/dev/null | node -e "
const fs = require('fs');
const input = fs.readFileSync(0, 'utf8').trim();
if (!input) process.exit(1);
const databases = JSON.parse(input);
const match = databases.find((db) => db.name === process.argv[1]);
if (!match) process.exit(1);
console.log(match.uuid);
" "$D1_NAME")"

if [[ -z "$D1_ID" ]]; then
  echo "Could not resolve D1 database id for $D1_NAME"
  echo "Run: wrangler d1 list"
  exit 1
fi

if [[ "$ENVIRONMENT" == "staging" ]]; then
  PLACEHOLDER="REPLACE_D1_STAGING"
else
  PLACEHOLDER="REPLACE_D1_PRODUCTION"
fi
TMP_FILE="$(mktemp)"

sed "s/${PLACEHOLDER}/${D1_ID}/g" "$WRANGLER_JSONC" > "$TMP_FILE"
mv "$TMP_FILE" "$WRANGLER_JSONC"

echo "Updated $WRANGLER_JSONC with D1 id: $D1_ID"
echo "Provisioning complete for $ENVIRONMENT"
