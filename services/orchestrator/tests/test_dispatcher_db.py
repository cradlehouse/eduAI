"""End to end against a real Postgres with the migrations and seeds applied (scripts/orchestrator-test.sh)."""

import os
import uuid

import pytest

from orchestrator.db import Db
from orchestrator.dispatcher import Dispatcher
from orchestrator.providers.base import ProviderError, Submission, VendorStatus
from orchestrator.settings import Settings
from orchestrator.storage import MemoryStorage

URL = os.environ.get("ORCH_TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not URL, reason="ORCH_TEST_DATABASE_URL not set")

PROJECT = "00000000-0000-4000-8000-000000000030"
SHOT = "40000000-0000-4000-8000-000000000001"
STUDENT = "10000000-0000-4000-8000-000000000002"


class FakeFal:
    """Completes on the second status call; serves one mp4."""
    name = "fal"

    def __init__(self, fail_submit=False):
        self.fail_submit, self.polls, self.submitted = fail_submit, 0, None

    async def submit(self, endpoint, inputs, key, webhook_url=None):
        if self.fail_submit:
            raise ProviderError("boom", retryable=False, status=422)
        self.submitted = (endpoint, inputs, key)
        return Submission(request_id="req-" + uuid.uuid4().hex[:8], status_url="s", response_url="r")

    async def status(self, sub, key):
        self.polls += 1
        return VendorStatus("running") if self.polls == 1 else VendorStatus("completed")

    async def result(self, sub, key):
        return {"video": {"url": "https://fake/out.mp4", "content_type": "video/mp4", "width": 1280, "height": 720}, "seed": 1}

    async def download(self, url, key, max_bytes):
        return b"\x00\x00\x00\x18ftypmp42" + b"x" * 100


async def insert_job(db: Db, inputs: dict, slug="ltx-2.5-fast@fal", lane="explore") -> str:
    row = await db._one(
        "insert into public.jobs (project_id, shot_id, deployment_profile_id, lane, requested_by, inputs) "
        "select %s, %s, id, %s::public.lane, %s, %s::jsonb from public.deployment_profiles where slug = %s returning id",
        PROJECT, SHOT, lane, STUDENT, __import__("json").dumps(inputs), slug)
    return str(row["id"])


def cfg() -> Settings:
    return Settings(database_url=URL, job_kinds="generate", worker_name="test", fal_key="platform-key", poll_interval_s=0)


async def test_happy_path_settles_with_take_receipt_and_ledger():
    db = await Db.connect(URL)
    try:
        fake = FakeFal()
        d = Dispatcher(db, MemoryStorage(), lambda name: fake, cfg())
        jid = await insert_job(db, {"prompt": "a quiet warehouse at dusk", "duration_s": 6, "camera_motion": "static"})
        await d.tick()
        job = await db.job(jid)
        assert job["status"] == "running", job["error"]
        assert job["estimated_cents"] == 24 and job["provider_request_id"].startswith("req-")
        assert fake.submitted[0] == "lightricks/ltx-2.5/text-to-video/fast" and fake.submitted[2] == "platform-key"
        assert "duration_s" not in fake.submitted[1] and fake.submitted[1]["duration"] == 6  # adapter map applied
        await d.tick()
        job = await db.job(jid)
        assert job["status"] == "succeeded" and job["cost_unknown"] is True and job["settled_at"] is not None
        take = await db._one("select t.*, a.sha256, a.chain_hash, a.r2_key from public.takes t join public.assets a on a.id = t.asset_id where t.job_id = %s", jid)
        assert take and take["layer"] == "merged" and take["r2_key"].startswith(str(job["org_id"]))
        assert take["chain_hash"] and len(take["chain_hash"]) == 64
        rec = await db._one("select * from public.job_receipts where job_id = %s", jid)
        assert rec["output_hashes"] == [take["sha256"]] and rec["cost_unknown"] is True
        assert rec["resource_estimate"] == {"disclosure_tier": "B"}  # fal is undisclosed ⇒ tier only, no number
        assert rec["provenance"]["request_id"] == job["provider_request_id"]
        led = await db._all("select kind::text as kind, cents from public.ledger where job_id = %s order by created_at", jid)
        assert [(r["kind"], r["cents"]) for r in led] == [("reserve", 24), ("settle", 0)]
        ev = [r["event"] for r in await db._all("select event::text as event from public.job_events where job_id = %s order by at, id", jid)]
        assert ev == ["queued", "claimed", "submitted", "accepted", "running", "output_received", "stored", "policy_approved", "settled", "unknown_cost"]
        # replay: a second completion must not double-charge or duplicate the take
        assert (await db._one("select count(*)::int as n from public.takes where job_id = %s", jid))["n"] == 1
    finally:
        await db.close()


async def test_bad_inputs_are_rejected_without_charge():
    db = await Db.connect(URL)
    try:
        d = Dispatcher(db, MemoryStorage(), lambda name: FakeFal(), cfg())
        jid = await insert_job(db, {"duration_s": 7})  # no prompt, bad enum
        await d.tick()
        job = await db.job(jid)
        assert job["status"] == "rejected" and "prompt" in job["error"]
        assert (await db._one("select count(*)::int as n from public.ledger where job_id = %s", jid))["n"] == 0
    finally:
        await db.close()


async def test_vendor_submit_failure_releases_reservation():
    db = await Db.connect(URL)
    try:
        d = Dispatcher(db, MemoryStorage(), lambda name: FakeFal(fail_submit=True), cfg())
        jid = await insert_job(db, {"prompt": "x", "duration_s": 6})
        await d.tick()
        job = await db.job(jid)
        assert job["status"] == "failed" and "boom" in job["error"]
        led = await db._all("select kind::text as kind, cents from public.ledger where job_id = %s order by created_at", jid)
        assert [(r["kind"], r["cents"]) for r in led] == [("reserve", 24), ("release", -24)]
    finally:
        await db.close()


async def test_timeout_releases():
    db = await Db.connect(URL)
    try:
        fake = FakeFal()
        fake.status = lambda sub, key: _queued()  # type: ignore[method-assign]
        d = Dispatcher(db, MemoryStorage(), lambda name: fake, cfg())
        jid = await insert_job(db, {"prompt": "x", "duration_s": 6})
        await d.tick()
        await db._exec("update public.jobs set submitted_at = now() - interval '2 hours' where id = %s", jid)
        await d.tick()
        assert (await db.job(jid))["status"] == "timed_out"
    finally:
        await db.close()


async def _queued():
    return VendorStatus("queued")


async def test_inbox_delivery_completes_job_and_is_deduped():
    db = await Db.connect(URL)
    try:
        fake = FakeFal()
        d = Dispatcher(db, MemoryStorage(), lambda name: fake, cfg(), webhook_url="https://inbox.example/fal")
        jid = await insert_job(db, {"prompt": "x", "duration_s": 6})
        await d.submit_queued()
        job = await db.job(jid)
        rid = job["provider_request_id"]
        # what the Worker does, twice (fal retry) — second insert is a no-op
        for _ in range(2):
            await db._exec("select public.webhook_ingest('fal', %s, %s, '{}'::jsonb, %s, true)", rid + ":1", rid, f'{{"request_id":"{rid}","status":"OK"}}')
        assert (await db._one("select count(*)::int as n from public.webhook_inbox where provider_request_id = %s", rid))["n"] == 1
        fake.polls = 1  # next status call reports completed
        assert await d.drain_inbox() == 1
        assert (await db.job(jid))["status"] == "succeeded"
        row = await db._one("select processed_at, error from public.webhook_inbox where provider_request_id = %s", rid)
        assert row["processed_at"] is not None and row["error"] is None
        assert await d.drain_inbox() == 0
    finally:
        await db.close()
