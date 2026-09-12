# Resource Neutrality Layer

A fifth axis for the integrity grid, alongside training data, licence, residency, and content:
the energy, water, and carbon impact of the AI stack and the hosting infrastructure.

## Why this exists

Every other axis in the integrity grid rates something a vendor could theoretically disclose. This one
is different: almost nobody discloses real per-generation energy or water numbers for video, audio, or
image generation. Inventing precise figures would be dishonest. The right move is to rate what's actually
knowable, disclosure itself, and to make real, verifiable claims only where the platform controls the
infrastructure directly.

This is a positioning pillar, not a compliance line: a meaningful share of this generation of students
hesitates to use AI tools specifically because of the resource cost. A platform that can show its work,
not just claim to care, is a real differentiator.

## What's measurable, and what isn't

- **Closed APIs (Kling, Veo, Runway, Hailuo…)**: a black box. Google is the only major vendor to publish
  anything (2025, per text prompt for Gemini: 0.24 Wh, 0.03 g CO₂, 0.26 mL water) and that stops short of
  video. No video vendor publishes a number. The grid entry reads "undisclosed", never a fabricated figure.
- **Self-hosted open models (LTX, Wan, Chatterbox, Stable Audio)**: the one tier where energy use is
  checkable. GPU wattage × generation time, on infrastructure the platform controls. An unplanned payoff of
  the open-weights-first principle already driving model selection.
- **Independent research on the trend**: a Hugging Face / Carnegie Mellon study found text-to-video energy
  roughly quadruples when clip length doubles. A 6 s clip costs ~4× a 3 s clip, not 2×. A 5 s generation is
  on the order of running a microwave for over an hour; a still image is a few seconds of the same draw.
  This is structural to video diffusion, so it applies whichever model a student routes to.

## Grid addition: disclosure tier

Rate each model version A/B/C on disclosure, same pattern as the other axes:

- **A — published methodology.** No video vendor qualifies today. Self-hosted profiles reach it once measured.
- **B — third-party estimated.** Independent research exists, no vendor number.
- **C — no disclosure at all.** Where most closed-API models sit.

Never publish a fabricated kWh-per-generation for a closed model. The absence of data is the finding.

## Infrastructure decisions (the part the platform controls)

- **Database/backend: Supabase pinned to AWS Oregon (us-west-2).** One of three AWS regions named as
  carbon-neutral rather than offset-purchased (Oregon, Frankfurt, GovCloud). Oregon runs substantially on
  hydro and wind. **Status: done.** The eduAI project is in us-west-2.
- **Self-hosted model compute: Crusoe Cloud**, not a generic GPU provider. Crusoe runs on stranded energy
  (flare gas that would otherwise be burned for nothing) plus renewables. Versus CoreWeave, Lambda or RunPod,
  which compete on speed and price. **Status: Phase 4**, draft profile `ltx-2.5@crusoe` in the registry.

Together: "infrastructure runs on a carbon-neutral AWS region and stranded-energy GPU compute". Specific and
verifiable, not a vague sustainability promise.

## Positioning

- Integrity page: alongside the "AI music training data is unresolved" honesty stance, state what's
  disclosed, what isn't, and what the platform measures itself.
- Student-facing: the clip-length scaling finding is a teaching moment. Shorter, more deliberate takes cost
  less, not just render faster. Surface it in the generation console and the prompt coach, not only the docs.
- Cohort mode (one shared film) is the demonstrably low-footprint mode, and the number can sit next to the
  budget ring. See PRICING.md.
- Pegasus letter/outline: "resource-neutral by default" is credible because the defaults are already open
  and self-hostable. It falls out of decisions already made.

## How it is wired (migration 0102)

| Where | What |
|---|---|
| `model_versions.resource_disclosure` + `_source` | A/B/C and what it rests on. Shown on the ModelTile with the other integrity axes. |
| `deployment_profiles.compute_provider` | who runs the silicon (fal, replicate, crusoe…), distinct from the API adapter |
| `deployment_profiles.energy_profile` | grid class (carbon_neutral_region / stranded_energy / renewable / offset / unknown), claim, verifiable flag, source |
| `deployment_profiles.resource_model` | basis (measured / third_party / undisclosed), GPU watts, Wh at 5 s, length exponent, water and CO₂ factors, measured date |
| `job_receipts.resource_estimate` | what applied at settle: basis, Wh, g CO₂e, mL water, disclosure tier. `{}` plus the tier when undisclosed. |

Disclosure tiers and resource models are operational fields: a measured figure may replace an estimate on
a profile that jobs already used. Receipts freeze the estimate that applied, so history is unaffected.

Seeded today: every version is B (open weights or Google's partial disclosure) except Kling (C). Every fal
and Replicate profile is `{"basis": "undisclosed"}` with `grid: unknown`. Nobody is A.

## Open items

- No provider publishes real energy-per-generation for video. Revisit periodically; Google's 2025 text
  disclosure suggests the direction of travel.
- Once the self-hosted stack runs on Crusoe, replace `third_party` with measured `gpu_watts × seconds` on
  `ltx-2.5@crusoe` and move `ltx-2.5` to tier A. That is the one place the platform can claim A.
- The orchestrator's estimate function (P1-10) reads `resource_model`; when `basis` is `undisclosed` it
  must write `{}` plus the tier, never a number.
