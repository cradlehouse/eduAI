# Imaje — Workspace design spec

For Claude Code. Companion mockup: `imaje-screens-v2.html` (open in a browser; it's the visual reference for every rule below). This spec replaces the platform's current colour scheme entirely.

## 0. What we're building

A governed studio for AI filmmaking in a course. The student experience is a film set, not a chat box: a bible of reusable assets on the left, a canvas of shots in the middle, an inspector on the right, a timeline underneath. Everything a student generates is a *take* under a *cut* inside a *scene*, inherits whatever is *pinned*, is *screened* before it runs, is *priced* before it runs, and is *receipted* after. Nothing is deleted; things are killed, restored, re-picked.

Visual reference: Martini (martini.film) — dark dot-grid canvas, floating glass panels, shots as image cards. Character reference: OmniChar — one identity built from references, continuity scored per take.

## 1. Design tokens

Implement as CSS variables on `:root`, mapped into Tailwind via `theme.extend.colors` so utilities like `bg-glass` and `text-gold` work. No hard-coded hex anywhere in components.

### Colour

```css
:root {
  /* surfaces */
  --bg:          #0F1013;                 /* the canvas */
  --bg-deep:     #08090B;                 /* app shell behind the canvas, modals backdrop */
  --grid:        rgba(255,255,255,.06);   /* dot grid on the canvas */
  --glass:       rgba(24,26,31,.78);      /* floating panels — always with backdrop-filter: blur(10px) */
  --glass-edge:  rgba(255,255,255,.10);
  --card:        #1A1C21;                 /* image card fallback before media loads */
  --card-edge:   rgba(255,255,255,.14);
  --field:       rgba(255,255,255,.04);   /* inputs */

  /* text */
  --ink:         #F2F0EB;                 /* primary text (warm white, not pure) */
  --dim:         rgba(242,240,235,.55);   /* secondary */
  --mute:        rgba(242,240,235,.32);   /* tertiary, hints, rulers */

  /* semantic — these carry meaning; do not use decoratively */
  --gold:        #F2B441;   /* pinned, primary action, selected route */
  --gold-wash:   rgba(242,180,65,.06);
  --chosen:      #69D2FF;   /* the chosen take, continuity pass */
  --chosen-wash: rgba(105,210,255,.12);
  --drift:       #FF7A59;   /* continuity fail, over budget, refused prompt */
  --ok:          #7FD3A6;   /* settled receipt, screening passed — use sparingly */
}
```

Rules:
- Gold means "this is taped to the set": pinned bible items, the primary button, the route you've selected. One gold button per panel, max.
- Cyan means "this is the one": chosen take borders, chosen-take chips in the timeline, continuity scores ≥ 85.
- Coral means "something's wrong with the picture": continuity < 85, budget over 90%, a refused prompt.
- Nothing else gets a colour. Model names, vendors, lanes, roles are all ink/dim/mute.
- Never use pure black (#000) or pure white (#FFF).

### Type

- One family: the system sans stack (`"Helvetica Neue", Helvetica, Arial, sans-serif`). If a webfont is wanted later, Inter Tight or Söhne; nothing with personality — the images are the personality.
- Scale: 22 / 16 / 13 / 12 / 11 / 10 px. Body is 13. Panel titles are 12 medium. Hints are 11 mute. Rulers 10.
- Weights: 400 and 500 only.
- Sentence case everywhere. No all-caps labels. No eyebrow labels.
- Line length under 70ch in any prose field.

### Shape and space

- Radius: panels 10, cards 8, inputs/buttons 6, chips 999, thumbnails 5.
- Spacing unit 4px. Panel padding 12/14. Gap between cards on canvas 16.
- Borders are 1px and translucent (see tokens). Never a solid grey border.
- Shadows only on the chosen card: `0 0 0 1px var(--chosen), 0 12px 30px rgba(0,0,0,.5)`.
- Glass panels: `background: var(--glass); border: 1px solid var(--glass-edge); backdrop-filter: blur(10px)`.

### Motion

- One transition length: 160ms ease-out. Used for: pin on/off, take chosen, panel open.
- No entrance animations. No hover lifts on cards. Hover = border goes from `--card-edge` to `rgba(255,255,255,.28)`.
- Generation in progress: the card shows a slow 2s pulse on its border at `--gold` 30% opacity, and the price badge stays visible. Respect `prefers-reduced-motion` (pulse becomes a static gold border).

## 2. Layout

Desktop-first; the workspace is a desktop tool. Minimum 1200 wide. Below 1024, the bible rail and inspector collapse to icon rails; the canvas and timeline stay.

```
┌──────────┬─────────────────────────────────────┬──────────┐
│ Bible    │  Title ····························· avatars    │
│ rail     │  Pinned chips                       │ Inspector│
│ 230px    │  Canvas (dot grid)                  │ 206–302px│
│          │  cards, cuts, takes                 │          │
│          │                                     │          │
├──────────┴─────────────────────────────────────┴──────────┤
│ Timeline drawer (collapsible, 180–280px)                   │
└────────────────────────────────────────────────────────────┘
```

- Bible rail: fixed left, 230px, glass, full height. Sections: Characters, Environments, Props, Style. Style is a single fixed item per project (no list).
- Canvas: fills the middle. Dot grid at 22px. Pannable. Cards are absolutely positioned within a scene; positions persist per scene.
- Inspector: fixed right, glass. Contents depend on what's selected (nothing → Routes; a cut → Cut inspector; a take → Take inspector with receipt).
- Timeline: bottom drawer. Collapsed by default on Character and Environment screens; open by default on Scene.
- Collaborator avatars top-right of every screen (team members currently in the project). Presence only; no cursors in v1.

## 3. Components

### Bible row
- 22px colour swatch (the asset's key image, cropped square) + name. Pinned state: 1px gold border, gold wash, small gold "pinned" text right-aligned.
- Click → opens that asset's screen. Drag → onto a cut card to pin *for that cut only*. Drop on the canvas background → pin to the scene.

### Pinned chip
- Pill, gold border, gold wash. Shows on the scene under the title. Click the × to unpin from the scene. A chip inherited by a cut can't be removed at cut level, only added to.

### Image card
- 8px radius, translucent border, media fills. Top-left label (11px, text-shadow). Bottom gradient foot with left text (what it is) and right text (score / cost).
- States: default, hover, chosen (cyan border + shadow), drifted (coral score text; border stays default), generating (gold pulse), refused (coral label "refused — no charge", no media).

### Take thumbnail
- 68×40. Shows the continuity score bottom-left. Chosen = cyan border, dim others to 60% opacity. Click = preview in the cut card. Double-click = choose.

### Route selector
- Three rows: Explore, Control, Finish, each with a price on the right. Selected row is gold text. Never shows a vendor or model name to a student. Under it: "This take" with the price at 16px.

### Price badge
- Always visible on Generate. Format `$0.45`. Turns coral if it would push the project over budget; the button stays enabled but shows "over budget" — the instructor's cap decides whether it runs.

### Budget bar
- 6px, gold fill, on the scene header. Coral fill at ≥ 90%.

### Continuity row
- `name … score`. Score in cyan ≥ 85, coral < 85 with a reason and timestamp when we have one ("jacket colour changed at 3.2s").

### Prompt field
- Field background, dim placeholder "Write the shot…". Screening happens on submit; a refusal replaces the take card with the refusal card and a one-line reason.

## 4. Screens

### 4.1 Character

Purpose: build a person once so every shot she's in matches.

Canvas:
- Three reference cards in a row, 220×220: Face (close-up, neutral), Body (full length), Wardrobe (what she wears). Two dashed slots to the right: + profile, + expression. Up to 9 references.
- Thin gold lines run from the three cards down into the Identity panel — the visual statement that identity is compiled from references.

Panels:
- Identity (below the cards): continuity score and bar; "Who she is" free-text; "Wardrobe by scene" chips — a Default plus optional per-scene overrides. A wardrobe override is the only per-scene variation a character has; everything else is locked.
- Test her (bottom): prompt + Generate + price. Results appear as three 120×70 thumbs with scores. Tests never enter the film and are billed as images (Explore $0.02 / Control $0.05 / Finish $0.08 — placeholder numbers; pull from the registry).
- Inspector (right): Routes for images; Screening note (minors tier on/off is set by the cohort, shown read-only); Lock note.

Behaviour:
- Save is disabled until Face + one other reference exist.
- The character's key image (used as her swatch everywhere) is the Face reference.
- Changing a reference re-compiles identity and re-scores; existing takes keep their old scores and get a "re-check" affordance, they are not re-scored silently.

### 4.2 Environment

Purpose: build a place once so every shot in it lines up.

Canvas:
- One large master card, Wide, 460×260, chosen-cyan border and foot text "geometry source". Two 216×124 cards stacked right: Reverse, Detail. Dashed slot: + angle, with the hint "made from the wide, so it lines up".
- The Wide must exist before any other angle can be generated; other angles are generated image-to-image from it.

Panels:
- Fixed for this space: a 2×2 grid — time, light, weather, occupancy. Editing any of these after save prompts "This makes a new environment" and forks; it never mutates the one existing shots used.
- What it is: free text.
- Props that live here: chips. A prop pinned here is auto-pinned to any scene set in this environment.
- Test it: prompt + Generate + price.
- Inspector: Camera (lens, height, move — the environment's default framing, inherited by cuts and overridable); Continuity note.

### 4.3 Scene

Purpose: the working screen. Lay out cuts, generate takes, choose one per cut.

Header: "Scene 3 — The handoff", budget bar with `$spent / $cap`, avatars.

Pinned chips under the header: everything pinned at scene level.

Canvas:
- Cuts are cards in a row, 290×164 (the chosen take, or the latest take if none chosen, is the media). Label "Cut 1 · Maya, close". Foot: take number left, continuity right.
- Under each cut: its take thumbnails in a row + a dashed "+" slot. Under those, a mute line with the camera: "close · eye level · static · 50mm".
- A cut can hold a subset of scene pins ("In this cut: Maya · depot"). Dropping a bible item on a cut adds it to that cut only.
- Dashed "+ cut" slot at the end of the row. Cuts are camera setups: close on A, close on B, both wide, insert on the bag.

Panels:
- Cut inspector (selected cut): camera 2×2 (framing/lens, height, move, light-from-environment); Shot prompt + "Another take"; Continuity on the current take, one row per pinned character and the environment. This is where a wide can pass on Maya and fail on the courier.
- Route (right): Explore / Control / Finish with video prices; "This take" price; screening note.
- Instructor strip (bottom, shown to instructor/admin roles only, collapsed for students): screened prompt count, refusals (no charge), team on this scene. Every take, prompt, cost, score and choice is here; nothing is deleted.

Behaviour:
- Choosing a take is a toggle. Choosing a different one un-chooses the previous. Kill hides a take (dims to 30%, still in history); Restore brings it back.
- Generate is blocked, with a reason, if the cut has no pinned environment.
- The timeline drawer is open on this screen and reflects chosen takes live.

### 4.4 Timeline

Purpose: assemble chosen takes in story order. This is not an editor; there are no trims or transitions in v1.

- Ruler: scene names across the top.
- Lanes: Picture (52px clips, media thumbs, cyan border = chosen, dashed gap = "C3 wide — no take chosen"); Ambience (one bed per environment, auto-placed, cyan-wash); Effects (spot sounds, cyan-wash); Voice (dashed, "voice route · phase 2").
- A cut with no chosen take renders as a gap the width of its cut, never as a stand-in take.
- Drag clips to reorder within a scene; scenes reorder in the project view, not here.
- Footer panel: takes in the cut ($), spent this project vs cap, bar.
- Export rough cut: ghost button, produces a stitched MP4 in v1; XML for Premiere/Resolve later.

Audio is a placeholder in this spec: Stable Audio is live for effects, so the Effects lane is real; Ambience should be generated once per environment at environment-save time; Voice waits for Chatterbox.

## 5. Data this implies

Add where missing:
- `characters.references[]` with a `slot` enum (face, body, wardrobe, profile, expression, other) and `wardrobe_overrides[{scene_id, description}]`.
- `environments.fixed { time, light, weather, occupancy }` — immutable after first take; edits fork a new environment row with `forked_from`.
- `environments.angles[]` with `is_master` and `derived_from`.
- `pins` table: `{ target_type: scene|cut, target_id, asset_type, asset_id }`.
- `takes.continuity[]`: `{ subject_type: character|environment, subject_id, score, reason, at_seconds }` — per subject, not one number per take.
- `takes.state`: live | killed. `cuts.chosen_take_id`.
- `cuts.camera { framing, lens, height, move }`, defaulting from the environment.

## 6. Migration from the current scheme

1. Add the tokens above to the global stylesheet and Tailwind config. Delete the existing palette; do not alias old names to new ones, or the old colours will leak back in.
2. Grep for hex literals and `bg-`/`text-`/`border-` utilities using the old palette; replace with semantic names (`bg-glass`, `border-card-edge`, `text-dim`, `text-gold`).
3. Convert every panel to the glass recipe. Convert every list to Bible rows. Convert every generation output to an Image card.
4. Reserve gold, cyan, coral for the meanings in §1 only. Anything currently coloured for decoration goes to ink/dim/mute.
5. Then rebuild screens in this order: Scene (most used), Character, Environment, Timeline.

## 7. Accessibility floor

- Text contrast: ink and dim pass AA on `--bg` and `--glass`; mute is for hints only, never for anything required to operate the tool.
- Chosen/drift are never conveyed by colour alone — the score number and the border/label carry it too.
- Every card and thumbnail is keyboard-focusable; focus ring is a 2px gold outline offset 2px.
- `prefers-reduced-motion` respected as in §1.
