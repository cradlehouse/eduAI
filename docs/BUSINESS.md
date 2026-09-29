# Imaje: the business (28 Sep 2026)

One page to start any business conversation from. Details live in the linked docs; this page says what's
decided, what the numbers are, and what's still open.

## What it is
A film school in the browser. Students write a script; the AI breaks it into cast, locations, props and
scenes; they build each person and place once, then shoot scene by scene, shot by shot, and cut the film.
Characters stay the same person and locations the same place from shot to shot, and every character keeps
their own voice. Built for classrooms: instructors see every step, every generation is priced before it
runs and receipted after, and minors are protected by default (no real faces or voices without a
guardian's release). How it works: `PRODUCTION_FLOW.md`.

## Who pays
- **Design partner:** Pegasus Media Project (Dallas nonprofit, Niloo Jalilvand). Its apprentices make both
  group and individual films in a free nine-month programme; the payer is PMP and its funders.
- **Market:** schools, youth media nonprofits, after-school and summer programmes. The buyer is the
  programme, not the student.

## Pricing (first cut, in the database as `plans`; see `PRICING.md`)
| Plan | Price | People | Generation included |
|---|---|---|---|
| Cohort | $250 / month | 30 | $200 / month |
| School | $1,000 / month | 100 | $750 / month |

Students see tokens ($1 = 1,000 tokens), never money. Plans are invoiced by hand; Stripe isn't connected.

## What things cost us (verified list prices, Sep 2026)
| Item | Cost |
|---|---|
| Video clip, LTX 2.5 fast 720p (sound included) | 9¢ / second |
| Video clip, LTX 2.5 pro 720p | 12¢ / second |
| Still image (Qwen-Image / Qwen edit) | 2–3¢ each |
| Stock voice sample (Kokoro) | ~1¢ |
| Voice conversion (Chatterbox) | $0.015 / minute |
| Script breakdown / shot plan (Claude) | fractions of a cent to a few cents |
| **Test film, 14 s, 2 characters, one location, made end to end** | **$1.71** |

Video is ~85% of the cost. Retakes multiply it, so the take-to-keep ratio drives the real cost per
finished minute.

## Hosting (see `RENDER_PLAN.md`, `research/self-host-feasibility-2026-09.md`)
- **Now:** every model runs on fal (pay per use). Every model except Claude is open-weight, so each can
  move to our own GPUs by changing one registry row.
- **Self-hosting estimate** (compute only, unverified 30 s/clip on an H100): about 60% cheaper than fal
  from the first school. 1 school ≈ $700/mo vs $1,800 on fal; 5 schools ≈ $2,500 vs $9,000;
  20 schools ≈ $10,000 vs $36,000. Overnight batch renders bring it towards 1–3¢ a clip.
- **The real cost is people:** ~4–6 founder-weeks to build, ~0.2 of a person to run, and a fallback to fal
  when our GPUs fail mid-class. Payback ~12 months at one school, ~2–3 months at five.
- **Shared server idea (Tim):** many schools on one pool, stills and cheap drafts live in class, final
  renders queued overnight with a queue position. Next step is the spike in `RENDER_PLAN.md` (needs a
  Modal or RunPod account with a spend cap).

## Licences to watch
- **LTX 2.5:** free below a revenue threshold; above it needs a licence from Lightricks.
- **Stable Audio Open:** free below $1M revenue.
- **Qwen, Kokoro, Chatterbox, Demucs, Whisper:** Apache/MIT, free.
- **Claude:** paid API; used only for script work and prompt safety.

## Risks
- **Minors:** consent and releases for any real face or voice; content screening on every prompt.
- **Quality:** continuity (same face, same room) and indoor weather still need checks; see `STATUS.md`.
- **Class-time outages:** a failure during a lesson loses the lesson, so fallback routes matter more
  than cost.
- **Model churn:** models change monthly; the registry and the weekly registry watch exist for this.

## Open questions
- Seat fee vs generation envelope, and the take-to-keep ratio per module.
- Credits bought through us vs schools bringing their own model keys.
- When to self-host (after the spike's numbers).
- Name: "Imaje" is the working name.

## Related
`PRODUCTION_FLOW.md` · `STATUS.md` · `PRICING.md` · `RENDER_PLAN.md` · `RESOURCE_NEUTRALITY.md` ·
`research/` (continuity, dialogue, self-hosting, competitors: `operational-flow-2026-09.md`)
