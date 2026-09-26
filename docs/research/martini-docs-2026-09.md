# Martini (martini.film) — how it works, from its docs (grabbed 26 Sep 2026)

Docs root: https://www.martini.film/docs (the martini.app links redirect). Sections: Getting started,
Canvas, Generation, Asset Library, Sets, Timeline, Export, Collaboration, Teams, Developers (API, Workflows,
CLI, MCP).

## The object model

- **Project → Canvas** (infinite, spatial; "everything lives" there: shots, images, audio, sets, text notes).
- **Shot**: press V to place one; write a prompt; pick a model; generate. Image-to-video, video-to-video,
  text-to-video. "Many creators begin with an image as an anchor."
- **Take**: each generation "lands beside the original so you can compare side by side".
- **Stack**: group two or more compatible images/shots; expand/collapse; Alt+arrow cycles takes; unstack
  keeps the assets. Uses: alternate takes, model comparisons, variations of one composition.
- **Set**: "a 3D environment built from a single image" (or a slow 180–360° video sweep; up to 7
  supplementary overlapping views). Fast or Quality reconstruction, runs in the background, olive estimate
  shown first. Then a **Set viewer**: walk it with WASD, drag to look, +/- lens, [/] aspect, Tab toggles
  Camera/Character mode; **Capture** (Enter) drops the framed angle as a shot on the canvas beside the set.
  Advice: check the reconstruction from several angles before framing; if geometry is unclear, redo with a
  wider main image or more overlap.
- **Characters** (inside sets): subjects auto-detected from the set's source image; you keep up to **two**
  per set; best from a clear full-body view with distinct edges. Move/rotate/scale them in Character mode.
  Placement is a reference to the model, "does not lock every visual detail": review identity, wardrobe,
  scale, contact with the environment in each take.
- **Asset Library** (workspace-level, cross-project): Library → Folders → **Collections** (named bundles with
  cover, description, tags: "Ms. Rambutan", "Costumes") → Assets (images, videos, variables) with typed
  **properties** (emotion, costume, colour). Referenced in prompts with `@Ms. Rambutan` or a slice
  `@Ms. Rambutan/happy`. Generated results can be saved back into a collection.
- **Timeline**: drag shots from canvas to tracks; order, trim, preview; audio tracks; "not a replacement for
  Premiere or DaVinci" — rough cut, timing, export package (MP4 or XML). **Sequences**: separate edits per
  scene / alternate cut / delivery format, nestable, export uses the active sequence.
- **Workflows** (agentic): a saved production task with steps, input variables (script, character
  descriptions) and material bins; each run has its own inputs, canvas, progress, spend, outputs. Examples:
  **Script to Video** (script → storyboard frames → shoot each panel), Create reaction close-up, Storyboard a
  scene beat, Animate storyboard frame. Steps chain; an agent reviews quality with verdicts and revision
  requests; failed steps resume.
- **Generation API**: projects → canvases → assets; ~30 model aliases across providers; `@Image1` positional
  refs; olives snapshotted per job so a later price change never alters a receipt; org-scoped keys.

## Prompting guidance (theirs)

Five observable elements: subject, action, framing, camera, light/environment. "Handheld medium follow
shot. A woman crosses the kitchen and pauses at the rain-streaked window. Soft overcast daylight, shallow
focus." Avoid adjectives ("beautiful cinematic"). Change one instruction at a time. Add references when words
can't fix composition or identity.

## What this tells us

1. **Environment continuity is solved with a persistent 3D set built from one still**, then *captured*
   angles become the start frames of shots. This is exactly the mechanism the practitioner survey found
   works; Martini productised it. Sets are created from the master wide we already have.
2. **Characters live in the set, not in the prompt**: placed, scaled, framed in the viewer; two per set.
3. **Reusable assets are a library with @names and typed slices** (`@Maya/angry`), shared across projects.
4. **The working surface is a canvas, not a form**: takes land beside the shot, stacks hold alternates.
5. **Sequences per scene** is how they hold "multiple".
6. **Workflows** encode the series order (script → boards → shots) and let an agent run it with review.
7. They run their own timeline only to rough-cut level and export to an NLE.

Their model has no course, no consent, no minors policy, no budgets per student; ours does. Their canvas is
the thing our Scenes page is a poor imitation of.

## Addendum: canvas objects and generation inputs

Canvas objects: Video/Shot (V), Image (I), Audio (A), Text note (T), **Bin** (B: groups related work
without hiding it), **Variable** (Shift+V: reusable prompt text), Set (Shift+S). Video generation inputs:
prompt (action, camera, framing, light), optional reference image, start frame / end frame / reference
(model-dependent; the form shows only what the chosen model supports), duration, resolution, aspect; olive
estimate before generate; result lands beside the source shot. Image generation: press I, prompt +
references (photos, storyboards, concept art, @library mentions); uses: composition before motion,
keyframes, storyboards, character sheets; stills kept with their prompts for reuse.
