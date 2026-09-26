// Spike 3: keep A's natural delivery but lock the voice.
//   D  A's audio re-voiced with Chatterbox speech-to-speech to a fixed voice sample, put back on A
//   E  the same with ElevenLabs' voice changer (one stock voice), put back on A
//   F  route B with a better voice: an expressive ElevenLabs v3 line lip-synced onto A
// Needs A-audio.m4a (A's sound, extracted locally). About 70c all in.
// Run: node scripts/spike/voice-lock.mjs docs/research/spike-a2v   (asks for the key, hidden)
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
const H = { Authorization: `Key ${KEY}`, "Content-Type": "application/json" };
const dir = process.argv[2] ?? "docs/research/spike-a2v";
const prev = JSON.parse(await readFile(`${dir}/result.json`, "utf8"));
const cmp = JSON.parse(await readFile(`${dir}/compare.json`, "utf8"));
const lineUrl = prev.line.audio.url, aVideo = cmp.A.video.url;
const LINE = "I got the job. In Tulsa. I leave on Monday.";

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
async function upload(path, type) {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST", headers: H, body: JSON.stringify({ content_type: type, file_name: path.split("/").pop() }) });
  if (!init.ok) throw new Error(`upload init ${init.status}: ${await init.text()}`);
  const { upload_url, file_url } = await init.json();
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": type }, body: await readFile(path) });
  if (!put.ok) throw new Error(`upload ${put.status}`);
  return file_url;
}
const save = async (url, name) => { await writeFile(`${dir}/${name}`, Buffer.from(await (await fetch(url)).arrayBuffer())); console.log("saved", `${dir}/${name}`); };
const out = {};
const step = async (name, fn) => { try { out[name] = await fn(); } catch (e) { console.error(`${name} failed:`, e.message); } };

// A's own performance (extracted locally from A-ltx-native.mp4), so D and E keep LTX's timing and delivery.
let aAudio;
try { aAudio = await upload(`${dir}/A-audio.m4a`, "audio/mp4"); } catch (e) { console.error(e.message, "- falling back to the video URL"); aAudio = aVideo; }

await Promise.all([
  // D: A's performance, re-voiced to our fixed voice sample (Chatterbox, cheap, open weights)
  step("D", async () => {
    const v = await run("fal-ai/chatterbox/speech-to-speech", { source_audio_url: aAudio, target_voice_audio_url: lineUrl });
    const m = await run("fal-ai/ffmpeg-api/merge-audio-video", { video_url: aVideo, audio_url: v.audio.url });
    await save(m.video.url, "D-ltx-native-revoiced-chatterbox.mp4"); return { v, m };
  }),
  // E: the same with ElevenLabs' voice changer, one stock voice standing in for Angie's
  step("E", async () => {
    const v = await run("fal-ai/elevenlabs/voice-changer", { audio_url: aAudio, voice: "Rachel" });
    const m = await run("fal-ai/ffmpeg-api/merge-audio-video", { video_url: aVideo, audio_url: v.audio.url });
    await save(m.video.url, "E-ltx-native-revoiced-elevenlabs.mp4"); return { v, m };
  }),
  // F: route B with a better voice actor: expressive ElevenLabs v3 line, lip-synced onto A
  step("F", async () => {
    const t = await run("fal-ai/elevenlabs/tts/eleven-v3", { text: `[quietly, hopeful] ${LINE}`, voice: "Rachel" });
    const l = await run("fal-ai/sync-lipsync/v2/pro", { video_url: aVideo, audio_url: t.audio.url, sync_mode: "cut_off" });
    await save(l.video.url, "F-ltx-plus-lipsync-elevenlabs.mp4"); return { t, l };
  }),
]);
await writeFile(`${dir}/voice.json`, JSON.stringify(out, null, 2));
console.log("\nDone. Watch D, E, F in", dir);
