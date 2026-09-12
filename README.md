# eduai

Working name for the AI film platform. Trimmed from `ai-film-platform-code-handoff.md`; the spec
(`ai-film-platform-build-spec.md`) is the *why*, the handoff is the *how*, this file is *what exists*.

## What exists (P1-01, P1-02)

```
eduai/
├── apps/web/                 Next.js 15 on Cloudflare Workers (OpenNext): login, /auth/callback, /invite/[token], role landing, shell stubs
├── services/orchestrator/    FastAPI + dispatcher (P1-10): claim → gate → reserve → fal → R2 → settle
├── packages/db/
│   ├── migrations/           → ../../supabase/migrations (0001–0014 schema, 0100 RLS enable, 0101 policies, generated)
│   ├── policies/             one RLS file per table → 0101
│   └── seed/                 registry: models.csv · model_versions.csv + schemas/ · deployment_profiles.csv + profiles/
│                             → models.sql (generated); seed.sql = demo org
├── infra/                    placeholder — render.yaml, Cloudflare webhook inbox, R2 lifecycle
├── scripts/                  build-policies.sh · build-models-seed.mjs · check-rls.sql · db-test.sh · test/
├── supabase/                 config.toml + migrations/ (native layout; packages/db/migrations symlinks here)
└── .github/workflows/ci.yml  generated-files check · migrations+RLS+smoke on postgres:17 · web lint+typecheck+build · orchestrator ruff+pytest
```

## Run it

```bash
pnpm check            # policies in sync + seed in sync + full db-test on a throwaway Postgres
pnpm db:test          # just the database: shim → migrations → seed → check-rls → smoke
```
`db-test` needs `initdb`/`pg_ctl`/`psql` on PATH (Homebrew `postgresql@16` or newer). With `DATABASE_URL`
set it uses that database instead (must be empty) — that is what CI does.

With the Supabase CLI + Docker:
```bash
npx supabase start && npx supabase db reset      # applies migrations + both seeds
npx supabase gen types typescript --local > apps/web/lib/db/types.ts
```

## Editing the schema

- **New table** → new numbered migration, `org_id uuid not null` + composite FK to its parent
  (`foreign key (org_id, parent_id) references parent (org_id, id)`), then a policy file in
  `packages/db/policies/<table>.sql`, then `pnpm policies:build`. `check-rls.sql` fails CI otherwise.
- **New model** → three rows, not one: a family in `models.csv`, a version in `model_versions.csv`
  (+ `schemas/<version>.json` for its input schema) and a route in `deployment_profiles.csv`
  (+ `profiles/<version>@<route>.json` for cost + retention), then `pnpm seed:build`. A version or
  profile is selectable only when `approval_status = approved`, inside its approval window, AND an org
  has allowlisted it for a lane in `org_model_profiles`. Nothing in code names a model.
- **Changing a used version/profile** — anything except approval/health/notes — is refused by a
  trigger once a job references it. Make a new slug instead; old jobs keep their receipt.
- **Never edit** `0101_rls_policies.sql` or `seed/models.sql` by hand; both are generated and CI diffs them.

Details: [packages/db/README.md](packages/db/README.md).

## Demo data

`seed.sql` creates org `demo` (Demo Film School), a six-module course, cohort *Autumn 2026*, project
*SC/Warehouse* with a $600 budget, and three invites. The registry holds six families but only the
three Phase 1 routes are approved and allowlisted (time-bounded to 31 Dec 2026, review 15 Nov):

| profile | lanes | role |
|---|---|---|
| `veo-3.1-lite@fal` | finish | the managed visual model; instructor-gated for release |
| `ltx-2.5@fal` | explore, control | open-weight experimentation route (managed API now, self-hosted profile is Phase 4) |
| `stable-audio-3@fal` | explore | SFX route |

`kling-3@fal`, `flux-2-dev@fal` (non-commercial licence) and `chatterbox-1@replicate` (voice, Phase 2)
are `draft`: visible in the registry, never selectable.

| token | email | becomes |
|---|---|---|
| `demo-instructor-token` | demo-instructor@example.com | instructor on the cohort |
| `demo-student-1-token`  | demo-student-1@example.com  | student, director on Warehouse |
| `demo-student-2-token`  | demo-student-2@example.com  | student, DP on Warehouse |

No auth users are seeded. Sign in by magic link with one of those addresses, then `/invite/[token]`
(P1-03) calls `eduai.accept_invite(token, user_id)` under the service role.

## Web app

```bash
pnpm --filter web dev          # local Next dev on :3000 (copy apps/web/.env.example → .env.local)
pnpm --filter web cf:preview   # run the real Worker bundle locally in workerd
pnpm --filter web cf:deploy    # build + deploy to https://eduai-web.long-night-f7d0.workers.dev
```
Deploys are explicit; CI never deploys.

## Known issues

- Production (Workers) logs React #418 (hydration mismatch) once per signed-in page load; local `next dev` does not. Server/client text and tags match apart from the RSC script payload, and React recovers client-side, so it is cosmetic for now. Reproduce under workerd (`pnpm --filter web cf:preview`) and diff before changing anything.

## Not done here, on purpose

P1-12 onward. The orchestrator (P1-10) and the webhook inbox Worker (P1-11, live) are built and tested; the orchestrator is not yet deployed on Render, so hosted jobs queue until it is. Sign-in is password / Google (when configured) / emailed link; invite emails are not sent yet (links are copied from /org/people); Resend is on the platform list. Endpoints, cents and licence links in the registry CSVs are marked
**UNVERIFIED** in their notes; confirm against vendor docs before P1-10. `adapter_tested_at` on the
three approved profiles is a placeholder date — the approval check requires it, and P1-10 should
overwrite it with the real test run.
