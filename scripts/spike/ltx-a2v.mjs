// Spike: does LTX audio-to-video lip-sync a character still to a line in a fixed voice?
// Still (FLUX 2 pro) -> line (Kokoro TTS) -> clip (LTX 2.3 audio-to-video). ~50¢ all in.
// Run: FAL_KEY=... node scripts/spike/ltx-a2v.mjs [outdir]
import { writeFile, mkdir } from "node:fs/promises";

const KEY = process.env.FAL_KEY;
if (!KEY) { console.error("Set FAL_KEY"); process.exit(1); }
const out = process.argv[2] ?? "spike-out";
await mkdir(out, { recursive: true });
const H = { Authorization: `Key ${KEY}`, "Content-Type": "application/json" };

async function run(endpoint, input) {
  const t = Date.now();
  const r = await fetch(`https://queue.fal.run/${endpoint}`, { method: "POST", headers: H, body: JSON.stringify(input) });
  if (!r.ok) throw new Error(`${endpoint} submit ${r.status}: ${await r.text()}`);
  const { status_url, response_url } = await r.json();
  for (;;) {
    await new Promise((s) => setTimeout(s, 3000));
    const s = await (await fetch(status_url, { headers: H })).json();
    if (s.status === "COMPLETED") break;
    if (s.status !== "IN_QUEUE" && s.status !== "IN_PROGRESS") throw new Error(`${endpoint}: ${JSON.stringify(s)}`);
  }
  const res = await (await fetch(response_url, { headers: H })).json();
  console.log(`${endpoint} done in ${Math.round((Date.now() - t) / 1000)} s`);
  return res;
}
async function save(url, name) {
  const b = Buffer.from(await (await fetch(url)).arrayBuffer());
  await writeFile(`${out}/${name}`, b);
  return `${out}/${name}`;
}

const still = await run("fal-ai/flux-2-pro", {
  prompt: "Cinematic 35mm film still, medium close-up. A waitress in her late twenties, curly auburn hair tied back, freckles, mint-green diner uniform, standing behind a diner counter at night, rain on the window behind her, warm sodium light, looking just off camera, mouth closed, calm.",
  image_size: "landscape_16_9", output_format: "png",
});
const stillUrl = still.images[0].url;
await save(stillUrl, "1-still.png");

const line = await run("fal-ai/kokoro/american-english", { prompt: "I got the job. In Tulsa. I leave on Monday.", voice: "af_bella", speed: 0.95 });
await save(line.audio.url, "2-line.wav");

const clip = await run("fal-ai/ltx-2.3/audio-to-video", {
  image_url: stillUrl, audio_url: line.audio.url, aspect_ratio: "16:9",
  prompt: "The waitress looks up and says her line quietly to someone off camera. Subtle head movement, natural blinking, lips in sync with the speech. Static camera.",
});
const p = await save(clip.video.url, "3-clip.mp4");
await writeFile(`${out}/result.json`, JSON.stringify({ still, line, clip }, null, 2));
console.log(`\nWatch: ${p}`);
