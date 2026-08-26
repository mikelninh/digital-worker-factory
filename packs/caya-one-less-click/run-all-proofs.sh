#!/usr/bin/env bash
set -euo pipefail

node packs/caya-one-less-click/run-evals.mjs
node packs/caya-one-less-click/run-http-e2e.mjs

if [[ -n "${DATABASE_URL:-}" ]]; then
  bash packs/caya-one-less-click/run-postgres-e2e.sh
else
  echo 'PostgreSQL proof skipped locally because DATABASE_URL is not set; CI runs it against a real PostgreSQL service.'
fi
