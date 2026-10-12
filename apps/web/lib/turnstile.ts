import "server-only";

// Cloudflare Turnstile: proof a form was sent by a person. On only when both keys exist: the site key
// (public, NEXT_PUBLIC_TURNSTILE_SITE_KEY in .env.production) and the secret (a Worker secret,
// TURNSTILE_SECRET_KEY, set with `wrangler secret put`). Until then forms rely on their honeypot.
export const turnstileOn = () => !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !!process.env.TURNSTILE_SECRET_KEY;

export async function verifyTurnstile(token: string, ip?: string | null): Promise<boolean> {
  if (!turnstileOn()) return true;
  if (!token) return false;
  const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body });
    const out = (await r.json()) as { success?: boolean };
    return !!out.success;
  } catch {
    return false;
  }
}
