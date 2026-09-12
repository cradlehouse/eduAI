# eduai — stack and standing preferences

What we run, why, and the decisions already made. Update this when a decision changes;
the handoff and build spec are history, this file is current.

## Who it is for

**Pegasus Media Project (PMP)**, Dallas. 501(c)(3) founded 2012 by Niloo Jalilvand (21 years teaching at
Booker T. Washington HSPVA; launched the student-run Pegasus Film Festival there in 2015), incorporated as a
nonprofit in 2021 with filmmaker Christian Vasquez. Runs the free Media Apprenticeship Program (MAP) and the
Pegasus Film Festival, the largest youth-run film festival in the US, with outreach to women, BIPOC and
LGBTQ+ young people. The handoff's "apprentice" (student role) and "Niloo's ops person" (admin role) are
PMP. They are the design partner and the first org; the demo org becomes theirs. Minors are the norm here,
so the conservative minors path is the default, not an edge case. MAP runs ~9 months in four frames (months 1–2 Trust,
3–4 Self-Awareness, 5–8 Collaboration, 9 Entrepreneurship, then ongoing mentorship), is free to participants, supplies
cameras/lighting/audio/laptops/software, and has apprentices make both individual and group films. Address:
2904 Floyd St, Suite C, Dallas TX 75204. https://www.pegasusmediaproject.com

## The stack

| Layer | Choice | Why | Status |
|---|---|---|---|
| Database, auth, realtime, secrets | **Supabase** (Postgres 17, Auth magic-link, Realtime, Vault), **pinned to AWS us-west-2 (Oregon)** | One contract between web and orchestrator; RLS does the tenancy; Vault holds org-supplied keys. Oregon is a carbon-neutral AWS region, a verifiable claim (see RESOURCE_NEUTRALITY.md) | Live: project `eduAI`, ref `zhltmlguysknjeueabyy`, us-west-2 |
| Migrations | **Supabase CLI**, native layout `supabase/migrations`, numbered `0001…`, applied with `supabase db push` | Same convention as ercotcron; CI replays them on plain Postgres | Live, 16 applied |
| Web app | **Next.js 15.5** App Router, TypeScript, Tailwind 4, pnpm 11 | Thin UI: CRUD + Realtime, no vendor calls. Holds **no secrets**: invite acceptance and landing are user-scoped RPCs (migration 0103) | P1-03 done |
| Web hosting | **Cloudflare Workers** (static assets binding) via **OpenNext** (`@opennextjs/cloudflare`) | Cloudflare is already required (R2, Worker); no per-push deploy cost; **not Vercel**. Not Pages: Cloudflare has moved Next.js to Workers. Not vinext yet: Cloudflare's own README calls it not battle-tested and Next-16-only; revisit in Phase 4, the swap is build-tool only | **Live**: https://eduai-web.long-night-f7d0.workers.dev (Worker `eduai-web`) |
| Orchestrator | **Python 3.12, FastAPI, uv**; one web service + `generate` and `render` workers | Talks to vendors, R2 and Postgres; never renders HTML | P1-10 |
| Orchestrator hosting | **Render**, workspace `waterfallai` (really Cradle House), project `eduai`, region **Oregon**; env group `eduai` holds every orchestrator secret; workers on paid instances | Same AWS region as the database; free tier sleeps and generation must not | Project + env group created 2026-09-12; services at P1-16 |
| Object storage | **Cloudflare R2**, bucket `eduai-assets`, content-addressed keys `<org>/<sha2>/<sha256>.<ext>`. Web uploads/serves via the Worker's R2 **binding** (no keys); the orchestrator uses S3 keys on Render | Cheap egress; immutable assets | P1-10. Cloudflare account `300ea11f0166485a4c182f50ad32b524` (admin@cradle.house). **Bucket created 2026-09-12**, location wnam, lifecycle in infra/r2-lifecycle.json |
| Webhook inbox | **Cloudflare Worker** → verify signature → insert `webhook_inbox` → 200 | Vendors never point at Render; replay-safe by `(provider, dedupe_key)` | P1-11 |
| Media processing | **ffmpeg** in the render worker; **OTIO** for timelines; FCP7 XML / FCPXML / EDL writers | Export formats editors actually open | Phase 3 |
| Model vendors | **fal.ai** (Veo 3.1 Lite, LTX 2.5, Stable Audio 3); Replicate (Chatterbox, Phase 2) | Registry-driven; a vendor is a row, never code | fal at P1-10 |
| Self-hosted compute | **Crusoe Cloud** (stranded-energy + renewable GPUs) for the Phase 4 open-weight profiles | The only tier where energy is measurable; the sustainability differentiator vs CoreWeave/Lambda/RunPod | Phase 4, draft profile `ltx-2.5@crusoe` |
| Prompt gate + assistants | **Anthropic Claude** | Content-tier prompt gate first (P1-14), seven assistants later | P1-14 |
| Publishing | **Ayrshare** | One API for YouTube/TikTok/Instagram; org and personal profiles | Phase 3 |
| Errors | **Sentry**, org `cradlehouse`, projects `eduai-orchestrator` (FastAPI; errors + logs) and `eduai-web` (Next.js). `send_default_pii=False` everywhere: users are mostly minors | | Projects created 2026-09-12; SDK wiring at P1-15 |
| CI | **GitHub Actions**: generated-file sync · migrations + RLS check + smoke on `postgres:17` · web lint/typecheck · orchestrator ruff/pytest | The db job is the one that matters; the last two skip until code exists | Live, green |
| Repo | **GitHub `cradlehouse/eduAI`**, pnpm-workspace monorepo | | Live |

Not in the stack, deliberately: Vercel (see hosting), Runway and ElevenLabs (keys exist in
`.env.example` but no registry row uses them), Google Cloud direct (Veo goes through fal), any
GPU platform before the Phase 4 self-hosted LTX profile.

## Preferences and rules already decided

**Architecture**
- `apps/web` never holds a vendor key and never calls a vendor. It writes a `jobs` row; Realtime shows progress.
- `services/orchestrator` never renders HTML. It reads the queue, talks to vendors, writes R2 and Postgres.
- The database is the only shared contract. Types are generated from it on both sides.
- Internal schema `eduai` holds every helper and state-changing function and is not exposed through PostgREST.
- Job lifecycle is a versioned event log (`job_events`) plus an immutable receipt at settle (`job_receipts`).
- Webhooks are untrusted until signature-verified, deduplicated, stored and processed idempotently.
- Self-hosted inference is a separate deployment class with quotas and checksums, not another adapter.

**Data**
- Every table has `org_id not null` plus a composite FK to its parent; `orgs`, `users`, the three registry tables and `webhook_inbox` are the only exceptions and CI enforces the list.
- RLS on every table; one policy file per table, generated into `0101`; `anon` has nothing; `service_role` bypasses.
- Append-only, trigger-enforced: `ledger`, `job_events`, `job_receipts`, `assets`. Corrections are new rows with a note.
- Settle exactly once (`settled_at is null` guard); reserve/settle/release replay is a no-op; unknown vendor cost settles at the estimate and is flagged.
- Ledger sign convention: `cents` is a debit; reserve `+estimate`, settle `actual − estimate`, release `−estimate`.
- **Tokens, not money, for students and instructors.** `orgs.tokens_per_dollar` (default 1000: $1 = 1,000 tokens) is admin-only. Views `project_tokens`, `personal_tokens`, `job_tokens` are what the shells read; `*_budget_admin` views and the ledger are admin-only; the cents columns on `jobs`/`job_receipts` are hidden from non-admins by column grants (so never `select *` on those). Instructors set budgets in tokens via `set_project_budget_tokens`.
- Migrations are never edited once applied to the hosted project; fixes are new migrations. (0004 was the last in-place edit, before it had landed.)

**Model governance**
- Registry is four entities: family → version (rights, licence, weights status, approval window) → deployment profile (route, cost, retention, lanes, health) → time-bounded org allowlist with an owner and review date.
- Lanes are the product vocabulary: `explore`, `control`, `finish`, `voice_likeness`. Never "open vs commercial".
- A model is selectable only through an approved profile an org has allowlisted for that lane. A registry row alone is nothing.
- Versions and profiles used by any job are immutable except for approval/health/notes; changes are new slugs.
- Phase 1 routes: one managed visual model (Veo), one open-weight experimentation route (LTX), one SFX route (Stable Audio). Kling, FLUX.2 dev and Chatterbox stay draft.
- Every cost and endpoint in the seed is flagged `verified: false` / UNVERIFIED until checked against vendor docs.
- Resource neutrality is the fifth integrity axis: disclosure tier A/B/C per version, energy profile + resource model per deployment profile, estimate frozen into every receipt. Never a fabricated kWh for a closed model. Details in RESOURCE_NEUTRALITY.md.
- Pricing unit is generated minutes, not seats; cohort film vs individual films are both supported by project vs personal budgets. Details in PRICING.md.

**People and safety**
- Auth is magic-link only. No passwords. Invites carry role, cohort, project and project role; acceptance is one transaction.
- Four org roles (student, instructor, admin, owner). Project roles are credit labels, not permissions. No permission matrix in v1.
- Minors: content tier forced to `M`, never the voice/likeness lane, no personal social accounts, guardian signer on releases.
- Consent is specific: subject, rights holder, source asset, permitted lanes, distribution scope, expiry. Revocation blocks new generation immediately; existing receipts keep the basis that applied at the time.
- Students never publish. Release is the instructor's screen with six checks.
- Shot intent (objective, continuity, camera language, bible assets) is required before Generate.

**Ways of working**
- Working name is **eduai**. "reel" was rejected: domains taken and an existing ReelAI app.
- Supabase-native layout, like ercotcron. Seeds run with `supabase db push --include-seed`.
- Local verification is `pnpm check` (generated files in sync + full db-test on a throwaway Postgres). Runs without Docker.
- Commits use `admin@cradle.house`. **A push is never a deploy**: CI lints, typechecks and builds the web app but does not deploy; deploys are explicit `pnpm --filter web cf:deploy`.
- Auth: magic link via `signInWithOtp`; callback handles both PKCE `?code=` and `?token_hash=`; `?next=` is sanitised to a same-site path. Middleware refreshes the session with `getUser()` (server-validated), never `getSession()`.
- Supabase auth settings (site URL, redirect allowlist) are declared in `supabase/config.toml` and pushed with `supabase config push`.
- Placeholders are labelled as such (`adapter_tested_at`, UNVERIFIED notes) rather than left looking real.

## Design tokens (from the handoff)

`ink #1B1F3B` · `paper #FBF9F4` · `accent #E0A030` · `money #2E8B57` · `integrity #3F7CAC` · `danger #C4453C`.
16px base. Light default; dark via `prefers-color-scheme` on the same tokens. Money is always the same colour;
integrity is never colour-only.

## Environment

All orchestrator secrets live in the Render env group `eduai` (project eduai → Production). Nothing secret is in the repo.

| Variable | Lives on | Used by |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | committed in `apps/web/.env.production` + `wrangler.jsonc` vars (public) | web (browser + server) |
| `SUPABASE_SERVICE_ROLE_KEY` | Render only | orchestrator. The web tier never has it |
| `ORCHESTRATOR_URL` | Worker var | `/assist/*` proxy only |
| `DATABASE_URL` (Supavisor pooled, 6543) | Render | orchestrator |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Render | orchestrator |
| `FAL_KEY`, `REPLICATE_API_TOKEN`, `ANTHROPIC_API_KEY`, `AYRSHARE_API_KEY` | Render | orchestrator |
| `WEBHOOK_SIGNING_SECRETS` (JSON) | Cloudflare Worker secret + Render | inbox verification |
| `SENTRY_DSN` | Render | orchestrator |
| `SENTRY_DSN_WEB` | Render env group (parked) → `wrangler secret put SENTRY_DSN` at P1-15 | web |
| `JOB_KINDS` | Render, per worker | `generate` or `render` |
| Org-supplied vendor keys | Supabase Vault only | orchestrator, via `org_credentials.secret_ref` |

## Phases

1. Shot → generate → take with receipt, budget visible, no double charge (P1-01…16; 01–02 done).
2. Compare as the assessable artefact, stronger consent linkage, one controlled voice workflow.
3. Timeline, export, release approvals, controlled publication.
4. Registry expansion (self-hosted LTX), curriculum evidence, billing, org-supplied credentials.
