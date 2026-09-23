# Imaje continuity research — one-family rule, characters + environments (Sept 2026)

## 1. Family scorecard

Prices are fal, per generated second, cited on the row. Ratings (1–5) are my synthesis of vendor claims + the community tests cited in §2; treat as provisional until the §5 test runs. **U** = could not verify.

| | **Kling 3.0 / O3** | **Seedance 2.5** | **MiniMax H3 / H3 Max** | **Veo 3.1** | **LTX 2.5** | **Wan 2.7** |
|---|---|---|---|---|---|---|
| text→video | `kling-video/v3/pro/text-to-video` $0.112 (no audio) / $0.168 (audio); Standard $0.084/$0.112 ([fal](https://fal.ai/learn/tools/how-to-use-kling-3-0-pro)) | `bytedance/seedance-2.5/text-to-video`, 480p/720p ([fal](https://fal.ai/seedance-2.5)); price U | `minimax/h3-max/text-to-video` $0.05/0.08/0.16 (480/768/1080p); turbo half that ([fal](https://fal.ai/minimax-h3-max)) | `fal-ai/veo3.1` $0.20/0.40 (no audio/audio); Fast $0.10/0.15; Lite ~$0.05 ([fal](https://fal.ai/veo-3.1)) | `lightricks/ltx-2.5/text-to-video/fast` $0.09 720p, $0.13 1080p, $0.30 4K; Pro price U ([fal](https://fal.ai/ltx-2.5)) | `fal-ai/wan/v2.7/text-to-video` $0.10 ([fal](https://fal.ai/wan-2.7)) |
| image→video | `o3/standard/image-to-video` $0.084/$0.112; Pro $0.112/$0.168; 4K $0.42 ([fal](https://fal.ai/models/fal-ai/kling-video/o3/standard/image-to-video)) | `seedance-2.5/image-to-video` (start + optional end frame) | `h3-max/image-to-video` same prices; `end_image_url` for FLF | `veo3.1/image-to-video`; Lite `veo3.1/lite/image-to-video` $0.05 720p / $0.08 1080p ([fal](https://fal.ai/models/fal-ai/veo3.1/lite/image-to-video)) | `ltx-2.5/image-to-video/pro` $0.12/$0.17; `/fast` $0.09–0.30 ([fal](https://fal.ai/models/lightricks/ltx-2.5/image-to-video/pro)) | `wan/v2.7/image-to-video` $0.10 |
| multi-ref (characters) | `o3/pro/reference-to-video` $0.112/$0.14; "Elements": up to 4 images or 8-s clips per element ([fal](https://fal.ai/models/fal-ai/kling-video/o3/pro/reference-to-video), [Kling](https://kling.ai/blog/kling-3-subject-binding-character-consistency)) | `seedance-2.5/reference-to-video` ~$0.22 480p / ~$0.47 720p (×0.6 if a video ref is present); up to 50 refs (30 img/10 vid/10 audio), `[Image1]` addressing ([fal](https://fal.ai/models/bytedance/seedance-2.5/reference-to-video)) | `minimax/h3/reference-to-video` $0.05/0.06/0.13/0.16 (480/768/2K/4K); 9 images + 3 video + 3 audio; first 5 images free then $0.08 each ([fal](https://fal.ai/models/minimax/h3/reference-to-video)) | `veo3.1/reference-to-video` $0.20/$0.40; 3 refs, "character, object, or scene" ([Google](https://developers.googleblog.com/introducing-veo-3-1-and-new-creative-capabilities-in-the-gemini-api/)) | **Not on fal.** IC-LoRA "Ingredients" (HF, reference-sheet conditioning, 768×448/121f only) ([HF](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Ingredients)) | `wan/v2.7/reference-to-video` $0.10; "multiple images/videos", count U ([fal](https://fal.ai/models/fal-ai/wan/v2.7/reference-to-video/api)) |
| environment/set ref | Elements documented for "characters, products, props… scene elements"; location-as-element **U** ([Kling](https://kling.ai/blog/kling-video-3-multi-shot-guide)) | Explicit: "locking a character, **set**, and palette across a full 30-second take" ([fal](https://fal.ai/seedance-2.5)) | fal's own sample prompt uses "empty environment shots" as refs → supported in practice | "scene" is an allowed ref type (Google blog) | Reference sheet has a **location panel** (HF card) | U |
| first+last frame | O3 line is the frame-control line (start+end) | Yes (i2v with end frame) | Yes (`end_image_url`) | `veo3.1/first-last-frame-to-video` (+Fast, +Lite) | Yes (`end_image_url`, Pro & Fast) | Yes per vendor ([WaveSpeed](https://wavespeed.ai/blog/posts/wan-2-7-first-last-frame-guide/)); fal param **U** |
| extend/continue | Native Kling API `/v1/video/extension` (+4–5 s); **fal endpoint U** | "Video extension: describe what should happen next" (fal page) — semantics of endpoint U | Not listed; U | `veo3.1/extend-video` (+Fast); fal page says "up to 30 s", another fal page says 7 s × 20 steps ≈148 s — **conflict, U** ([fal](https://fal.ai/models/fal-ai/veo3.1/extend-video)) | LTX API `/v1/extend` + open pipeline; **not on fal** ([LTX](https://ltx.io/model/capabilities/extend)) | `edit-video` only; extend U |
| multi-shot in one gen | **Yes, up to 6 shots / 15 s**, Smart or Custom storyboard ([Kling](https://kling.ai/blog/kling-video-3-multi-shot-guide)) | Timeline prompting ("0–4s wide, 4–8s medium") in one 30 s take (community) | Not documented | No | "Native Multishot" in one gen (fal page) | No |
| native audio | Yes | Yes | Yes (stereo) | Yes | Yes | Yes |
| max clip | 15 s | 30 s (720p max) | 15 s | 8 s (+extend) | 10 s Pro / 20 s Fast | 15 s (fal ref2v schema says 2–10) |
| open weights | No | No | **Yes** (Aug 3 2026, `MiniMaxAI/MiniMax-H3`) but license **excludes US/EU/UK/KR for local deployment** ([TechTimes](https://www.techtimes.com/articles/322904/20260804/minimax-h3-open-weights-exclude-us-eu-uk-korea-local-deployment.htm)) | No | **Yes** (LTX-2-community-license) | **No** — API-only; last open Wan is 2.2 ([invideo](https://invideo.io/blog/wan-2-7-complete-guide/)). *Corrects the prior report.* |
| minors / ref-image policy | Bans content harmful to minors; no explicit rule on minor ref faces — **U** ([Kling](https://kling.ai/docs/user-policy)) | Global build blocks **real-face uploads** (secondary source, [MindStudio](https://www.mindstudio.ai/blog/seedance-2-0-content-restrictions-workarounds)) | ToS bans sexual minor content only; ref rules U | Default `personGeneration` = adults only; minors need allowlist ([Google forum](https://discuss.ai.google.dev/t/request-allowlist-access-for-veo-3-1-person-generation-image-to-video-minors-project-little-learning-lab/174587)) | None stated — U | U |
| char continuity | 4.5 | 4 | 4 | 3.5 | 3 (with IC-LoRA) | 3 (U) |
| env continuity | **4.5** (multi-shot) | **4.5** (set lock, 30 s) | 3.5 | 4 (extend chain) | 3.5 (multishot, few tests) | 3 (U) |

Sources for ratings: [Vmake lab test](https://vmake.ai/blog/seedance-2-5-vs-minimax-h3-vs-kling-3) (Kling 3.0 4.5/5 cinematic incl. lighting/backlight held; Seedance 2.5 4.3; H3 4.0), [Kapwing multi-shot test](https://www.kapwing.com/resources/seedance-vs-veo-vs-kling-text-to-video-comparison-2026/) (Veo held scene structure best across angles), [Seedance 2.5 vs 2.0](https://fal.ai/learn/devs/seedance-2-5-vs-seedance-2-0) (cross-shot style consistency +1.14). Note [PersonaShot](https://arxiv.org/abs/2608.16717) finds "physical-state resets… across shots" are common in *all* models — props moving is the norm, not the exception.

## 2. Environment continuity: what actually works

**What holds geometry vs vibe.** Nothing hosted reconstructs 3D. Every mechanism below is 2D pattern-matching; Runway's own docs admit extreme angle changes (overhead) "can still break consistency" ([Runway](https://help.runwayml.com/hc/en-us/articles/40042718905875-Creating-with-Gen-4-Image-References)). Ranked by how much layout survives:

1. **Multi-shot inside one generation (Kling ≤6 shots/15 s; Seedance ≤30 s timeline; LTX multishot).** Best geometry: the model carries latent scene state across cuts, so furniture/props stay put within that take. Limit: 15–30 s per take, then you're back to mechanism 2. Kling Custom Storyboard lets students write shot/duration/camera per cut — pedagogically ideal.
2. **Extend from last frame (Veo extend-video; Kling native extension; LTX /v1/extend).** Geometry holds because the new clip is conditioned on real pixels of the old one. Drift compounds over chains; Veo forum reports 7 s steps.
3. **Master wide → Qwen-Image-Edit 2511 Multiple-Angles → i2v.** `fal-ai/qwen-image-edit-2511-multiple-angles` $0.035/MP; LoRA trained on 3,000+ Gaussian-splat renders with 96 camera positions (4 elevations × 8 azimuths × 3 distances) ([fal](https://fal.ai/models/fal-ai/qwen-image-edit-2511-multiple-angles), [HF](https://huggingface.co/fal/Qwen-Image-Edit-2511-Multiple-Angles-LoRA)). Because it was trained on splat renders it is the closest thing to geometry-aware novel view in a hosted image model; vendor claims "minimal structural drift." Reverse angles (>90°) still hallucinate the unseen wall. FLUX.2 edit ($0.012–0.06/MP) works for "same room, camera moved" but is vibe-level.
4. **Location plate as a reference alongside character refs (Seedance set-lock; MiniMax "empty environment shots"; Veo "scene" ref; LTX sheet location panel).** Holds palette, materials, time-of-day; layout only loosely.
5. **First+last frame with two angle-edited keyframes** forces the model to bridge two consistent views — good for "reveal" shots.

**3D routes, honestly for a classroom:**
- **World Labs Marble**: Standard $20/mo (20k credits, ~12 worlds), splat/panorama export; API 1,500 credits ≈ $1.20/world, draft 150 credits ≈ $0.12 ([World Labs](https://docs.worldlabs.ai/api/pricing), [invideo](https://invideo.io/blog/world-labs-marble-3d-worlds/)). Generate a world from your master wide, render true camera angles, feed as i2v keyframes. Cheap, ~minutes, no skill. **Caveat**: Marble's splats are soft/low-detail beyond the source view; you still run them through i2v, which re-hallucinates. Best available "true geometry" for non-technical students.
- **Apple SHARP** (open source, single image → splat in <1 s on a GPU, [UploadVR](https://www.uploadvr.com/apple-sharp-open-source-on-device-gaussian-splatting/)): only small parallax; not a reverse angle.
- **Postshot/Luma splats from a generated video**: 5–15 min per capture, needs a clean orbit video (which generated video rarely gives) — floaters, manual cleanup. Not classroom-ready.
- **Blender/3D scan**: weeks of skill; only for a dedicated elective.

## 3. Open source vs platform

| Option | GPU | Rough cost/s (serverless) | Verdict |
|---|---|---|---|
| **MiniMax H3 self-host** (FL2VA + Ref2VA) | 2×5090 (26 GB each w/ offload) or 4×H100 (66 GB each) ([MindStudio](https://www.mindstudio.ai/blog/minimax-h3-run-locally-guide)) | — | **Blocked: license excludes local deployment in the US.** Use fal at $0.05–0.06/s. |
| **LTX 2.5 22B + IC-LoRA** | 1×H100 (80 GB) realistic | H100 ≈ $1.89–3.99/h fal, $3.95/h Modal, $4.79/h RunPod serverless ([fal](https://fal.ai/pricing), [Modal](https://modal.com/pricing), [RunPod](https://www.runpod.io/pricing)); at ~1–2 min per 5 s clip ≈ $0.03–0.15/s **before** cold starts | Only route to reference-sheet conditioning for LTX; roughly break-even with hosted LTX Fast ($0.09/s), worse once you count ops. |
| **Wan 2.x** | Wan 2.7 closed; Wan 2.2 open but no ref mode comparable | — | Not worth it. |
| **OmniChar** (Electron desktop, `.char` files, SFace + DINOv2 fingerprint, continuity score/100 with worst-frame timestamp) ([GitHub](https://github.com/omnichar/OmniChar)) | Local GPU or fal-backed (its H3 workflow already targets fal) | — | Borrow the *design* (fingerprint once, score every take), not the app. |

**Blunt take for two people:** the only self-host that buys you a feature you can't buy (IC-LoRA sheet conditioning) costs ~one week of ComfyUI/Modal plumbing plus permanent on-call for OOMs and cold starts (billed). Hosted fal endpoints at $0.05–0.14/s beat it on total cost until you're past ~10 GPU-hours/day. Self-host only the **scoring worker** (§4).

## 4. Scoring per take (small worker, CPU-tolerable)

Sample 1 fps + first/last frame. All models below are open, run on CPU in seconds or on a $0.99/h A100.

- **Character face**: ArcFace/AuraFace or SFace cosine vs the character's fingerprint; report min over frames, not mean (OmniChar's rule).
- **Body/wardrobe**: DINOv2-base CLS embedding on the person crop (YOLO/segment first) vs turnaround refs.
- **Environment, cheap layer**: DINOv2 patch-token similarity + CLIP on the person-masked frame vs master wide and vs the *angle keyframe you fed in*. Catches palette/time-of-day/weather drift, not moved props.
- **Environment, geometry layer**: **MASt3R** two-image pass (pointmap + confidence + dense descriptors, seconds per pair on a small GPU; multi-image runs need >16 GB but pairs don't) ([learnopencv](https://learnopencv.com/mast3r-sfm-grounding-image-matching-3d/)). Score = fraction of confident reciprocal matches between sampled frame and master wide, plus reprojection residual. **VGGT** is the faster feed-forward alternative (0.2 s/scene, [CVPR 2025](https://www.openaccess.thecvf.com/content/CVPR2025/papers/Wang_VGGT_Visual_Geometry_Grounded_Transformer_CVPR_2025_paper.pdf)). **LoFTR via kornia** runs on CPU if you have no GPU at all. Low matches on a reverse angle are expected — compare against the *nearest angle keyframe*, not only the wide.
- **Props**: open-vocab detector (OWLv2/Grounding-DINO) on a prop list from the shot sheet; flag missing/moved.

Realistic budget: ~10–20 s per take on a single A100 spot, or ~1 min on CPU; effectively free vs generation cost.

## 5. Recommendation

**Default family: Kling 3.0/O3.** Plain-language why: it is the only family that has every piece on fal *and* generates several cuts of the same scene in one go, which is the single strongest environment-continuity mechanism today. It holds faces (Elements, 4 refs), gives start+end frame control, native audio, 4K, and its Custom Storyboard makes students think in shots. Cost is mid-pack ($0.08–0.14/s). Same family has `fal-ai/kling-image/o3/image-to-image` for keyframes. Risk: minors-as-reference policy unverified; solve by never uploading real student faces — characters are generated.

**Alternate: Seedance 2.5** if a project needs 30 s continuous takes or a hard "set lock" with a location board (up to 30 images). Costs 3–4× Kling at 720p, generation is slow (11 min in Vmake's test), and it blocks real faces outright — which is actually a feature for a school.

**Budget/open fallback: MiniMax H3** on fal ($0.05–0.06/s, 9 refs incl. environment plates, FLF), accepting no multi-shot.

**Pipeline (one family):**
1. *Project start* — choose family; lock aspect, resolution, look prompt; create shot sheet with a prop list per location.
2. *Character build* — FLUX.2 edit / Kling Image O3: face close-up + front/side/back turnaround + outfit; store fingerprints (ArcFace + DINOv2).
3. *Environment build* — one master wide per location per time-of-day (Kling Image O3 or FLUX.2); Qwen-Edit Multiple-Angles for 4–8 canonical angles (reverse, 3/4 L/R, high, low, CU insert); optional Marble world for true angles; store wide + angles as the "set board".
4. *Per cut* — composite keyframe: character refs + nearest angle plate → FLUX.2 edit / Kling Image; for dialogue coverage, write a Kling multi-shot (≤6 cuts) instead of separate i2v calls.
5. *Video* — i2v or reference-to-video with elements + plate; FLF when a shot must end on a known frame; extend for >15 s.
6. *Score* — worker returns face-min, wardrobe, env-vibe, env-geometry, prop-check; retake below threshold.

**6-shot test this week (fal, Kling family), Scene: kitchen, golden hour, two characters, one prop (red mug).**

| # | Shot | Endpoint | Est. cost |
|---|---|---|---|
| 1 | Master wide, 5 s | `o3/pro/image-to-video` audio on | $0.84 |
| 2 | Reverse angle (Qwen-Edit angle → i2v) | Qwen $0.04 + i2v 5 s | $0.88 |
| 3 | OTS A→B with elements (2 chars + mug) | `o3/pro/reference-to-video` 5 s | $0.70 |
| 4 | OTS B→A, same | same | $0.70 |
| 5 | 3-shot multi-shot coverage, 15 s | `v3/pro/text-to-video` multi-shot + elements, audio | $2.52 |
| 6 | Insert on mug, FLF (wide frame → CU keyframe) | `o3/pro/image-to-video` w/ end frame 5 s | $0.84 |

≈ **$6.50 per pass**; run 3 seeds each ≈ **$20**. Repeat the same board on Seedance 2.5 ref2v 720p (~$0.47/s × 40 s ≈ $19/pass) for a head-to-head ≈ **$60 total**. Score every take with §4; compare env-geometry on shots 2, 4, 5 (the reverse/coverage cases) — that is where families separate.

## Could not verify
- Kling: fal extend endpoint; whether an Element may be a location; explicit policy on reference images of minors; exact O3 4K/Standard ref2v prices.
- Veo 3.1: extend cap on fal (30 s vs ~148 s conflict); `allow_adult` currently erroring per forum threads.
- Seedance 2.5: t2v/i2v per-second prices; extend endpoint on fal; face-block behaviour on fal's build (secondary sources only).
- Wan 2.7: reference count, FLF/extend params on fal, minors policy; open-weights claim in prior report appears **wrong**.
- LTX 2.5 Pro t2v price; whether fal exposes multishot as parameters or prompt-only.
- MiniMax H3 max duration on ref2v; reference-image minors policy.
- All 1–5 ratings are synthesized from small vendor/community tests, not an independent benchmark.
