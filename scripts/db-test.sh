#!/usr/bin/env bash
# Apply every migration + seed to a FRESH Postgres, then run the RLS check and the smoke tests.
#   - DATABASE_URL set   → use it (CI service container). Must be an empty database.
#   - DATABASE_URL unset → initdb a throwaway cluster in a temp dir (needs Homebrew/apt postgres).
# Supabase-only objects (auth schema, roles) come from scripts/test/supabase-shim.sql.
set -euo pipefail
export LC_ALL=${LC_ALL:-C}   # macOS: postgres refuses to start under an unset/odd locale
ROOT=$(cd "$(dirname "$0")/.." && pwd)
MIG="$ROOT/supabase/migrations"
SEED="$ROOT/packages/db/seed"

if [[ -z "${DATABASE_URL:-}" ]]; then
  PGDIR=$(mktemp -d)
  PORT=${PGPORT:-5499}
  initdb -D "$PGDIR/data" -U postgres --auth=trust -E UTF8 >"$PGDIR/initdb.log" 2>&1
  # TCP on localhost only: unix-socket paths under mktemp are too long on macOS.
  pg_ctl -D "$PGDIR/data" -o "-p $PORT -c listen_addresses=127.0.0.1 -c unix_socket_directories=''" -l "$PGDIR/pg.log" -w start >/dev/null \
    || { cat "$PGDIR/pg.log"; exit 1; }
  trap 'pg_ctl -D "$PGDIR/data" stop -m immediate >/dev/null 2>&1; rm -rf "$PGDIR"' EXIT
  DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/postgres"
fi

run() { psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1 "$@"; }

run -f "$ROOT/scripts/test/supabase-shim.sql"
for f in "$MIG"/*.sql; do
  echo "apply  $(basename "$f")"
  run -f "$f"
done
echo "seed   models.sql"; run -f "$SEED/models.sql"
echo "seed   seed.sql";   run -f "$SEED/seed.sql"
echo "check  check-rls.sql"; run -f "$ROOT/scripts/check-rls.sql"
echo "smoke  smoke.sql";  run -f "$ROOT/scripts/test/smoke.sql"
echo "db-test: OK"
