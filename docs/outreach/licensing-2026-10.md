# Licensing and training-data outreach (drafts, 2 Oct 2026)

Drafts only: nothing has been sent. Contacts are the published routes found on 2 Oct 2026 (source in each
section). Most companies use forms; paste the email body into the form. Send in this order: **Lightricks
first** (our one video engine, and it makes the dialogue audio), then fal, Bria, Stability, Resemble, Adobe.

Fill in before sending: the sender's name, title and email. Write from the company address, not a personal
Gmail.

---

## 1. Lightricks (LTX-2 / LTX 2.5)

**Status: sent 6 Oct 2026 by Tim.** The licensing form redirects companies under the $10M threshold to
Hugging Face, so it reaches no one; email went instead (dpo@ltx.io is the published route). If there's
no reply in ~2 weeks: post the two key questions on the LTX-2 Community tab on Hugging Face, then LinkedIn.

**Send via:** licensing form https://ltx.io/forms/ltx-licensing-form (linked from ltx.io/model/licensing).
CEO Zeev Farbman is publicly quoted (Shutterstock release, Dec 2024), but has no published email.

**Subject:** LTX-2 in a film school for teenagers: training data and licensing questions

> Hello,
>
> I run Imaje, a browser-based film school for youth media programmes. Our first partner is Pegasus Media
> Project in Dallas, which runs a free filmmaking apprenticeship and the largest youth-run film festival in
> the US. Students write a script, build their characters and locations, and direct their film shot by
> shot. LTX-2 is our video engine for every shot, including the dialogue audio for talking scenes. We run it
> through fal today and plan to self-host the open weights.
>
> Our students are 13 to 19, and many are wary of AI because of how models are trained. We tell them
> plainly what each model was trained on, so we'd like to get LTX right rather than guess:
>
> 1. What do LTX-2's video training data cover? We know of the Shutterstock research licence (Dec 2024)
>    and have read about a Getty Images partnership. Is anything beyond licensed sources in the mix?
> 2. Where did LTX-2's **audio** training data come from?
> 3. Do you offer, or plan, a checkpoint trained only on licensed data, or an indemnity tier for
>    commercial users?
> 4. We're well under the $10M revenue threshold in the community licence. Is there anything you'd want
>    from an education platform beyond that licence, or an academic or education programme we should join?
> 5. Would Lightricks be open to an education partnership? A minors-focused school platform is a demanding
>    reference case for how a video model is trained and used.
>
> Happy to talk. Thank you.
>
> [Name], [Title], Imaje · [email]

---

## 2. fal.ai

**Send via:** enterprise form https://fal.ai/enterprise#contact-sales, and copy **legal@fal.ai**
(published in the acceptable use policy). The DPA is at https://fal.ai/legal/data-processing-addendum.

**Subject:** No-training terms, US data residency, and Bria indemnity for an education customer

> Hello,
>
> Imaje is a film school platform for teenagers (13–19), built on fal: LTX-2 for video, FLUX/Qwen for
> stills, Chatterbox, Stable Audio and Whisper. Schools ask us to put these points in writing, and we'd
> like to confirm them with you:
>
> 1. **No training.** Your enterprise page says you never train on enterprise customers' data. Can we get
>    that in our contract or DPA? Your current DPA allows deidentified data to be used "to improve the
>    Services".
> 2. **US residency.** Can our jobs, inputs and outputs be processed and stored only in US regions?
>    District data agreements often require it.
> 3. **Bria indemnity.** Your Bria model pages mention legal indemnification on outputs. Does Bria's
>    indemnity pass through to customers calling Bria models via fal, and on what terms?
> 4. **Education pricing.** Is there an education or nonprofit plan?
> 5. **Safety and energy.** We plan to turn on `enable_safety_checker` everywhere. Do you publish any energy
>    or carbon data per GPU-second or per region? We show students what's disclosed and what isn't.
>
> Thank you.
>
> [Name], [Title], Imaje · [email]

---

## 3. Bria AI

**Send via:** https://bria.ai/contact-us (the FIBO model card points here for commercial use), or
**hi@bria.ai** (published in the privacy policy). CEO Yair Adato is publicly listed (eMerge Americas 2025);
no published email.

**Subject:** FIBO for a teen film school: licensing, indemnity via fal, and contributor payments

> Hello,
>
> Imaje is a browser-based film school for youth programmes (students 13–19; first partner Pegasus Media
> Project, Dallas). We want every still in a student's film (character portraits, locations, shot
> frames) to come from a model trained on licensed images, and FIBO / FIBO Edit 1.5 is the strongest
> candidate. Before we test it with students:
>
> 1. **Through fal or direct?** Does your indemnity apply when FIBO is called through fal, or only when
>    we buy from you directly?
> 2. **Self-hosting.** We plan to run models on our own GPUs. What does an Enterprise licence for the FIBO
>    weights cost for a small education company, and is there education or nonprofit pricing?
> 3. **Character consistency.** We need the same character across many frames from up to four reference
>    images. Is FIBO Edit 1.5 the right model, and are there settings you'd recommend?
> 4. **Contributor payments.** We'd like to tell students how artists are paid when they generate. What
>    can we say publicly about your attribution engine?
> 5. **Video.** Are licensed image-to-video models on your roadmap? We'd be glad to be an education
>    launch partner.
>
> Thank you.
>
> [Name], [Title], Imaje · [email]

---

## 4. Stability AI (Stable Audio 3)

**Send via:** **partners@stability.ai** (published on stability.ai/license and /enterprise), or the
enterprise form https://stability.ai/enterprise.

**Subject:** Stable Audio 3 in a youth film school: attribution and licence check

> Hello,
>
> Imaje is a film school platform for teenagers. We use Stable Audio for music, effects and room tone,
> partly because it's trained on licensed and Creative Commons audio. We're under the Community License's
> $1M threshold. Two questions:
>
> 1. **Attribution.** The model was trained partly on Freesound CC BY recordings. What do you expect from
>    platforms whose users publish films with Stable Audio output? Is a credits page linking your
>    attribution list enough?
> 2. **Licence terms.** Can you confirm the Community License covers an education platform where students
>    publish their films, for example to festivals?
>
> Thank you.
>
> [Name], [Title], Imaje · [email]

---

## 5. Resemble AI (Chatterbox)

**Send via:** https://www.resemble.ai/contact/ (form); **privacy@resemble.ai** for the data question.

**Subject:** Chatterbox training data, for an education platform

> Hello,
>
> Imaje is a film school platform for teenagers. We use Chatterbox speech-to-speech to give each character
> its own voice, and only clone real people's voices with a signed release (a guardian's, under 18). We
> appreciate the Perth watermark. Two questions:
>
> 1. Can you share what the 500k hours of Chatterbox training data cover, at least by source type
>    (licensed, consented, public domain, web)?
> 2. Do you offer, or plan, a voice conversion model trained only on licensed or consented speech?
>
> Thank you.
>
> [Name], [Title], Imaje · [email]

---

## 6. Adobe Firefly Services (later; only if we pursue the video pilot)

**Send via:** Contact Sales on https://business.adobe.com/products/firefly-business/firefly-services.html
(short link posted by Adobe staff: https://adobe.ly/3J5sxDX).

**Subject:** Firefly Video API for a youth film school pilot

> Hello,
>
> Imaje is a browser-based film school for youth media programmes (students 13–19). We'd like to pilot
> Firefly Video Model 2 on one student film, because it's trained on licensed material. We're a small
> education company:
>
> 1. Is there API access suited to a pilot or an education or nonprofit customer, and what are the
>    minimums?
> 2. Does indemnity apply to API outputs at that tier?
> 3. Does the video API produce dialogue audio and lip sync, or picture only?
>
> Thank you.
>
> [Name], [Title], Imaje · [email]

---

## Worth knowing before you write
- **LTX Studio** (Lightricks' app, which we don't use) may train on users' inputs, outputs and face/voice
  models, with consent. This doesn't affect the open weights we run, but never send students to LTX Studio.
- **fal's DPA** has no explicit no-training clause and no US-residency commitment yet; those are the two
  things to get in writing.
- **Bria** publishes no education pricing, and doesn't say whether indemnity reaches fal customers.
- **Adobe**'s API reportedly needs an enterprise contract (a forum post mentions 3 years and 50 seats,
  *unverified*).
