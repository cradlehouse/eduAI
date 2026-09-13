import { NextResponse } from "next/server";

// Throws on purpose so Sentry's server wiring can be verified after a deploy. Admin-only would be
// nicer; for now it needs the exact token below and does nothing else.
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("t") !== "eduai-sentry-2026-09-13") return NextResponse.json({ ok: true, note: "no-op" });
  throw new Error("eduai sentry check: server-side exception on purpose");
}
