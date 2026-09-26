// Spike 4: two people talking in one clip, split into separate tracks.
//   1. Two-shot still (FLUX 2 pro), a voice sample each (Kokoro stand-ins for Angie and Bert).
//   2. LTX 2.5 image-to-video with its own sound: Angie says her line, Bert answers.
//   3. Split the sound: voices vs room (Demucs); who speaks when (ElevenLabs speech-to-text, diarize).
//   4. Convert the voices to Angie's and to Bert's voice (Chatterbox), keep each only where that person
//      speaks -> an Angie track and a Bert track, same timing as the picture.
//   5. Put picture + Angie + Bert + room back together (fal ffmpeg compose) to check the sync.
// About $1. Run: node scripts/spike/two-voices.mjs docs/research/spike-a2v   (asks for the key, hidden)
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

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
const ANGIE = "I got the job. In Tulsa.";
const BERT = "Then go. Before I talk you out of it.";

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
async function upload(bytes, name, type) {
  const init = await fetch("https://rest.alpha.fal.ai/storage/upload/initiate?storage_type=fal-cdn-v3", {
    method: "POST", headers: H, body: JSON.stringify({ content_type: type, file_name: name }) });
  if (!init.ok) throw new Error(`upload init ${init.status}: ${await init.text()}`);
  const { upload_url, file_url } = await init.json();
  const put = await fetch(upload_url, { method: "PUT", headers: { "Content-Type": type }, body: bytes });
  if (!put.ok) throw new Error(`upload ${put.status}`);
  return file_url;
}
const get = async (url) => Buffer.from(await (await fetch(url)).arrayBuffer());
const save = async (url, name) => { const b = await get(url); await writeFile(`${dir}/${name}`, b); console.log("saved", `${dir}/${name}`); return b; };

// Minimal WAV: find fmt + data, silence everything outside the given [start, end] seconds.
function keepOnly(wav, spans) {
  let p = 12, fmt, data;
  while (p < wav.length - 8) {
    const id = wav.toString("ascii", p, p + 4), size = wav.readUInt32LE(p + 4);
    if (id === "fmt ") fmt = { channels: wav.readUInt16LE(p + 10), rate: wav.readUInt32LE(p + 12), bits: wav.readUInt16LE(p + 22) };
    if (id === "data") { data = { start: p + 8, size: Math.min(size, wav.length - p - 8) }; break; }
    p += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error("not a WAV I can read");
  const out = Buffer.from(wav), frame = fmt.channels * (fmt.bits / 8), frames = Math.floor(data.size / frame);
  const pad = 0.08; // a little air either side of each word run
  for (let f = 0; f < frames; f++) {
    const t = f / fmt.rate;
    if (!spans.some(([a, b]) => t >= a - pad && t <= b + pad)) out.fill(0, data.start + f * frame, data.start + (f + 1) * frame);
  }
  return out;
}
const words = (s) => s.toLowerCase().replace(/[^a-z' ]/g, " ").split(/\s+/).filter(Boolean);
const overlap = (a, b) => { const B = new Set(words(b)); return words(a).filter((w) => B.has(w)).length; };

// 1-2. Still, voice samples and the clip. A rerun reuses the clip already saved (the costly part).
import { existsSync } from "node:fs";
const [angieVoice, bertVoice] = await Promise.all([
  run("fal-ai/kokoro/american-english", { prompt: "Hi, I'm Angie. I've worked the night shift at Rosie's for four years now.", voice: "af_bella" }),
  run("fal-ai/kokoro/american-english", { prompt: "Name's Bert. I've been cooking in this diner longer than you've been alive, kid.", voice: "am_onyx", speed: 0.9 }),
]);
let clipUrl;
if (existsSync(`${dir}/G-1-original.mp4`)) {
  console.log("reusing G-1-original.mp4");
  clipUrl = await upload(await readFile(`${dir}/G-1-original.mp4`), "G-1-original.mp4", "video/mp4");
} else {
  const still = await run("fal-ai/flux-2-pro", { image_size: "landscape_16_9", output_format: "png",
    prompt: "Cinematic 35mm film still, night, inside a small American diner. Medium two-shot: on the left a waitress in her late twenties, curly auburn hair tied back, freckles, mint-green diner uniform, behind the counter; on the right a cook in his sixties, grey stubble, white apron and paper hat, leaning through the kitchen hatch. They look at each other. Rain on the window, warm sodium light, mouths closed." });
  await save(still.images[0].url, "G-still.png");
  const clip = await run("lightricks/ltx-2.5/image-to-video/fast", {
    image_url: still.images[0].url, duration: 8, resolution: "1080p", aspect_ratio: "16:9", generate_audio: true, camera_motion: "static",
    prompt: `The waitress on the left says quietly to the cook: "${ANGIE}" The cook on the right pauses, then answers: "${BERT}" They take turns, no talking over each other. Rain on the window, quiet diner room tone, no music.`,
  });
  await save(clip.video.url, "G-1-original.mp4");
  clipUrl = clip.video.url;
}

// 3. Split the sound
execFileSync("swift", ["scripts/spike/extract-audio.swift", `${dir}/G-1-original.mp4`, `${dir}/G-original.m4a`], { stdio: "ignore" });
execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16", `${dir}/G-original.m4a`, `${dir}/G-original.wav`]);
const clipAudio = await upload(await readFile(`${dir}/G-original.wav`), "G-original.wav", "audio/wav");
const stems = await run("fal-ai/demucs", { audio_url: clipAudio, model: "htdemucs", stems: ["vocals", "drums", "bass", "other"], output_format: "wav" });
if (!stems.vocals?.url) {
  console.log("demucs returned:", JSON.stringify(stems).slice(0, 400));
  const iso = await run("fal-ai/elevenlabs/audio-isolation", { audio_url: clipAudio });
  stems.vocals = iso.audio;
}
await save(stems.vocals.url, "G-voices-before.wav");
const room = ["other", "drums", "bass"].filter((k) => stems[k]?.url).map((k) => stems[k].url);
if (stems.other?.url) await save(stems.other.url, "G-room.wav");
const stt = await run("fal-ai/elevenlabs/speech-to-text", { audio_url: stems.vocals.url, diarize: true });
await writeFile(`${dir}/G-transcript.json`, JSON.stringify(stt, null, 2));

// Who is who: each detected speaker's words vs each character's line
const bySpeaker = {};
for (const w of stt.words.filter((w) => w.type === "word")) (bySpeaker[w.speaker_id] ??= []).push(w);
const cast = { angie: ANGIE, bert: BERT }, spans = { angie: [], bert: [] };
for (const [id, ws] of Object.entries(bySpeaker)) {
  const said = ws.map((w) => w.text).join(" ");
  const who = overlap(said, ANGIE) >= overlap(said, BERT) ? "angie" : "bert";
  console.log(`speaker ${id} -> ${who}: "${said}"`);
  for (const w of ws) spans[who].push([w.start, w.end]);
}
if (Object.keys(bySpeaker).length < 2) {
  // One diarized speaker: fall back to the script. Words from Angie's line are hers, the rest Bert's.
  console.log("only one speaker detected; splitting by the script's words");
  spans.angie = []; spans.bert = [];
  const A = new Set(words(ANGIE)); let inBert = false;
  for (const w of stt.words.filter((w) => w.type === "word")) {
    if (!inBert && !A.has(words(w.text)[0] ?? "")) inBert = true;
    (inBert ? spans.bert : spans.angie).push([w.start, w.end]);
  }
}

// 4. Convert and keep each voice only where that person speaks
const [va, vb] = await Promise.all([
  run("fal-ai/chatterbox/speech-to-speech", { source_audio_url: stems.vocals.url, target_voice_audio_url: angieVoice.audio.url }),
  run("fal-ai/chatterbox/speech-to-speech", { source_audio_url: stems.vocals.url, target_voice_audio_url: bertVoice.audio.url }),
]);
const angieTrack = keepOnly(await get(va.audio.url), spans.angie);
const bertTrack = keepOnly(await get(vb.audio.url), spans.bert);
await writeFile(`${dir}/G-track-angie.wav`, angieTrack);
await writeFile(`${dir}/G-track-bert.wav`, bertTrack);
console.log("saved the Angie and Bert tracks");

// 5. Back together: picture + Angie + Bert + room
const ms = 8000;
const [ua, ub] = await Promise.all([upload(angieTrack, "angie.wav", "audio/wav"), upload(bertTrack, "bert.wav", "audio/wav")]);
const kf = (url) => [{ timestamp: 0, duration: ms, url }];
const mix = await run("fal-ai/ffmpeg-api/compose", { tracks: [
  { id: "picture", type: "video", keyframes: kf(clipUrl) },
  { id: "angie", type: "audio", keyframes: kf(ua) },
  { id: "bert", type: "audio", keyframes: kf(ub) },
  ...room.map((u, i) => ({ id: `room${i}`, type: "audio", keyframes: kf(u) })),
] });
await save(mix.video_url, "G-2-two-voices.mp4");
await writeFile(`${dir}/two-voices.json`, JSON.stringify({ angieVoice, bertVoice, clipUrl, stems, stt, spans, va, vb, mix }, null, 2));
console.log("\nDone. Compare G-1-original.mp4 with G-2-two-voices.mp4; tracks are G-track-angie.wav, G-track-bert.wav, G-room.wav");
