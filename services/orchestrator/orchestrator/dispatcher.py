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

log = logging.getLogger("orchestrator")


class Dispatcher:
    def __init__(self, db: Db, storage: Storage, provider_factory: Callable[[str], Provider] = make_provider,
                 cfg: Settings = default_settings, webhook_url: str | None = None, gate: PromptGate | None = None) -> None:
        self.db, self.storage, self.providers, self.cfg = db, storage, provider_factory, cfg
        self.webhook_url = webhook_url
        self.gate = gate or PromptGate(cfg.anthropic_api_key, cfg.gate_model)
        self._provider_cache: dict[str, Provider] = {}

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
    async def submit_queued(self) -> int:
        count = 0
        while job := await self.db.claim(self.cfg.kinds, self.cfg.worker_name):
            count += 1
            try:
                await self.handle_claimed(job)
            except Exception as e:  # noqa: BLE001
                log.exception("job %s failed before submit", job["id"])
                await self.db.release(str(job["id"]), "failed", f"{type(e).__name__}: {e}")
        return count

    async def handle_claimed(self, job: dict[str, Any]) -> None:
        jid = str(job["id"])
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
        cutoff = datetime.now(UTC) - timedelta(minutes=self.cfg.submit_timeout_min)
        for job in await self.db.open_jobs(self.cfg.kinds):
            sub_at = job.get("submitted_at")
            if sub_at and sub_at < cutoff:
                if await self.db.release(str(job["id"]), "timed_out", f"no result after {self.cfg.submit_timeout_min} min"):
                    n += 1
        return n
