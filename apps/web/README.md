# apps/web

Next.js 15 (App Router) on Cloudflare Workers via OpenNext. Live: https://eduai-web.long-night-f7d0.workers.dev

Rules: never holds a vendor key, never calls a vendor, never holds the service-role key. Uploads go to R2
through the Worker's bucket binding (no credentials), content-addressed by sha256, and the `assets` row is
inserted as the user under RLS (`lib/assets/store.ts`). It writes rows
as the signed-in user (RLS) and calls three user-scoped RPCs from migration 0103:
`invite_preview(token)` (anon ok), `accept_invite(token)`, `my_landing()`.

| Route | What |
|---|---|
| `/` | `my_landing()`: cohort, `/home`, or `/welcome` |
| `/login`, `/auth/callback`, `/invite/[token]`, `/welcome` | auth and invite acceptance |
| `/home` | hub: cohorts you can reach; Organisation card for admins |
| `/org`, `/org/people`, `/org/cohorts` | organisation scope (admins) |
| `/c/[cohortId]` | cohort Home: this week, team, my projects / all projects, open for sign-up / needs attention |
| `/c/[cohortId]/team` | roster: person, project, roles; instructors get status, assign, roles, CSV |
| `/c/[cohortId]/projects` | posted projects; students sign up with roles; instructors post, edit, approve |
| `/c/[cohortId]/schedule` | module dates, on/off, Open now (instructors) |
| `/p/[projectId]/brief` | the module brief (pre-production) |
| `/p/[projectId]/bible`, `/bible/[entryId]` | bible + consent (pre-production) |
| `/p/[projectId]/scenes` | storyboard as e-conte (pre-production) |
| `/p/[projectId]/shoot` | production: cuts with per-layer take counts, recent generations |
| `/p/[projectId]/shots/[shotId]` | the cut console |
| `/p/[projectId]/members` | crew and roles (self-edit; instructors edit anyone) |
| `/api/assets/[id]` | streams an asset from R2 after the RLS check |

Navigation: one `Shell` (global header with breadcrumb scope switcher + scope sidebar). See docs/NAVIGATION.md.
