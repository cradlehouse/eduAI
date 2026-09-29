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
| `/login`, `/login/reset`, `/auth/callback`, `/invite/[token]`, `/welcome` | sign-in (password / Google / link), reset, invite acceptance |
| `/account` | display name; set or change password |
| `/home` | hub: cohorts you can reach; Organisation card for admins |
| `/org`, `/org/people`, `/org/cohorts` | organisation scope (admins) |
| `/c/[cohortId]` | cohort Home: this week, team, my projects / all projects, open for sign-up / needs attention |
| `/c/[cohortId]/team` | roster: person, project, roles; instructors get status, assign, roles, CSV |
| `/c/[cohortId]/projects` | posted projects; students sign up with roles; instructors post, edit, approve |
| `/c/[cohortId]/schedule` | module dates, on/off, Open now (instructors) |
| `/p/[id]` | Script: settings (shape, look, engine), editor, Break it down, changes from other pages with undo |
| `/p/[id]/cast/[entry]`, `/locations/[entry]`, `/props/[entry]` | one element at a time; `?tab=` look · turnaround · voice / look · angle · time · room |
| `/p/[id]/scenes` | scenes in script order |
| `/p/[id]/scenes/[scene]` | Scene: asset drawer, Where/Who/Props, lines, new character, Plan the shots |
| `/p/[id]/scenes/[scene]/shots/[shot]` | Shot: `?tab=` camera · frame · clip |
| `/p/[id]/edit` | Edit: tracks per character, room, levels, export |
| `/p/[id]/members` | crew and roles |
| `/p/[id]/bible/[entry]` | older entry page, kept for releases and consent; `/places`, `/shots/[id]`, `/shoot` redirect |
| `/api/assets/[id]` | streams an asset from R2 after the RLS check |

Navigation: one `Shell` (global header with breadcrumb scope switcher + scope sidebar). See docs/NAVIGATION.md.
