import csv
from pathlib import Path

import httpx
import pytest
import respx

from orchestrator import gate
from orchestrator.gate import API, GateDecision, PromptGate, find_ip_names


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


@respx.mock
async def test_ip_refusal_carries_a_make_it_your_own_suggestion():
    reply = {"content": [{"type": "tool_use", "name": "classify", "input": {
        "allowed": False, "category": "ip_character", "reason": "Spider-Man belongs to Marvel.",
        "suggestion": "Keep the masked hero who climbs walls, and give them your own name, costume and colours."}}]}
    route = respx.post(API).mock(return_value=httpx.Response(200, json=reply))
    d = await PromptGate("k", "m", httpx.AsyncClient()).classify("Spider-Man swings over a Dallas street at night", "M")
    assert not d.allowed and d.category == "ip_character"
    assert d.ip_hits == ["Spider-Man (character)"]
    assert "Protected names found in the prompt: Spider-Man (character)" in route.calls[0].request.content.decode()
    assert d.release_message() == ("prompt gate: ip_character. Spider-Man belongs to Marvel.\n"
                                   "Make it your own: Keep the masked hero who climbs walls, and give them your own name, costume and colours.")
    assert d.as_dict()["suggestion"].startswith("Keep the masked hero")


@respx.mock
async def test_allowed_prompt_drops_suggestion_and_keeps_close_call_note():
    reply = {"content": [{"type": "tool_use", "name": "classify", "input": {
        "allowed": True, "category": "ok", "reason": "", "suggestion": "ignored", "note": "A boy wizard, but no scar or school: generic."}}]}
    respx.post(API).mock(return_value=httpx.Response(200, json=reply))
    d = await PromptGate("k", "m", httpx.AsyncClient()).classify("a young wizard reads by candlelight", "M")
    assert d.allowed and d.suggestion == "" and d.ip_hits == []
    assert d.as_dict()["note"].startswith("A boy wizard") and "suggestion" not in d.as_dict()
    assert d.release_message() == "prompt gate: ok."


def test_non_ip_refusal_never_adds_a_suggestion():
    d = GateDecision(False, "graphic_violence", "Too graphic for tier M.", suggestion="should not show")
    assert d.release_message() == "prompt gate: graphic_violence. Too graphic for tier M."


def test_name_list_matches_whole_words_only():
    assert find_ip_names("a poster of SPIDERMAN on the wall") == ["Spiderman (character)"]
    assert find_ip_names("a batmanesque silhouette") == []  # not a whole word; Claude still judges the description
    assert find_ip_names("in the style of Wes Anderson, symmetrical") == ["Wes Anderson (artist)"]
    assert find_ip_names("a detective in a foggy London street") == []


def test_name_list_is_well_formed():
    path = Path(gate.__file__).parent / "ip_names.csv"
    rows = list(csv.DictReader(path.open(encoding="utf-8")))
    assert len(rows) > 150
    assert {r["kind"] for r in rows} == {"character", "brand", "artist", "famous_person"}
    names = [r["name"].lower() for r in rows]
    assert len(names) == len(set(names)), "duplicate names"
    assert all(len(r) == 3 and None not in r for r in rows), "a field contains a comma"
