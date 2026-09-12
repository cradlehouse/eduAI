"""Cloudflare R2 through the S3 API. Content-addressed keys <org>/<sha2>/<sha256>.<ext>; same bytes ⇒ same key."""

from __future__ import annotations

import asyncio
from typing import Protocol

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

from .settings import settings


def asset_key(org_id: str, sha256: str, ext: str) -> str:
    return f"{org_id}/{sha256[:2]}/{sha256}.{ext}"


class Storage(Protocol):
    async def put_if_absent(self, key: str, data: bytes, content_type: str) -> None: ...
    async def presigned_get(self, key: str, ttl_s: int) -> str: ...


class R2Storage:
    def __init__(self) -> None:
        self.bucket = settings.r2_bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=f"https://{settings.r2_account_id}.r2.cloudflarestorage.com",
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name="auto",
            config=Config(signature_version="s3v4", retries={"max_attempts": 3}),
        )

    def _exists(self, key: str) -> bool:
        try:
            self._client.head_object(Bucket=self.bucket, Key=key)
            return True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return False
            raise

    async def put_if_absent(self, key: str, data: bytes, content_type: str) -> None:
        def _put() -> None:
            if not self._exists(key):
                self._client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)
        await asyncio.to_thread(_put)

    async def presigned_get(self, key: str, ttl_s: int) -> str:
        return await asyncio.to_thread(
            self._client.generate_presigned_url, "get_object", Params={"Bucket": self.bucket, "Key": key}, ExpiresIn=ttl_s
        )


class MemoryStorage:
    """For tests and local runs without R2 keys."""

    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}

    async def put_if_absent(self, key: str, data: bytes, content_type: str) -> None:
        self.objects.setdefault(key, (data, content_type))

    async def presigned_get(self, key: str, ttl_s: int) -> str:
        return f"memory://{key}"


def make_storage() -> Storage:
    if settings.r2_account_id and settings.r2_access_key_id:
        return R2Storage()
    return MemoryStorage()
