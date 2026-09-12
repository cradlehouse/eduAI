#!/usr/bin/env bash
# Orchestrator unit + integration tests against a FRESH throwaway Postgres (same recipe as db-test.sh, no smoke).
set -euo pipefail
export LC_ALL=${LC_ALL:-C}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIG="$ROOT/supabase/migrations"; SEED="$ROOT/packages/db/seed"

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGDIR=$(mktemp -d); PORT=${PGPORT:-5498}
  initdb -D "$PGDIR/data" -U postgres --auth=trust -E UTF8 >"$PGDIR/initdb.log" 2>&1
  pg_ctl -D "$PGDIR/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$PGDIR/pg.log" -w start >/dev/null \
    || { cat "$PGDIR/pg.log"; exit 1; }
  trap 'pg_ctl -D "$PGDIR/data" stop -m immediate >/dev/null 2>&1; rm -rf "$PGDIR"' EXIT
  DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
fi
run() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }
run -f "$ROOT/scripts/test/supabase-shim.sql"
for f in "$MIG"/*.sql; do run -f "$f"; done
run -f "$SEED/models.sql"; run -f "$SEED/seed.sql"
run -f "$ROOT/scripts/test/orchestrator-fixture.sql"

cd "$ROOT/services/orchestrator"
ORCH_TEST_DATABASE_URL="$DATABASE_URL" uv run pytest -q "$@"
