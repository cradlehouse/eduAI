# Navigation

Derived from a research pass (2026-09-12) over NN/g guidance (IA vs navigation, local vs global nav,
breadcrumbs, duplicate links, universal navigation), design systems (Carbon UI Shell, Shopify app nav,
Atlassian navigation system, GOV.UK breadcrumbs) and the navigation of Canvas LMS, Google Classroom,
GitHub, Vercel, Stripe, Linear, Frame.io V4, Notion and Slack. Full brief with sources:
`docs/NAVIGATION_RESEARCH.md`.

## What the exemplars agree on

1. **No role switcher.** Menus are additive: Canvas adds an "Admin" link, GitHub an org "Settings" tab,
   Classroom a "Grades" tab. Nobody swaps the chrome by role. A user with several roles simply sees more.
2. **Header = global and fixed; sidebar = the sections of the current scope.** Carbon: the left panel is
   secondary navigation and never carries three tiers. Vercel: the scope lives in the header; sidebar labels
   stay put. So our four-level tree (org → cohort → project → tools) is never rendered as one sidebar.
3. **The breadcrumb is the scope switcher.** Each segment is a dropdown of its siblings (Vercel's scope
   selector; NN/g "single canonical pathway"). The way back up sits top-left, next to the logo.
4. **Hub and spoke for choosing containers.** Courses → course, Classes → class, workspace → project.
   Cohorts and projects are chosen on a page, never in the sidebar.
5. **Entering someone else's work is navigation, not a mode.** Classroom: class → People → student → work.
   The instructor lands in the same project UI as the student, with more affordances. Canvas-style
   "Student View" (bordered, escapable, logged) is a separate, later feature for verifying the student
   experience, never a global toggle.
6. **No duplicate links.** A project reachable from three sidebar entries is the anti-pattern we had.

## The IA

```
GLOBAL HEADER (every page, fixed)
  [eduai]  Demo Film School ▾ › Autumn 2026 ▾ › SC/Warehouse ▾ › Storyboard        [avatar ▾: profile · sign out]
           └ org segment only when the user belongs to >1 org; each ▾ lists siblings the user can reach

SIDEBAR = sections of the current scope only (two tiers max, Settings last, instructor-only items marked)
  Home        (no scope)   Home  ·  Organisation (admin)
  Org         (admin)      Overview · Cohorts · People · Courses · Models · Credentials · Settings
  Cohort                   COHORT: Home · Team · Projects · [instructor: Schedule · Review queue · Budgets · Release · Settings]
                           MY PROJECTS: the projects I am on, by name with my roles
  Project                  ‹ cohort · PRE-PRODUCTION: Brief · Bible · Storyboard · PRODUCTION: Shoot · POST-PRODUCTION: Edit · Deliver
                           PROJECT: Members · [instructor: Settings] · token ring
                           (same list for every role; instructor-only items carry a marker)

THE COHORT IS THE STUDENT'S HOME
  sign in → cohort Home (this week, team, my projects, what's open for sign-up) → Team (everyone, their
  projects and roles) → Projects (posted by the instructor; sign up with one or more roles; approval optional)
  → the project, in three phases. Roles come from an org-editable list and a member may hold several.

/home (hub) exists for people who can reach more than one cohort: their cohorts as cards, Organisation card for admins.

LANDING (public.my_landing)
  instructor/admin with exactly one cohort → that cohort; with several → /home;
  apprentice → their cohort; nobody → /welcome

ENTERING A STUDENT'S PROJECT AND RETURNING
  Cohort › Projects (or Students › name) → open → identical project UI.
  Header reads Org › Cohort › Project; the Project ▾ lists the cohort's other projects, the Cohort segment is the way back.
  No banner: the instructor is acting as themselves with their own permissions; the breadcrumb and avatar say who and where.
```

## Rules for adding screens

- A new screen goes into exactly one scope's sidebar list above. It never appears in two.
- Nothing in the sidebar opens a different scope. Scope changes happen in the header breadcrumb or on hub pages.
- Every page renders the header breadcrumb: `Org › Cohort › Project › Section`, last segment unlinked.

## Scenes as the working surface (2026-09-13)

Decision: option C (Flow-style filmstrip + inspector) with option B's dock (LTX-style prompt bar).
The Scenes page (sidebar: Scenes; the drawn board is the e-conte view) is where students generate: a filmstrip of cuts per scene, the selected cut large
with its takes for the chosen layer (choose a plate / a merged take, kill), and the dock under it — the
prompt box whose meaning follows the layer (picture, line to voice, sound), then lane, route (with the
"cost before you commit" list), the route's inputs as chips, and Generate carrying the token cost.
The right-hand inspector holds the e-conte notes, the bible links with consent state, and the
generation log with vendor errors. The e-conte column survives as the list view. The old per-cut console
route redirects here. The sidebar collapses to an icon rail (remembered per browser) so the strip gets
the width.

## Menu audit (2026-09-13) — the kill rule

Every menu row must answer: important, for what, where does it lead, does it add value. If not, kill.

Applied:
- **Brief** killed (the week's brief is on the cohort home). **Shoot** killed (same cuts and counts as the
  Scenes filmstrip). Both routes forward to Scenes. `module` and `shots/[id]` forward too.
- **Every "soon" row** killed from the sidebars (Edit, Deliver, Settings, Review queue, Budgets, Release,
  Courses, Models, Credentials). A row a student can click and get nothing is noise; the roadmap lives here.
- **Phase headings** dropped while each would hold one item. The project menu is flat: Scenes, Bible,
  Members. Pre/Production/Post return as groups when Edit and Deliver exist.
- Marks on rows are role marks only (`instructor`, `admin`) and appear only on rows that role alone sees.

Menus today:
- Home: Home · Organisation (admin)
- Organisation: Overview · Cohorts · People
- Cohort: Home · Team · Projects · Schedule (instructor) · My projects
- Project: ‹ cohort · Scenes · Bible · Members
- Account: Account · Home

Roadmap rows (not in menus): project Settings; cohort Review queue, Budgets, Release; org Courses,
Models, Credentials, Settings; project Edit, Deliver (Post-production).

## One tree (2026-09-13, after the review)

The four swapping sidebars are gone. There is one tree on the left, and it opens along the path you are
on: organisation rows (admins), every cohort you can reach, the current cohort's pages (Team, Projects,
Schedule) and its projects, and under the current project its pages (Scenes, Bible, Members). Clicking
deeper never replaces the menu; it opens the row underneath. The breadcrumb in the header remains the
scope switcher. Below the `lg` breakpoint the same tree is an icon rail; there is no manual collapse.
Layouts only declare their scope (`{cohortId, projectId}`); the tree is built once from `getNav()`.

Refinement the same day: the tree stops at **Projects**. Opening a project drops the tree to an icon
rail and slides out a second panel (`ProjectPanel`) listing the cohort's projects, the current one open
with Scenes · Bible · Members beneath, the project's token meter on top, and "All projects" back to the
cohort's list. The rail is CSS (`.rail`) so it is icons-only at every width while the panel is open.
