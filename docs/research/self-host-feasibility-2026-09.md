# Imaje — Self-hosted video stack feasibility (23 Sep 2026)

**Short version:** The premise is half-right. Hosted per-second endpoints (fal's LTX-2.5) expose only start/end-image I2V — no reference sheet, no multishot, no extend, no LoRAs ([fal LTX-2.5 Fast](https://fal.ai/models/lightricks/ltx-2.5/image-to-video/fast)). But "self-host" does not mean buying GPUs: the continuity features you want are open-weight and run fine on rented serverless H100s. **Build a custom LTX-2.5 worker on Modal/RunPod; do not buy hardware; do not plan on trained set-LoRAs.** Only one model family qualifies under US law, so "one model family per film" collapses to "LTX-2.5 for everything".

## 1. Open-weight models with real continuity controls

| Model | Licence (URL) | Continuity conditioning | Size / res / len | VRAM | ~5 s clip | Comfy / diffusers | Char | Env |
|---|---|---|---|---|---|---|---|---|
| **LTX-2.5** (22B, Aug 2026) | LTX-2.x Community: free commercial <$10M revenue, paid above ([LICENSE-2_x](https://github.com/Lightricks/LTX-2/blob/main/LICENSE-2_x)) | **Ingredients IC-LoRA** (single reference sheet: characters + props + one location panel; "setting panel carries forward" — [HF](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Ingredients)), native multishot, first/last frame, extend, Union-Control depth/pose/canny (2.3 IC-LoRA, runs on 2.5 — [HF](https://huggingface.co/Lightricks/LTX-2.3-22b-IC-LoRA-Union-Control)), LoRA + IC-LoRA training | 22B DiT + Gemma-4 12B encoder; up to 4K; 121 frames = 5.04 s standard ([README](https://github.com/Lightricks/LTX-2)) | bf16 ~66 GiB on disk; int8-convrot fits 32 GB; `--quantization fp8-cast` ([RunPod blog](https://www.runpod.io/blog/ltx-2-5-the-open-weights-world-model-built-for-speed-and-how-to-run-it-on-runpod)) | 5090: 8 s 720p I2V ≈ 80 s bf16-distilled; int8 faster; OOM at 15 s ([hands-on](https://note.com/truenorthai/n/nf600b6190507)); ~25 s for 4 s 720p ([runaihome](https://runaihome.com/blog/ltx-2-5-local-ai-video-hardware-guide-2026/)). **H100/L40S: not found** | Native ComfyUI templates + `ltx-pipelines`; diffusers `LTX2Pipeline` on main only ([docs](https://huggingface.co/docs/diffusers/api/pipelines/ltx2)) | **4** | **4** |
| **Wan 2.2** A14B (+VACE-Fun, Phantom, Animate-2) | Apache 2.0 ([GitHub](https://github.com/Wan-Video/Wan2.2)) | Phantom ≤4 subject refs (480p-trained); VACE-Fun depth/pose/canny + ref image ([HF](https://huggingface.co/alibaba-pai/Wan2.2-VACE-Fun-A14B)); Animate = performance transfer. **No environment ref.** | 27B MoE; 720p; ~5 s (81 f) | ≥80 GB bf16; GGUF Q4 on 24–32 GB | 5090 832×480×81 Q4: ~125 s vs LTX-2.3 22 s ([bench](https://zenn.dev/toki_mwc/articles/ltx23-vs-wan22-i2v-benchmark-rtx5090?locale=en)) | Both (Kijai wrapper for VACE) | 3 | 2 |
| Wan 2.5/2.6/2.7/3.0 | **API-only; no weights.** HF org tops out at Wan2.2 ([Wan-AI](https://huggingface.co/Wan-AI), [HF forum](https://discuss.huggingface.co/t/where-are-the-wan-3-0-weights-short-answer-there-are-none-wan-2-2-is-the-last-open-one/180223)) | — | — | — | — | — | — | — |
| HunyuanVideo-1.5 / HunyuanCustom | Tencent Community; **void in EU/UK/KR**, >100M MAU cap ([LICENSE](https://github.com/Tencent-Hunyuan/HunyuanVideo-1.5/blob/main/LICENSE)) | 1.5 = T2V/I2V only; Custom = identity image (old 13B base, 80 GB) | 8.3B; 720p; 10 s | 14 GB w/ offload | 5090 848×480 5 s ≈ 284 s ([HF](https://huggingface.co/tencent/HunyuanVideo-1.5/discussions/3)) | Both | 2 (Custom 4) | 2 |
| **MiniMax H3-Base** (33B, Aug 2026) | H3 Community: <$20M revenue, attribution; **"Excluded Territories means the EU, the UK, Korea and the USA"**; rights granted "solely within the Applicable Territory"; US users must "contact us about obtaining a license" ([LICENSE](https://huggingface.co/MiniMaxAI/MiniMax-H3/blob/main/LICENSE)). Reason given: Disney/Universal/WBD suit ([The Batch](https://www.deeplearning.ai/the-batch/minimaxs-state-of-the-art-video-model-is-only-minimally-open)) | Ref2VA ≤9 images + 3 video + 3 audio refs; first/last frame | 768p; 4–15 s | bf16 62 GB; int8 32 GB ([comfyui-wiki](https://comfyui-wiki.com/en/news/2026-08-03-minimax-h3-open-weights-comfyui)) | 5090 ~1.5–4 min; H200 90 s/14 s clip | ComfyUI native | 4 | 3 |
| SkyReels-V3 R2V (Jan 2026) | Skywork Community, no thresholds found ([LICENSE](https://github.com/SkyworkAI/SkyReels-V3/blob/main/LICENSE.txt)) | 1–4 refs incl. backgrounds; V2V extend | 14B; 720p | ≥24 GB fp8 | not found | diffusers; no official Comfy | 3 | 3 |
| Mochi 1 / CogVideoX-1.5 / Open-Sora 2.0 | Apache / custom / Apache | T2V, I2V only | 2024–25 gen | — | CogVideoX H100 ~550 s | — | 1 | 1 |
| Seedance, FLUX 3 Video, Stability | No open video weights in 2026 | — | — | — | — | — | — | — |

**MiniMax H3 answer:** a US company running H3 on US cloud GPUs is deploying inside an Excluded Territory without a grant. Not legally usable without a bespoke licence from MiniMax — and given the pending studio litigation, not a model to put in front of minors. Dead.

**Continuity evidence is thin everywhere.** No independent head-to-head of Ingredients vs H3 vs SkyReels exists. The LTX-2.3 IC-LoRA test that circulated showed strong face hold but heavy dependence on shot ordering and a face-forward reference at clip start ([MindStudio](https://www.mindstudio.ai/blog/bach-model-vs-ltx-2-3-ic-loras-character-consistency)). Ingredients 0.9 is trained **only at 768×448×121** ("other resolutions out of distribution") and needs the IC-LoRA loader node. The 4/4 for LTX-2.5 is "best available", not "solved".

## 2. Per-project fine-tunes

| Item | LTX-2.5 | Wan 2.2 |
|---|---|---|
| Tooling | `ltx-trainer` (only tool that trains IC-LoRA; "80 GB+ recommended", 32 GB low-VRAM INT8 config: rank 16, 2000 steps, lr 1e-4 — [README](https://github.com/Lightricks/LTX-2/blob/main/packages/ltx-trainer/README.md)); ai-toolkit | ai-toolkit (14B on 24 GB), diffusion-pipe (4090 w/ fp8+offload), musubi-tuner |
| Image-only datasets | **Yes** — frame count 1 in bucket (`960x544x1`); mixed stills+video "supported but requires care" ([dataset-preparation](https://github.com/Lightricks/LTX-2/blob/main/packages/ltx-trainer/docs/dataset-preparation.md)) | Yes (ai-toolkit, diffusion-pipe, musubi) |
| Character LoRA | 20–50 images, overfits past ~1000 steps, 3–5 h on a 4090 ([WaveSpeed](https://wavespeed.ai/blog/posts/ltx-2-3-lora-training-guide-2026/)) → ~1–2 h on H100 ≈ **$4–8** | 28 images, 2500 steps ≈ 2.2 h on 5090 ([report](https://ai-muninn.com/en/blog/train-character-lora-wan22-rtx5090)); fal trainer $0.004–0.005/step ≈ **$4–5** ([fal](https://fal.ai/models/fal-ai/wan-22-trainer/i2v-a14b)) |
| IC-LoRA training | Requires **paired reference/target videos** of equal length ([training-modes](https://github.com/Lightricks/LTX-2/blob/main/packages/ltx-trainer/docs/training-modes.md)); Ingredients itself was rank 128, 12k steps, 8 GPUs — not a per-project thing | n/a |
| Stacking | Community reports up to three LoRAs before the IC-LoRA loader; no rigorous char+set+control test found | 2.2 high-noise LoRAs break I2V stacking |

**Set/environment LoRAs — no evidence they hold layout.** No Reddit/Banodoco/Civitai report of a room LoRA preserving floor plan across new angles. Community practice is the opposite: caption backgrounds *out*, train "camera angles one at a time" ([Civitai](https://civitai.com/articles/11942/training-a-wan-or-hunyuan-lora-the-right-way)). Expect palette, furniture style and lighting — not geometry. Treat it as a spike question, not a roadmap item.

**Geometry anchor:** Blender block-out → depth/canny → control is a real pipeline (Mickmumpitz "AI Renderer 2.0", Blender/Unreal passes into Wan VACE — [RunComfy](https://www.runcomfy.com/comfyui-workflows/blender-to-comfyui-ai-renderer-2-0-workflow-cinematic-video-output)); LTX Union-Control does the same job. Classroom-realistic only as a **teacher-run station**: students can't run Blender + a 22B model in a period. Seed reuse is not a continuity technique; first/last frame + extend (`LTXVExtendSampler` overlap) + Ingredients are.

## 3. Infrastructure economics (prices seen 23 Sep 2026)

| Provider | H100 80GB | H200 | L40S / A6000 | 5090 / 4090 | Billing / cold start | URL |
|---|---|---|---|---|---|---|
| Modal | $3.95 | $4.54 | $1.95 / — | — | per-sec; ~2 s container, but **snapshots don't speed weight load**; 45 GB from Volume at 1–2.5 GB/s ≈ 20–45 s, real reports 30–90 s | [pricing](https://modal.com/pricing), [snapshots](https://modal.com/docs/guide/memory-snapshot) |
| RunPod serverless | $4.79 | $5.93 | $1.75 / $1.22 | $1.58 / $1.10 | per-sec; FlashBoot "sub-200 ms" only on same-host restore; 60–120 s otherwise | [pricing](https://www.runpod.io/pricing) |
| RunPod pods (secure) | $3.49 | $4.59 | $1.09 / $0.53 | $0.99 / $0.74 | per-sec | same |
| fal serverless GPU | $4.50 list / $1.89 discounted | $4.50 / $2.10 | — | — | per-sec runner-alive; setup not billed | [pricing](https://fal.ai/pricing) |
| Lambda | $3.99–4.29 | — | — / $1.09 | — | per-min; VM boot ~45 s | [pricing](https://lambda.ai/pricing) |
| Together dedicated | $3.99 promo (reg. $5.49) | contact | — | — | per-min | [pricing](https://www.together.ai/pricing) |
| Crusoe | $3.90 | $4.29 | $1.50 / — | — | hourly VM; $0 egress | [pricing](https://crusoe.ai/cloud/pricing) |
| Nebius | $3.85 (→$4.50 on 1 Oct) | $4.50 | $1.55 | — | hourly; spot $0.74–0.99 | [prices](https://nebius.com/prices) |
| Vast.ai | ~$1.87–4.00 | — | — | ~$0.27–0.67 / $0.34–0.44 | interruptible; not verified live | [vast](https://vast.ai/pricing) |
| Buy: 5090 | $4.2–7.4k street ([tracker](https://videocardprices.com/card/nvidia-rtx-5090)); H100 SXM $25–30k; 1U colo ~$850/mo ([clusterbid](https://clusterbid.com)) | | | | | |

Storage: LTX-2.5 full pack ~66 GiB + LoRAs (Union-Control is 654 MB; rank-16 project LoRAs likely 100–300 MB, unverified). Modal $0.09/GiB-mo, RunPod volume $0.07/GB-mo → **<$15/mo** even at 100 projects. Egress: 5 s 768×448 clip ≈ 2–5 MB; deliver via Cloudflare R2 ($0.015/GB-mo, zero egress — [R2](https://developers.cloudflare.com/r2/pricing)). Negligible.

**Monthly model** (20 school days; LTX-2.5 distilled at 768×448×121 + Ingredients; assume **30 s/clip on H100 incl. decode + NSFW + scorer — an estimate, no H100 benchmark exists**; warm pool sized so 40 simultaneous submits clear in <7 min):

| Profile | Clips/day | Self-host (Modal H100 warm pool + burst) | Cheaper variant | fal hosted @ $0.09 / $0.13 per s |
|---|---|---|---|---|
| (i) 1 school, 3 h/day | 200 | 2 warm × 3.5 h + burst to 4 ≈ **$700** | RunPod 5090 serverless active ≈ $450 (slower) | **$1,800 / $2,600** |
| (ii) 5 schools (overlapping hours) | 1,000 | 6 warm × 4 h + burst ≈ **$2,500** | | **$9,000 / $13,000** |
| (iii) 20 schools | 4,000 | ~20 warm × 5 h + burst ≈ **$10,000** | 24/7 dedicated 16×H100 ≈ $44k — worse, utilisation ~20% | **$36,000 / $52,000** |

**Break-even:** on compute alone, self-host on rented serverless wins from school one (~60% cheaper) and the gap widens linearly. The honest denominator is people: ~4–6 founder-weeks to build (≈$15–25k opportunity cost) plus ~0.2 FTE to keep it alive. Payback ≈ 12 months at one school, **~2–3 months at five**. But the comparison is partly moot: the hosted endpoint can't run Ingredients/multishot/LoRAs at all, so the true alternative to building is *not having the feature*.

**On-call reality:** classes are synchronous; a 15-minute outage kills a period and you'll hear about it that day. Serverless removes hardware ops but not model-ops (ComfyUI node breakage, OOMs on odd aspect ratios, Modal alpha snapshot segfaults — [issue](https://github.com/modal-labs/modal-client/issues/4132)). Two people must run a **degraded mode**: fall back automatically to fal's hosted LTX-2.5 I2V (same model family, start/end image only) when the queue's p95 > 3 min or workers fail health checks.

## 4. Architecture if you build

- **Worker:** start **ComfyUI headless** (official LTX-2.5 templates already wire Ingredients, multishot, extend, Union-Control; the IC-LoRA loader is a specific node the generic loader won't replace). Front it with Salad's `comfyui-api` — the only wrapper with per-request model URLs + LRU cache + warmup + `/health` ([repo](https://github.com/SaladTechnologies/comfyui-api)). Migrate hot paths to a `ltx-pipelines`/diffusers worker later (`load_lora_weights(hotswap=True)` — [docs](https://huggingface.co/docs/diffusers/main/en/using-diffusers/loading_adapters)) if Comfy's single-user server becomes the bottleneck. Skip RunPod `worker-comfyui` for LoRAs (volume-only, no hot-swap — [docs](https://github.com/runpod-workers/worker-comfyui/blob/main/docs/customization.md)). No official Comfy-Org runtime Docker exists; build your own from `comfy-cli`.
- **Queue:** keep Postgres claim; worker pulls a job, calls Modal function (`@modal.concurrent(max_inputs=1)`), writes result URL back. Modal `min_containers` set by a cron per school timezone (08:00–15:30), `scaledown_window` 10 min ([cold start](https://modal.com/docs/guide/cold-start)). Weights on a Modal Volume; GPU snapshot for CUDA init only.
- **LoRAs:** one `/loras/{project_id}/` dir on the Volume; budget 2–10 s load per swap (no published benchmark); pin state dicts in RAM per worker; group jobs by project in the queue to avoid thrash.
- **Speed:** SageAttention 2 + distilled 8-step; xDiT supports LTX-2.5 for multi-GPU if you ever need <10 s latency ([xDiT](https://github.com/xdit-project/xDiT)).
- **Safety:** sample 2 frames/s → Falconsai ViT gate on-GPU ([HF](https://huggingface.co/Falconsai/nsfw_image_detection)) → flagged frames to AWS Rekognition ($0.001/image — [pricing](https://aws.amazon.com/rekognition/pricing/)) for suggestive/minor labels. Avoid NudeNet (AGPL).
- **Continuity scorer:** runs on the same worker post-decode (ArcFace on face crops vs sheet; DINOv2 on background crops vs location panel); writes scores to Postgres; also your spike metric.

## 5. Verdict: **HYBRID — build the software, rent the GPU, keep fal as fallback**

**Don't** buy hardware, don't touch H3, don't promise set-LoRAs. **Do** run a 2-week spike:

| Days | Run | GPU | Cost |
|---|---|---|---|
| 1–2 | Modal Volume with LTX-2.5 distilled + Gemma-4 + VAEs + Ingredients 0.9 + Union-Control; ComfyUI headless via `comfyui-api` | H100 | ~$25 |
| 3–6 | 3 test films × (2 characters + 1 location sheet) × 12 shots at varied angles; ArcFace/DINOv2 + blind rating by both founders + one teacher | H100 | ~$40 |
| 7–8 | 4-shot chains: native multishot vs extend vs first/last frame | H100 | ~$25 |
| 9–10 | Train one character LoRA (low-VRAM config, 30 stills, 2000 steps) and one "set LoRA" (master wide + 12 angles); A/B vs Ingredients-only | H100 | ~$20 |
| 11–12 | Load test: 40 simultaneous jobs on 1/2/4 H100s; measure p50/p95, cold start with and without `min_containers`, LoRA swap time | H100 | ~$60 |
| 13–14 | NSFW gate + fal-fallback switch; write-up | — | ~$10 |

Total ≈ $180–220 incl. storage; upgrade to a 5090 RunPod pod for a cost-floor comparison if budget remains.

**Kill criteria (any one → stay on hosted I2V and stop):**
1. Character hold: <70% of shots rated "same person" blind, or ArcFace sim <0.5 on ≥30% of shots.
2. Environment hold: location panel fails to survive ≥2 distinct camera angles in most tests.
3. p95 > 90 s per 5 s clip on one H100, or 40 concurrent jobs can't clear in <5 min on ≤4 GPUs.
4. Cold start > 120 s with no warm-pool schedule under $800/mo per school.
5. >1 crash per 100 jobs across ComfyUI + nodes over the load test.
6. Trained LoRAs show no measurable gain over Ingredients → drop per-project training from the roadmap (that alone removes most of the ops burden).

## Could not verify
- Any **H100 or L40S** timing for LTX-2.5, Wan 2.2 14B 720p, SkyReels-V3; all cost math uses a 30 s/clip estimate.
- Size (MB) of a rank-16 LTX-2.5 LoRA and real `load_lora_weights` seconds on a 22B model.
- Any independent multi-model continuity benchmark; VBench for LTX-2.5/H3.
- Whether Ingredients + character LoRA + Union-Control stack cleanly (no test found).
- Modal `docs/examples/comfyapp` (fetch returned a different page); any official Comfy-Org runtime image.
- Modal egress price; RunPod flex vs active rate split; live Vast.ai rates; Hetzner GEX131 price.
- ltx.io blog pages (403); Patreon Ingredients guide (fetch failed).
- LTX-2.5 fp8 checkpoint (only int8-convrot + NVFP4 published; runtime `fp8-cast` exists).
- Whether Hunyuan EU/UK exclusion matters — assumed all students are in the US.

---

## Addendum (23 Sep 2026, after review with Tim): overnight batch changes the economics

The cost model above assumed a warm pool so a clip returns in minutes during class. Tim's model is a
render queue: students lock stills in class, queue the video shots, and review "dailies" next morning.

- No warm pool, no cold-start problem; interruptible/spot GPUs ($0.75–1/h) are fine because nobody waits.
- Cost falls to the compute floor, ~1–3¢ per clip (30 s/clip unverified). 20 schools × 4,000 clips/night ≈ $40–120/night.
- The in-class loop moves to keyframes (image edit: seconds, pennies) plus an optional low-res preview render.
- Ops: a night queue has no audience, so "on-call" becomes "did it all render by 7am". Self-healing plumbing
  (health checks, requeue on worker loss, retry budgets) + a scheduled night-shift agent (retry, restart, roll
  back to last good image, morning report) + escalation to a human only for spend/security/model changes.
- Unchanged: the reverse-angle problem is about what the model knows, not speed.
