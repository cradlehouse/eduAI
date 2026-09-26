# Dialogue spike: making a character say a line (26 Sep 2026)

Same still (made-up adult waitress, FLUX 2 pro) and the same line in every test. Clips judged by Tim.
Scripts: `scripts/spike/ltx-a2v.mjs`, `lipsync-compare.mjs`, `voice-lock.mjs`. Outputs are local only
(`docs/research/spike-a2v/`, gitignored).

| Test | Route | Verdict |
|---|---|---|
| 1 | LTX 2.3 audio-to-video: still + a TTS line (Kokoro) | sync poor |
| A | LTX 2.5 image-to-video with `generate_audio`, the line written in the prompt | **best delivery and sync**; the voice is invented per clip |
| B | A + sync.so lipsync-2-pro onto the Kokoro line | synced, flat voice |
| C | OmniHuman 1.5: still + Kokoro line (different model) | synced, flat voice |
| D | A's own audio → Chatterbox speech-to-speech to a fixed voice sample → back onto A | **cleanest; keeps A's delivery and sync, fixed voice** |
| E | Same as D with ElevenLabs voice changer | about the same as D |
| F | ElevenLabs v3 expressive line + lipsync onto A | more expressive, lips less clean |

Why A's voice changes every shot: LTX makes the sound fresh each clip from the prompt and picture only;
it has no voice input and no memory between clips, so each shot recasts the voice.

Why B/C sounded worse: the voice came from a small TTS, recorded clean and laid on top. Sync was fine;
the performance wasn't. A's audio is generated with the face, so intonation and room sound match.

## Route that worked (D)

1. Shot clip: LTX image-to-video, `generate_audio: true`, the character's line in the prompt.
2. Take the clip's audio; Chatterbox speech-to-speech with the character's voice sample as target
   (`fal-ai/chatterbox/speech-to-speech`, $0.015/min, open source from Resemble AI).
3. Put the converted audio back on the clip (`fal-ai/ffmpeg-api/merge-audio-video`).

Stays one video model (LTX). Timing is untouched, so lips stay in sync.

## Open questions

- One speaker per clip: conversion turns every voice in the clip into one voice. Two people talking in
  one clip needs the speakers separated first, or coverage cut so each clip has one speaker.
- LTX sometimes says the line wrong or adds words: needs a check (transcribe and compare) before the
  student sees it.
- The voice sample per character: stock/synthetic by default. A real person's voice (including a
  student's) needs a signed release, as the Voices page already says. Minors: no student voices without
  guardian consent.
- Room sound after conversion held up in this test; check with louder backgrounds (rain, music).

## Two people in one clip (spike 4, `two-voices.mjs`)

LTX 2.5 two-shot, 8 s, both lines in the prompt. Demucs split voices from the rest; ElevenLabs
speech-to-text with `diarize` found two speakers and each matched its script line; Chatterbox converted
the voices twice (Angie's sample, Bert's sample); each copy was silenced outside that speaker's words;
the picture, the Angie track, the Bert track and the room were recomposed (fal ffmpeg compose).
Tim: both voices sound good and in their own voices, sync holds. ~$1.40.

Room: LTX made almost no ambience (gaps between lines at -50 to -55 dB, near silent), so the room stem
was empty. Room tone will be made once per location (sound-effects model) and laid under every shot
there, as a real crew records room tone per location.
