import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

// Before a student spends a clip on a frame, Claude looks at it next to the Cast looks and says what's
// wrong: someone who isn't in the Cast, the wrong face, or weather inside. It only flags; the student
// still chooses. Results live on the shot (intent.checks[takeId]), so each frame is checked once.

export const FrameCheck = z.object({
  extra_people: z.boolean().describe("True if the frame shows a person who is not one of the expected people (a stranger, a duplicate of someone, a face in the background)"),
  people: z.array(z.object({
    name: z.string().describe("Expected person's name, as given"),
    visible: z.boolean().describe("True if this person appears in the frame"),
    matches: z.boolean().describe("True if the person in the frame looks like the reference: same face, hair, age, build, clothes. False if clearly a different person"),
  })),
  weather_indoors: z.boolean().describe("True only for an interior shot where rain, snow or water is falling or pooling INSIDE the room. Weather seen through a window is fine"),
  notes: z.string().describe("One or two short sentences for a teenage student: what's wrong, or empty if the frame is fine"),
});
export type FrameCheckT = z.infer<typeof FrameCheck>;
export type CheckResult = FrameCheckT & { ok: boolean; at: string };

const SYSTEM = `You check a still frame from a student film before it is animated into a video clip.
You are given reference portraits of the people who should be in the frame (by name), the scene heading
(INT. means indoors, EXT. outdoors) and what the shot should show. Then the frame.
Judge only what you can see. Be strict about faces: a different face, hair colour, age or build is a mismatch,
a change of expression or angle is not. Lighting and style differences are not mismatches.
"people" must list every expected person exactly once, in the order given.
If the shot expects nobody, any clearly visible person counts as an extra person.`;

// Claude takes images up to 5 MB each; bigger frames are skipped rather than failing the check.
const MAX_IMAGE = 5 * 1024 * 1024;

async function imageBlock(assetId: string): Promise<Anthropic.Beta.BetaImageBlockParam | null> {
  const supabase = await createClient();
  const { data: a } = await supabase.from("assets").select("r2_key, mime, bytes").eq("id", assetId).maybeSingle();
  if (!a || !/^image\/(png|jpeg|webp|gif)$/.test(a.mime) || Number(a.bytes) > MAX_IMAGE) return null;
  const { env } = getCloudflareContext();
  const obj = await env.ASSETS_BUCKET.get(a.r2_key);
  if (!obj) return null;
  const buf = new Uint8Array(await obj.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { type: "image", source: { type: "base64", media_type: a.mime as "image/png" | "image/jpeg" | "image/webp" | "image/gif", data: btoa(bin) } };
}

export async function checkFrame(input: { frameAssetId: string; heading: string; description: string; people: { name: string; reference: string | null }[] }): Promise<{ ok: true; result: CheckResult } | { error: string }> {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "The frame check isn't set up on this server." };
  const frame = await imageBlock(input.frameAssetId);
  if (!frame) return { error: "Couldn't read this frame." };
  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const p of input.people) {
    const ref = p.reference ? await imageBlock(p.reference) : null;
    content.push({ type: "text", text: ref ? `Reference: ${p.name}` : `${p.name} (no reference picture; check only that one person is there for them)` });
    if (ref) content.push(ref);
  }
  content.push({ type: "text", text: `Scene: ${input.heading || "(no heading)"}\nShot: ${input.description || "(no description)"}\nExpected people: ${input.people.map((p) => p.name).join(", ") || "nobody"}\nThe frame:` });
  content.push(frame);
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  try {
    const r = await client.beta.messages.parse({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "low", format: betaZodOutputFormat(FrameCheck) },
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (r.stop_reason === "refusal") return { error: "The check was declined for this frame." };
    const out = r.parsed_output;
    if (!out) return { error: "The check came back in an unexpected shape." };
    const interior = /^\s*(INT|I\/E|INT\.?\/EXT)/i.test(input.heading);
    const result = { ...out, weather_indoors: interior && out.weather_indoors };
    const ok = !result.extra_people && !result.weather_indoors && result.people.every((p) => p.visible && p.matches);
    return { ok: true, result: { ...result, ok, at: new Date().toISOString() } };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { error: "Too many checks at once. Try again in a minute." };
    if (e instanceof Anthropic.APIError) return { error: `The check failed (${e.status}).` };
    return { error: "The check failed." };
  }
}

