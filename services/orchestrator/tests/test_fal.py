import httpx
import pytest
import respx

from orchestrator.providers import ProviderError
from orchestrator.providers.fal import QUEUE, FalProvider


@respx.mock
async def test_fal_round_trip():
    respx.post(f"{QUEUE}/fal-ai/ltx-2.5/text-to-video").mock(return_value=httpx.Response(200, json={
        "request_id": "r1", "status_url": "https://q/r1/status", "response_url": "https://q/r1"}))
    respx.get("https://q/r1/status").mock(side_effect=[httpx.Response(200, json={"status": "IN_QUEUE"}),
                                                     httpx.Response(200, json={"status": "IN_PROGRESS"}),
                                                     httpx.Response(200, json={"status": "COMPLETED"})])
    respx.get("https://q/r1").mock(return_value=httpx.Response(200, json={"video": {"url": "https://f/v.mp4", "content_type": "video/mp4"}}))
    respx.get("https://f/v.mp4").mock(return_value=httpx.Response(200, content=b"abc"))
    p = FalProvider(httpx.AsyncClient())
    sub = await p.submit("fal-ai/ltx-2.5/text-to-video", {"prompt": "x"}, "k")
    assert sub.request_id == "r1"
    assert respx.calls[0].request.headers["authorization"] == "Key k"
    assert [(await p.status(sub, "k")).state for _ in range(3)] == ["queued", "running", "completed"]
    assert (await p.result(sub, "k"))["video"]["url"] == "https://f/v.mp4"
    assert await p.download("https://f/v.mp4", "k", 100) == b"abc"


@respx.mock
async def test_fal_errors_classified():
    respx.post(f"{QUEUE}/x").mock(return_value=httpx.Response(429, text="slow down"))
    p = FalProvider(httpx.AsyncClient())
    with pytest.raises(ProviderError) as e:
        await p.submit("x", {}, "k")
    assert e.value.retryable and e.value.status == 429
    respx.get("https://f/big").mock(return_value=httpx.Response(200, content=b"0" * 50))
    with pytest.raises(ProviderError) as e:
        await p.download("https://f/big", "k", 10)
    assert not e.value.retryable
