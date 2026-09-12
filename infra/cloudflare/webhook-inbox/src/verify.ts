// fal webhook signature (https://fal.ai/docs/model-endpoints/webhooks):
//   message = request_id \n user_id \n timestamp \n sha256hex(body), UTF-8; Ed25519; signature hex;
//   public keys = JWKS (OKP / Ed25519, `x` base64url); timestamp within ±300 s.
// Pure WebCrypto so it runs unchanged in Workers and in Node's test runner.

export type FalHeaders = { requestId: string; userId: string; timestamp: string; signature: string };
export type Jwks = { keys: Array<{ kty?: string; crv?: string; x?: string; kid?: string }> };

const subtle = crypto.subtle;

export function falHeaders(h: Headers): FalHeaders | null {
  const requestId = h.get("x-fal-webhook-request-id"), userId = h.get("x-fal-webhook-user-id");
  const timestamp = h.get("x-fal-webhook-timestamp"), signature = h.get("x-fal-webhook-signature");
  return requestId && userId && timestamp && signature ? { requestId, userId, timestamp, signature } : null;
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  return hex(new Uint8Array(await subtle.digest("SHA-256", bytes as BufferSource)));
}

export function hex(b: Uint8Array): string {
  return [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
}

export function fromHex(s: string): Uint8Array {
  if (s.length % 2 || /[^0-9a-f]/i.test(s)) throw new Error("bad hex");
  return new Uint8Array(s.match(/../g)!.map((x) => parseInt(x, 16)));
}

export async function falMessage(h: FalHeaders, body: Uint8Array): Promise<Uint8Array> {
  return new TextEncoder().encode(`${h.requestId}\n${h.userId}\n${h.timestamp}\n${await sha256Hex(body)}`);
}

export function timestampFresh(ts: string, now = Date.now(), leewayS = 300): boolean {
  const t = Number(ts);
  return Number.isFinite(t) && Math.abs(now / 1000 - t) <= leewayS;
}

export async function importJwks(jwks: Jwks): Promise<CryptoKey[]> {
  const keys: CryptoKey[] = [];
  for (const k of jwks.keys ?? []) {
    if (k.kty !== "OKP" || k.crv !== "Ed25519" || !k.x) continue;
    // fal's JWKS pads `x` with "="; JWK base64url must be unpadded or importKey throws.
    const x = k.x.replace(/=+$/, "");
    keys.push(await subtle.importKey("jwk", { kty: "OKP", crv: "Ed25519", x }, { name: "Ed25519" }, false, ["verify"]));
  }
  return keys;
}

// True when ANY current key verifies (fal rotates keys; the JWKS may list several).
export async function verifyFal(h: FalHeaders, body: Uint8Array, keys: CryptoKey[], now = Date.now()): Promise<boolean> {
  if (!timestampFresh(h.timestamp, now)) return false;
  let sig: Uint8Array;
  try { sig = fromHex(h.signature); } catch { return false; }
  const msg = await falMessage(h, body);
  for (const k of keys) {
    if (await subtle.verify({ name: "Ed25519" }, k, sig as BufferSource, msg as BufferSource)) return true;
  }
  return false;
}
