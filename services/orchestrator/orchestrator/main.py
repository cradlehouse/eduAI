"""FastAPI entry. /health for Render; the dispatcher runs as a background task when JOB_KINDS is set."""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .db import Db
from .dispatcher import Dispatcher
from .settings import settings
from .storage import make_storage

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("orchestrator")

# P1-15: errors to Sentry when a DSN is set. send_default_pii=False: most users are minors; prompts and
# emails never leave the platform this way. Import is optional so tests need no Sentry.
if settings.sentry_dsn:
    try:
        import sentry_sdk

        sentry_sdk.init(dsn=settings.sentry_dsn, send_default_pii=False, traces_sample_rate=0.0, environment="production")
        log.info("sentry on")
    except ImportError:  # pragma: no cover
        log.warning("SENTRY_DSN set but sentry-sdk not installed")


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.db = await Db.connect(settings.database_url) if settings.database_url else None
    app.state.stop = asyncio.Event()
    app.state.task = None
    if app.state.db and settings.kinds:
        app.state.dispatcher = Dispatcher(app.state.db, make_storage(), webhook_url=f"{settings.webhook_url.rstrip('/')}/fal" if settings.webhook_url else None)
        app.state.task = asyncio.create_task(app.state.dispatcher.run_forever(app.state.stop))
    else:
        log.info("dispatcher off (DATABASE_URL=%s, JOB_KINDS=%r)", "set" if settings.database_url else "unset", settings.job_kinds)
    try:
        yield
    finally:
        app.state.stop.set()
        if app.state.task:
            await app.state.task
        if app.state.db:
            await app.state.db.close()


app = FastAPI(title="eduai orchestrator", lifespan=lifespan, docs_url=None, redoc_url=None)


@app.get("/health")
async def health():
    db: Db | None = app.state.db
    ok = False
    depth: dict[str, int] = {}
    if db:
        try:
            ok = await db.ping()
            depth = await db.queue_depth(settings.kinds)
        except Exception as e:  # noqa: BLE001
            return {"ok": False, "db": f"{type(e).__name__}: {str(e)[:200]}", "kinds": settings.kinds, "worker": settings.worker_name,
                    "dispatcher": bool(app.state.task and not app.state.task.done())}
    return {"ok": ok, "db": ok, "kinds": settings.kinds, "worker": settings.worker_name,
            "dispatcher": bool(app.state.task and not app.state.task.done()), "queue": depth}
