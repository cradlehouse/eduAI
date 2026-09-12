# packages/db

The database is the only shared contract between `apps/web` and `services/orchestrator`.

## Conventions

- **`org_id` on every table**, `not null`, plus a composite FK `(org_id, parent_id) → parent (org_id, id)`
  so a child can never carry a different org than its parent. Policies trust `org_id` because of this.
  Documented exceptions (enforced in `scripts/check-rls.sql`): `orgs`, `users` (global identity),
  `models` / `model_versions` / `deployment_profiles` (global registry), `webhook_inbox` (org unknown
  until the job is looked up).
- **RLS on every table**; `0100` loops over `public` so nothing is missed. `anon` has no policies anywhere.
  `service_role` bypasses RLS and is what the orchestrator, invite acceptance and seeds use.
- **Schema `eduai`** holds every helper and every state-changing function. It is not in PostgREST's
  exposed schemas, so none of it is callable from the browser.
- **Views** are `security_invoker = true` so RLS applies through them.
- `updated_at` maintained by trigger; `id uuid default gen_random_uuid()`; enums for closed sets.
- **Append-only** (trigger-enforced): `ledger`, `job_events`, `job_receipts`, `assets`.

## Registry

`models` (family) → `model_versions` (exact release: weights status, licence family/version/URL,
commercial eligibility, training-data disclosure, output rights, self-hostable, voice/likeness risk,
release eligibility, approval owner + window, input schema, safety pipeline) → `deployment_profiles`
(managed API or self-hosted: provider, endpoint, region, credential policy, lanes, cost model,
retention, quota, health, adapter test date, approval window, `adapter` request/response mapping — 0110) → `org_model_profiles` (per-org
allowlist: lanes, start/end, budget cap, release allowed, instructor gate, approver, review date).

Lanes are the UX vocabulary: `explore`, `control`, `finish`, `voice_likeness`. A profile declares
which lanes it serves; an org allowlists a subset; a job carries one. `eduai.model_allowed` walks
that chain and returns a reason string the UI shows on a locked tile.

Jobs pin `model_version_id` + `deployment_profile_id`. `eduai.registry_guard` refuses non-operational
edits to either once a job references it (operational = approval status/owner/dates, notes, enabled,
health, adapter test date, quota).

## Functions the orchestrator calls (schema `eduai`)

| function | what |
|---|---|
| `claim_job(kinds[], worker) → jobs` | org-fair claim: fewest in-flight org first, then priority/oldest; `SKIP LOCKED` |
| `model_allowed(org, profile, lane, user) → (allowed, reason)` | profile approved + in window + not down · lane served · version approved · org allowlist active for lane · content tier · minors never voice/likeness |
| `shot_ready(shot, lane) → (ready, missing[])` | intent fields (objective, continuity, camera_language), bible assets declared, consent valid for the lane |
| `shot_consent_basis(shot, lane) → jsonb` | the releases that permit each linked entry right now; frozen into the receipt at settle |
| `job_event(job, event, payload, actor)` | append to the versioned lifecycle log (accepted, output_received, stored, policy_approved, …) |
| `reserve_job(job, estimated_cents) → bool` | debit the envelope (project budget if it exists, else personal); idempotent |
| `mark_submitted(job, provider_request_id)` / `mark_running(job)` | status transitions |
| `settle_job(job, actual_cents, receipt) → bool` | exactly once; ledger row = actual − estimated; `null` cost ⇒ charge estimate + `cost_unknown`; writes the immutable `job_receipts` row (version, profile, lane, inputs, consent basis, policy decisions, hashes, provenance) |
| `release_job(job, status, error) → bool` | failed/rejected/cancelled/timed_out; gives the reservation back; no-op on terminal jobs |
| `claim_inbox(limit) → setof webhook_inbox` | drain unprocessed deliveries, locked |
| `accept_invite(token, user) → memberships` | membership + enrolment/instructor + project member, one tx |
| `shot_consent_ok(shot) → bool` | every consent-bearing bible entry on the shot is signed |

The web app inserts `jobs` with only `project_id, shot_id, deployment_profile_id, lane, inputs`; a
trigger derives `org_id, cohort_id, provider, model_version_id, requested_by` before RLS checks the
row, and logs the `queued` event. Every status function logs its event, so `job_events` is the full
lifecycle: queued → claimed → submitted → accepted → running → output_received → stored →
policy_approved → settled (or failed / policy_rejected / timed_out / cancelled, plus unknown_cost).

## Ledger

`cents` is a debit. `reserve = +estimate`, `settle = actual − estimate`, `release = −estimate`,
`refund` / `adjust` = later corrections, note required. `spent = Σ(everything but grant)`. Rows are
never updated or deleted.
`unique (job_id, kind)` makes a replayed settle or release a no-op. Views: `project_budget_status`,
`personal_budget_status` (`total`, `spent`, `remaining`, `reserved_open`).

## Roles → what the policies allow

| | student | instructor (assigned cohorts) | admin | owner |
|---|---|---|---|---|
| projects they're a member of | read/write | read/write, all cohort projects | all in org | all |
| jobs | insert own, cancel while queued | see cohort | see org | |
| budgets, members, review, publish | see | manage | manage | |
| invites, credentials, org models, courses | — | — | manage | manage |
| grant `admin` role | — | — | — | yes |
| `owner` | one per org (partial unique index), set out of band | | | |

Minors (`memberships.is_minor`): effective content tier is always `M`; never the `voice_likeness`
lane or a high-likeness-risk version; personal social accounts blocked by both policy and trigger.

## Consent

`consent_releases` is specific: subject, rights holder (guardian when `is_guardian`), source asset,
`permitted_lanes`, `permitted_uses`, `distribution` scope, `expires_at`, state. `bible_consent_state
(entry, lane)` resolves to not_required / revoked / signed / expired / lane_not_permitted / pending /
missing. Revocation blocks new generation immediately; existing receipts keep the basis that applied
when they were generated.

## Testing

`scripts/db-test.sh` applies `scripts/test/supabase-shim.sql` (roles, `auth.users`, `auth.uid()`),
then every migration, both seeds, `check-rls.sql`, and `scripts/test/smoke.sql`, which asserts:
invite acceptance, composite-FK org spoof rejection, `model_allowed` across eight cases, shot
readiness and lane-aware consent, org-fair claim order, the event log, registry immutability,
reserve/settle/release idempotency, unknown-cost settlement, receipts, append-only enforcement,
webhook dedupe + drain, RLS as an outsider / student / instructor, and revocation semantics. It runs
in a transaction and rolls back.
