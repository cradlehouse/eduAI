# apps/web

Next.js 15 (App Router) on Cloudflare Workers via OpenNext. Live: https://eduai-web.long-night-f7d0.workers.dev

Rules: never holds a vendor key, never calls a vendor, never holds the service-role key. It writes rows
as the signed-in user (RLS) and calls three user-scoped RPCs from migration 0103:
`invite_preview(token)` (anon ok), `accept_invite(token)`, `my_landing()`.

| Route | What |
|---|---|
| `/` | redirect by role via `my_landing()` |
| `/login` | magic-link form (`signInWithOtp`) |
| `/auth/callback` | exchanges `?code=` (PKCE) or `?token_hash=`; redirects to sanitised `?next=` |
| `/invite/[token]` | preview → sign in with the invited email → accept (one transaction) → land |
| `/welcome` | signed in, no cohort/project yet |
| `/p/[projectId]`, `/c/[cohortId]`, `/org` | stubs; the real shells are P1-05 / Phase 2 / P1-04 |

`pnpm dev` for Next dev, `pnpm cf:preview` to run the Worker bundle in workerd, `pnpm cf:deploy` to ship.
Types: `pnpm db:types` at the repo root after any migration.
