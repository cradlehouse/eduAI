"""P1-14 prompt gate: Claude classifies a prompt against the school's content tier before it reaches a vendor.

It also checks for other people's creative IP (a named or plainly described copyrighted character, a
brand or logo, a famous person, the style of a named living artist) at every tier. An IP refusal comes
with a "make it your own" suggestion that keeps the student's idea. `ip_names.csv` is a deterministic
backstop: names found in the prompt are passed to Claude as a hint and recorded, never refused on their
own (plenty of names are also ordinary words).

Tier M (minors-safe, the default and forced for any minor) or A (adult-permitted, instructor-unlocked).
The decision is recorded in the job's event log and frozen into the receipt. No prompt text is logged
by this module beyond what the job row already holds; the classifier sees only the prompt and the tier.
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from functools import cache
from pathlib import Path
from typing import Any

import httpx

API = "https://api.anthropic.com/v1/messages"
VERSION = "2023-06-01"

CATEGORIES = ["ok", "sexual", "nudity", "graphic_violence", "self_harm", "hate", "harassment", "drugs", "real_person_likeness",
              "weapons_realistic", "other_unsafe", "ip_character", "ip_brand", "ip_famous_person", "ip_artist_style"]
IP_CATEGORIES = {c for c in CATEGORIES if c.startswith("ip_")}

SYSTEM = """You are the content gate for a film-school platform where most students are under 18.
You receive one generation prompt (text-to-video, image, speech or sound) and the school's content tier.
Decide whether the prompt may be sent to the generation model.

Tier M (minors-safe): refuse sexual content or nudity, graphic gore or torture, self-harm, hate or
harassment of protected groups, glamorised drug use, realistic depictions of a named or recognisable real
person, and instructions to make weapons. Ordinary drama is fine: tension, danger, stylised or implied
violence, crime stories, sad or scary scenes, blood in a non-gratuitous way.
Tier A (adult-permitted): refuse only sexual content involving minors, non-consensual sexual content,
real-person likeness, and content that promotes self-harm, terrorism or hate.

Other people's creative work, at every tier. Students make their own characters and worlds. Refuse:
- ip_character: a copyrighted character or franchise, by name or by a description that plainly points to
  one without naming it ("a yellow electric mouse creature", "a boy wizard with a lightning scar").
- ip_brand: a trademarked logo or brand name shown in the picture. A generic object is fine ("a soda can").
- ip_famous_person: a celebrity or other famous living person, by name or unmistakable description.
- ip_artist_style: "in the style of" (or similar) a named living artist, illustrator, filmmaker or studio.
Allow public-domain characters and stories (Sherlock Holmes, Dracula, Robin Hood, fairy tales, myths),
historical figures in a historical setting, genres and techniques (film noir, anime, claymation, stop
motion, watercolour), and the styles of artists who are no longer living (Van Gogh, Hokusai). Archetypes are fine: a masked hero, a wizard, a
detective, a robot. When an IP refusal is a close call, allow it and leave a note.
For any ip_ refusal also write `suggestion`: one sentence on how to make it the student's own that keeps
their idea (what the character does, the mood, the setting) and changes the name, look and details.
A list of protected names may be supplied as a hint; use your judgement, a hit is not a refusal by itself.

Judge the prompt as a filmmaker's brief, not as a search query. When unsure at tier M, refuse and say why
in one sentence a teacher could show the student. Write reasons to the student, plainly, never accusing."""

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
            "suggestion": {"type": "string", "description": "ip_ refusals only: one sentence on making it the student's own."},
            "note": {"type": "string", "description": "Optional: a close IP call that was allowed (who it resembles)."},
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
    suggestion: str = ""
    note: str = ""
    ip_hits: list[str] = field(default_factory=list)

    def as_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {"prompt_gate": "allowed" if self.allowed else "rejected", "category": self.category, "reason": self.reason,
                             "model": self.model, "ran": self.ran}
        for k in ("suggestion", "note", "ip_hits"):
            if getattr(self, k):
                d[k] = getattr(self, k)
        return d

    def release_message(self) -> str:
        """The job's error text, which the web shows the student (apps/web/lib/refusal.ts parses it)."""
        msg = f"prompt gate: {self.category}. {self.reason}".strip()
        if self.suggestion and self.category in IP_CATEGORIES:
            msg += f"\nMake it your own: {self.suggestion}"
        return msg


@cache
def ip_names() -> list[tuple[str, str, re.Pattern[str]]]:
    """(name, kind, pattern) from ip_names.csv; whole words, case-insensitive."""
    rows = csv.DictReader((Path(__file__).parent / "ip_names.csv").open(encoding="utf-8"))
    return [(r["name"], r["kind"], re.compile(r"(?<![\w])" + re.escape(r["name"]) + r"(?![\w])", re.IGNORECASE))
            for r in rows if r.get("name", "").strip()]


def find_ip_names(prompt: str) -> list[str]:
    return [f"{name} ({kind})" for name, kind, pat in ip_names() if pat.search(prompt)]


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
        hits = find_ip_names(prompt)
        hint = f"Protected names found in the prompt: {', '.join(hits)}\n" if hits else ""
        body = {
            "model": self.model, "max_tokens": 400, "system": SYSTEM,
            "tools": [TOOL], "tool_choice": {"type": "tool", "name": "classify"},
            "messages": [{"role": "user", "content": f"Content tier: {tier}\nLayer: {layer or 'picture'}\n{hint}Prompt:\n{prompt[:4000]}"}],
        }
        r = await self._client.post(API, json=body, headers={"x-api-key": self.api_key, "anthropic-version": VERSION, "content-type": "application/json"})
        if r.status_code >= 400:
            raise RuntimeError(f"prompt gate {r.status_code}: {r.text[:300]}")
        data = r.json()
        for block in data.get("content", []):
            if block.get("type") == "tool_use" and block.get("name") == "classify":
                inp = block.get("input", {})
                allowed = bool(inp.get("allowed"))
                return GateDecision(allowed, str(inp.get("category", "other_unsafe")), str(inp.get("reason", "")).strip(), self.model,
                                    suggestion="" if allowed else str(inp.get("suggestion", "")).strip(),
                                    note=str(inp.get("note", "")).strip(), ip_hits=hits)
        raise RuntimeError("prompt gate returned no decision")
