"""P1-14 prompt gate: Claude classifies a prompt against the school's content tier before it reaches a vendor.

Tier M (minors-safe, the default and forced for any minor) or A (adult-permitted, instructor-unlocked).
The decision is recorded in the job's event log and frozen into the receipt. No prompt text is logged
by this module beyond what the job row already holds; the classifier sees only the prompt and the tier.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

API = "https://api.anthropic.com/v1/messages"
VERSION = "2023-06-01"

CATEGORIES = ["ok", "sexual", "nudity", "graphic_violence", "self_harm", "hate", "harassment", "drugs", "real_person_likeness",
              "weapons_realistic", "other_unsafe"]

SYSTEM = """You are the content gate for a film-school platform where most students are under 18.
You receive one generation prompt (text-to-video, image, speech or sound) and the school's content tier.
Decide whether the prompt may be sent to the generation model.

Tier M (minors-safe): refuse sexual content or nudity, graphic gore or torture, self-harm, hate or
harassment of protected groups, glamorised drug use, realistic depictions of a named or recognisable real
person, and instructions to make weapons. Ordinary drama is fine: tension, danger, stylised or implied
violence, crime stories, sad or scary scenes, blood in a non-gratuitous way.
Tier A (adult-permitted): refuse only sexual content involving minors, non-consensual sexual content,
real-person likeness, and content that promotes self-harm, terrorism or hate.

Judge the prompt as a filmmaker's brief, not as a search query. When unsure at tier M, refuse and say why
in one sentence a teacher could show the student."""

TOOL = {
    "name": "classify",
    "description": "Record the gate decision for this prompt.",
    "input_schema": {
        "type": "object",
        "required": ["allowed", "category", "reason"],
        "properties": {
            "allowed": {"type": "boolean"},
            "category": {"type": "string", "enum": CATEGORIES},
            "reason": {"type": "string", "description": "One sentence. Empty when allowed."},
        },
    },
}


@dataclass
class GateDecision:
    allowed: bool
    category: str = "ok"
    reason: str = ""
    model: str = ""
    ran: bool = True

    def as_dict(self) -> dict[str, Any]:
        return {"prompt_gate": "allowed" if self.allowed else "rejected", "category": self.category, "reason": self.reason,
                "model": self.model, "ran": self.ran}


class PromptGate:
    def __init__(self, api_key: str, model: str, client: httpx.AsyncClient | None = None) -> None:
        self.api_key, self.model = api_key, model
        self._client = client or httpx.AsyncClient(timeout=httpx.Timeout(30.0, connect=10.0))

    @property
    def available(self) -> bool:
        return bool(self.api_key)

    async def classify(self, prompt: str, tier: str, layer: str = "") -> GateDecision:
        if not prompt.strip():
            return GateDecision(True, "ok", "", self.model)
        body = {
            "model": self.model, "max_tokens": 200, "system": SYSTEM,
            "tools": [TOOL], "tool_choice": {"type": "tool", "name": "classify"},
            "messages": [{"role": "user", "content": f"Content tier: {tier}\nLayer: {layer or 'picture'}\nPrompt:\n{prompt[:4000]}"}],
        }
        r = await self._client.post(API, json=body, headers={"x-api-key": self.api_key, "anthropic-version": VERSION, "content-type": "application/json"})
        if r.status_code >= 400:
            raise RuntimeError(f"prompt gate {r.status_code}: {r.text[:300]}")
        data = r.json()
        for block in data.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == "classify":
                inp = block.get("input", {})
                return GateDecision(bool(inp.get("allowed")), str(inp.get("category", "other_unsafe")), str(inp.get("reason", "")).strip(), self.model)
        raise RuntimeError("prompt gate returned no decision")
