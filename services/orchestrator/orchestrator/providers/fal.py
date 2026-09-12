"""fal.ai queue API: POST queue.fal.run/<app> → request_id; GET status; GET response; files are plain URLs.

fal returns no per-request cost, so every fal job settles at the estimate with cost_unknown = true
(the ledger note says so) until reconciliation against the monthly invoice.
"""

from __future__ import annotations

from typing import Any

import httpx

from .base import ProviderError, Submission, VendorStatus

QUEUE = "https://queue.fal.run"


class FalProvider:
    name = "fal"

    def __init__(self, client: httpx.AsyncClient | None = None) -> None:
        self._client = client or httpx.AsyncClient(timeout=httpx.Timeout(60.0, connect=15.0))

    @staticmethod
    def _headers(key: str) -> dict[str, str]:
        return {"Authorization": f"Key {key}", "Content-Type": "application/json"}

    async def submit(self, endpoint: str, inputs: dict[str, Any], key: str, webhook_url: str | None = None) -> Submission:
        params = {"fal_webhook": webhook_url} if webhook_url else None
        r = await self._client.post(f"{QUEUE}/{endpoint}", json=inputs, headers=self._headers(key), params=params)
        _raise_for(r)
        d = r.json()
        if "request_id" not in d:
            raise ProviderError(f"fal submit: no request_id in {d!r}")
        return Submission(request_id=d["request_id"], status_url=d.get("status_url", ""), response_url=d.get("response_url", ""), raw=d)

    async def status(self, sub: Submission, key: str) -> VendorStatus:
        r = await self._client.get(sub.status_url, headers=self._headers(key), params={"logs": "0"})
        _raise_for(r)
        d = r.json()
        s = d.get("status", "")
        if s == "COMPLETED":
            return VendorStatus("completed", raw=d)
        if s == "IN_PROGRESS":
            return VendorStatus("running", raw=d)
        if s == "IN_QUEUE":
            return VendorStatus("queued", raw=d)
        return VendorStatus("failed", error=f"fal status {s or d!r}", raw=d)

    async def result(self, sub: Submission, key: str) -> Any:
        r = await self._client.get(sub.response_url, headers=self._headers(key))
        if r.status_code == 422:
            raise ProviderError(f"fal rejected the request: {r.text[:500]}", retryable=False, status=422)
        _raise_for(r)
        return r.json()

    async def download(self, url: str, key: str, max_bytes: int) -> bytes:
        buf = bytearray()
        async with self._client.stream("GET", url) as r:
            if r.status_code >= 400:
                raise ProviderError(f"download {r.status_code} from {url}", retryable=r.status_code >= 500, status=r.status_code)
            async for chunk in r.aiter_bytes():
                buf.extend(chunk)
                if len(buf) > max_bytes:
                    raise ProviderError(f"output larger than {max_bytes} bytes", retryable=False)
        return bytes(buf)


def _raise_for(r: httpx.Response) -> None:
    if r.status_code < 400:
        return
    retryable = r.status_code in (408, 425, 429) or r.status_code >= 500
    raise ProviderError(f"fal {r.status_code}: {r.text[:500]}", retryable=retryable, status=r.status_code)
