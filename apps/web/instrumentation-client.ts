// Browser-side Sentry. The DSN is public by design; nothing personal is sent (send_default_pii off,
// no session replay, no user context): most users are minors.
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (dsn && process.env.NODE_ENV === "production") {
  Sentry.init({ dsn, sendDefaultPii: false, tracesSampleRate: 0, replaysSessionSampleRate: 0, replaysOnErrorSampleRate: 0, environment: "production" });
}
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
