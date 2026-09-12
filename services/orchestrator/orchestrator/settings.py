from __future__ import annotations

import socket

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Everything comes from the Render env group `eduai`. Nothing secret is in the repo."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = Field(default="", description="Supavisor pooled connection string (service role)")
    r2_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket: str = "eduai-assets"
    fal_key: str = ""
    replicate_api_token: str = ""
    sentry_dsn: str = ""
    job_kinds: str = Field(default="", description="comma list: generate, render. Empty ⇒ API only, no dispatcher")
    webhook_url: str = Field(default="", description="inbox Worker base, e.g. https://eduai-webhook-inbox.<acct>.workers.dev; empty ⇒ poll only")
    worker_name: str = Field(default_factory=lambda: socket.gethostname())
    poll_interval_s: float = 3.0
    submit_timeout_min: int = 30
    asset_url_ttl_s: int = 3600
    max_output_bytes: int = 500 * 1024 * 1024

    @property
    def kinds(self) -> list[str]:
        return [k.strip() for k in self.job_kinds.split(",") if k.strip()]


settings = Settings()
