# Design direction

Chosen 2026-09-12 from three researched directions (research in the session; exemplars: Frame.io V4,
Procreate Dreams, djay, Brilliant/ustwo, Duolingo, Linear, Google Flow, Runway; the Ponyo e-conte
pages for the storyboard). Canvas: https://claude.ai/code/artifact/611dad42-8a18-42e5-b3ed-387eece62d8c

**Darkroom's layout, Playbook's colour, rounded corners.**

- Layout (from "Darkroom"): contact sheet of takes on the left, the picture large in the middle, the
  light table (three-up compare + written justification) on the right, and the console as a camera
  body along the bottom: lane toggle, route dial with the cost on it, token counter, shutter.
- Colour (from "Playbook"): off-white paper `#f6f1ea`, sand panels `#efe8de`, line `#e2d8c9`, ink
  `#23212b`, muted `#7a7466`. Lane colours: explore coral `#e8654a`, control teal `#2a9d8f`, finish
  violet `#6f5bd6`. Amber `#f0b429` is reserved for tokens and the reflection card, so cost always
  reads the same. Radii: cards 18–22 px, fields 12 px, pills full.
- Type: Nunito (display, milestones and labels), Source Sans 3 (body), JetBrains Mono (timecodes,
  tokens, take ids). All via next/font, self-hosted at build.
- Rules from the research: cost on the picker and on the button, never after the fact; provenance in
  a panel, not on the card; the celebration moment is saving the justification, not pressing Generate;
  gates say why and what unlocks them; colour is never the only signal.

## The storyboard is an e-conte

The Scenes screen is a single column of cuts read top to bottom as the film: cut number and lane dot in
the left margin, the picture, then action / camera / continuity / dialogue beside it, timing on the
right, and the student's own note from Compare in handwriting. Reordering is by dragging the margin
number.

## Layers

A cut is built in layers, as on an animation layout sheet:

| Layer | Belongs to | Route (Phase 1) | Consent |
|---|---|---|---|
| Background plate | the location; reused across every cut in the scene at no extra tokens | LTX (video) or a still | none |
| Character pass | the cut | LTX with the plate frame as reference | likeness release, lane-scoped |
| Merged take | the cut; what students compare and choose | = the character pass in Phase 1; true compositing is Phase 2 | inherits |
| Dialogue | the cut; the line is written in the notes first | Chatterbox (registry draft, Phase 2) | voice release (`voice_likeness` lane) |
| SFX | the cut | Stable Audio 3 | none |
| Music | the scene, **scored to the locked cut at the timeline stage (Phase 3)** | none yet | none |

Schema: `jobs.layer`, `takes.layer`, `shots.plate_take_id` (migration 0108); `intent.dialogue` on the shot.

## Board styles (later)

The storyboard is a view over the same cuts, notes and layers, so a per-org or per-cohort **board style**
is a small setting rather than a fork: e-conte column (default, above), western horizontal panels, or a
shot-list table for instructors who plan in spreadsheets. Phase 4, once the first cohort has opinions.
