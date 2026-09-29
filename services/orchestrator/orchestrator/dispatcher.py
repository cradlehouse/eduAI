"""The job state machine. queued → claimed → submitted → running → succeeded, or a terminal release.

One tick = submit everything queued, check everything open, drain the webhook inbox, expire stragglers.
Every per-job failure is caught and released so one bad job never stalls the loop. Money moves only
through reserve / settle / release in the database; this file never computes a price."""

from __future__ import annotations

import asyncio
import hashlib
import logging
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from .db import Db, StoredOutput
from .estimate import resource_estimate
from .gate import GateDecision, PromptGate
from .providers import Provider, ProviderError, Submission, make_provider
from .registry import Route, asset_kind_for, ext_for, extract_outputs, map_inputs, validate_inputs
from .settings import Settings
from .settings import settings as default_settings
from .storage import Storage, asset_key
from .voices import ESTIMATE_CENTS, Fal, Track, decode_pcm, extract_wav, media_seconds, mix, split_voices, voice_allowed

log = logging.getLogger("orchestrator")


class Dispatcher:
    def __init__(self, db: Db, storage: Storage, provider_factory: Callable[[str], Provider] = make_provider,
                 cfg: Settings = default_settings, webhook_url: str | None = None, gate: PromptGate | None = None) -> None:
        self.db, self.storage, self.providers, self.cfg = db, storage, provider_factory, cfg
        self.webhook_url = webhook_url
        self.gate = gate or PromptGate(cfg.anthropic_api_key, cfg.gate_model)
        self._provider_cache: dict[str, Provider] = {}
        self._renders: set[asyncio.Task[None]] = set()

    def provider(self, name: str) -> Provider:
        if name not in self._provider_cache:
            self._provider_cache[name] = self.providers(name)
        return self._provider_cache[name]

    def platform_key(self, provider: str) -> str:
        return {"fal": self.cfg.fal_key, "replicate": self.cfg.replicate_api_token}.get(provider, "")

    # ---- loop -----------------------------------------------------------
    async def run_forever(self, stop: asyncio.Event) -> None:
        log.info("dispatcher up: kinds=%s worker=%s", self.cfg.kinds, self.cfg.worker_name)
        while not stop.is_set():
            try:
                await self.tick()
            except Exception:  # noqa: BLE001 — the loop must survive
                log.exception("tick failed")
            try:
                await asyncio.wait_for(stop.wait(), timeout=self.cfg.poll_interval_s)
            except TimeoutError:
                pass

    async def tick(self) -> dict[str, int]:
        n = {"submitted": 0, "checked": 0, "inbox": 0, "expired": 0}
        n["submitted"] = await self.submit_queued()
        n["checked"] = await self.check_open()
        n["inbox"] = await self.drain_inbox()
        n["expired"] = await self.expire()
        return n

    # ---- queued → submitted ---------------------------------------------
    @property
    def claim_kinds(self) -> list[str]:
        # A generate worker also does the short post-processing renders (voice splits): they are a few
        # fal calls, not a GPU job of our own.
        return list(dict.fromkeys(self.cfg.kinds + (["render"] if "generate" in self.cfg.kinds else [])))

    async def submit_queued(self) -> int:
        count = 0
        while job := await self.db.claim(self.claim_kinds, self.cfg.worker_name):
            count += 1
            try:
                await self.handle_claimed(job)
            except Exception as e:  # noqa: BLE001
                log.exception("job %s failed before submit", job["id"])
                await self.db.release(str(job["id"]), "failed", f"{type(e).__name__}: {e}")
        return count

    async def handle_claimed(self, job: dict[str, Any]) -> None:
        jid = str(job["id"])
        op = (job.get("inputs") or {}).get("op")
        if job.get("kind") == "render" and op in ("voices", "export"):
            # Runs in the background; the job stays 'claimed' until it settles or is released.
            t = asyncio.create_task(self.run_voices(job) if op == "voices" else self.run_export(job))
            self._renders.add(t)
            t.add_done_callback(self._renders.discard)
            return
        if job.get("kind") != "generate":
            await self.db.release(jid, "failed", f"no handler for kind {job.get('kind')}")
            return
        route = await self.db.route(str(job["deployment_profile_id"]))
        inputs: dict[str, Any] = job.get("inputs") or {}

        problems = validate_inputs(route.input_schema, inputs)
        if problems:
            await self.db.release(jid, "rejected", "inputs: " + "; ".join(problems)[:1500])
            return
        allowed, reason = await self.db.model_allowed(str(job["org_id"]), route.profile_id, job["lane"], str(job["requested_by"]))
        if not allowed:
            await self.db.release(jid, "rejected", f"route not allowed: {reason}")
            return
        decision = await self.prompt_gate(job, route, inputs)
        if decision is None:
            return
        cents = await self.db.estimate_cents(route.profile_id, inputs)
        if cents is None:
            await self.db.release(jid, "failed", "no estimate for this route's cost model")
            return
        if not await self.db.reserve(jid, cents):
            await self.db.release(jid, "rejected", "not enough budget for the estimate")
            return
        key = await self.db.credential(str(job["org_id"]), route.provider, route.credential_policy, self.platform_key(route.provider))
        if not key:
            await self.db.release(jid, "failed", f"no {route.provider} credential for policy '{route.credential_policy}'")
            return

        resolved = await self.resolve_asset_refs(route, inputs, str(job["org_id"]))
        vendor_inputs = map_inputs(route.adapter, resolved)
        provider = self.provider(route.provider)
        try:
            sub = await provider.submit(route.endpoint, vendor_inputs, key, self.webhook_url)
        except ProviderError as e:
            await self.db.release(jid, "failed", f"submit: {e}")
            return
        await self.db.mark_submitted(jid, sub.request_id)
        await self.db.event(jid, "accepted", {"provider": route.provider, "endpoint": route.endpoint, "request_id": sub.request_id,
                                              "status_url": sub.status_url, "response_url": sub.response_url,
                                              "vendor_fields": sorted(vendor_inputs.keys())})

    async def prompt_gate(self, job: dict[str, Any], route: Route, inputs: dict[str, Any]) -> GateDecision | None:
        """Classify the prompt against the effective tier. None ⇒ the job was released; the caller stops."""
        jid = str(job["id"])
        mode = route.safety.get("prompt_gate", "required")
        text = " ".join(str(inputs.get(k) or "") for k in ("prompt", "text")).strip()
        if mode == "none" or not text:
            decision = GateDecision(True, "ok", "", "", ran=False)
        elif not self.gate.available:
            if mode == "required":
                await self.db.release(jid, "failed", "prompt gate required for this route but no classifier is configured")
                return None
            decision = GateDecision(True, "ok", "", "", ran=False)
        else:
            tier = await self.db.effective_tier(str(job["org_id"]), str(job["requested_by"]))
            try:
                decision = await self.gate.classify(text, tier, str(job.get("layer") or ""))
            except Exception as e:  # noqa: BLE001 — the gate failing closed is the safe default
                await self.db.release(jid, "failed", f"prompt gate unavailable: {e}")
                return None
            decision.reason = decision.reason[:500]
            payload = {"stage": "prompt", "tier": tier, **decision.as_dict()}
            if not decision.allowed:
                await self.db.event(jid, "policy_rejected", payload)
                await self.db.release(jid, "rejected", f"prompt gate: {decision.category}. {decision.reason}".strip())
                return None
            await self.db.event(jid, "policy_approved", payload)
            return decision
        await self.db.event(jid, "policy_approved", {"stage": "prompt", **decision.as_dict()})
        return decision

    async def resolve_asset_refs(self, route: Route, inputs: dict[str, Any], org_id: str) -> dict[str, Any]:
        out = dict(inputs)
        for f in route.asset_ref_fields:
            ref = inputs.get(f)
            if not ref:
                out.pop(f, None)
                continue
            refs = ref if isinstance(ref, list) else [ref]
            urls = []
            for r in refs:
                key = await self.db.asset_key(org_id, str(r))
                if not key:
                    raise ValueError(f"asset {r} for '{f}' not found in this org")
                urls.append(await self.storage.presigned_get(key, self.cfg.asset_url_ttl_s))
            out[f] = urls if isinstance(ref, list) else urls[0]
        return out

    # ---- render: a chosen talking take → one track per character -------
    async def run_voices(self, job: dict[str, Any]) -> None:
        jid, org = str(job["id"]), str(job["org_id"])
        inputs: dict[str, Any] = job.get("inputs") or {}
        try:
            if not await self.db.reserve(jid, ESTIMATE_CENTS):
                await self.db.release(jid, "rejected", "not enough budget for the voice split")
                return
            key = self.platform_key("fal")
            if not key:
                await self.db.release(jid, "failed", "no fal key for the voice split")
                return
            fal = Fal(key)
            vkey = await self.db.asset_key(org, str(inputs["video"]))
            if not vkey:
                raise ValueError("the take's video is missing")
            video = await fal.get(await self.storage.presigned_get(vkey, self.cfg.asset_url_ttl_s))
            original = extract_wav(video)
            okey = asset_key(org, hashlib.sha256(original).hexdigest(), "wav")
            await self.storage.put_if_absent(okey, original, "audio/wav")
            # Voices come from the Cast entries as they are now, not from the job's inputs, and a real
            # person's voice only with a signed release (voices.voice_allowed).
            speakers = inputs.get("speakers") or []
            rows = {r["entry_id"]: r for r in await self.db.speaker_voices(org, [str(sp["entry_id"]) for sp in speakers if sp.get("entry_id")], job.get("requested_by"))}
            voices: dict[str, str | None] = {}
            kept: dict[str, str] = {}
            for sp in speakers:
                name = str(sp["name"]).upper()
                row = rows.get(str(sp.get("entry_id")))
                ok, why = voice_allowed(row) if row else (False, "not in the Cast")
                k = await self.db.asset_key(org, str(row["voice_asset_id"])) if ok and row else None
                voices[name] = await self.storage.presigned_get(k, self.cfg.asset_url_ttl_s) if k else None
                if not voices[name]:
                    kept[name] = why
            await self.db.event(jid, "submitted", {"op": "voices", "speakers": sorted(voices)})
            tracks, info = await split_voices(fal, await self.storage.presigned_get(okey, self.cfg.asset_url_ttl_s), inputs.get("lines") or [], voices)
            tracks.insert(0, Track(kind="original", data=original, mime="audio/wav", name="LTX"))
            ids = {str(sp["name"]).upper(): sp.get("entry_id") for sp in inputs.get("speakers") or []}
            stored: list[tuple[StoredOutput, Track]] = []
            for t in tracks:
                t.entry_id = ids.get(t.name)
                sha = hashlib.sha256(t.data).hexdigest()
                r2 = asset_key(org, sha, "wav")
                await self.storage.put_if_absent(r2, t.data, t.mime)
                stored.append((StoredOutput(sha256=sha, r2_key=r2, mime=t.mime, bytes=len(t.data), kind="audio",
                                            provenance={"source": "generated", "op": "voices", "job_id": jid, "track": t.kind, "character": t.name,
                                                        "pipeline": ["demucs", "whisper", "chatterbox-s2s"]}), t))
            receipt = {"actual_cents": None, "output_hashes": [s.sha256 for s, _ in stored],
                       "policy_decisions": {"prompt_gate": "not_run", "reason": "post-processing of an approved take"},
                       "provenance": {"op": "voices", "take_id": inputs.get("take_id"), "kept_ltx_voice": kept, **info}, "resource_estimate": {"basis": "undisclosed"}}
            await self.db.settle_tracks(job, str(inputs["take_id"]), stored, receipt)
            log.info("job %s: voices split into %d track(s)", jid, len(stored))
        except Exception as e:  # noqa: BLE001 — a failed split must not take the loop down
            log.exception("job %s: voice split failed", jid)
            await self.db.release(jid, "failed", f"voice split: {type(e).__name__}: {e}")

    async def run_export(self, job: dict[str, Any]) -> None:
        """The edit → one file. Picture: the chosen takes end to end (fal ffmpeg compose, video only).
        Sound: mixed here, sample-accurate: each character's voice track at its shot (at that character's
        level), the picture's own sound where a take wasn't split, the location's room tone under each
        shot, the music under the whole film, all at the Edit levels."""
        jid, org = str(job["id"]), str(job["org_id"])
        inputs: dict[str, Any] = job.get("inputs") or {}
        clips: list[dict[str, Any]] = inputs.get("clips") or []
        levels: dict[str, float] = {k: float(v) for k, v in (inputs.get("levels") or {}).items()}
        try:
            if not clips:
                raise ValueError("nothing to export")
            if not await self.db.reserve(jid, 1 + len(clips) // 10):
                await self.db.release(jid, "rejected", "not enough budget to export")
                return
            fal = Fal(self.platform_key("fal"))

            async def fetch(asset_id: str) -> tuple[str, bytes]:
                k = await self.db.asset_key(org, asset_id)
                if not k:
                    raise ValueError(f"asset {asset_id} missing")
                url = await self.storage.presigned_get(k, self.cfg.asset_url_ttl_s)
                return url, await fal.get(url)

            picture, layers, t = [], [], 0.0
            room_cache: dict[str, Any] = {}
            for c in clips:
                vurl, vdata = await fetch(c["video"])
                secs = media_seconds(vdata) or float(c.get("seconds") or 6)
                picture.append({"timestamp": int(t * 1000), "duration": int(secs * 1000), "url": vurl})
                if c.get("voices"):
                    for v in c["voices"]:
                        # {asset, name} carries the character's own level (Edit's per-character slider);
                        # a bare asset id (older exports) plays at the voice level alone.
                        aid, name = (v.get("asset"), v.get("name")) if isinstance(v, dict) else (v, None)
                        gain = levels.get("voice", 1.0) * (levels.get(f"voice:{name}", 1.0) if name else 1.0)
                        layers.append((decode_pcm((await fetch(str(aid)))[1]), t, secs, gain, False))
                else:
                    layers.append((decode_pcm(vdata), t, secs, levels.get("picture", 1.0), False))
                if c.get("room"):
                    if c["room"] not in room_cache:
                        room_cache[c["room"]] = decode_pcm((await fetch(c["room"]))[1])
                    layers.append((room_cache[c["room"]], t, secs, levels.get("room", 0.5), True))
                t += secs
            if inputs.get("music"):
                # Under the whole film from the top, looped if the piece is shorter than the film.
                layers.append((decode_pcm((await fetch(str(inputs["music"])))[1]), 0.0, t, levels.get("music", 0.3), True))
            await self.db.event(jid, "submitted", {"op": "export", "clips": len(clips), "seconds": round(t, 2)})
            comp = await fal.run("fal-ai/ffmpeg-api/compose", {"tracks": [{"id": "picture", "type": "video", "keyframes": picture}]}, timeout_s=900)
            sound = mix(t, layers)
            skey = asset_key(org, hashlib.sha256(sound).hexdigest(), "wav")
            await self.storage.put_if_absent(skey, sound, "audio/wav")
            sound_url = await self.storage.presigned_get(skey, self.cfg.asset_url_ttl_s)
            merged = await fal.run("fal-ai/ffmpeg-api/merge-audio-video", {"video_url": comp["video_url"], "audio_url": sound_url}, timeout_s=900)
            data = await fal.get(merged["video"]["url"])
            sha = hashlib.sha256(data).hexdigest()
            r2 = asset_key(org, sha, "mp4")
            await self.storage.put_if_absent(r2, data, "video/mp4")
            stored = StoredOutput(sha256=sha, r2_key=r2, mime="video/mp4", bytes=len(data), kind="video",
                                  provenance={"source": "rendered", "op": "export", "job_id": jid, "clips": len(clips), "seconds": round(t, 2)})
            receipt = {"actual_cents": None, "output_hashes": [sha], "policy_decisions": {"prompt_gate": "not_run", "reason": "export of approved takes"},
                       "provenance": {"op": "export", "seconds": round(t, 2), "levels": levels}, "resource_estimate": {"basis": "undisclosed"}}
            await self.db.settle_tracks(job, None, [(stored, None)], receipt)
            log.info("job %s: exported %d clip(s), %.1fs", jid, len(clips), t)
        except Exception as e:  # noqa: BLE001
            log.exception("job %s: export failed", jid)
            await self.db.release(jid, "failed", f"export: {type(e).__name__}: {e}")

    # ---- submitted / running → succeeded --------------------------------
    async def check_open(self) -> int:
        jobs = await self.db.open_jobs(self.cfg.kinds)
        for job in jobs:
            try:
                await self.check_one(job)
            except Exception as e:  # noqa: BLE001
                log.exception("job %s failed while open", job["id"])
                await self.db.release(str(job["id"]), "failed", f"{type(e).__name__}: {e}")
        return len(jobs)

    async def submission_of(self, job: dict[str, Any]) -> Submission:
        p = await self.db.last_event_payload(str(job["id"]), "accepted") or {}
        return Submission(request_id=job.get("provider_request_id") or p.get("request_id", ""),
                          status_url=p.get("status_url", ""), response_url=p.get("response_url", ""))

    async def check_one(self, job: dict[str, Any]) -> None:
        jid = str(job["id"])
        route = await self.db.route(str(job["deployment_profile_id"]))
        key = await self.db.credential(str(job["org_id"]), route.provider, route.credential_policy, self.platform_key(route.provider))
        if not key:
            await self.db.release(jid, "failed", "credential disappeared while running")
            return
        provider = self.provider(route.provider)
        sub = await self.submission_of(job)
        try:
            st = await provider.status(sub, key)
        except ProviderError as e:
            if e.retryable:
                log.warning("job %s: transient status error: %s", jid, e)
                return
            await self.db.release(jid, "failed", f"status: {e}")
            return
        if st.state == "queued":
            return
        if st.state == "running":
            if job["status"] == "submitted":
                await self.db.mark_running(jid)
            return
        if st.state == "failed":
            await self.db.release(jid, "failed", st.error or "vendor reported failure")
            return
        if job["status"] == "submitted":
            await self.db.mark_running(jid)
        await self.complete(job, route, provider, sub, key)

    async def complete(self, job: dict[str, Any], route: Route, provider: Provider, sub: Submission, key: str) -> None:
        jid = str(job["id"])
        payload = await provider.result(sub, key)
        files = extract_outputs(route.adapter, payload)
        await self.db.event(jid, "output_received", {"files": len(files), "keys": [f.key for f in files]})
        if not files:
            await self.db.release(jid, "failed", "vendor response had no files")
            return

        stored: list[StoredOutput] = []
        for f in files:
            data = await provider.download(f.url, key, self.cfg.max_output_bytes)
            sha = hashlib.sha256(data).hexdigest()
            r2_key = asset_key(str(job["org_id"]), sha, ext_for(f.content_type, f.url))
            await self.storage.put_if_absent(r2_key, data, f.content_type)
            stored.append(StoredOutput(
                sha256=sha, r2_key=r2_key, mime=f.content_type, bytes=len(data), kind=asset_kind_for(f.content_type),
                width=f.width, height=f.height, duration_s=f.duration_s,
                provenance={"source": "generated", "provider": route.provider, "endpoint": route.endpoint, "request_id": sub.request_id,
                            "model_version": route.version_slug, "deployment_profile": route.profile_slug, "output_key": f.key,
                            "job_id": jid, "lane": job.get("lane"), "layer": job.get("layer")}))
        await self.db.event(jid, "stored", {"hashes": [s.sha256 for s in stored]})

        prompt_stage = await self.db.last_event_payload(jid, "policy_approved") or {}
        policy = {"prompt_gate": prompt_stage.get("prompt_gate", "not_run"), "prompt_gate_category": prompt_stage.get("category"),
                  "prompt_gate_model": prompt_stage.get("model"), "tier": prompt_stage.get("tier"),
                  "output_moderation": "vendor" if route.safety.get("output_moderation") else "none",
                  "safety_pipeline_version": route.safety_pipeline_version}
        await self.db.event(jid, "policy_approved", {"stage": "output", **policy})

        receipt = {
            "actual_cents": None,  # fal reports no per-request cost ⇒ settle at estimate, flagged cost_unknown
            "output_hashes": [s.sha256 for s in stored],
            "policy_decisions": policy,
            "provenance": {"provider": route.provider, "endpoint": route.endpoint, "request_id": sub.request_id,
                           "model_version": route.version_slug, "deployment_profile": route.profile_slug,
                           "vendor_inputs": map_inputs(route.adapter, job.get("inputs") or {}),
                           "response_keys": sorted(payload.keys()) if isinstance(payload, dict) else []},
            "resource_estimate": resource_estimate(route.resource_model, job.get("inputs") or {}, route.duration_field),
        }
        await self.db.settle(job, stored, receipt)
        log.info("job %s settled: %d file(s)", jid, len(stored))

    # ---- webhook inbox (P1-11 Worker fills it; polling is the fallback) --
    async def drain_inbox(self) -> int:
        rows = await self.db.claim_inbox()
        for row in rows:
            err: str | None = None
            try:
                # A delivery is only a nudge: we re-poll the vendor ourselves, so an unsigned or forged row
                # can at most make us check sooner. The flag is recorded for visibility, not trusted.
                rid = row.get("provider_request_id")
                if not row.get("signature_ok"):
                    err = "bad signature (checked the job anyway)"
                if rid:
                    job = await self.db.job_by_request(row["provider"], rid)
                    if job and job["status"] in ("submitted", "running"):
                        await self.check_one(job)
                    elif not job:
                        err = "no job for request id"
                else:
                    err = "no request id"
            except Exception as e:  # noqa: BLE001
                err = f"{type(e).__name__}: {e}"
            await self.db.inbox_done(str(row["id"]), err)
        return len(rows)

    async def expire(self) -> int:
        n = 0
        for row in await self.db.stale_renders(20):
            if await self.db.release(str(row["id"]), "timed_out", "render did not finish (worker restarted?)"):
                n += 1
        cutoff = datetime.now(UTC) - timedelta(minutes=self.cfg.submit_timeout_min)
        for job in await self.db.open_jobs(self.cfg.kinds):
            sub_at = job.get("submitted_at")
            if sub_at and sub_at < cutoff:
                if await self.db.release(str(job["id"]), "timed_out", f"no result after {self.cfg.submit_timeout_min} min"):
                    n += 1
        return n
