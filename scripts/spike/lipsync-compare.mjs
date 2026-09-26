// Spike 2: three ways to make a character say a line, on the same still and the same voice line
// as spike 1 (ltx-a2v.mjs). About $1.70 all in.
//   A  LTX 2.5 image-to-video with audio generated alongside, the line written in the prompt
//      (sync comes from generating both together; the voice is whatever LTX invents)
//   B  clip A, then a lip-sync pass (sync.so lipsync-2-pro) onto our fixed voice line
//   C  OmniHuman 1.5: still + voice line -> talking clip (a different model; a benchmark)
// Run: FAL_KEY=... node scripts/spike/lipsync-compare.mjs docs/research/spike-a2v
import { readFile, writeFile } from "node:fs/promises";

// Asks for the key (hidden) when FAL_KEY isn't set, so it never lands in shell history.
async function askHidden(q) {
  process.stdout.write(q);
  process.stdin.setRawMode(true); process.stdin.resume();
  let s = "";
  for await (const chunk of process.stdin) {
    for (const ch of chunk.toString()) {
      if (ch === "\r" || ch === "\n") { process.stdin.setRawMode(false); process.stdin.pause(); process.stdout.write("\n"); return s.trim(); }
      if (ch === "\u0003") process.exit(1);
      if (ch === "\u007f") s = s.slice(0, -1); else s += ch;
    }
  }
  return s.trim();
}
const KEY = process.env.FAL_KEY || await askHidden("fal key (hidden): ");
if (!KEY) { console.error("No key"); process.exit(1); }
const dir = process.argv[2] ?? "docs/research/spike-a2v";
const prev = JSON.parse(await readFile(`${dir}/result.json`, "utf8"));
const stillUrl = prev.still.images[0].url, lineUrl = prev.line.audio.url;
const H = { Authorization: `Key ${KEY}`, "Content-Type": "application/json" };

async function run(endpoint, input) {
  const t = Date.now();
  const r = await fetch(`https://queue.fal.run/${endpoint}`, { method: "POST", headers: H, body: JSON.stringify(input) });
  if (!r.ok) throw new Error(`${endpoint} submit ${r.status}: ${await r.text()}`);
  const { status_url, response_url } = await r.json();
  for (;;) {
    await new Promise((s) => setTimeout(s, 4000));
    const s = await (await fetch(status_url, { headers: H })).json();
    if (s.status === "COMPLETED") break;
    if (s.status !== "IN_QUEUE" && s.status !== "IN_PROGRESS") throw new Error(`${endpoint}: ${JSON.stringify(s)}`);
  }
  const res = await (await fetch(response_url, { headers: H })).json();
  console.log(`${endpoint} done in ${Math.round((Date.now() - t) / 1000)} s`);
  return res;
}
const save = async (url, name) => { await writeFile(`${dir}/${name}`, Buffer.from(await (await fetch(url)).arrayBuffer())); return `${dir}/${name}`; };
const results = {};

// C first-in-parallel with A: they don't depend on each other.
const [a, c] = await Promise.allSettled([
  run("lightricks/ltx-2.5/image-to-video/fast", {
    image_url: stillUrl, duration: 6, resolution: "1080p", aspect_ratio: "16:9", generate_audio: true, camera_motion: "static",
    prompt: 'The waitress looks up and says quietly to someone off camera: "I got the job. In Tulsa. I leave on Monday." Natural blinking, small head movement. Rain on the window, quiet diner room tone.',
  }),
  run("fal-ai/bytedance/omnihuman/v1.5", { image_url: stillUrl, audio_url: lineUrl, resolution: "1080p",
    prompt: "She looks up and says the line quietly to someone off camera." }),
]);
if (a.status === "fulfilled") { results.A = a.value; console.log("A:", await save(a.value.video.url, "A-ltx-native.mp4")); } else console.error("A failed:", a.reason.message);
if (c.status === "fulfilled") { results.C = c.value; console.log("C:", await save(c.value.video.url, "C-omnihuman.mp4")); } else console.error("C failed:", c.reason.message);

if (results.A) {
  try {
    const b = await run("fal-ai/sync-lipsync/v2/pro", { video_url: results.A.video.url, audio_url: lineUrl, sync_mode: "cut_off" });
    results.B = b; console.log("B:", await save(b.video.url, "B-ltx-plus-lipsync.mp4"));
  } catch (e) { console.error("B failed:", e.message); }
}
await writeFile(`${dir}/compare.json`, JSON.stringify(results, null, 2));
console.log("\nDone. Watch A, B, C in", dir);
