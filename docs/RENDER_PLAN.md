# Render plan: stills in class, video overnight

Status: agreed direction (24 Sep 2026). Research behind it: `docs/research/*-2026-09.md`.

## The shape

```
IN CLASS (interactive, seconds, pennies)          OVERNIGHT (batch, cheap GPUs)           MORNING
Character sheet ─┐                                 Render queue (jobs, exists)             Dailies
Set board        ├─► keyframe per cut ─► "Render ─► spot GPU workers: LTX 2.5 ─────────►  scores, receipts,
(wide + angles)  ┘   (image edit, fal)   tonight"    Ingredients · multishot · FLF ·        resubmit list
                                                     extend · depth control
                                                   ─► continuity scorer (same worker)
                                                   ─► night-shift agent (retry/restart/report)
```

Rules: one model family per film (a project setting); stills are locked before video; nothing is
deleted; every take is priced before and receipted after; the reverse angle is a geometry problem, not
a speed problem.

## Stack

| Layer | Now | Adds |
|---|---|---|
| Web (Next.js, Cloudflare) | Scenes, bible, takes, tokens | Character + Environment screens (DESIGN.md §4.1/4.2), keyframe step per cut, "Render tonight" + queue position, Dailies |
| DB (Supabase) | jobs, takes, receipts, registry | `characters.references[]`, `environments` (fixed fields, master wide, angles, fork), `pins`, `takes.continuity[]`, render windows per org |
| Orchestrator (Python, Render) | claim, gate, fal adapter | `self@modal` adapter, batch window scheduler, low-res preview lane |
| Stills (fal) | — | Flux 2 edit (multi-reference keyframes), Qwen image-edit multiple-angles (set board) |
| Video (self-hosted) | LTX/Veo via fal | ComfyUI headless on Modal/RunPod spot: LTX 2.5 + Ingredients + Union-Control; fal LTX as fallback |
| Scoring | — | ArcFace + DINOv2 on the worker (geometry match later), per take |
| Ops | Sentry, weekly registry watch | night-shift agent, morning report, spend caps, requeue on worker loss |

## Order of work

1. **Spike** (2 weeks, ~$200): LTX 2.5 + Ingredients on a rented H100. Measure s/clip, face hold, location-panel hold across two angles. Kill criteria in `research/self-host-feasibility-2026-09.md` §5. Needs a Modal/RunPod account with a spend cap.
2. **Stills in class** (hosted; independent of 1): registry rows for Flux 2 edit + Qwen angles; Character screen (reference slots, fingerprint); Environment screen (master wide → angles, fixed conditions fork); keyframe step on each cut.
3. **Render queue + dailies**: "Render tonight" per cut/scene, queue position, batch window per org, Dailies page with resubmit. Ships against fal before the worker exists.
4. **Self-hosted worker**: Modal/RunPod adapter, ComfyUI graph, spot handling, fal fallback, preview lane.
5. **Continuity scores** in the take UI and the morning report.
6. **Night-shift agent**, spend caps; then a real Pegasus cohort to learn true clips/day.

## Open numbers
- seconds per clip on H100 (no public benchmark) — drives every cost figure
- clips per student per class (guess: 6–7) — drives queue sizing
- whether Ingredients + character LoRA + depth control stack
