#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/sql/schema-ci.sql"
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$(dirname "$0")/sql/benchmark.sql" | tee /tmp/caya-postgres-plan.txt

grep -q "idx_integration_deliveries_customer_type_latest" /tmp/caya-postgres-plan.txt || {
  echo "Expected composite index was not used by EXPLAIN ANALYZE" >&2
  exit 1
}

echo '{"postgres_schema":"PASS","synthetic_rows":20000,"composite_index":"USED_BY_PLAN"}'
