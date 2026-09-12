// eduai webhook inbox: POST /fal → verify → public.webhook_ingest → 200. Vendors never point at Render.
// Unverified deliveries are stored too (signature_ok = false) so a mis-signed delivery is visible,
// but the orchestrator only ever uses a row as a nudge to re-poll the vendor — never as data.
import { falHeaders, importJwks, verifyFal, type Jwks } from "./verify";

export interface Env { SUPABASE_URL: string; SUPABASE_ANON_KEY: string; FAL_JWKS_URL: string }

let jwksCache: { keys: CryptoKey[]; at: number } | null = null;
const JWKS_TTL_MS = 10 * 60 * 1000;

async function falKeys(env: Env, force = false): Promise<CryptoKey[]> {
  if (!force && jwksCache && Date.now() - jwksCache.at < JWKS_TTL_MS) return jwksCache.keys;
  const r = await fetch(env.FAL_JWKS_URL, { cf: { cacheTtl: 600 } } as RequestInit);
  if (!r.ok) throw new Error(`jwks ${r.status}`);
  const keys = await importJwks((await r.json()) as Jwks);
  jwksCache = { keys, at: Date.now() };
  return keys;
}

async function ingest(env: Env, args: { provider: string; dedupe: string; requestId: string; headers: Record<string, string>; body: string; ok: boolean }) {
  const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/webhook_ingest`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: env.SUPABASE_ANON_KEY, authorization: `Bearer ${env.SUPABASE_ANON_KEY}` },
    body: JSON.stringify({ p_provider: args.provider, p_dedupe_key: args.dedupe, p_request_id: args.requestId,
                           p_headers: args.headers, p_body: args.body, p_signature_ok: args.ok }),
  });
  if (!r.ok) throw new Error(`ingest ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return (await r.json()) as boolean;
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname === "/health") return Response.json({ ok: true });
    if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
    if (url.pathname !== "/fal") return new Response("not found", { status: 404 });

    const bytes = new Uint8Array(await req.arrayBuffer());
    if (bytes.byteLength > 256 * 1024) return new Response("too large", { status: 413 });
    const h = falHeaders(req.headers);
    if (!h) return new Response("missing signature headers", { status: 400 });

    let ok = false;
    try {
      ok = await verifyFal(h, bytes, await falKeys(env));
      if (!ok) ok = await verifyFal(h, bytes, await falKeys(env, true)); // key rotation: refetch once
    } catch (e) {
      console.error("verify failed", String(e));
    }

    const body = new TextDecoder().decode(bytes);
    let requestId = "";
    try { requestId = String(JSON.parse(body)?.request_id ?? ""); } catch { /* keep "" */ }
    // one row per delivery attempt: fal re-sends on non-2xx, and the same request can report twice (retry)
    const dedupe = `${h.requestId}:${h.timestamp}`;
    try {
      const stored = await ingest(env, {
        provider: "fal", dedupe, requestId, ok, body,
        headers: { request_id: h.requestId, user_id: h.userId, timestamp: h.timestamp, ua: req.headers.get("user-agent") ?? "" },
      });
      return Response.json({ ok: true, verified: ok, stored });
    } catch (e) {
      console.error("ingest failed", String(e));
      return new Response("inbox unavailable", { status: 503 }); // fal retries; the orchestrator polls anyway
    }
  },
};
