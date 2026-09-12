// Runs on Node ≥ 20 (WebCrypto Ed25519). Signs a body with a fresh key and checks the Worker's verifier.
import { test } from "node:test";
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
globalThis.crypto ??= webcrypto;
const { falMessage, hex, importJwks, verifyFal, timestampFresh } = await import("../src/verify.ts");

async function fixture(bodyText = '{"request_id":"r1","status":"OK","payload":{}}') {
  const kp = await crypto.subtle.generateKey({ name: "Ed25519" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", kp.publicKey);
  const body = new TextEncoder().encode(bodyText);
  const now = Date.now();
  const h = { requestId: "r1", userId: "u1", timestamp: String(Math.floor(now / 1000)), signature: "" };
  const sig = await crypto.subtle.sign({ name: "Ed25519" }, kp.privateKey, await falMessage(h, body));
  h.signature = hex(new Uint8Array(sig));
  const keys = await importJwks({ keys: [{ kty: "OKP", crv: "Ed25519", x: jwk.x + "=", kid: "k1" }, { kty: "RSA" }] }); // padded like fal's
  return { h, body, keys, now };
}

test("valid signature verifies", async () => {
  const { h, body, keys, now } = await fixture();
  assert.equal(keys.length, 1);
  assert.equal(await verifyFal(h, body, keys, now), true);
});

test("tampered body, wrong key, bad hex and stale timestamp are rejected", async () => {
  const { h, body, keys, now } = await fixture();
  assert.equal(await verifyFal(h, new TextEncoder().encode("{}"), keys, now), false);
  const other = await fixture();
  assert.equal(await verifyFal(h, body, other.keys, now), false);
  assert.equal(await verifyFal({ ...h, signature: "zz" }, body, keys, now), false);
  assert.equal(await verifyFal(h, body, keys, now + 10 * 60 * 1000), false);
  assert.equal(timestampFresh("nope"), false);
});
