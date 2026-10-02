// Run: pnpm test:script
import { readFailure } from "./refusal.ts";
import assert from "node:assert";

assert.deepStrictEqual(readFailure("prompt gate: ip_character. Spider-Man belongs to Marvel.\nMake it your own: Keep the wall-climbing hero; give them your own name and costume."),
  { refused: true, ip: true, category: "ip_character", reason: "Spider-Man belongs to Marvel.", suggestion: "Keep the wall-climbing hero; give them your own name and costume." });
assert.deepStrictEqual(readFailure("prompt gate: graphic_violence. Too graphic for tier M."),
  { refused: true, ip: false, category: "graphic_violence", reason: "Too graphic for tier M.", suggestion: "" });
assert.strictEqual((readFailure("prompt gate: ip_brand.") as { reason: string }).reason, "That brand or logo belongs to someone else.");
assert.deepStrictEqual(readFailure("submit: fal 500"), { refused: false, text: "submit: fal 500" });
assert.deepStrictEqual(readFailure(null), { refused: false, text: "It didn't work." });
console.log("refusal: ok");
