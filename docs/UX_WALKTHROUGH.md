# Project UI walkthrough — 26 Sep 2026

Driven as the student account (qa-student) on the live site, from sign-in to the Scene workspace,
after Tim reported the project UI "clunky as hell and unusable". Findings first, then the shape of
the fix. Companion research: `docs/research/operational-flow-2026-09.md` (how LTX Studio, Martini
and Flow sequence the work).

## What a student meets, in order

1. **Sign in → cohort home.** "This week: Module 1 · Bible & consent · Read the brief", team, my
   projects, open projects. No statement of what the film is or what to do first. "Read the brief"
   is the removed Brief page.
2. **Open the project → lands straight in Scenes.** `/p/<id>` redirects to the Scene workspace. There is
   no project home: no logline, no script, no "where you are", no next step. The first thing on screen
   is a cut from two weeks ago with a prompt containing "beep beep beep".
3. **Left side.** Icon rail, then the project panel: token meter, cohort → projects → Scenes / Bible /
   Members, then a second heading "Bible" with a rail of environments. The rail and the Bible page
   show the same things; the phone Menu repeats both. **Bible appears three times.**
4. **Scene header.** "Scene 1 · open" (the scene's title is literally "open"), a Look dropdown that is
   "not set", Canvas/E-conte toggle, pinned chips. Nothing says a scene needs an environment or who is
   in it.
5. **Cut cards.** "Cut 1A · didn't you "beep beep…" with black thumbnails (first frame of the clip is
   dark; no poster frame). The takes row under each card is unlabelled black rectangles.
6. **Workspace.** Layer tabs (Background / Character / Merged / Dialogue / SFX) with no explanation of
   what a layer is or which to use first; a route panel with three lanes and token counts; a notes form
   with nine fields (Cut, Action, Camera, Seconds, Objective, Continuity, Cut 1B checkbox, "uses nothing
   from the bible", Dialogue). Receipts list shows raw errors ("DuplicatePreparedStatement").
7. **Bible page.** A card list plus an "Add an entry" form (Kind / Name / Description / Likeness /
   consent). Tim added a location and the description went into Name, so the bible now shows a location
   called "Empty brick warehouse, one high window, dusk light, concrete floor." beside "Warehouse
   interior" with the same description. Nothing prevents that or shows it is pinned to a cut.
8. **Environment page.** Master-wide card, fixed conditions, "+ angle", "Test it". Reasonable on its own
   but it lives at the end of a chain the student was never walked along, and the description says "empty
   brick warehouse, dusk" while the image I put there for testing was a bright retail warehouse (removed).
9. **Members.** Fine. **Schedule (instructor).** Six modules, all "open".

## The real problems (not cosmetics)

- **No spine.** The product has bible → scenes → cuts → takes as data, but the UI never says "first
  build your world, then lay out scenes, then shoot". Every screen is a workspace with no "you are here".
- **No script / story step at all.** A film starts from a script or at least a logline and a scene list.
  Ours starts from a cut. Scenes have a title and synopsis, nothing else.
- **Characters are not a first-class step.** They are one "kind" in the bible form. No wizard, no
  "who is in this scene", no dialogue owner.
- **Environments and characters are not attached to scenes, only to cuts** (pins). So "the warehouse
  is the set for Scene 1" is not a thing the system knows; every cut re-pins.
- **The layer model (Background / Character / Merged) is exposed raw.** It is an implementation of
  plate-then-character compositing, not how a student thinks ("shoot the shot").
- **Old test data everywhere.** Two-week-old takes with junk prompts, my test photo, the failed jobs
  with database error messages. Real users will meet the same in their own projects unless the UI
  hides killed/failed history by default.
- **Navigation repeats itself** (bible ×3, project panel + tree + breadcrumb all say SC/Warehouse).
- **Phone**: fixed today, but the workspace is still a desktop tool.

## The shape of the fix (pending the operational research)

A project needs a spine of stages that unlock in order and are always visible:

1. **Story** — logline, scene list (title, what happens, who is in it, where), optional script paste.
2. **Characters** — one card per character: references, who they are, voice (later). Built once.
3. **Environments** — one per location: master wide, angles, fixed conditions. Built once.
4. **Scenes** — each scene knows its environment and its cast (from 1–3). Cuts inherit both.
5. **Shoot** — per cut: keyframe, then takes; choose one. (The current workspace, simplified.)
6. **Dialogue & sound** — lines per cut, voices, SFX. (Today: layers inside the cut.)
7. **Cut & export** — timeline of chosen takes; dailies for overnight renders.

Series: 1 → (2 ∥ 3) → 4 → 5 → 6 → 7. Parallel: characters and environments; different scenes by
different crew members; shooting scene 2 while scene 1 renders.

Each stage screen: what it needs from earlier stages, what it unlocks, one primary action. The left
panel becomes the spine (stage list with state), not a second copy of the bible.
