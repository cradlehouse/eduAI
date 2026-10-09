import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// A script breakdown, the way a production does one: who is in it, where it happens, what objects
// matter, and the scenes in order. Appearance is a prompt the student will reuse for every shot, so it
// is only filled from what the script actually says; gaps become questions for the student.
export const Breakdown = z.object({
  characters: z.array(z.object({
    name: z.string().describe("As written in the script, e.g. MAYA"),
    importance: z.enum(["lead", "supporting", "minor"]),
    who: z.string().describe("Who they are and what they want, from the script; 1–2 sentences"),
    appearance: z.string().describe("How they look, as a prompt, ONLY from what the script states: man/woman, age written as 'in his 60s' or 'in her 20s' (never '60s' alone, which reads as the decade), build, hair, clothes, marks. Never what they do or where they are. Empty string if the script gives nothing."),
    scenes: z.array(z.number().int()),
  })),
  locations: z.array(z.object({
    name: z.string().describe("Short set name, e.g. WAREHOUSE"),
    int_ext: z.enum(["INT", "EXT", "INT/EXT"]),
    appearance: z.string().describe("The place itself as a prompt, only from the script: no people, no action. Weather only for an EXT location; for INT never mention rain, snow or storms, not even on a window. Empty if not described."),
    times: z.array(z.string()).describe("Times of day the script uses here, e.g. NIGHT, DUSK"),
    scenes: z.array(z.number().int()),
  })),
  props: z.array(z.object({
    name: z.string(),
    appearance: z.string().describe("The object alone, as it sits, only from the script: e.g. 'slice of cherry pie on a chipped white plate'. Never what happens to it, who holds it or where it is. Empty if not described."),
    scenes: z.array(z.number().int()),
  })).describe("Objects a character handles or the story depends on. Not furniture or set dressing, and not clothes or accessories someone wears (those belong in that character's appearance)."),
  scenes: z.array(z.object({
    number: z.number().int(),
    heading: z.string().describe("The slugline as written, e.g. INT. WAREHOUSE - NIGHT"),
    location: z.string().describe("Must equal one of locations[].name"),
    time_of_day: z.string(),
    synopsis: z.string().describe("What happens, one or two sentences"),
    characters: z.array(z.string()).describe("Names from characters[].name"),
    props: z.array(z.string()).describe("Names from props[].name"),
    excerpt: z.string().describe("The scene's text from the script, verbatim"),
  })),
  questions: z.array(z.string()).describe("What the student still has to decide because the script leaves it open, e.g. 'What does MAYA look like? The script never says.'"),
});
export type BreakdownT = z.infer<typeof Breakdown>;

const SYSTEM = `You are a first assistant director doing a script breakdown for a student film class.
Read the screenplay and return the breakdown. Rules:
- Use the script's own names and sluglines. Number scenes in order starting at 1.
- If the text has no sluglines, split it into scenes where the place or time changes and write a slugline.
- Appearance fields contain only what the script states. Never invent looks; leave them empty and add a question instead.
- Appearance is how something looks when it's still. What people do, and what happens to objects, stays in the script, not in appearance.
- One thing, one entry: if the script calls the same person, place or object two ways ("bob the trucker", "BOB"), list it once.
- Keep synopses short and plain. The students are teenagers; write for them.`;

export async function breakDownScript(script: string): Promise<{ ok: true; breakdown: BreakdownT } | { error: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { error: "Script breakdown is not configured yet (no API key on the server)." };
  const client = new Anthropic({ apiKey });
  try {
    const response = await client.messages.parse({
      model: "claude-opus-5",
      max_tokens: 16000,
      output_config: { effort: "medium", format: zodOutputFormat(Breakdown) },
      system: SYSTEM,
      messages: [{ role: "user", content: `<script>\n${script}\n</script>` }],
    });
    if (response.stop_reason === "refusal") return { error: "The breakdown was declined for this script. Check the content and try again." };
    if (response.stop_reason === "max_tokens") return { error: "The script is too long to break down in one go. Split it and try again." };
    if (!response.parsed_output) return { error: "The breakdown came back in an unexpected shape. Try again." };
    return { ok: true, breakdown: response.parsed_output };
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return { error: "Too many breakdowns at once. Wait a minute and try again." };
    if (e instanceof Anthropic.APIError) return { error: `Breakdown failed (${e.status}). Try again.` };
    return { error: "Breakdown failed. Try again." };
  }
}
