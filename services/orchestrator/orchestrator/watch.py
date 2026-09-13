"""Weekly registry watch: does every approved route still exist, and what moved in the market this week?

Run by .github/workflows/registry-watch.yml. Prints a Markdown report; the workflow files it as an issue.
Part 1 needs nothing but the repo. Part 2 asks Claude (with web search) to compare the market against the
registry and propose rows; it runs only when ANTHROPIC_API_KEY is set. Nothing here changes the registry:
a human turns proposals into CSV rows, the same way every route was added.
"""

from __future__ import annotations

import csv
import json
import os
import sys
from datetime import date
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[3]
SEED = ROOT / "packages" / "db" / "seed"
API = "https://api.anthropic.com/v1/messages"


def registry() -> list[dict]:
    rows = list(csv.DictReader(open(SEED / "deployment_profiles.csv")))
    for r in rows:
        try:
            r["cost_model"] = json.load(open(SEED / "profiles" / f"{r['slug']}.json")).get("cost_model", {})
        except FileNotFoundError:
            r["cost_model"] = {}
    return rows


def check_endpoints(rows: list[dict]) -> list[str]:
    out = ["## Approved routes: do they still exist?", "", "| route | endpoint | check |", "|---|---|---|"]
    with httpx.Client(timeout=20, follow_redirects=True, headers={"user-agent": "imaje-registry-watch"}) as c:
        for r in rows:
            if r["approval_status"] != "approved":
                continue
            if r["provider"] == "fal":
                url = f"https://fal.ai/models/{r['endpoint']}/api"
            elif r["provider"] == "replicate":
                url = f"https://replicate.com/{r['endpoint']}"
            else:
                out.append(f"| {r['slug']} | {r['endpoint']} | not checked ({r['provider']}) |")
                continue
            try:
                st = c.get(url).status_code
                mark = "ok" if st == 200 else f"**HTTP {st}** — check the endpoint"
            except Exception as e:  # noqa: BLE001
                mark = f"**error** {type(e).__name__}"
            out.append(f"| {r['slug']} | `{r['endpoint']}` | {mark} |")
    return out


def market_scan(rows: list[dict], key: str, model: str) -> list[str]:
    known = "\n".join(f"- {r['slug']}: {r['provider']} {r['endpoint']} ({r['approval_status']}, lanes {r['lanes']}, cost {json.dumps(r['cost_model'])})" for r in rows)
    prompt = f"""You maintain the model registry for Imaje, a film-education platform for cohorts of mostly under-18 students.
Routes today:
{known}

Using web search, report what changed in the last 7 days that matters for us, as Markdown with these sections:
1. Price or endpoint changes for routes we already have (fal.ai, Replicate).
2. New video / image / text-to-speech / sound-effects models on fal.ai or Replicate worth a registry row, one line each:
   name, endpoint, open weights or closed, licence, likeness risk, rough price, why it matters for a school.
3. Anything about training-data disclosure, licences, or energy disclosure from Lightricks, Google, Stability, Resemble.
Be specific and cite URLs. If nothing changed in a section, say so in one line. Do not invent prices."""
    body = {"model": model, "max_tokens": 2000, "tools": [{"type": "web_search_20250305", "name": "web_search", "max_uses": 8}],
            "messages": [{"role": "user", "content": prompt}]}
    r = httpx.post(API, json=body, headers={"x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json"}, timeout=180)
    if r.status_code >= 400:
        return ["## Market scan", "", f"Claude request failed: HTTP {r.status_code} {r.text[:300]}"]
    text = "".join(b.get("text", "") for b in r.json().get("content", []) if b.get("type") == "text")
    return ["## Market scan (Claude with web search)", "", text.strip() or "(empty)"]


def main() -> int:
    rows = registry()
    lines = [f"# Registry watch · {date.today().isoformat()}", "",
             "Automated weekly check. Nothing here edits the registry: a person turns proposals into CSV rows.", ""]
    lines += check_endpoints(rows)
    key = os.environ.get("ANTHROPIC_API_KEY", "")
    if key:
        lines += [""] + market_scan(rows, key, os.environ.get("WATCH_MODEL", "claude-sonnet-5"))
    else:
        lines += ["", "## Market scan", "", "Skipped: ANTHROPIC_API_KEY not set."]
    print("\n".join(lines))
    return 0


if __name__ == "__main__":
    sys.exit(main())
