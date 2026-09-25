// Server-side Sentry on the Cloudflare Worker (nodejs_compat, compatibility date ≥ 2025-08-16).
// onRequestError catches the "server-side exception" cases that only show a digest to the user.
import * as Sentry from "@sentry/nextjs";

export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  // Development never reports: a local dev server mid-rebuild raised "high priority" alerts (2026-09-24).
  if (!dsn || process.env.NODE_ENV !== "production") return;
  Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0, environment: "production" });
}

export const onRequestError = Sentry.captureRequestError;
