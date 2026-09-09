# apps/web — placeholder

Next.js 15 (App Router) lives here from ticket P1-03 onward. Nothing is scaffolded yet on purpose:
P1-01/P1-02 stop at the repo, CI and the database.

Rules (from the handoff): this app never holds a vendor API key and never calls a vendor.
It writes a `jobs` row; Realtime shows progress. Types come from `pnpm db:types`.
