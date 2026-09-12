# infra — placeholder

- `render.yaml` (orchestrator web + 2 workers) — P1-16
- `cloudflare/webhook-inbox/` (Worker: verify signature → insert into `webhook_inbox` → 200) — P1-11
- `r2-lifecycle.json` — applied to bucket `eduai-assets` (created 2026-09-12, location wnam): abort incomplete multipart uploads after 1 day; expire `tmp/` after 7 days. Content-addressed assets under `<org>/…` are never expired here; retention is enforced by the orchestrator per deployment profile. Re-apply with `wrangler r2 bucket lifecycle set eduai-assets --file infra/r2-lifecycle.json --force`.
