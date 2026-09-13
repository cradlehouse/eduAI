import httpx
import pytest
import respx

from orchestrator.gate import API, PromptGate


def tool_reply(allowed, category, reason=""):
    return {"content": [{"type": "tool_use", "name": "classify", "input": {"allowed": allowed, "category": category, "reason": reason}}]}


@respx.mock
async def test_gate_allows_and_rejects_and_sends_tier():
    route = respx.post(API).mock(side_effect=[httpx.Response(200, json=tool_reply(True, "ok")),
                                             httpx.Response(200, json=tool_reply(False, "graphic_violence", "Too graphic for tier M."))])
    g = PromptGate("k", "claude-haiku-4-5-20251001", httpx.AsyncClient())
    d = await g.classify("a quiet warehouse at dusk", "M", "background")
    assert d.allowed and d.category == "ok" and d.model == "claude-haiku-4-5-20251001"
    body = route.calls[0].request.content.decode()
    assert "Content tier: M" in body and "tool_choice" in body and route.calls[0].request.headers["x-api-key"] == "k"
    d = await g.classify("...", "M")
    assert not d.allowed and d.category == "graphic_violence" and "Too graphic" in d.reason


@respx.mock
async def test_gate_fails_closed_on_api_error_and_skips_empty():
    respx.post(API).mock(return_value=httpx.Response(529, text="overloaded"))
    g = PromptGate("k", "m", httpx.AsyncClient())
    with pytest.raises(RuntimeError):
        await g.classify("x", "M")
    assert (await g.classify("   ", "M")).allowed
    assert not PromptGate("", "m").available
