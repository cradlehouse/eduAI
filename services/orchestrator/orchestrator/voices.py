"""A chosen talking take → one sound track per character (docs/research/dialogue-spike-2026-09.md).

LTX performs the lines (best delivery and lip sync) but invents a new voice every clip. So:
  1. pull the clip's sound out (PyAV, no ffmpeg binary needed)
  2. split voices from everything else (Demucs)
  3. who speaks when (Whisper with speakers), each speaker matched to a character by their script line
  4. convert the voices to each character's Cast voice (Chatterbox speech-to-speech) and keep each
     copy only where that character speaks → one track per character, same timing as the picture
The room comes from the location's room tone, not from LTX. Every step is open weights, so the
whole thing can move to our own GPUs; on fal today with the platform key.
"""

from __future__ import annotations

import asyncio
import io
import re
import wave
from array import array
from dataclasses import dataclass, field
from typing import Any

import httpx

QUEUE = "https://queue.fal.run"
DEMUCS = "fal-ai/demucs"
WHISPER = "fal-ai/whisper"
CHATTERBOX = "fal-ai/chatterbox/speech-to-speech"
PAD_S = 0.08  # a little air either side of each run of words
ESTIMATE_CENTS = 3  # demucs + whisper + chatterbox on a clip under 20 s, rounded up


@dataclass
class Track:
    kind: str  # voice | original
    data: bytes
    mime: str
    name: str = ""
    entry_id: str | None = None
    spans: list[tuple[float, float]] = field(default_factory=list)


def extract_wav(video: bytes) -> bytes:
    """The clip's sound as 16-bit PCM WAV at its own rate (PyAV decodes; nothing is re-encoded lossy)."""
    import av  # heavy import; only the render path needs it

    with av.open(io.BytesIO(video)) as c:
        stream = next((s for s in c.streams if s.type == "audio"), None)
        if stream is None:
            raise ValueError("the clip has no sound")
        rate = stream.rate or 48000
        res = av.AudioResampler(format="s16", layout="mono", rate=rate)
        pcm = bytearray()
        for frame in c.decode(stream):
            for out in res.resample(frame):
                pcm += bytes(out.planes[0])[: out.samples * 2]
        for out in res.resample(None):
            pcm += bytes(out.planes[0])[: out.samples * 2]
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(bytes(pcm))
    return buf.getvalue()


MIX_RATE = 48000


def decode_pcm(data: bytes, rate: int = MIX_RATE) -> array:
    """Any audio or video file's sound as mono 16-bit samples at `rate` (PyAV)."""
    import av

    out = array("h")
    with av.open(io.BytesIO(data)) as c:
        stream = next((s for s in c.streams if s.type == "audio"), None)
        if stream is None:
            return out
        res = av.AudioResampler(format="s16", layout="mono", rate=rate)
        for frame in c.decode(stream):
            for f in res.resample(frame):
                out.frombytes(bytes(f.planes[0])[: f.samples * 2])
        for f in res.resample(None):
            out.frombytes(bytes(f.planes[0])[: f.samples * 2])
    return out


def media_seconds(data: bytes) -> float:
    import av

    with av.open(io.BytesIO(data)) as c:
        if c.duration:
            return c.duration / 1_000_000
        v = next((s for s in c.streams if s.type == "video"), None)
        return float(v.duration * v.time_base) if v and v.duration else 0.0


def mix(total_s: float, layers: list[tuple[array, float, float, float, bool]], rate: int = MIX_RATE) -> bytes:
    """layers: (samples, start_s, length_s, gain, loop). Each is laid at start for length (looped if asked,
    else cut), scaled by gain, summed and clipped. Returns a 16-bit mono WAV."""
    n = int(total_s * rate)
    acc = [0] * n
    for samples, start, length, gain, loop in layers:
        if not samples or gain <= 0:
            continue
        a, m = int(start * rate), int(length * rate)
        for i in range(min(m, n - a)):
            j = i % len(samples) if loop else i
            if j >= len(samples):
                break
            acc[a + i] += int(samples[j] * gain)
    out = array("h", (max(-32768, min(32767, x)) for x in acc))
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(out.tobytes())
    return buf.getvalue()


def keep_only(wav_bytes: bytes, spans: list[tuple[float, float]], pad: float = PAD_S) -> bytes:
    """Silence everything outside the spans (seconds). Works on 16-bit PCM of any channel count."""
    with wave.open(io.BytesIO(wav_bytes)) as r:
        ch, width, rate, n = r.getnchannels(), r.getsampwidth(), r.getframerate(), r.getnframes()
        raw = r.readframes(n)
    if width != 2:
        raise ValueError(f"expected 16-bit audio, got {width * 8}-bit")
    samples = array("h")
    samples.frombytes(raw)
    keep = [False] * n
    for a, b in spans:
        for f in range(max(0, int((a - pad) * rate)), min(n, int((b + pad) * rate) + 1)):
            keep[f] = True
    for f in range(n):
        if not keep[f]:
            for c in range(ch):
                samples[f * ch + c] = 0
    out = io.BytesIO()
    with wave.open(out, "wb") as w:
        w.setnchannels(ch)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(samples.tobytes())
    return out.getvalue()


def voice_allowed(row: dict[str, Any]) -> tuple[bool, str]:
    """May this Cast voice be used to convert the lines? A stock voice (generated) always may. A real
    person's voice (an uploaded recording, or an entry marked as depicting someone) needs a signed release
    that permits the voice_likeness lane, and the person asking must not be a minor (the same rule the
    model gate applies to that lane). Otherwise LTX's own voice stays for that character."""
    if not row.get("voice_asset_id"):
        return False, "no Cast voice"
    real = bool(row.get("requires_consent")) or row.get("source") == "uploaded"
    if not real:
        return True, "stock voice"
    if row.get("consent") != "signed":
        return False, f"real voice without a signed release ({row.get('consent') or 'missing'})"
    if row.get("minor"):
        return False, "real voice: a student under 18 can't use the voice-likeness lane"
    return True, "real voice, release signed"


def _words(s: str) -> list[str]:
    return [w for w in re.sub(r"[^a-z' ]", " ", s.lower()).split() if w]


def assign_speakers(chunks: list[dict[str, Any]], lines: list[dict[str, str]]) -> dict[str, list[tuple[float, float]]]:
    """Diarized word chunks → {CHARACTER: [(start, end), …]}. Each detected speaker goes to the character
    whose script lines share the most words with what that speaker said. If diarization found only one
    speaker, fall back to the script: walk the words in order through the lines."""
    names = list(dict.fromkeys(line["who"].upper() for line in lines))
    by_speaker: dict[str, list[dict[str, Any]]] = {}
    for c in chunks:
        ts = c.get("timestamp") or [None, None]
        if ts[0] is None:
            continue
        by_speaker.setdefault(str(c.get("speaker") or "?"), []).append(c)
    out: dict[str, list[tuple[float, float]]] = {n: [] for n in names}
    if len(by_speaker) >= 2 or len(names) == 1:
        vocab = {n: set(w for line in lines if line["who"].upper() == n for w in _words(line["text"])) for n in names}
        for cs in by_speaker.values():
            said = _words(" ".join(c.get("text", "") for c in cs))
            who = max(names, key=lambda n: sum(1 for w in said if w in vocab[n]))
            out[who] += [(float(c["timestamp"][0]), float(c["timestamp"][1] or c["timestamp"][0])) for c in cs]
        return out
    # One voice detected for several characters: follow the script's order word by word.
    queue = [(line["who"].upper(), _words(line["text"])) for line in lines]
    li, wi = 0, 0
    for c in sorted((c for cs in by_speaker.values() for c in cs), key=lambda c: c["timestamp"][0]):
        for w in _words(c.get("text", "")):
            while li < len(queue) and wi >= len(queue[li][1]):
                li, wi = li + 1, 0
            if li >= len(queue):
                break
            out[queue[li][0]].append((float(c["timestamp"][0]), float(c["timestamp"][1] or c["timestamp"][0])))
            if w in queue[li][1][wi:]:
                wi = queue[li][1].index(w, wi) + 1
    return out


class Fal:
    """Just enough of the fal queue for a pipeline that waits on each step."""

    def __init__(self, key: str, client: httpx.AsyncClient | None = None) -> None:
        self.key = key
        self.http = client or httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=15.0))

    async def run(self, endpoint: str, inputs: dict[str, Any], timeout_s: int = 600) -> dict[str, Any]:
        h = {"Authorization": f"Key {self.key}", "Content-Type": "application/json"}
        r = await self.http.post(f"{QUEUE}/{endpoint}", json=inputs, headers=h)
        r.raise_for_status()
        sub = r.json()
        for _ in range(timeout_s // 3):
            await asyncio.sleep(3)
            s = (await self.http.get(sub["status_url"], headers=h)).json()
            if s.get("status") == "COMPLETED":
                res = await self.http.get(sub["response_url"], headers=h)
                res.raise_for_status()
                return res.json()
            if s.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
                raise RuntimeError(f"{endpoint}: {s}")
        raise TimeoutError(f"{endpoint}: no result after {timeout_s}s")

    async def get(self, url: str) -> bytes:
        r = await self.http.get(url)
        r.raise_for_status()
        return r.content


async def split_voices(fal: Fal, clip_audio_url: str, lines: list[dict[str, str]], voices: dict[str, str | None]) -> tuple[list[Track], dict[str, Any]]:
    """voices: CHARACTER → presigned URL of their Cast voice sample (None ⇒ keep LTX's voice for them)."""
    stems = await fal.run(DEMUCS, {"audio_url": clip_audio_url, "model": "htdemucs", "stems": ["vocals", "drums", "bass", "other"], "output_format": "wav"})
    vocals_url = (stems.get("vocals") or {}).get("url")
    if not vocals_url:
        raise RuntimeError("demucs returned no vocals")
    stt = await fal.run(WHISPER, {"audio_url": vocals_url, "diarize": True, "chunk_level": "word", "num_speakers": max(1, len({line["who"].upper() for line in lines}))})
    spans = assign_speakers(stt.get("chunks") or [], lines)
    tracks: list[Track] = []
    vocals = await fal.get(vocals_url)
    for name, sp in spans.items():
        if not sp:
            continue
        target = voices.get(name)
        if target:
            conv = await fal.run(CHATTERBOX, {"source_audio_url": vocals_url, "target_voice_audio_url": target})
            src = await fal.get(conv["audio"]["url"])
        else:
            src = vocals
        tracks.append(Track(kind="voice", data=keep_only(src, sp), mime="audio/wav", name=name, spans=sp))
    return tracks, {"stems": list(stems.keys()), "speakers": {n: len(s) for n, s in spans.items()}, "text": stt.get("text", "")}
