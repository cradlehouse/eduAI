from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Literal, Protocol


class ProviderError(Exception):
    def __init__(self, message: str, *, retryable: bool = False, status: int | None = None) -> None:
        super().__init__(message)
        self.retryable = retryable
        self.status = status


@dataclass
class Submission:
    request_id: str
    status_url: str = ""
    response_url: str = ""
    raw: dict[str, Any] = field(default_factory=dict)


@dataclass
class VendorStatus:
    state: Literal["queued", "running", "completed", "failed"]
    error: str | None = None
    raw: dict[str, Any] = field(default_factory=dict)


class Provider(Protocol):
    name: str

    async def submit(self, endpoint: str, inputs: dict[str, Any], key: str, webhook_url: str | None = None) -> Submission: ...
    async def status(self, sub: Submission, key: str) -> VendorStatus: ...
    async def result(self, sub: Submission, key: str) -> Any: ...
    async def download(self, url: str, key: str, max_bytes: int) -> bytes: ...
