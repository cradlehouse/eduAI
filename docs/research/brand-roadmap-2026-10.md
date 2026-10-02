# How we reach the promises (research roadmap, 2 Oct 2026)

How Imaje could actually become **protected** and **principled** (creative IP, the environment), not just
describe itself that way. This builds on `brand-claims-2026-10.md`, which covers what's true today. Four
research tracks, all web research; sources are summarised per section. Everything here is an option for
Tim; nothing is decided. *Unverified* marks anything from secondary sources or not confirmed.

## The short version

| Goal | Reachable when | What it takes | Rough cost |
|---|---|---|---|
| **Protected**, provable to schools | **~6 weeks** | Check finished takes, not just prompts; scan uploads for abuse images; one incident runbook; privacy paperwork; Texas data agreement | Under $5k cash plus ~6 weeks of engineering |
| **IP in what students make** | **Built 2 Oct** (prompt check); output check later | Instructor override next; keyframe check if things slip through | Pennies per take |
| **Licensed sound** (music, effects, room tone, transcription) | **0–3 months** | Recorded and licensed libraries, Stable Audio 3, swap Whisper for Parakeet, a credits page | ~$0 |
| **Licensed stills** (portraits, locations, frames) | **0–2 months**, after a test | Bria FIBO on fal (trained on 479M licensed images, pays contributors per generation) | About the same as today |
| **Licensed, consented stock voices** | **~6 months** | Commission 8–12 paid voice actors; train a voice model from scratch on public-domain speech plus their recordings | ~$10–25k |
| **Licensed video** | **Not reachable on our principles today** | Either give up open weights (Adobe Firefly Video, enterprise) or wait for a licensed open model (est. 12–36 months) | Firefly ~$1k+/month (*unverified*); building our own $1.5–5M+ |
| **Measured footprint** per take | **With the self-hosting spike** | GPU energy meter per job, grid carbon, a public method page | Engineering time |
| **Beyond our footprint** | **Any time after measuring** | Durable carbon removal at 2× measured, framed as contribution | ~$5–110 per school per month |
| **Whole stack "without taking"** | **Not before a licensed video model and voice conversion exist** | — | — |

The pattern is the same across all three promises: **protected** can be finished this autumn,
**licensed sound and stills** this winter, **footprint** with self-hosting, and **video** is the
part that depends on the market.

---

## 1. Protected: finish it and make it provable

Prompt screening, consent releases, instructor oversight, receipts and no likeness for minors are built.
What a school buyer would still find missing:

### Before the first paid cohort (~4–6 weeks, under $5k cash)

| Item | Why | Effort | Cost |
|---|---|---|---|
| **Check finished takes**: sample 1–2 frames a second plus first and last frame; open-weight classifier (ShieldGemma 2 or Llama Guard 4) with a paid second opinion (Hive or OpenAI) on borderline cases; a flagged take goes to the instructor, never the student | Prompts can be clean and outputs still not | 1–2 weeks | ~1–4¢ per clip |
| **Turn on fal's safety checker** on every call (off by default) | Free extra layer | Hours | $0 |
| **Scan uploads** (reference photos, consent media) against known abuse images: Hive's CSAM API or PhotoDNA (free once vetted) | Uploads are where known images could enter | 3–5 days | Per call / free |
| **One incident runbook**: abuse-material reports to NCMEC's CyberTipline (required once we know of it), 1-year legal hold under the REPORT Act; takedown within 48 hours to the TAKE IT DOWN standard; breach notice to schools | Three incidents, one page; it's exactly what "protected" promises | ~1 week | $0 |
| **Privacy notice and retention schedule** rewritten to the amended COPPA rule: name fal, Anthropic, Supabase; no training on student data; a published deletion schedule | Required since 22 Apr 2026 | 3 days + lawyer | $2–5k legal |
| **Split retention**: generations and receipts kept; children's personal data deleted on schedule or request | COPPA bans keeping under-13s' personal data indefinitely, which conflicts with "nothing deleted" | 1 week | $0 |
| **Written security programme and incident plan** | COPPA requires one; districts ask | 3 days | $0 |
| **Texas data agreement (TX-NDPA)** filled in and signed with Exhibit E, so any Texas district can join without renegotiating | The single most useful document for Texas sales | 2 days | $0 |

### Within 6 months
- Every frame checked before export (~$0.10 a minute), plus audio checks.
- Content Credentials (C2PA) on every export; Chatterbox audio already carries Resemble's watermark.
- A parent view: their child's films, releases (revocable), data, export and deletion requests.
- A public safety page with categories, thresholds and monthly counts of flags, blocks and reports.
- Public alignment with Thorn's Safety by Design principles; ask about signing.
- Measure the classifiers' error rate on 300–500 of our own labelled takes.

### 12–24 months
- SOC 2 Type I then II once a district asks (~$20–45k in year one; too early before district revenue).
- iKeepSafe or 1EdTech certification only if RFPs name them. Skip the Student Privacy Pledge (retired Apr 2025).

### Questions for a lawyer (one review, ~$2–5k)
1. Is Imaje a "covered platform" under TAKE IT DOWN?
2. Is it a "provider" under the CSAM reporting statute?
3. Can Pegasus, a nonprofit and not a school, consent for under-13s the way schools can?
4. Does the Texas SCOPE Act reach school-contracted services?
5. How do "nothing deleted" and COPPA retention fit together?

---

## 2. IP in what students make

**Built 2 Oct 2026** (commit `c946826`, not yet deployed):
- The Claude prompt screen refuses copyrighted characters (named or plainly described), brands in the
  picture, famous people and named living artists' styles, at every tier.
- Each refusal carries a "make it your own" suggestion.
- A name list (~195 entries) acts as a hint and an audit trail.

**Next:**
1. **Instructor override** for parody, homage and class-only work, recorded on the receipt. Needs a
   migration and a small screen.
2. **Festival-ready flag**: no third-party IP, all music licensed. The Pegasus Film Festival requires
   original, fully cleared work (FilmFreeway rules; confirm with Niloo).
3. **Keyframe check** for characters and logos, if instructors see things slip through. Never celebrity face
   recognition on students: it creates biometric data from minors.

---

## 3. Licensed models: the stack, job by job

### Where each job can get to

| Job | Today | Licensed option | When | Catch |
|---|---|---|---|---|
| Music | Stable Audio 2.5 (licensed) | **Stable Audio 3** (May 2026): licensed incl. UMG/WMG; small models are open weights, free under $1M revenue | Now | CC BY attribution owed for its Freesound share |
| Effects, room tone | Stable Audio | **Recorded libraries first**: Freesound CC0, Sonniss (royalty-free, no AI training), our own Dallas recordings with Pegasus apprentices; generate only what can't be found | Now | Check Sonniss redistribution terms |
| Transcription | Whisper (scraped) | **Parakeet v3** (NVIDIA, CC BY; human-labelled public corpora plus Granary), as good or better on short clips | Now | Granary includes CC-tagged YouTube: "openly licensed", not "licensed" |
| Splitting voices from the rest | Demucs (commercial songs) | **Ask LTX for dialogue-only audio** and add music, effects and room in post; then only speaker separation is left | Now | Untested with LTX |
| Stills: portraits, locations, frames | FLUX, Qwen (undisclosed / scraped) | **Bria FIBO + FIBO Edit 1.5** on fal: 479M licensed images (Getty, Alamy, Envato, Freepik…), pays contributors per generation, up to 4 reference images for character combinations | 0–2 months, after an A/B test on 10 characters | Frozen parts (Wan VAE, SmolLM3 text encoder) aren't licensed: claim "trained only on licensed images" with a footnote. Indemnity through fal *unverified*; direct from Bria is capped |
| Stills, self-hosted | — | Bria Enterprise licence for the open weights (price not public, likely five figures a year, *unverified*), or **F Lite** (free, licensed, weaker) | ~6 months | |
| Stock voices | Kokoro (permissive, partly synthetic) | **Commission 8–12 paid actors** (Texas talent, AI rider), train a voice model from scratch on LibriTTS-R (public domain) plus their recordings | ~6 months, ~$10–25k | Fine-tuning a scraped base doesn't clean it; it must be trained from scratch |
| Character voice conversion | Chatterbox (undisclosed) | A clean encoder (HuBERT on LibriSpeech) plus our own vocoder | 12–24 months | **Nothing at Chatterbox quality today** |
| Speaker separation | pyannote (data not listed) | Train our own on licensed mixes | 12–24 months | No documented clean option today |
| Script breakdown, shot planning | Claude | **Apertus 1.5** (Swiss, open data honouring opt-outs, tool use) or Comma (fully openly licensed, needs our own tuning) | Pilot in ~6 months | Apertus is "opt-out-respecting", not "licensed" |
| Safety screening | Claude | **Keep Claude.** No openly licensed model has comparable safety testing; a miss costs more than a footnote | — | Say so plainly |
| **Video** | LTX 2.5 (partly licensed) | **Adobe Firefly Video 2** (licensed, commissioned and public-domain footage) | Only by giving up open weights and probably the talking-shot pipeline | Enterprise-only, ~$1k+/month (*unverified*), closed |

**The video gap, frankly.** No open-weight video model trained on licensed data exists, and none is
announced. Moonvalley (licensed) was absorbed into Reka, which is pivoting away. Building our own costs:
- **Data:** 10k hours of licensed footage at $1–6 a minute is $0.6–3.75M.
- **Compute:** Open-Sora 2.0's $200k is only the compute floor, and it started from FLUX.

So the honest position for now is *licensed pictures and sound, video from a partly licensed open model,
with a published plan to close the gap*. Ways to close it:
1. **Ask Lightricks** in writing for a data disclosure and whether it has or would build a licensed-only
   checkpoint or indemnity tier. A minors-focused school customer is a good reference case for them. (The
   Shutterstock research licence is confirmed; the Getty deal is reported in a May 2025 press release but
   one researcher couldn't confirm it, so verify.)
2. **Be the education launch partner** for whoever ships a licensed image-to-video model with sound
   (Bria plans to extend to video; Adobe has one).
3. **A grant-funded consortium** with other youth media nonprofits. "Artists Make Technology" (Doris Duke,
   Mozilla, Hewlett, Ford; $6.5M, up to 40 grants, Jan 2026) names artist consent and pay explicitly.
4. **Pilot Firefly Video** on one Pegasus film, accepting a closed model for that film.

### Consented student material
- Per-film styles (LoRAs) trained on apprentices' **drawings, sets, props and costumes**, with consent, on a
  licensed base, are the cheapest route to "our films look like ours".
- The consent has to be separate from the publication release, revocable (so per-film and deletable), and
  must exclude faces and voices by default.
- The amended COPPA rule requires separate parental consent before a child's data trains AI.
- Texas rules for 13–17s need counsel.
- A pooled dataset from minors is high-risk; only with legal review.

### Paying the artists behind the models
- **Bria pays its licensors per generation automatically**: switching stills to Bria routes money to
  artists with no extra work. Stable Audio shares revenue through AudioSparx; Shutterstock's contributor
  fund reportedly got 20% of the Lightricks deal.
- **Option:** set aside 2–5% of revenue for a fund paying consented local artists whose work feeds
  programme styles. It can't reach the artists behind LTX, FLUX or Qwen (undisclosed), so it mustn't be
  described as making those models licensed.

### Attribution
A standing credits page in the app and in exported film metadata. It names each model and its licence
(Parakeet CC BY, Stable Audio community licence), links Stability's Freesound list and Kokoro's dataset
credits. Creative Commons' March 2026 brief treats output attribution mostly as good practice, not a clear
legal duty.

---

## 4. The environment: measure, reduce, then go beyond

**Scale check (estimates):**
- Per school: ~280 GPU-hours a month ≈ 240 kWh.
- That's ~2.6 kg CO2e on Montréal's grid, ~24 kg in Oregon and ~96 kg on Texas' grid.
- Removing twice that through Frontier costs **~$5–110 a school per month**.

Paying for it is cheap. What matters is **measuring honestly, choosing where the GPUs run, and the
wording**.

### Ladder

| Rung | What we do | When | Cost |
|---|---|---|---|
| **1. Estimate, labelled as such** | Show an estimated range of Wh / gCO2e / litres per take, from the published LTX measurements (~3.8 Wh per 5 s at 512×704 for the older model; LTX-2 at 720p maybe 15–60 Wh per 10 s, *unverified*). Publish the method on one page | Now | $0 |
| **2. Reduce** | Default class drafts to LTX-2's distilled model (8 steps, ~5× less than 40), half resolution plus upscaler (~4× fewer tokens), short takes (20 s → 10 s ≈ 4× less, since energy grows with the square of length). Only render finals for takes students keep | Now | $0 |
| **3. Measure** | When self-hosting: read the GPU's energy counter per job (NVML via Zeus, or DCGM); add the CPU/RAM share, an idle share and PUE; show measured numbers on receipts. Follow the Green Software Foundation's SCI for AI standard (Dec 2025), per take and per finished film, including discarded takes | Self-hosting spike | Engineering time |
| **4. Run on clean power** | **US first** (district agreements often require student data to stay in the US): Google Cloud us-west1 Oregon (83% hourly carbon-free, 98 g/kWh; L4 ~$0.71/hr). Québec or Iceland (Verda from $1.36/hr for L40S; Crusoe Iceland H100 ~$3.90) only for programmes that agree in writing. Avoid Genesis Cloud (reported in liquidation, *unverified*). Choosing *where* matters far more than choosing *when* | Self-hosting spike | Compute ~$700 / $2–2.5k / $6–9k a month at 1 / 5 / 20 schools (*estimate*) |
| **5. Go beyond** | Durable carbon removal at 2× the measured footprint via Stripe Climate / Frontier ($450–550/t, 1 kg minimum, publishes AB 1305 disclosures). Report tonnes contracted vs delivered, location-based carbon first | After rung 3 | ~$5–110 / school / month |
| **6. Certify and localise** | B Corp (~$1–1.25k a year under $500k revenue); water restoration in the Trinity River basin via Bonneville Environmental Foundation (current price to check); Dallas trees (Texas Trees Foundation) as a community contribution, never as offsetting | 12–24 months | Small |

### Teaching it
Per-take energy numbers are a lesson in themselves. Options to explore:
- A class energy budget that rewards planning shots before generating.
- A footprint line in the credits that counts discarded takes.
- A festival award for the lowest footprint per minute.
- Students voting on where the contribution money goes.

Open references they can use: Hugging Face's AI Energy Score and the ML.ENERGY leaderboard. There is no
existing curriculum on AI video footprints, which is an opening.

### What "regenerative" could honestly mean
Rungs 3 and 5 together (measured footprint, then removal beyond it) is the environmental version.
SBTi treats this as contribution, not neutralisation. The educational version (every student leaves
able to measure and cut their footprint) needs only rungs 1–3. Either way the word waits until there's a
published, measured method behind it; EU, UK and German regulators have already ruled against offset-based
"carbon neutral" and "carbon negative" claims (Apple, BrewDog).

---

## A possible sequence

These are options, not a decision.

| When | Protected | Principled: IP | Principled: footprint |
|---|---|---|---|
| **Oct–Nov 2026** (before the Pegasus pitch) | Output checks, upload scan, runbook, privacy notice, TX-NDPA, lawyer review | Deploy the IP check; instructor override; festival-ready flag; correct registry ratings; Bria A/B test; letters to Lightricks and fal | Fix the mission page; estimated footprint per take, labelled; distilled drafts by default |
| **Dec 2026 – Mar 2027** | C2PA on exports; parent view; safety page | Stills on Bria if the test passes; Parakeet; recorded libraries and Stable Audio 3; credits page; commission voice actors | Self-hosting spike in Oregon with per-job measurement |
| **Apr – Sep 2027** | Classifier error rates; Safety by Design alignment | Own stock voices; Apertus pilot for planning; consented per-film styles (with counsel) | Measured numbers on receipts; first removal purchase; method page v2 |
| **2027–28** | SOC 2 when districts ask | Licensed video when one exists (partner or grant consortium) | B Corp; local water and trees as community contributions |

## Decisions for Tim

1. Deploy the IP check (push to Render; web deploy for the refusal display)?
2. Book a one-off edtech privacy lawyer review (~$2–5k) before the first paid cohort?
3. Build output checks + upload scan + runbook before the Pegasus pitch?
4. Run the Bria A/B test (a few dollars) for stills?
5. Write to Lightricks (data disclosure, licensed checkpoint) and fal (no-training terms, Bria indemnity)?
6. Commission stock voices from paid actors (~$10–25k), and when?
7. For video: wait and partner, pilot Firefly on one film, or apply for a grant consortium?
8. Self-hosting region: US-only (Oregon) by default, with clean non-US grids only by written agreement?
9. Removal purchases: 2× measured footprint, from when?
