# Operational flow research: how script-to-film tools sequence the work (26 Sep 2026)

Method: vendor docs, help centres, blogs, 2025–26 reviews. App UIs and video transcripts not opened;
unconfirmed items marked [unverified].

## LTX Studio (ltx.io/studio)

- **Entry**: New Project → Gen Space (freeform). Or the Storyboard Generator: "Input your idea", one
  sentence or a full script; pick image model and aspect. Script optional. Each project has its own Gen
  Space, Storyboard, Timeline, Pitch Deck; "start from any tool and return at any time".
  https://ltx.io/blog/introducing-projects · https://ltx.io/studio/platform/ai-storyboard-generator
- **Stages**: (1) Storyboard Generator: script/brief → scenes and shots shown with counts *before*
  rendering; merge scenes, split shots, add beats at zero cost; characters/objects/locations auto-extracted
  as Elements; Generate renders one still per shot. (2) Elements (Character, Object, Logo, Font, Style,
  Other). (3) Storyboard (scene rows of shot panels + per-scene settings). (4) Gen Space (shot video:
  model, start/end frame, ≤2 refs, camera presets, Retake). (5) Timeline (2 video + 5 audio tracks) → MP4,
  XML, PDF deck. https://ltx.io/blog/how-to-storyboard
- **Characters**: Create Element → Character → image(s) (≤10 refs) + description (age, hair, outfit,
  demeanour) → name `@Name` → voice. Attached by typing `@Name` in shot descriptions. Outfit variants =
  duplicate + edit clothing (`@Sarah_casual`). Replace Image propagates everywhere. Voice carries through
  every tagged appearance. https://ltx.io/blog/getting-started-with-elements ·
  https://ltx.io/blog/how-to-create-a-consistent-character
- **Locations**: Location Elements (tagged) **and scene-level Location / Lighting / Weather fields** that
  every shot in the scene inherits; a shot can override. Time of day lives in Lighting.
  https://ltx.io/blog/setting-location-lighting-and-weather
- **Shots/takes**: panels have frame, description, camera direction, dialogue line; tap to regenerate/swap
  model/rewrite. Generations grouped in Sessions; Retake regenerates a 2–16 s sub-range. No explicit "choose
  this take" [unverified].
- **Dialogue**: characters with voices → script with speaker labels → assign → sync; lip sync. (Projects
  release moved dialogue out of Storyboard toward clip level.)
- **Where it breaks**: forgetting `@` tags is "the primary cause" of inconsistency; heavy, manual as
  projects grow; learning curve of weeks; Trustpilot 1.5/5 vs G2 4.3/5.
  https://lumalabs.ai/news/ltx-studio-review

## Martini (martini.film)

- **Entry**: blank infinite canvas; press V for a shot, prompt, model, olive estimate, Generate. Scripts
  and scenes are not objects; they are Variables fed to Workflows ("Script to Video": storyboard step →
  shoot step). https://martini.film/docs/workflows
- **Modes**: Canvas (generate/organise) and Timeline (cut/export). Objects: Video, Image, Text, Audio, Bin,
  Variable, Set.
- **Characters**: Library collections (workspace-wide) with typed properties, `@Ms. Rambutan/happy`; and
  Set characters (≤2, detected from the set image, placed with gizmos). No voice binding.
- **Locations = Sets**: 3D from one image or a 180–360° sweep (+≤7 views); walk it, set lens/aspect,
  Capture a framed angle as a start frame. Strongest "build once, shoot many angles" model. No
  time-of-day variants documented.
- **Takes**: land beside the shot; stacks; star ratings, favourite/reject, filters; choosing = dragging to
  timeline; clips link back to canvas.
- **Audio**: TTS per speaker, music, SFX as nodes → tracks. Sequences per scene/alt cut; MP4 or XML.
- **Parallel**: async generation, real-time multi-user, roles. **Breaks**: no scaffolding for a novice;
  set is "a reference, not a final render"; character placement "does not lock every detail".

## Google Flow (labs.google/flow)

- **Entry**: prompt box with modes Text to Video / Frames to Video / Ingredients to Video (+ images). No
  script field; Flow Agent can outline storyboards. https://support.google.com/labs/answer/16353334
- **Characters/locations**: an "ingredient" is one image, `@`-mentioned (≤3 per prompt); no location object;
  `Jump to` moves a character to a new setting.
- **Shots**: N outputs per generation; Add to Scene; Scenebuilder is one linear filmstrip per project with
  Extend (Veo only) and Jump to. Dialogue lives in the prompt (native Veo audio); Flow Music.
- **Breaks**: Extend drifts after 3–5 hops; Scenebuilder rudimentary; users learn late they "should
  pre-generate the starting and ending frames, and character portraits, ahead of time".

## Others

Higgsfield (brief → Soul ID → Elements → Popcorn storyboard grid → Cinema Studio → lip sync); Runway Agent
(beats → multi-scene → VO → assembly); Kling 3.0 storyboard prompts (≤6 shots/15 s, `@Name`); Freepik
Spaces / Krea Nodes (node canvases); Pika Director Suite (agent → script → storyboard → clips → timeline);
**Dreamina Octo** (closest staged tool: outline → `@Character/@Environment/@Object` → auto shot-split
storyboard → per-scene video → timeline); Saga (logline → screenplay → storyboard → video); Filmustage
(script breakdown into cast/props/locations).

## Synthesis

| Stage | LTX Studio | Martini | Flow |
|---|---|---|---|
| Entry | idea or script | blank canvas | prompt box |
| Script | optional, auto scene/shot breakdown | none (workflow variable) | none (agent) |
| Characters | Element: refs, description, voice, `@`, outfit variants | Library `@Name/prop`; set-placed | one image, `@` |
| Locations | Element + scene Location/Lighting/Weather inherited by shots | 3D Set, capture angles | image / start frame |
| Storyboard | scene rows of stills | canvas (optional workflow) | none |
| Takes | Sessions, Retake | stacks, ratings | N outputs, Add to Scene |
| Dialogue | voice bound to character | TTS per speaker | in prompt |
| Edit | timeline → MP4/XML/PDF | sequences → MP4/XML | Scenebuilder |
| Locked stages | none | none | none |

**Folk flow**: idea/script → reusable identity assets (character, place, style) → a still per shot →
video per shot with takes → sequence → export. The still is the hinge in all three; all three bind assets
with `@name`.

**Series**: an asset must exist before a shot can use it; a still before image-to-video; a take before
the timeline. **Parallel**: different scenes, different people, audio alongside video, script edits after
boarding. Nothing is locked anywhere, so nothing stops a student skipping the asset step, which reviewers
name as the #1 cause of failure.

**Descriptive stage model for a classroom**: 1 Story (logline, beats, scene list; script optional) →
2 Cast and 3 World, built once, in parallel (refs, description, outfit variants, voice; hero image + angles
+ lighting/weather) → 4 Scenes & Shots (scene = location + lighting + cast; shot = description, camera,
`@cast`, dialogue, still → takes; chosen take stored explicitly) → 5 Cut & Share. Gated but revisitable;
changes to Cast/World propagate. No shipping tool enforces stages 2–3 before 4.

## Addendum: LTX's own console (screens from Tim, 26 Sep)

Tim signed up at LTX; the screens are the **developer playground / API console**, not LTX Studio. It is
a tool-per-mode form layout (left: tools; middle: inputs; right: example; Generate button carries the
price): Image to Video (start + end frame, prompt, model LTX-2.5 Pro, resolution, duration, fps; $1.00
for 6 s 1080p ≈ 17¢/s, same as fal), Text to Video (+ aspect 16:9 / 9:16), **Audio to Video** (start
image + prompt + audio file; ~$0.85), **Long Form Avatar** (start frame + "describe how they look and
talk" + Script *or* Audio tab: a character speaking given lines), Extend Video, Video to HDR.
Relevance: dialogue can stay inside the one LTX family (a character's still + their line → speaking
clip), and Extend is available for continuity. fal also hosts LTX audio-to-video
(https://fal.ai/models/fal-ai/ltx-2-19b/audio-to-video). Official API docs: https://docs.ltx.io/welcome

## Addendum: LTX Studio itself (screens from Tim, 26 Sep)

- **Home**: projects, plus a tool dock: Gen Space · Canvas · Storyboard · Video Editor · Flows | Dubbing ·
  Caption. Sidebar: Home, Brand Kits, Assets, Custom Training, **Education (new)**.
- **Storyboard Builder** (entry for a film): project settings first (aspect ratio, image model, **style**),
  then one large box "Start with your story idea, scene, or full script", or drag/upload a script file.
  "Blank Storyboard" or continue (AI storyboards are a paid tier).
- **Gen Space**: a bottom prompt dock with Add image reference · Consistent element (@) · mode (Image /
  Video) · model · resolution · aspect · count (3) · Generate · credits. Results stack in rows, each row
  headed by its prompt, model, time, rerun, delete. Per image: favourite · **Edit image** · **Create
  video** · download · menu: **Save as Element** · Upscale (~150 credits) · Send to · Set as cover · Delete.
  Their onboarding tour teaches consistency as: "use your image as a reference for the next one" (drag the
  still into the prompt box, write "the same wildflower field at night…").
- **Video mode dock**: two frame slots, start ⇄ end, and **Camera motion as a picture grid** (None, Static,
  Focus shift, Dolly in/out/left/right, Jib up/down — the same LTX enum our schema already carries), then
  LTX-2.5 Fast · 6 s · 1080p · 16:9 · More.
- **Video Editor**: assets panel (images, audio, elements) beside a timeline; Add clip; Export; Collaborate.
- **Canvas**: node graph (Image upload + Prompt → model node) — their Flows surface.
- **Pricing**: Free 800 credits once; Lite $12/mo 8k; Standard $28/mo 28k (AI storyboards, **Elements**,
  Kling, Seedance, Nano Banana, commercial licence); Pro $100/mo 110k (Veo, 3 collaborators); Enterprise
  (shared brand kits, unlimited collaborators). Consistency (Elements) sits behind the $28 tier.

What maps onto Imaje: project settings (aspect, style/look, engine) asked with the script; still → "Create
video" and still → "Save as Element" (set as a character reference or a place's master wide) as one-click
actions on every take; start and end frame slots; camera motion as pictures; results grouped by prompt.
