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

## Infrastructure: what's true and the path (revised 2 Oct 2026)

Two earlier claims were withdrawn after research (`research/brand-claims-2026-10.md` §3):
- **"Carbon-neutral AWS region (Oregon)."** Amazon's 100% renewable figure is annual and certificate-based,
  and disputed by its own employees' group; Amazon's Oregon demand pushed a local co-op onto fossil market
  power. The database stays in us-west-2 (its grid is largely hydro), but we don't count certificate claims,
  and the database is a tiny share of the footprint anyway.
- **"Crusoe stranded-energy compute."** Crusoe sold its flare-gas business to NYDIG (Mar 2025) and builds
  gas-turbine campuses in Texas. Its Iceland and Norway sites are clean but outside the US.

**We don't say "carbon neutral".** The public stance (mission page) is the path:
1. **Estimate, labelled** — a range per take from published measurements (LTX-Video 0.9.7 ≈ 3.8 Wh per
   5 s at 512×704 on an H100; energy ∝ length² and resolution²). Method on a public page.
2. **Use less** — distilled LTX-2 drafts (8 steps vs 40), half resolution plus upscaler, short takes,
   finals only for kept takes.
3. **Measure** — on our own GPUs: NVML energy counter per job (Zeus/DCGM) + CPU/RAM share + idle share × PUE,
   following the Green Software Foundation's SCI for AI; on receipts, discarded takes included.
4. **Cleaner power, US data** — default Google Cloud us-west1 Oregon (83% hourly carbon-free, 98 g/kWh);
   clean non-US grids (Québec, Iceland) only by a programme's written agreement.
5. **Go beyond** — durable removal (Stripe Climate / Frontier, $450–550/t) for 2× the measured footprint,
   reported as tonnes contracted vs delivered, called a contribution. Estimated ~$5–110 a school a month.

Never say carbon neutral, net zero, climate positive, regenerative, green or sustainable about Imaje
without a measured, published method (FTC Green Guides, California AB 1305, EU rules from 27 Sep 2026).
Full roadmap: `research/brand-roadmap-2026-10.md` §4. The registry's `ltx-2.5@crusoe` draft profile should
be re-pointed at whichever clean host the self-hosting spike picks.

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
- Once the self-hosted stack runs on our own clean-grid GPUs, replace `third_party` with measured `gpu_watts × seconds` on
  `ltx-2.5@crusoe` and move `ltx-2.5` to tier A. That is the one place the platform can claim A.
- The orchestrator's estimate function (P1-10) reads `resource_model`; when `basis` is `undisclosed` it
  must write `{}` plus the tier, never a number.
