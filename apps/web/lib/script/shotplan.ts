import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// A shot list for one scene, the way a director and DP would plan coverage: an establishing wide,
// then the shots that carry the lines and the beats. Each shot says which lines it covers, so every
// line in the scene has a shot. One speaker per shot where possible (their voice is converted later).
export const FRAMINGS = ["wide", "medium", "close", "over_shoulder", "two_shot", "insert"] as const;
export const MOTIONS = ["static", "dolly_in", "dolly_out", "dolly_left", "dolly_right", "jib_up", "jib_down", "focus_shift"] as const;

export const ShotPlan = z.object({
  shots: z.array(z.object({
    label: z.string().describe("Short name a crew would use, e.g. 'Wide', 'Angie close', 'Over Bert'"),
    framing: z.enum(FRAMINGS),
    camera_motion: z.enum(MOTIONS),
    on: z.array(z.string()).describe("Character names (as in the script, capitals) who are visible"),
    speaker: z.string().describe("The one character who speaks in this shot, or empty if nobody speaks"),
    lines: z.array(z.number().int()).describe("Indices of the dialogue blocks (from the numbered list) this shot covers"),
    description: z.string().describe("What the camera sees and what happens, as a prompt: who, where they are, what they do. No camera jargon beyond the framing."),
    seconds: z.number().int().min(4).max(12),
  })),
  note: z.string().describe("One sentence of advice for the student about this coverage"),
});
export type ShotPlanT = z.infer<typeof ShotPlan>;

const SYSTEM = `You plan coverage for one scene of a student film, like a director with their DP.
Rules:
- Start with an establishing shot (usually wide) unless the scene continues straight from the last one.
- Every dialogue block must be covered by exactly one shot. Prefer one speaker per shot (singles or over-the-shoulder), because each character's voice is converted separately afterwards; use a two-shot with a speaker only for short exchanges.
- Keep it small: 3 to 7 shots for a normal scene. Students pay for every shot.
- Motion: mostly static; a slow dolly in for an emotional line; don't move the camera on every shot.
- Descriptions are prompts for an image model: concrete, visual, present tense. Use the character names in capitals.
- "on" lists EVERY character visible in the frame, even partly: an over-the-shoulder includes the near person's shoulder, a reaction includes whoever is being looked at if they are in frame. A description never refers to anyone (not even "her" or "him") who isn't in "on"; if someone is out of frame, say they are off-screen.
- Weather belongs outside. In an INT. scene, don't mention rain, snow or storms in descriptions at all (image and video models put weather wherever it's named, including inside); the location already carries its weather.
- Seconds: roughly the time to say the lines plus a beat (4-12).`;

export async function planShots(scene: { heading: string; blocks: { i: number; kind: string; who?: string; text: string }[]; cast: string[]; location: string }) {
  if (!process.env.ANTHROPIC_API_KEY) return { error: "Shot planning isn't set up on this server." } as const;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const numbered = scene.blocks.map((b) => (b.kind === "dialogue" ? `[${b.i}] ${b.who}: "${b.text}"` : `(action) ${b.text}`)).join("\n");
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 6000,
      output_config: { effort: "medium", format: zodOutputFormat(ShotPlan) },
      system: SYSTEM,
      messages: [{ role: "user", content: `<scene heading="${scene.heading}" location="${scene.location}" cast="${scene.cast.join(", ")}">\n${numbered}\n</scene>` }],
    });
    if (response.stop_reason === "refusal") return { error: "Shot planning was declined for this scene." } as const;
    if (!response.parsed_output) return { error: "The plan came back in an unexpected shape. Try again." } as const;
    return { ok: true as const, plan: response.parsed_output };
  } catch (e) {
    if (e instanceof Anthropic.APIError) return { error: `Shot planning failed (${e.status}). Try again.` } as const;
    return { error: "Shot planning failed. Try again." } as const;
  }
}
