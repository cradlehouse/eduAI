"""Every state change goes through the eduai.* functions; this module never updates jobs directly.
Service role via DATABASE_URL (RLS bypassed), so it must stay the only writer for settle."""

from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from psycopg_pool import AsyncConnectionPool

from .registry import Route


@dataclass
class StoredOutput:
    sha256: str
    r2_key: str
    mime: str
    bytes: int
    kind: str  # asset_kind
    width: int | None = None
    height: int | None = None
    duration_s: float | None = None
    provenance: dict[str, Any] | None = None


def canonical(o: Any) -> str:
    return json.dumps(o, sort_keys=True, separators=(",", ":"), default=str)


def chain_hash(prev: str | None, sha256: str, provenance: dict[str, Any]) -> str:
    return hashlib.sha256(((prev or "") + sha256 + canonical(provenance)).encode()).hexdigest()


class Db:
    def __init__(self, pool: AsyncConnectionPool) -> None:
        self.pool = pool

    @classmethod
    async def connect(cls, url: str) -> Db:
        pool = AsyncConnectionPool(url, min_size=1, max_size=4, kwargs={"row_factory": dict_row, "autocommit": True}, open=False)
        await pool.open()
        return cls(pool)

    async def close(self) -> None:
        await self.pool.close()

    async def _one(self, sql: str, *args: Any) -> dict[str, Any] | None:
        async with self.pool.connection() as c:
            cur = await c.execute(sql, args)
            return await cur.fetchone()

    async def _all(self, sql: str, *args: Any) -> list[dict[str, Any]]:
        async with self.pool.connection() as c:
            cur = await c.execute(sql, args)
            return await cur.fetchall()

    async def _exec(self, sql: str, *args: Any) -> None:
        async with self.pool.connection() as c:
            await c.execute(sql, args)

    # ---- health ---------------------------------------------------------
    async def ping(self, timeout: float = 3.0) -> bool:
        """Never let /health hang on a pool that cannot connect: bounded wait, then report."""
        async with self.pool.connection(timeout=timeout) as c:
            cur = await c.execute("select 1 as ok")
            return (await cur.fetchone()) is not None

    async def queue_depth(self, kinds: list[str]) -> dict[str, int]:
        rows = await self._all(
            "select status::text as status, count(*)::int as n from public.jobs where kind::text = any(%s) "
            "and status in ('queued','claimed','submitted','running') group by status", kinds or ["generate", "render"])
        return {r["status"]: r["n"] for r in rows}

    # ---- queue ----------------------------------------------------------
    async def claim(self, kinds: list[str], worker: str) -> dict[str, Any] | None:
        row = await self._one("select * from eduai.claim_job(%s::public.job_kind[], %s)", kinds, worker)
        return row if row and row.get("id") else None

    async def job(self, job_id: str) -> dict[str, Any] | None:
        return await self._one("select * from public.jobs where id = %s", job_id)

    async def open_jobs(self, kinds: list[str]) -> list[dict[str, Any]]:
        return await self._all(
            "select * from public.jobs where kind::text = any(%s) and status in ('submitted','running') order by submitted_at", kinds)

    async def job_by_request(self, provider: str, request_id: str) -> dict[str, Any] | None:
        return await self._one("select * from public.jobs where provider = %s and provider_request_id = %s", provider, request_id)

    async def event(self, job_id: str, event: str, payload: dict[str, Any] | None = None, actor: str = "orchestrator") -> None:
        await self._exec("select eduai.job_event(%s, %s::public.job_event, %s, %s)", job_id, event, Jsonb(payload or {}), actor)

    async def last_event_payload(self, job_id: str, event: str) -> dict[str, Any] | None:
        row = await self._one("select payload from public.job_events where job_id = %s and event = %s::public.job_event order by at desc limit 1", job_id, event)
        return row["payload"] if row else None

    # ---- registry -------------------------------------------------------
    async def route(self, profile_id: str) -> Route:
        r = await self._one(
            "select dp.id as profile_id, dp.slug as profile_slug, dp.provider, dp.endpoint, dp.credential_policy::text as credential_policy, "
            "dp.cost_model, dp.adapter, dp.resource_model, dp.safety_pipeline_version, "
            "mv.id as version_id, mv.slug as version_slug, mv.model_id, mv.input_schema, mv.safety "
            "from public.deployment_profiles dp join public.model_versions mv on mv.id = dp.model_version_id where dp.id = %s", profile_id)
        if not r:
            raise LookupError(f"deployment profile {profile_id} not found")
        return Route(profile_id=str(r["profile_id"]), profile_slug=r["profile_slug"], provider=r["provider"], endpoint=r["endpoint"],
                     credential_policy=r["credential_policy"], cost_model=r["cost_model"] or {}, adapter=r["adapter"] or {},
                     resource_model=r["resource_model"] or {}, version_id=str(r["version_id"]), version_slug=r["version_slug"],
                     model_id=str(r["model_id"]), input_schema=r["input_schema"] or {"type": "object"}, safety=r["safety"] or {},
                     safety_pipeline_version=r["safety_pipeline_version"] or "")

    async def effective_tier(self, org_id: str, user_id: str) -> str:
        """M for any minor regardless of the org setting (eduai.effective_content_tier)."""
        r = await self._one("select eduai.effective_content_tier(%s, %s)::text as tier", org_id, user_id)
        return (r or {}).get("tier") or "M"

    async def model_allowed(self, org_id: str, profile_id: str, lane: str, user_id: str) -> tuple[bool, str]:
        r = await self._one("select * from eduai.model_allowed(%s, %s, %s::public.lane, %s)", org_id, profile_id, lane, user_id)
        return (bool(r["allowed"]), r["reason"] or "") if r else (False, "no answer")

    async def estimate_cents(self, profile_id: str, inputs: dict[str, Any]) -> int | None:
        r = await self._one("select eduai.estimate_cents(%s, %s) as cents", profile_id, Jsonb(inputs))
        return r["cents"] if r else None

    async def credential(self, org_id: str, provider: str, policy: str, platform_key: str) -> str | None:
        """'platform' ⇒ ours; 'org' ⇒ theirs from Vault; 'either' ⇒ theirs if present, else ours."""
        if policy != "platform":
            r = await self._one(
                "select s.decrypted_secret as key from public.org_credentials oc join vault.decrypted_secrets s on s.id = oc.secret_ref "
                "where oc.org_id = %s and oc.provider = %s and oc.revoked_at is null limit 1", org_id, provider)
            if r and r["key"]:
                return r["key"]
            if policy == "org":
                return None
        return platform_key or None

    async def asset_key(self, org_id: str, asset_id: str) -> str | None:
        r = await self._one("select r2_key from public.assets where org_id = %s and id = %s", org_id, asset_id)
        return r["r2_key"] if r else None

    # ---- lifecycle ------------------------------------------------------
    async def reserve(self, job_id: str, cents: int) -> bool:
        r = await self._one("select eduai.reserve_job(%s, %s) as ok", job_id, cents)
        return bool(r and r["ok"])

    async def mark_submitted(self, job_id: str, request_id: str) -> None:
        await self._exec("select eduai.mark_submitted(%s, %s)", job_id, request_id)

    async def mark_running(self, job_id: str) -> None:
        await self._exec("select eduai.mark_running(%s)", job_id)

    async def release(self, job_id: str, status: str, error: str | None) -> bool:
        r = await self._one("select eduai.release_job(%s, %s::public.job_status, %s) as ok", job_id, status, (error or "")[:2000] or None)
        return bool(r and r["ok"])

    async def settle(self, job: dict[str, Any], outputs: list[StoredOutput], receipt: dict[str, Any]) -> bool:
        """Assets + takes + settle_job in ONE transaction, as the settle function's contract requires."""
        async with self.pool.connection() as c:
            async with c.transaction():
                asset_ids: list[str] = []
                for o in outputs:
                    cur = await c.execute("select id from public.assets where org_id = %s and sha256 = %s", (job["org_id"], o.sha256))
                    row = await cur.fetchone()
                    if row:
                        asset_ids.append(str(row["id"]))
                        continue
                    cur = await c.execute(
                        "select chain_hash from public.assets where org_id = %s and chain_hash is not null order by created_at desc, id desc limit 1",
                        (job["org_id"],))
                    prev = (await cur.fetchone() or {}).get("chain_hash")
                    prov = o.provenance or {}
                    cur = await c.execute(
                        "insert into public.assets (org_id, project_id, kind, source, r2_key, sha256, mime, bytes, duration_s, width, height, "
                        "job_id, prev_hash, chain_hash, provenance, created_by) values (%s,%s,%s::public.asset_kind,'generated',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id",
                        (job["org_id"], job["project_id"], o.kind, o.r2_key, o.sha256, o.mime, o.bytes, o.duration_s, o.width, o.height,
                         job["id"], prev, chain_hash(prev, o.sha256, prov), Jsonb(prov), job["requested_by"]))
                    asset_ids.append(str((await cur.fetchone())["id"]))
                for aid in asset_ids:
                    await c.execute(
                        "insert into public.takes (org_id, project_id, shot_id, job_id, asset_id, model_version_id, deployment_profile_id, layer) "
                        "values (%s,%s,%s,%s,%s,%s,%s,%s::public.layer)",
                        (job["org_id"], job["project_id"], job["shot_id"], job["id"], aid, job["model_version_id"], job["deployment_profile_id"],
                         job.get("layer") or "merged"))
                cur = await c.execute("select eduai.settle_job(%s, %s, %s) as ok", (job["id"], receipt.get("actual_cents"), Jsonb(receipt)))
                ok = bool((await cur.fetchone())["ok"])
                if not ok:
                    raise RuntimeError("settle_job returned false (already settled?)")
                return ok

    # ---- webhook inbox --------------------------------------------------
    async def claim_inbox(self, limit: int = 50) -> list[dict[str, Any]]:
        return await self._all("select * from eduai.claim_inbox(%s)", limit)

    async def inbox_done(self, inbox_id: str, error: str | None) -> None:
        await self._exec("update public.webhook_inbox set processed_at = now(), error = %s where id = %s", error, inbox_id)
