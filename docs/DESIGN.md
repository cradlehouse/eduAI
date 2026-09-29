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

Rewritten 28 Sep 2026 for the one-job-per-screen flow (PRODUCTION_FLOW.md; mockups in
`docs/design/flow-mock.html` and `scene-lines-mock.html`). The earlier single-workspace layout (bible rail +
canvas + inspector + timeline on one screen) was dropped: students were shown everything at once.

```
┌──────┬──────────────┬──────────────────────────────────────────────┐
│ Step │ List of this │  Title · tabs for this element or shot        │
│ rail │ step's items │  One job's content (results, slots, lines)    │
│ 68px │ 210–220px    │                                               │
│      │ (or asset    │                                               │
│      │  drawer)     │  Prompt bar (only where something is made)    │
└──────┴──────────────┴──────────────────────────────────────────────┘
```

- **Step rail** (left, every project page): Script, Cast, Locations, Props, Scenes, Edit in order; a gold dot
  means something is waiting, a tick means done. Crew, Cohort and the budget ring sit at the bottom. On
  phones it becomes a scrolling row under the header. The org/cohort tree only appears outside a project.
- **Second column**: the list for this step (Cast, Locations, Props: one row per element with its status),
  the shot list (Shot screen), or the **asset drawer** (Scene and Edit only: drag in, or +).
- **Main**: one job. Tabs split an element or a shot into its steps (Look / Turnaround / Voice;
  Master wide / Angles / Times of day / Room tone; Camera / Frame / Clip).
- **Prompt bar** (bottom, sticky): only on screens that make something (Look, Frame, Clip). Shows what goes
  in automatically (chips for the cast look and the location view), the count, and the price on the button.
- Header: the breadcrumb doubles as the project switcher; avatar menu top right.

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

## 4. Screens (as built, 28 Sep 2026)

| Step | Route | What's on it |
|---|---|---|
| Script | `/p/:id` | Settings bar (shape, look, engine); script editor; Break it down → review; "Added to the script from other pages" list with undo |
| Cast | `/p/:id/cast/:entry?tab=` | Look (description, 3 portraits, "This is Angie", "Start from this", upload a start image) · Turnaround (front/side/back) · Voice (stock voice picker, sample, "Use this voice") |
| Locations | `/p/:id/locations/:entry?tab=` | Master wide · Angles (made from the wide; preset buttons) · Times of day · Room tone (30 s bed, "Use this") |
| Props | `/p/:id/props/:entry` | Look only |
| Scenes | `/p/:id/scenes` | Cards in script order: location thumb, who's in it, shots chosen |
| Scene | `/p/:id/scenes/:scene` | Asset drawer; Where / Who / Props slots (drop or +); lines pop-up on drop; "+ new character" with a line; What happens (the script's own blocks, editable, + line); Plan the shots → suggested list → Keep |
| Shot | `/p/:id/scenes/:scene/shots/:shot?tab=` | Camera (framing and move as picture tiles, location view) · Frame (stills; Use this frame / Use as end frame) · Clip (start ⇄ end, Fast/Quality, takes, choose; sound tracks once split) |
| Edit | `/p/:id/edit` | Player; tracks: Picture, one per character, Room, Music (placeholder); level sliders; Export → download |

Rules the screens follow:
- Adding anything anywhere writes it into the script and asks where it goes.
- Choosing is a toggle and nothing is deleted (takes are hidden, not removed); every generation is priced
  before and receipted after.
- A step's tab shows ✓ when it's done; the next step is where a student lands.

## 5. Data (as built)

`bible_entries` (+ appearance, voice_asset_id, room_tone_asset_id), `bible_entry_assets` (roles: look,
turnaround, angle, time, voice, room, upload…), `scenes` (heading, location, excerpt, follows the script via
`set_scene_order`), `shots.intent` (framing, camera_motion, lines, on, angle_asset_id, end_take_id),
`shots.plate_take_id` = chosen frame, `shots.selected_take_id` = chosen clip, `take_tracks` (voice per
character, original), `script_changes` (undo), `projects.edit` (levels).

## 6. Superseded
The §2 workspace layout and §4 screens of the 23 Sep spec (one canvas with bible rail, inspector and
timeline) and its §5 data sketch (characters/environments/pins tables) were replaced by the above.
Tokens (§1), components (§3) and the accessibility floor (§7) still apply.

## 7. Accessibility floor

- Text contrast: ink and dim pass AA on `--bg` and `--glass`; mute is for hints only, never for anything required to operate the tool.
- Chosen/drift are never conveyed by colour alone — the score number and the border/label carry it too.
- Every card and thumbnail is keyboard-focusable; focus ring is a 2px gold outline offset 2px.
- `prefers-reduced-motion` respected as in §1.
