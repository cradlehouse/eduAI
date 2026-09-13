"""Registry-driven request/response mapping. A vendor route is a row (deployment_profiles.adapter), not code."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from jsonschema import Draft202012Validator


@dataclass
class Route:
    profile_id: str
    profile_slug: str
    provider: str
    endpoint: str
    credential_policy: str
    cost_model: dict[str, Any]
    adapter: dict[str, Any]
    resource_model: dict[str, Any]
    version_id: str
    version_slug: str
    model_id: str
    input_schema: dict[str, Any]
    safety: dict[str, Any] = field(default_factory=dict)
    safety_pipeline_version: str = ""

    @property
    def asset_ref_fields(self) -> list[str]:
        props = self.input_schema.get("properties", {})
        return [k for k, v in props.items() if isinstance(v, dict) and v.get("format") == "asset-ref"]

    @property
    def duration_field(self) -> str:
        return self.cost_model.get("duration_field") or "duration_s"


def validate_inputs(schema: dict[str, Any], inputs: dict[str, Any]) -> list[str]:
    """Return human-readable problems; empty list ⇒ valid. Strips x-ui so the validator ignores UI hints."""
    v = Draft202012Validator(schema)
    return [f"{'/'.join(str(p) for p in e.path) or '(root)'}: {e.message}" for e in sorted(v.iter_errors(inputs), key=str)]


def map_inputs(adapter: dict[str, Any], inputs: dict[str, Any]) -> dict[str, Any]:
    """Our field names → the vendor's. string = rename; {to, prefix?, suffix?} = rename + format; null = drop."""
    imap: dict[str, Any] = adapter.get("input_map") or {}
    out: dict[str, Any] = {}
    for k, v in inputs.items():
        if k not in imap:
            out[k] = v
            continue
        rule = imap[k]
        if rule is None:
            continue
        if isinstance(rule, str):
            out[rule] = v
            continue
        to = rule.get("to", k)
        if v is not None and (rule.get("prefix") or rule.get("suffix") is not None):
            v = f"{rule.get('prefix', '')}{v}{rule.get('suffix', '')}"
        out[to] = v
    for k, v in (adapter.get("fixed") or {}).items():
        out.setdefault(k, v)
    return out


@dataclass
class OutputFile:
    url: str
    content_type: str
    key: str
    file_size: int | None = None
    width: int | None = None
    height: int | None = None
    duration_s: float | None = None


def extract_outputs(adapter: dict[str, Any], payload: Any) -> list[OutputFile]:
    """Files in the vendor response: the adapter's `outputs` keys, else every {url, content_type} object found."""
    keys = adapter.get("outputs")
    found: list[OutputFile] = []
    if keys and isinstance(payload, dict):
        for k in keys:
            if k in payload:
                _collect(payload[k], k, found)
        if found:
            return found
    _collect(payload, "", found)
    return found


EXT_TYPES = {"mp4": "video/mp4", "webm": "video/webm", "mov": "video/quicktime", "wav": "audio/wav", "mp3": "audio/mpeg",
             "flac": "audio/flac", "png": "image/png", "jpg": "image/jpeg", "jpeg": "image/jpeg", "webp": "image/webp"}


def _collect(node: Any, key: str, out: list[OutputFile]) -> None:
    if isinstance(node, str) and node.startswith("http") and key:
        ext = node.split("?")[0].rsplit(".", 1)[-1].lower()
        out.append(OutputFile(url=node, content_type=EXT_TYPES.get(ext, "application/octet-stream"), key=key))
        return
    if isinstance(node, dict):
        if isinstance(node.get("url"), str) and node["url"].startswith("http"):
            out.append(OutputFile(
                url=node["url"], content_type=node.get("content_type") or "application/octet-stream", key=key,
                file_size=node.get("file_size"), width=node.get("width"), height=node.get("height"),
                duration_s=node.get("duration") if isinstance(node.get("duration"), (int, float)) else None,
            ))
            return
        for k, v in node.items():
            _collect(v, k if not key else f"{key}.{k}", out)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            _collect(v, f"{key}[{i}]", out)


def asset_kind_for(content_type: str) -> str:
    if content_type.startswith("video/"):
        return "video"
    if content_type.startswith("audio/"):
        return "audio"
    if content_type.startswith("image/"):
        return "image"
    return "document"


def ext_for(content_type: str, url: str) -> str:
    tail = url.split("?")[0].rsplit("/", 1)[-1]
    if "." in tail and len(tail.rsplit(".", 1)[1]) <= 5:
        return tail.rsplit(".", 1)[1].lower()
    return {"video/mp4": "mp4", "video/webm": "webm", "audio/mpeg": "mp3", "audio/wav": "wav", "audio/x-wav": "wav",
            "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}.get(content_type, "bin")
