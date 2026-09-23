> Correction (later report): Wan 2.7 is API-only, not open weights; the last open Wan is 2.2. See continuity-one-family-2026-09.md.

# Character Continuity for Imaje — research report (Sep 2026)

## 1. "OmniChar" — it exists, and it's exactly the thing

**OmniChar** is an open-source (GPL-3.0) "AI character studio for portable identity" by Aesthisia Datacenters Pvt Ltd. Repo: https://github.com/omnichar/OmniChar; site: https://www.omnichar.org/.

- You drop 1–9 photos; it compiles a portable **`.char`** file holding reference crops (face / body / clothing slots) plus an identity fingerprint: **SFace face signature + DINOv2 subject signature** (per omnichar.org). Trained LoRAs can also live in the `.char`.
- Every generation returns a **continuity score /100**; for video it reports the worst frame and its timestamp. Underlying algorithm not documented beyond SFace/DINOv2 — **unverified**.
- Runs locally (Python 3.11+, NVIDIA/ROCm/Apple Silicon) with hosted "API Nodes" that relay to **fal.ai** (`queue.fal.run`) for FLUX.2, MiniMax H3, LTX, Seedance, Kling, etc. You pay fal per render; OmniChar itself is free.
- It is a desktop/self-hosted app with an internal HTTP surface (`/rpc`, `/events`, `/media`, `/upload`), **not a SaaS API**, and it is not on fal/Replicate. No minors/likeness policy published.

Verdict: not a drop-in dependency for a hosted student platform, but its design (reference-crops + identity embedding + per-take drift score, portable across models) is the blueprint we should copy. The MiniMax H3 workflow page shows the face/body/cloth slot approach: https://www.omnichar.org/workflows/minimax-h3-guided-consistent-characters-via-reference-identity-face-body-cloths.

## 2–3. Options table

| Name | Mechanism | fal/Replicate endpoint | Price | Refs | Face+wardrobe? | Minors/likeness | Verdict |
|---|---|---|---|---|---|---|---|
| **Veo 3.1 reference-to-video** | Google "Ingredients": asset images conditioned in-model | `fal-ai/veo3.1/reference-to-video`, `fal-ai/veo3.1/fast/reference-to-video` ([std](https://fal.ai/models/fal-ai/veo3.1/reference-to-video), [fast](https://fal.ai/models/fal-ai/veo3.1/fast/reference-to-video)) | Std $0.20/s no audio, $0.40/s audio (720/1080p); 4K $0.40/$0.60. Fast $0.10/s / $0.15/s | Up to 3 asset images of one subject ([Gemini docs](https://ai.google.dev/gemini-api/docs/veo)); 8 s required with refs | Yes (Google claims face + clothing) | `personGeneration=allow_adult` is the only value for reference mode; child/teen faces are blocked and false positives common ([forum](https://discuss.ai.google.dev/t/veo-3-1-image-to-video-blocks-wholesome-commercial-storyboard-child-safety-false-positive/131917)) | Best quality, but **Lite has no reference mode** and **no minors** — a hard problem for a student platform if characters are kids |
| **Veo 3.1 Lite i2v** (current) | single start frame | `fal-ai/veo3.1/lite/image-to-video` ([page](https://fal.ai/models/fal-ai/veo3.1/lite/image-to-video)) | $0.03–0.08/s | 1 start image | Only via keyframe | same policy | Keep as cheap tier; identity comes from the keyframe |
| **LTX-2.5 (fal)** | i2v + end frame; no reference/LoRA param on hosted endpoint | `lightricks/ltx-2.5/image-to-video/{fast,pro}` ([fal](https://fal.ai/ltx-2.5), [schema](https://fal.ai/models/lightricks/ltx-2.5/image-to-video/fast/api)) | fast $0.09/s 720p, $0.13/s 1080p; pro $0.12/$0.17 | start + end image only | Only via keyframe | fal AUP: no sexual/harm to minors; end-users must be 18+ ([AUP](https://fal.ai/legal/acceptable-use-policy)) | Keyframe-driven; identity lives in the still |
| **LTX-2.5 IC-LoRA "Ingredients"** | reference-sheet conditioning (composite of face close-up, turnaround, props, location) | HF only, gated, v0.9 preview (10 Sep 2026) ([HF](https://huggingface.co/Lightricks/LTX-2.5-22b-IC-LoRA-Ingredients), [issue](https://github.com/dkackman/diffusers-workflow/issues/151)); not on fal | self-host | 1 sheet, multiple subjects | Yes | LTX-2 community licence | Watch; needs ComfyUI/diffusers today |
| **LTX-2 LoRA trainer (fal)** | train per-character LoRA from 10–50 video clips | `fal-ai/ltx2-video-trainer` → `fal-ai/ltx-2-19b/{text,image}-to-video/lora` ([guide](https://fal.ai/learn/devs/ltx-2-video-trainer-user-guide)) | $0.0048/step (~$9.60 / 2000 steps, 20–40 min) | video dataset, no images | Yes if dataset has it | — | Too slow/expensive per student character; LTX-2.5 endpoints don't take LoRAs |
| **Kling O1 / O3 reference-to-video** | "Elements": frontal image + extra angles per element, `@Element1` in prompt | `fal-ai/kling-video/o1/reference-to-video` ([page](https://fal.ai/models/fal-ai/kling-video/o1/reference-to-video)); `fal-ai/kling-video/o3/standard/reference-to-video` ([page](https://fal.ai/models/fal-ai/kling-video/o3/standard/reference-to-video)) | O1 $0.112/s; O3 std $0.084/s (no audio) / $0.112/s (audio) | O1: up to 7 inputs; O3 element cap **unverified** | Yes — full-body elements | Kling: no content harming minors ([policy](https://kling.ai/docs/user-policy)) | **Strong candidate**: cheapest true multi-ref with body/wardrobe |
| **MiniMax H3 reference-to-video** | up to 9 subject/style images (+3 video, +3 audio), cited by order | `minimax/h3/reference-to-video` ([page](https://fal.ai/models/minimax/h3/reference-to-video)) | $0.05/s 480p, $0.06 768p, $0.13 2K, $0.16 4K; first 5 refs free then $0.08 each | 9 images | Yes (page example preserves hair, crown, robes) | MiniMax: not for under-16s; "avoid submitting children's images" | **Strong candidate** — cheapest per second, face+body+cloth slots (OmniChar's preferred video target) |
| **Seedance 2.0 / 2.5 reference-to-video** | multimodal refs | `bytedance/seedance-2.0/reference-to-video` ([page](https://fal.ai/models/bytedance/seedance-2.0/reference-to-video)); 2.5 ([page](https://fal.ai/models/bytedance/seedance-2.5/reference-to-video)) | 2.0: $0.30/s 720p ($0.24 fast), $0.68/s 1080p; 2.5: $0.22/s 480p, $0.47/s 720p, $1.16/s 1080p | 2.0: 9 images/12 files; 2.5: up to 50 | Yes ("exact outfit") | Seedance intercepts identifiable real faces ([blog](https://vicsee.com/blog/seedance-content-filter)) | Excellent but 3–5× the price of H3/Kling |
| **Wan 2.7 reference-to-video** | multi-subject refs, "appearance and voice" | `fal-ai/wan/v2.7/reference-to-video` ([page](https://fal.ai/wan-2.7), [api](https://fal.ai/models/fal-ai/wan/v2.7/reference-to-video/api)) | $0.10/s | multiple images/videos (api page says up to 20 URLs; another source says 5 — **conflict, verify**) | Claimed | — | Good mid-price alternative; voice continuity is interesting |
| **Pika 2.2 Pikascenes** | "ingredients" images composited | `fal-ai/pika/v2.2/pikascenes` ([page](https://fal.ai/models/fal-ai/pika/v2.2/pikascenes)) | $0.04/s 720p, $0.06/s 1080p | up to 5 | Object-level, weaker on face | — | Cheap but quality lower; skip |
| **Runway Gen-4 References** | refs for **image** gen (gen4_image), then i2v | Runway API only ([pricing](https://docs.dev.runwayml.com/guides/pricing/)) | $0.01/credit: gen4_image 5–8 cr/img; gen4_turbo $0.05/s; gen4.5 $0.12/s; +1 cr/ref | refs on image model | Yes for keyframes | — | Another vendor to integrate; not needed |
| **FLUX.2 edit (multi-ref) for keyframes** | image model reads up to 9–10 reference images | `fal-ai/flux-2-pro/edit` ($0.03 first MP), `fal-ai/flux-2/edit` ($0.012/MP), `fal-ai/flux-2-flex/edit` ($0.06/MP) ([pro](https://fal.ai/models/fal-ai/flux-2-pro/edit), [dev](https://fal.ai/models/fal-ai/flux-2/edit)) | cents per keyframe | 9 (pro) / 10 (flex) | Yes | — | **Core of the keyframe path** — OmniChar uses FLUX.2 natively for this |
| **PuLID-Flux** | face-embedding conditioning, one photo | `fal-ai/flux-pulid` ([page](https://fal.ai/models/fal-ai/flux-pulid)) | $0.0333/MP | 1 | Face only | — | Fallback for face-lock; wardrobe from prompt |
| **Flux LoRA trainers** | per-character LoRA from ~10–20 images | `fal-ai/flux-lora-fast-training` ($0.005/step, [page](https://fal.ai/models/fal-ai/flux-lora-fast-training)), `fal-ai/flux-lora-portrait-trainer` ($0.0024/step, min 1000, [page](https://fal.ai/models/fal-ai/flux-lora-portrait-trainer)), FLUX.2 LoRA $0.008/step; inference `fal-ai/flux-2/lora` $0.021/MP | ~$2.40–10 per character, minutes | images | Yes | — | Only for "star" characters; multi-ref edit is usually enough |

## 4. Consistency measurement ("continuity score")

- **ArcFace/InsightFace** (buffalo_l, 512-d, cosine): same person > ~0.4, different < ~0.3 ([facematch toolkit](https://github.com/an80sPWNstar/facematch) does exactly "score generated images/video against reference photos"). fal's own **AuraFace-v1** is an Apache-licensed ArcFace-style model usable via InsightFace ([HF](https://huggingface.co/fal/AuraFace-v1)). No hosted "compare two faces" endpoint on fal or Replicate was found — **unverified negative**; Replicate has InstantID/Arc2Face but not a scorer.
- **Hosted alternatives**: AWS Rekognition `CompareFaces` (similarity 0–100), Hive Face Similarity ([docs](https://docs.thehive.ai/docs/face-similarity)), Face++. Pennies per call.
- **Wardrobe/body**: DINOv2 or CLIP embedding of a body crop vs reference (this is what OmniChar's "subject signature" does). No vendor returns a score with the video.
- Cheapest build: a tiny Python worker (Render/Modal) running InsightFace + DINOv2, sampling ~8 frames per take; report min face cosine, mean, and the worst frame's timestamp — mirroring OmniChar's UX.

## 5. Who does it well as a product

| Product | Mechanism | Cost |
|---|---|---|
| **Martini** (martini.film; YC) | "character bible" + one canonical reference fed to every model; no training | Pro $30/mo, Studio $150/mo; 1 olive=$0.10; Veo 3.1 $0.18–0.54/s ([pricing](https://www.martini.film/pricing)). Note martini.art now redirects to **astorie.ai** — a different product; don't conflate |
| **Higgsfield Soul ID** | trains identity from 20–80 photos (~3–5 min), reused in image and Seedance video Elements; not exportable ([help](https://higgsfield.ai/creator-hub/help-center/ai-models/how-do-i-create-and-use-a-soul-id-character)) | Basic $9, Plus $49, Ultra $129/mo; training needs paid plan |
| **LTX Studio** | "Elements" saved characters referenced with `@`; Pro tier "unlimited trained actors" | $15 / $35 / $125/mo |
| **Google Flow** | Ingredients (3 refs) on Veo 3.1 | AI Pro $19.99 (1,000 cr); Veo 3.1 Quality 100 cr/8 s ([magichour](https://magichour.ai/blog/google-flow)) |
| **Freepik/Magnific** | Custom Characters = LoRA from 12–24 images | from $7/mo |
| **Krea** | one reference image per video model | $9 / $35 Pro |
| **Runway** | Gen-4 References on image, then video | $12/mo+ |

Pattern: nobody relies on LoRAs for the mainline anymore; everyone anchors on **reference images + a locked canonical portrait**, and the two "trained" products (Higgsfield, Freepik) do it for stills.

## Recommended architecture: build once, keep across scenes

1. **Character record** (`characters` table): student answers a short wizard → Claude writes a *character bible* (fixed traits, wardrobe, signature items). Generate a **canonical set** with `fal-ai/flux-2-pro/edit`: front close-up, 3/4, profile, full-body turnaround, wardrobe flat — all from the same seed. Store crops in slots: `face[]`, `body[]`, `wardrobe[]` (OmniChar's schema). Compute and store **ArcFace + DINOv2 embeddings** at build time.
2. **Per-shot keyframe**: for every shot, generate the first frame with FLUX.2 edit using 3–6 slot images + scene prompt (cents). Score it against the fingerprint before spending video money; auto-retry below threshold.
3. **Video**: default to keyframe → `lightricks/ltx-2.5/image-to-video/fast` or `veo3.1/lite/image-to-video` (identity carried by the keyframe, cheapest). For dialogue/turning shots where a single frame won't hold, route to a multi-reference model: **MiniMax H3** ($0.06/s 768p, 9 refs) or **Kling O3** ($0.084/s), passing the slot images. Veo 3.1 reference mode only for adult characters, 8 s, $0.10+/s.
4. **Continuity score**: worker samples frames, min face cosine (ArcFace) + body DINOv2 cosine → 0–100 with worst-frame timestamp, shown per take; threshold ~0.45 face cosine to flag drift.
5. **Optional "lock"**: Flux LoRA (`flux-lora-portrait-trainer`, ~$3) for a student's lead character if edit-with-refs drifts; keep LTX video LoRAs off the table.

**Verify by test** (same 6 shots × 3 characters, incl. wardrobe change and profile view): (a) H3 vs Kling O3 vs Wan 2.7 identity hold at 768p; (b) whether Veo Lite i2v holds identity over 8 s when the face turns; (c) real Kling O3 element cap and Wan 2.7 ref cap (conflicting docs); (d) minors: what H3/Kling/Seedance actually do with synthetic teen characters — Veo will refuse; (e) whether our ArcFace score correlates with human judgement on stylised/animated characters (ArcFace is weak off-photoreal — may need DINOv2-only for animated styles); (f) H3 per-extra-ref pricing ($0.04 vs $0.08 — sources disagree).

**Could not verify**: OmniChar's scoring algorithm; Kling O3 element count; Wan 2.7 ref count; H3 durations; any hosted face-compare endpoint on fal/Replicate.
