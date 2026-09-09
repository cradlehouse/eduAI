# services/orchestrator — placeholder

Python 3.12 / FastAPI / uv, from ticket P1-10 onward. Nothing is scaffolded yet on purpose.

The database functions it will call are already in place (schema `eduai`):
`claim_job`, `mark_submitted`, `reserve_job`, `settle_job`, `release_job`, `claim_inbox`, `model_allowed`.
See packages/db/README.md.
