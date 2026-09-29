# Imaje (eduai)

AI film-making platform for schools. First organisation: Pegasus Media Project (Niloo Jalilvand). Students
are often minors: never upload real student faces or voices without a signed guardian release.

## Where things are
- `apps/web` — Next.js 15 (App Router) on Cloudflare Workers via OpenNext. Live: https://eduai-web.long-night-f7d0.workers.dev
- `services/orchestrator` — Python/FastAPI job worker on Render (auto-deploys on push to main): runs generations via fal, voice splits, exports.
- `supabase/migrations` — Postgres schema (Supabase project `zhltmlguysknjeueabyy`). `packages/db/migrations` is a symlink to it: always `git add supabase/migrations/<file>`.
- `packages/db/seed` — model registry: models.csv, model_versions.csv, deployment_profiles.csv, schemas/*.json, profiles/*.json.
- `docs/PRODUCTION_FLOW.md` — how the product works (read this first). `docs/STATUS.md` — what's done, what's open.
- `docs/BUSINESS.md` — customers, pricing, unit costs, hosting economics, licences, risks. `docs/STACK.md` — every layer and the standing rules. `docs/DESIGN.md` — tokens, layout, screens as built.
- `docs/research/` — model, continuity, dialogue and self-hosting research. `docs/design/` — mockups.
- `scripts/spike/` — paid model tests; they ask for a fal key (hidden). Keys pasted into chat can't be used.

## Commands
- Web: `pnpm -C apps/web tsc --noEmit -p .` · `pnpm -C apps/web lint` · `pnpm -C apps/web test:script` · deploy `pnpm -C apps/web cf:deploy` (retry once if it fails with SQLITE_BUSY)
- Orchestrator: `cd services/orchestrator && uv run pytest -q && uv run ruff check orchestrator tests`
- DB: `supabase db push --linked` (migrations) · `supabase db query --linked "<sql>"` · types: `supabase gen types typescript --linked > apps/web/lib/db/types.ts`
- Registry: edit the CSV/JSON, then `pnpm seed:build` and `supabase db query --linked -f packages/db/seed/models.sql`; allowlist new profiles per org (`org_model_profiles`); update the counts in `scripts/test/smoke.sql`.

## Rules that bit us
- `public.job_tokens` must stay an owner view (`security_invoker = false`).
- Composite keys `(org_id, x)` with ON DELETE SET NULL must name the column: `SET NULL (x)` (0127).
- "use server" files may only export async functions.
- CSV registry fields can't contain commas.
- Indoor shots: never write weather words into prompts (the models rain indoors).

## Product decisions (agreed with Tim)
- One screen, one job: Script → Cast → Locations → Props → Scene → Shot (Camera, Frame, Clip) → Edit.
- The script is the master copy: anything added anywhere is written into it (with undo on the Script page).
- One video engine per film (LTX 2.5). Open-weight models everywhere except Claude (script breakdown,
  shot planning, prompt safety), so everything else can move to our own GPUs.
- Talking shots: LTX performs the lines → split per speaker → Chatterbox to each character's Cast voice →
  one track per character. Room tone is made once per location.
- Research is exploratory: present options, don't announce decisions Tim hasn't made.
