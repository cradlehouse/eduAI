# How AI short-film makers keep characters and environments consistent (practitioner survey, Sep 2026)

Scope note: I fetched the underlying pages where possible. Items marked **[2nd-hand]** come from press coverage or search summaries rather than the practitioner's own write-up; **[vendor]** marks tool-maker tutorials (workflow-level, but self-interested). Several key sources (Forbes, IndieWire, Playbook3D) were paywalled/403'd and are noted where relevant.

---

## The workflows

### 1. Josh Wallace Kerrigan — Neural Viz / "Monoverse" (episodic, 2025–26)
Source: https://www.thedaringcreatives.com/creator-stories/neural-viz-ai-tv-universe/
- **Tools:** Midjourney (stills), Runway Act-One (performance transfer), Hedra (lip-sync), ElevenLabs, Premiere.
- **Character:** Identity lives in a library of approved stills per alien. He performs each line on a webcam; Act-One maps his head turns/timing onto the still. Consistency comes from re-using the *same still* as the driver source, not from re-generating the character.
- **Environment:** Designed the show to hide the weakness: mostly talking heads to camera, "degraded 1990s broadcast" grade so artifacts read as VHS. Explicitly keeps "lighting and sight lines consistent so the cuts don't fall apart later." Reuses characters/locations from a growing world bin.
- **Editorial:** ~12 hours per 2–3 min episode, ~$100/month subscriptions.
- **Still fails:** Not itemised; the design choice (cartoon aliens, no photoreal humans, no complex blocking) is itself the admission.

### 2. Kavan Cardoza ("Kavan the Kid") — Phantom X / *The Chronicles of Bone* (2025–26)
Sources: https://www.thedaringcreatives.com/creator-stories/kavan-the-kid-ai-films/ ; https://aicinema.substack.com/p/how-an-ai-film-series-gets-sold-kavan (Forbes Aug 2026 piece 403'd)
- **Tools:** Physical masks/costumes → photographed on himself → Freepik/Nano Banana for design iteration → reference sheets → Kling for video → Premiere, Resolve, After Effects, Blender, Suno.
- **Character:** The only practitioner here who anchors identity in a **physical object** ("Temu outfit" method): he photographs himself in a real three-faced mask and jacket under real light, then iterates in Nano Banana until locked. Reference sheets go into every Kling generation.
- **Environment:** "AI is basically the set." Storyboards + blocking planned traditionally; environments designed with reference sheets. Detail on reverse angles not given.
- **Still fails:** Early Midjourney attempts: "I can kind of see Deadpool in this blob." Solo creator, 10–15 min monthly episodes; no per-shot take counts published.

### 3. Shy Kids — *Air Head* (Sora, 2024; still the best-documented "what breaks")
Source: https://www.fxguide.com/fxfeatured/actually-using-sora/
- **Character:** No reference input existed; "hyper-descriptive" prompts repeated shot to shot (wardrobe, balloon type, "35 mm film").
- **Environment:** Same trick — repeated lighting/lens words. Edited like a documentary: generate hundreds of clips, then find the film.
- **Editorial:** ~300:1 shooting ratio for 90 s. Roto + recolour the balloon in After Effects, remove faces Sora drew on it, remove strings, retime slo-mo clips, Topaz upscale from 480p, full grade with grain to unify.
- **Lesson repeated by everyone since:** text alone doesn't hold identity; post fixes what generation can't.

### 4. Tim Simmons (Theoretically Media) — Marble "virtual set" + Midjourney characters (Nov 2025)
Source: https://www.worldlabs.ai/case-studies/creative-film (vendor-hosted, but Simmons' own steps) ; films list https://theoreticallymedia.com/films/
- **Environment:** Generate a space-station world once in Marble (Gaussian splat), then walk it to find angles: "a stable 360-degree virtual set I could wander." Export stills as plates for each angle.
- **Character:** Midjourney with 360° pose references; composited into the plates before video.
- **Video:** Plates + character → Veo 3 i2v; touch-ups in Nano Banana/Reve; Premiere.
- Also in the same case study: Rik Vasquez stitched four Marble scenes into one .spz world for a 12-episode series, then shot it in Runway/Pika/Sora.
- **Still fails:** Not stated in the case study. Simmons' 2026 films (*The Bridge* remake, *Death Walks Into A Bar*) are credited to Seedance 2.5 end-to-end — suggests the Marble step is optional when the video model holds the room. **[2nd-hand for 2026 films]**

### 5. Blender/3D block-out → motion reference (JSFILMZ, Erika Taranto, Sam Wasserman's *Blockout*, Aug–Sep 2026)
Sources: https://erikataranto.com/en/blog/higgsfield-blender ; https://github.com/wassermanproductions/blockout ; https://gachoki.com/block-in-blender-finish-with-ai/ **[2nd-hand for Gachoki]**
- **Method:** Grey-box the set and actors in Blender (Taranto lets an assistant build it via MCP), animate the camera, export a playblast/depth pass, feed as motion reference to Seedance 2.5 / Veo 3.1 / Kling / LTX / Wan with a start frame. Wasserman's open-source *Blockout* app packages this: stage → marks → export reference video + depth + prompt + ComfyUI graph.
- **Environment:** Geometry is fixed in 3D, so "six people around a table, four cuts" keeps positions across cuts; only the "style layer" regenerates.
- **Character:** Comes from the start frame / reference image; block-out is a stand-in.
- **Cost claim:** Taranto: a dialogue scene had burned ~5,000 credits "without ever getting the right shot"; with blocking "the result came within the first iterations."
- **Still fails:** Without blocking "the camera spins on itself, the character shrinks from one shot to the next." Nothing said about faces across cuts.

### 6. Storyboard-grid first: Nano Banana Pro 3×3 → Kling 3.0 multi-shot (Max Anh, AI Fire, Mar 2026)
Source: https://www.aifire.co/p/nano-banana-2-kling-3-0-cinematic-ai-ad-workflow-2026
- **Method:** One prompt generates all nine storyboard panels at once so they share one world; fix product/character detail with edits; feed panels + character photos + product photos into Kling 3.0 with timestamped multi-shot prompts ("[0:04] Shot 1…"), three shots per run.
- **Still fails:** facial markings drift in close-ups; person-to-person contact unreliable; blurry references poison everything downstream.

### 7. Claude → Nano Banana Pro sheets → Seedance 2.0, solo weekend short (Luis Chavez-Mattos, MindStudio, Mar 2026)
Source: https://www.mindstudio.ai/blog/how-to-make-ai-short-film-under-200-claude-seedance
- **Character:** 4–6 angle sheet per character in Nano Banana Pro; 3–4 location references per environment; every shot still is generated with those sheets attached; saved prompt language reused verbatim.
- **Environment:** Location refs as anchors; keyframe still first, always.
- **Editorial:** 3–5 image variants per shot, 2–3 video variants, clips 3–6 s, straight cuts in Resolve, LUT. "If a character looks different in shot 7 than in shot 3, regenerate." ~$70–100 per finished minute.
- **Still fails:** over-generating (200+ clips) drowns the edit; starting video before locking stills wastes credits.

### 8. Midjourney omni-reference → Ideogram face fix → Seedream wardrobe → Photoshop Harmonize → Seedance (Curious Refuge, Sep 2025)
Source: https://curiousrefuge.com/blog/how-to-create-consistent-ai-characters
- Identity created in Midjourney `--oref`; face corrected with Ideogram character-reference inpaint; outfit swapped with Seedream using two references; character and background composited on layers and lighting-matched with Photoshop's Harmonize; only then i2v. Admits "it will typically take some back and forth."

### 9. Midjourney + Nano Banana asset library (Tatiana Tsiguleva, Substack, Sep 2025)
Source: https://ciguleva.substack.com/p/step-by-step-guide-consistent-characters
- Character born in Midjourney (high chaos, `--sref`), expanded to full body/angles/hands in Nano Banana; **props (a chair) generated as separate assets** and reused; scenes assembled by combining character + prop references. Environment = a reusable object library, not a place.

### 10. "Crop Duster" / "Zoomer" coverage tricks (Gabe Michael, undated ~2024–25)
Source: https://gabemichael.ai/ai-filmmaking-2-easy-methods-for-character-consistency-and-coverage/
- Generate one wide with matched eyelines, then crop progressively to medium/close/ECU (or generate a close-up and Midjourney Zoom Out 1.5/2×) → animate each crop. Reverse angles faked by **flipping the image**. Still fails: inpainting emotions distorted faces; Runway turned a wolf into a human.

### 11. Trained character LoRA on Wan 2.2 (MkSaaS guide, Jun 2026; AiorBust Patreon **[2nd-hand]**)
Source: https://wan27.org/blog/wan-2-2-lora-training-guide
- 25–40 images, ≥5 angles, ≥3 lighting setups, trigger word; rank 32–64; train on the I2V checkpoint you'll infer on; use LoRA at 0.6–0.8 *plus* a reference frame generated from the same LoRA. Wan Animate for motion transfer.
- **Still fails:** face correct at frame 1, generic by frame 60 (raise strength/rank); consistent within clip but not between clips (dataset lacked angles); "hybrid face" when reference and LoRA disagree. 3–4 h on a 12 GB GPU.

### 12. Performance-transfer / character replacement (Wan 2.2 Animate; Runway Act-One)
Source: https://docs.comfy.org/tutorials/video/wan/wan2-2-animate
- Film a human (or a stand-in) doing the blocking; "Mix" mode swaps in the reference character while keeping expression, motion and original lighting. Environment consistency is inherited from the *real* footage. Kerrigan (#1) is the production example of this pattern.

### 13. Studio hybrids: Asteria, Staircase, Netflix *El Eternauta*
Sources: https://www.topazlabs.com/news/asteria-is-building-the-future-of-filmmaking-with-hybrid-ai-workflows-and-topaz-video ; Staircase/Netflix **[2nd-hand]**: https://www.vp-land.com/p/staircase-studios-ai-promises-studio-quality-films-at-micro-budgets ; https://www.cined.com/netflix-publishes-generative-ai-guidelines-for-content-production/
- Asteria: artist-made source (hand-drawn, miniatures, filmed dancers) → traditional 3D track/comp → **per-project LoRAs used to interpolate between art-directed frames**, not generate from scratch → clean 3D reinserted where branding must be exact → Topaz as "unifying layer." Names consistency across mixed sources as "one of the biggest challenges."
- Staircase: real actors' voices/expressions drive AI footage (performance-anchored). Netflix guideline: main characters/key settings can't be AI-generated without approval — i.e., studios don't yet trust generation for identity.

### 14. Platform "identity slots" — Higgsfield Soul ID + Popcorn, Flow Ingredients, Kling Elements, LTX Elements **[vendor]**
Sources: https://higgsfield.ai/blog/ai-short-film-pipeline ; https://cloud.google.com/blog/products/ai-machine-learning/ultimate-prompting-guide-for-veo-3-1 ; https://kling.ai/blog/kling-3-subject-binding-character-consistency ; https://ltx.io/blog/how-to-create-a-consistent-character
- Common shape: upload/train identity once (Soul ID: 20+ photos, 3–5 min), storyboard each scene as 4–8 frame grids with location refs, generate each shot from the grid frame + identity, chain short clips. Higgsfield's own warning: "identity and lighting consistency degrade past 30 seconds." ~38 shots ≈ $150–160 for a 5-min short.

Also consulted: VP Land workflow roundup (Unreal 360° panoramas + style transfer for backgrounds) https://www.vp-land.com/stories/step-by-step-the-state-of-ai-filmmaking-workflows ; Rewake on continuity breaking through *workflow fragmentation* https://rewake.studio/notes/why-ai-filmmaking-workflow-breaks-continuity ; TMFF failure catalogue https://tmff.net/character-consistency-in-ai-filmmaking-why-it-breaks-and-what-fixes-it/ ; Dor Brothers — press only, no workflow published (Deadline/Creative Bloq) **[2nd-hand]**.

---

## Synthesis

### 1. The folk method
Almost everyone converges on the same five moves:
1. **Lock stills before any video.** Build a character sheet (front/¾/profile/back + close-ups) in an image editor (Nano Banana Pro is the 2026 default; Midjourney oref/Freepik/Recraft for the initial face). Build 3–4 location stills the same way.
2. **Keyframe every shot as a still**, with the sheets attached as references, and only then image-to-video. Text-to-video is used by nobody serious for narrative.
3. **Keep clips short (3–8 s), generate 2–5 takes, chain them.** Cut on straight cuts.
4. **Repeat the exact same words** for lens, film stock, light, wardrobe in every prompt; keep a prompt bible.
5. **Unify in post**: one LUT/grain pass, Topaz upscale, roto/recolour/face-fix the survivors; regenerate rather than accept a drifted face.

The 3D-assisted school adds a step zero — block the space so the camera and bodies can't lie — and the performance school (Kerrigan, Staircase, Wan Animate) replaces generation of the *performance* with capture of a real one.

### 2. Character continuity: solved vs papered over
- **Genuinely solved (within limits):** same face across shots when (a) a still is the source of every clip, and (b) the clip is short and the head doesn't turn far. Identity slots (Soul ID, Elements, Ingredients) and LoRAs make this repeatable; Kerrigan's Act-One pipeline effectively never re-generates the face at all.
- **Papered over:** anything longer than ~30 s, big head turns, two bodies touching, hands with props, close-ups of fine facial detail (tattoos, scars). Practitioners cut around it, flip images, regenerate, or fix in AE. Wardrobe and accessories still "disappear mid-clip." Nobody reports face-swapping as a *primary* method; it's a rescue.

### 3. Environment continuity: solved vs avoided
- **Solved-ish:** a persistent 3D thing exists — Marble splat, Blender grey-box, Unreal panorama, or real footage under a performance transfer. Then reverse angles are real angles.
- **Papered over:** the far more common approach is one master plate + image-editor "reframes" (Nano Banana "same golden hour, keep the peak centred"), crop-in coverage, and generated storyboard grids that share one prompt. This holds for wides→close-ups on the same axis; it gets vague on true reverses, and light/time-of-day survives only because the prompt text says so.
- **Avoided:** Neural Viz's design (talking heads, no reverses), Shy Kids' documentary edit, Tsiguleva's prop-library-instead-of-room. Multiple sources reuse "never cut to the reverse" in spirit without saying it.

### 4. What a 15–17-year-old could follow in class
- **Feasible in a browser:** the folk method as in #6, #7, #8, #14 — sheet → storyboard grid → keyframe → short i2v clip → cut in CapCut/Resolve. Outschool already runs a Flow/Veo "consistent characters" class for ages 9–14 **[2nd-hand]**. The cognitive load is a *shot list and a prompt bible*, i.e., ordinary film-class discipline. Kavan's mask-and-selfie trick is very teachable and cheap.
- **Needs a pro (or a lab):** LoRA training (GPU, dataset hygiene, checkpoint matching), ComfyUI/Wan Animate graphs, Blender block-outs with depth-pass export, Marble→Unreal, roto/AE repair. Budget is also a wall: $70–160 per finished minute in credits recurs across sources.

### 5. What one-click would require
The practitioners are hand-carrying state between tools. The missing product is the *project bible as data*, which Rewake's note names exactly: scene→shot→take→prompt→reference→decision kept linked. Concretely: (a) a character/location "bin" that auto-attaches the right sheets and locked prompt phrases to every shot; (b) storyboard-grid generation with an eyeline/axis check and a "shoot the reverse from the same plate" action; (c) a cheap spatial anchor (grey-box or splat) generated from the location still so reverses are real; (d) take-management with side-by-side compare and "regenerate to match shot 3"; (e) a post pass (grade/grain/upscale) baked in. Every piece exists somewhere in #5, #7, #14; none of them exist together.

### 6. Read/watch first
1. Shy Kids in fxguide — the definitive "what breaks and how post hides it": https://www.fxguide.com/fxfeatured/actually-using-sora/
2. Neural Viz tool-by-tool breakdown — design the world around the weakness: https://www.thedaringcreatives.com/creator-stories/neural-viz-ai-tv-universe/
3. MindStudio's solo-short walkthrough — the folk method with take counts and cost: https://www.mindstudio.ai/blog/how-to-make-ai-short-film-under-200-claude-seedance
4. Erika Taranto on Blender block-out → Seedance — the 3D school in six steps with a credit-burn story: https://erikataranto.com/en/blog/higgsfield-blender
5. World Labs / Tim Simmons Marble case study — the "virtual set" environment approach: https://www.worldlabs.ai/case-studies/creative-film

Gaps I couldn't close: Dor Brothers, Promise/Dave Clark and Kavan's Forbes pieces are paywalled or press-only, so no first-hand take counts from them; no verifiable r/aivideo threads surfaced via search (reddit indexing was poor), so the Reddit layer is absent.
