# services/orchestrator

Python 3.12 · FastAPI · uv. Reads the job queue, talks to vendors, writes R2 and Postgres. Never renders HTML.

## Run

```bash
cd services/orchestrator
cp ../../.env.example .env      # fill DATABASE_URL, R2_*, FAL_KEY, JOB_KINDS=generate
uv sync
uv run uvicorn orchestrator.main:app --reload --port 8001
```

`GET /health` → `{ok, db, kinds, worker, dispatcher, queue: {queued, submitted, …}}`. With `JOB_KINDS`
empty the API runs without a dispatcher (useful for a read-only replica). Without R2 keys outputs go to
an in-memory store (local only).

## What one job does (`dispatcher.py`)

| step | database call | on failure |
|---|---|---|
| claim | `eduai.claim_job` (org-fair, SKIP LOCKED) | — |
| validate `inputs` against `model_versions.input_schema` | — | `release_job(rejected)` |
| gate | `eduai.model_allowed(org, profile, lane, requester)` | `release_job(rejected)` |
| price | `eduai.estimate_cents` (the single evaluator; Python never prices) | `release_job(failed)` |
| reserve | `eduai.reserve_job` | `release_job(rejected)` "not enough budget" |
| credential | `org_credentials` → Vault, or the platform key, per `credential_policy` | `release_job(failed)` |
| resolve `asset-ref` inputs → presigned R2 URLs; map fields via `deployment_profiles.adapter` | | |
| submit | `mark_submitted` + event `accepted` {status_url, response_url} | `release_job(failed)` |
| poll (`status`) or webhook inbox | `mark_running` | `release_job(failed)`; transient errors retry next tick |
| complete: download → sha256 → R2 `<org>/<sha2>/<sha>.<ext>` | events `output_received`, `stored`, `policy_approved` | `release_job(failed)` |
| settle | **one transaction**: `assets` (hash-chained) + `takes` (one per file, `layer` from the job) + `eduai.settle_job(receipt)` | rolled back together |
| expire | `release_job(timed_out)` after `SUBMIT_TIMEOUT_MIN` | |

The receipt carries `output_hashes`, `provenance` (provider, endpoint, request id, version, profile, vendor
inputs), `policy_decisions` (`prompt_gate: not_run` until P1-14) and `resource_estimate` from the profile's
`resource_model` (`{}` when undisclosed; the settle function appends the disclosure tier).

fal returns no per-request cost, so fal jobs settle at the estimate with `cost_unknown = true`.

## Registry-driven adapters

`deployment_profiles.adapter` (migration 0110, seeded from `packages/db/seed/profiles/*.json`) maps our
input schema onto the vendor's request and names the response keys that hold files:

```json
{"input_map": {"duration_s": {"to": "duration", "suffix": "s"}, "image": "image_url", "camera_motion": null},
 "fixed": {"generate_audio": false}, "outputs": ["video"], "verified": false}
```

A new fal route is a CSV row + JSON file. The field names shipped today are **UNVERIFIED** against fal's
docs; the adapter test at deploy (`adapter_tested_at`) is where they get corrected, and the registry
guard allows that edit on a profile jobs already reference.

## Tests

```bash
uv run ruff check . && uv run pytest -q          # unit: mapping, estimate, fal client (respx)
../../scripts/orchestrator-test.sh               # + integration: throwaway Postgres, migrations, seeds, fixture
```

The integration suite drives the real state machine with a fake fal and asserts the take, receipt,
ledger rows (`reserve +20`, `settle 0`), the event order, rejection without charge, release on vendor
failure, and timeout.

## Deploy

`infra/render.yaml` (Render blueprint, env group `eduai`). Not deployed yet — see the root README.
