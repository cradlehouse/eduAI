# apps/web

Next.js 15 (App Router) on Cloudflare Workers via OpenNext. Live: https://eduai-web.long-night-f7d0.workers.dev

Rules: never holds a vendor key, never calls a vendor, never holds the service-role key. Uploads go to R2
through the Worker's bucket binding (no credentials), content-addressed by sha256, and the `assets` row is
inserted as the user under RLS (`lib/assets/store.ts`). It writes rows
as the signed-in user (RLS) and calls three user-scoped RPCs from migration 0103:
`invite_preview(token)` (anon ok), `accept_invite(token)`, `my_landing()`.

| Route | What |
|---|---|
| `/` | redirect by role via `my_landing()` |
| `/login` | magic-link form (`signInWithOtp`) |
| `/auth/callback` | exchanges `?code=` (PKCE) or `?token_hash=`; redirects to sanitised `?next=` |
| `/invite/[token]` | preview → sign in with the invited email → accept (one transaction) → land |
| `/welcome` | signed in, no cohort/project yet |
| `/org` | admin overview (counts) inside the admin rail |
| `/org/people` | paste emails → invites (link to copy each; Resend later); revoke; member roles, minor flag, remove |
| `/p/[projectId]` | student shell: rail (project switcher, nav, budget ring from the budget views, me), dashboard (this week, crew, budget, recent jobs); instructors get a “viewing as instructor” banner |
| `/p/[projectId]/module` | the cohort schedule with derived state per module (open / upcoming / locked + why / closed) and the brief |
| `/p/[projectId]/bible` | entries by kind with consent state first on every card; add entry |
| `/p/[projectId]/bible/[entryId]` | edit, reference image upload, per-lane consent state, releases (subject, rights holder, guardian/minor, lanes, distribution, expiry, signed document ⇒ signed), revoke (instructor/admin) |
| `/api/assets/[id]` | streams an asset from R2 via the Worker binding after the RLS check on the assets row |
| `/p/[projectId]/scenes` | scenes with inline edit; ShotCard grid per scene (intent status, bible count, takes); add shot |
| `/p/[projectId]/shots/[shotId]` | shot intent (objective, continuity, camera language, duration, no-bible flag), bible links with consent chips, per-lane readiness via `shot_ready_for` (migration 0106). The generation console lands here at P1-08/09 |
| `/c/[cohortId]` | stub; instructor shell is Phase 2 |

`pnpm dev` for Next dev, `pnpm cf:preview` to run the Worker bundle in workerd, `pnpm cf:deploy` to ship.
Types: `pnpm db:types` at the repo root after any migration.
