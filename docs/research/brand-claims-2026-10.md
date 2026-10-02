# What the stack can and can't back up (research, 2 Oct 2026)

Research behind the two promises in `BRAND.md`: **protected** and **principled** (creative IP and the
environment). For each gap: what's true today, the options to close it, and a recommendation. These are
options for Tim, not decisions. Web research by three agents; sources at the end of each section. Items
marked *unverified* rest on secondary sources or couldn't be confirmed.

## Summary

| Promise | Holds today? | Biggest gap | Cheapest real fix |
|---|---|---|---|
| Protected: real faces and voices | **Yes.** Consent-gated likeness is the strongest pattern in the industry, and we have it | No takedown process to the TAKE IT DOWN Act standard | A visible reporting route and 48-hour removal |
| Protected: content | Mostly | Prompts aren't checked for characters, brands, celebrities or living artists' styles | Extend the existing Claude screen (option IP-A) |
| Principled: creative IP in our tools | **No**, except music | Video, image, edit and speech models are scraped, undisclosed or only partly licensed | Say exactly where we are; move stills to a licensed model; publish a provenance page |
| Principled: environment | Partly | Two claims on the live mission page are now shaky (Crusoe, "carbon-neutral region"); nothing is measured | Fix the page; measure Wh per take when self-hosting |
| "Regenerative" | **No** | No standard defines it; risky under green-claims law | Don't use it until there's a published method (see §4) |

**Fix soon, whatever else is decided:** the public mission page (`apps/web/app/mission/page.tsx`) says
the self-hosted route "runs on stranded-energy GPU compute" and the database "sits in a carbon-neutral
AWS region". Both now need rewording (§3). `RESOURCE_NEUTRALITY.md` has the same two claims.

---

## 1. Training data: what our models were trained on

### What's true today

| Model (job) | What the vendor says | Honest rating | Registry today |
|---|---|---|---|
| LTX 2.5 / LTX-2 (video + sound) | Lightricks licensed Shutterstock (Dec 2024) and Getty (May 2025) footage for training. No primary source says LTX-2 is trained *only* on licensed data; the model card and paper name no sources; audio data undisclosed | **Partly licensed, rest undisclosed** | undisclosed |
| FLUX 2 (stills) | "Proprietary mix": bought data, contractors, synthetic, internal | Undisclosed | undisclosed ✓ |
| Qwen-Image / Edit-2511 (stills, angles) | Billions of web-collected image-text pairs, ~27% "design" including paintings and digital art | Undisclosed, web-scraped, includes art | undisclosed ✓ |
| Kokoro (stock voices) | Public domain, Apache/MIT and a little CC BY audio, **plus synthetic audio from closed commercial TTS** | **Permissive, partly distilled** | undisclosed (too harsh) |
| Chatterbox (voice conversion) | "500K hours of cleaned data", sources not named; outputs watermarked | Undisclosed | undisclosed ✓ |
| Stable Audio 2.5 (music, effects) | Fully licensed from AudioSparx, revenue share with artists | **Licensed** | licensed ✓ |
| Stable Audio Open | Freesound and Free Music Archive, CC0 / CC BY / CC Sampling+ | **Open-licensed; CC BY attribution owed** | licensed (should be "open-licensed") |
| Whisper, Demucs (analysis) | Web-collected audio; MUSDB commercial songs | Undisclosed | — |
| Claude (script work) | Trained partly on books; Bartz v Anthropic: fair use for training, pirated copies were not; $1.5B settlement approved Jul 2026 | Undisclosed, litigated | — |

**Fairly Trained** (the certification for models trained only on licensed data) lists **no video model and
no photoreal image model**. Nobody in the market can build a video product that is clean end to end
today.

**Do our vendors train on what students send?**
- **Anthropic:** no. Its commercial terms bar training on customer content.
- **fal:** its terms (8 Sep 2026) let it use anonymised or aggregated usage data to develop AI models. I found no promise that it won't train on inputs; enterprise terms may differ (not seen). fal also gives no warranty that outputs don't infringe.

### What we can truthfully say today (as facts, not copy)
- Music and sound effects come from models trained on licensed and Creative Commons audio.
- Stock voices come from a model trained on permissively licensed audio (partly synthetic).
- Character voices are only cloned from people who signed a release (a product rule, not a model property).
- Students' scripts aren't used to train Claude.
- The video engine's maker licensed Getty and Shutterstock footage for training; not that it's trained only on licensed footage.
- We **can't** say: built without taking from artists, ethically trained, or commercially safe, across the whole stack.

### Options

| Option | What changes | Cost / effort | Quality hit | What it unlocks |
|---|---|---|---|---|
| **TD-A. Rate honestly and publish** | Registry: LTX → "partly licensed", Kokoro → "permissive (partly synthetic)", Stable Audio Open → "open-licensed". A public page per model saying what it was trained on. CC BY attribution for Stable Audio Open in exports | Hours | None | "Principle 5: say where we are" made real. Students can check every model |
| **TD-B. Ask in writing** | Lightricks: what LTX-2's video *and audio* data cover. fal: enterprise terms ruling out training on our inputs | Two emails | None | Might upgrade LTX; closes the "is my work training data" question |
| **TD-C. Licensed stills: Bria on fal** | Swap FLUX/Qwen for Bria 3.2 or FIBO (licensed from Getty, Depositphotos, Envato, Freepik; pays contributors; indemnity on Bria's own platform, *unverified* through fal). Test Bria's edit models for angles | About the same price (2–4¢ an image); a spike to test continuity | Some; multi-angle is unproven | Everything a student *sees first* (portraits, location wides, frames) is from a licensed model |
| **TD-D. Licensed, open-weight stills: F Lite** | Self-host Freepik's F Lite (80M licensed images, open weights, commercial use allowed) | Part of the self-hosting work | Below FLUX | Licensed *and* fits the own-GPUs plan |
| **TD-E. Licensed voice conversion** | Test Fairly Trained voice vendors (Voice-Swap and others) in place of Chatterbox | A spike | Unknown | Closes the voice gap |
| **TD-F. Licensed video: Adobe Firefly** | Enterprise contract | ~$1k+/month, closed weights | Unknown for our flow | The strongest claim, but it breaks the open-weight, own-GPU plan. Moonvalley (the other licensed video model) looks unreliable now |
| **TD-G. Name the analysis tools as what they are** | Say plainly that Whisper, Demucs and Claude analyse and organise but don't generate the pictures or sounds in the film | Nothing | None | Honest framing for the parts with no licensed equivalent |

**Recommendation:** TD-A + TD-B + TD-G now (nearly free). TD-C as the next spike: it turns "partly"
into "the images are licensed", which is the most visible part of the student's film. TD-D when
self-hosting happens. Keep LTX for video; no licensed video model is good and dependable enough today.
After that, the honest position is: *licensed where a good licensed model exists; disclosed where it
doesn't; moving as the market moves.*

Sources: investor.shutterstock.com/node/13936 · morningstar.com/news/pr-newswire/20250506ny80327 ·
huggingface.co/Lightricks/LTX-2 · arxiv.org/abs/2601.03233 · bfl.ai/transparency ·
arxiv.org/abs/2508.02324 · huggingface.co/hexgrad/Kokoro-82M · github.com/resemble-ai/chatterbox ·
fairlytrained.org/certified-models · fairlytrained.org/certifications ·
anthropic.com/legal/commercial-terms · fal.ai/legal/terms-of-service

## 2. IP in what students make

### What's true today
- Likeness is handled: no real person without a signed release, a guardian signing under 18. That's what
  Sora 2 (cameos), Runway and Firefly do.
- **Nothing checks for well-known characters, brands, celebrities or "in the style of" a living artist.**
  Runway bans living-artist styles outright; Firefly strips names; Sora moved to opt-in characters after
  the SpongeBob/Pokémon backlash in Oct 2025.
- Name lists alone don't work: models produce Mario from "videogame plumber" with no name in the prompt
  (He et al., ICML 2024).
- **Pegasus Film Festival requires original work with all permissions cleared** (FilmFreeway rules, to
  confirm with Niloo). For the first partner, IP-clean isn't a nice-to-have.

### Options

| Option | What it does | Effort | What it unlocks |
|---|---|---|---|
| **IP-A. Add IP checks to the Claude screen** | Flags named characters and franchises, brands and logos, real or famous people, living artists' styles, *and* clear descriptions of a character without the name. Turns a flag into a lesson: why it's flagged, and a "make it your own" rewrite that keeps the idea and changes the look. Allows public domain and history. Parody or homage only with instructor approval, recorded on the receipt | Low; near-zero running cost | Principle 3 becomes a feature students touch, not a statement |
| **IP-B. A short name list as backstop** | 200–500 franchises, brands and objecting artists, as a CSV like the registry | Low | Deterministic, testable, auditable |
| **IP-C. Content Credentials (C2PA) on exports** | Every exported film says it was made with AI, on Imaje, and when. Open-source signing tools; cheap certificates | Medium | Labelled AI work; matches OpenAI, Adobe, Google; the EU AI Act's labelling duties. Doesn't prove IP-clean |
| **IP-D. Check finished shots** | A vision check on one or two keyframes for characters and logos | Higher | Catches what slips past the prompt check |
| ~~Face recognition against celebrities~~ | Not recommended: running minors' faces through matching creates biometric data (amended COPPA, Apr 2026; state biometric laws) | — | — |

**Recommendation:** IP-A + IP-B first, with the instructor override; that's the minimum that makes
"make your own" true. IP-C before festival season. IP-D only if instructors report things slipping
through. A **festival-ready flag** (no third-party IP, all music licensed) would map the Pegasus rule
onto the product.

### Legal floor (protected)
- **TAKE IT DOWN Act** (platform duties since 19 May 2026): Imaje may not count as a platform under it, but
  complying is cheap. Add a visible reporting route, removal within 48 hours, and removal of copies.
- **Texas** (in force 2025–26): AI-made sexual images of minors are criminal, including cartoons; deepfake
  intimate media needs written consent; TRAIGA puts governance duties on school districts, so expect
  procurement questions.
- **COPPA** (amended, compliance date 22 Apr 2026): biometrics are personal information; a written
  retention policy is required.
- **NO FAKES Act** is not law (cleared Senate Judiciary Jun 2026). **ELVIS Act** (Tennessee) targets tools
  whose *primary purpose* is unauthorised likeness; consent-gated voices keep us clear.

Sources: deploymentsafety.openai.com/sora-2 · runwayml.com/safety/usage-policy ·
help.ltx.io/hc/en-us/articles/37290264108178 · arxiv.org/abs/2406.14526 · filmfreeway.com/PegasusFilmFestival
· wilmerhale.com (TAKE IT DOWN, 15 Jun 2026) · kirkland.com (COPPA) · jw.com (TRAIGA) ·
legiscan.com/TX/text/SB441/2025 · ncte.org/statement/fairusemedialiteracy

## 3. The environment

### What's true today
- **Energy per take is real but unmeasured for our engine.** Hugging Face measured an older LTX-Video at
  ~3.8 Wh for a 5 s clip (~0.75 Wh per second of video). Other video models measured 5–200× more. Energy
  grows roughly with the *square* of length and resolution (Delavande, Pierrard, Luccioni, NeurIPS 2025),
  which confirms the "shorter take, lighter take" teaching point. A rough guess for an LTX 2.5 take is 5–150 Wh
  (*unverified estimate*). fal publishes nothing.
- **"Carbon-neutral AWS region" is contested.** Amazon's 100% renewable figure is annual and based on
  certificates; its own employees' group disputes it, and in Oregon Amazon's demand pushed a local co-op
  onto fossil market power. The database is a tiny share of our footprint anyway.
- **Crusoe no longer fits the story.** It sold its flare-gas business to NYDIG in March 2025, and its main
  build now is a gas-turbine campus in Abilene, Texas (Stargate). Its **Iceland** (geothermal and hydro) and **Norway**
  (hydro) sites are defensible; its Texas sites aren't.

### Words with legal risk
- **US:** FTC Green Guides (still 2012) forbid unqualified "green" or "eco-friendly". **California AB 1305** requires a
  published method for any "carbon neutral" or "net zero" claim.
- **EU** (selling to EU consumers): generic environmental claims and offset-based "neutral" claims are
  banned from 27 Sep 2026.
- **UK:** the CMA can now fine directly.
- **Avoid unless measured and documented:** carbon neutral, net zero, climate positive,
  regenerative, green, sustainable, eco-friendly, zero impact, "powered by renewables".

### Options

| Option | What it does | Cost | Credibility |
|---|---|---|---|
| **EN-A. Fix the live claims** | Mission page and `RESOURCE_NEUTRALITY.md`: drop "stranded-energy compute" and "carbon-neutral region"; describe the database region and its contested accounting plainly, or leave it out | Hours | Removes a real risk |
| **EN-B. Measure** | When self-hosting: GPU watts × seconds per take, location-based carbon, a water estimate; show it on the receipt next to the price | Engineering time | The foundation for every later claim; ties straight into lessons (NSTA, Edutopia and CodeHS units already teach watts × time × grid) |
| **EN-C. Reduce** | Choose length, resolution and steps deliberately (the biggest lever, given squared scaling); cheap drafts before final renders; render on clean grids (Iceland, Norway, Quebec, or Google regions with high hourly clean-energy shares) | Low | High |
| **EN-D. Carbon-aware queue** | Overnight renders scheduled for the cleanest hours (fits Tim's shared-server queue idea) | Low | Medium; report the measured difference |
| **EN-E. Pay for removal** | Durable carbon removal for what's left, via Stripe Climate or Frontier (~$300–550 a tonne; at our scale, hundreds of dollars a year). Call it a contribution, never "neutral" | Small | High if framed honestly |
| **EN-F. Certify** | The Climate Label (free support under $5M revenue) or B Corp (2026 standards require a climate plan; ~$5–15k first year, *unverified*) | Low–medium | Medium–high |

**Recommendation:** EN-A now. EN-C and EN-B as part of the self-hosting spike in `RENDER_PLAN.md`, and
re-pick the compute provider on grid, not brand: Crusoe Iceland or Norway, or another hydro/geothermal
host. EN-E once there's a measured number to remove against.

Sources: huggingface.co/blog/jdelavande/text-to-video-energy-cost · arxiv.org/abs/2509.19222 ·
technologyreview.com/2025/05/20/1116327 · arxiv.org/abs/2508.15734 · datacenterdynamics.com (Crusoe exits
crypto, sells to NYDIG) · texastribune.org/?p=235529 · crusoe.ai (Iceland expansion) · esgmena.com (AECJ on
Amazon renewables) · cloud.google.com/sustainability/region-carbon · frontierclimate.com/pathway ·
changeclimate.org/blog/announcing-the-climate-label · bdlaw.com (EU ECGT) · mofo.com (AB 1305)

## 4. "Regenerative"

No standard defines it for a software company, and it's on every regulator's list of words to back up or
avoid. To use it credibly, all of these would need to be true and published:
1. A measured footprint (EN-B).
2. Deep reductions (EN-C, EN-D).
3. Durable removal *beyond* the measured footprint. SBTi's net-zero standard v2 (Jun 2026) makes "beyond
   value chain mitigation" a formal framework, which is the most credible basis.
4. Possibly local water restoration, verified and by volume.
5. Teaching students to count it themselves.

**Ways to make it ours** (options, not decisions):
- **Environmental:** remove more carbon than we measure, published yearly against the SBTi framework.
- **Creative:** a share of revenue to the artists and libraries the licensed models draw on, as Bria
  and Stable Audio's revenue shares already do.
- **Educational:** every student leaves able to measure and cut the footprint of what they make. Arguably
  the most "Imaje" version, and the cheapest to do honestly.

**Recommendation:** keep it as an internal direction, not a public word, until one of these is
measured and published.

## Decisions for Tim

1. Fix the mission page claims now (EN-A)? It needs a web deploy.
2. Correct the registry ratings and publish a per-model provenance page (TD-A)?
3. Send the two letters to Lightricks and fal (TD-B)?
4. Spike Bria on fal for stills (TD-C)? It costs a few dollars of test generations.
5. Build the IP check into the prompt screen, with a festival-ready flag (IP-A + B)? Before the Pegasus
   pitch?
6. Add a takedown route to the TAKE IT DOWN standard?
7. Which version of "regenerative" (environmental, creative, educational), if any?
8. Re-pick the self-hosting provider on grid (Crusoe Iceland or Norway, or other hydro/geothermal hosts)?
