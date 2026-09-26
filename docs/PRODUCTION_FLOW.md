# Imaje production flow (agreed 26 Sep 2026)

One screen, one job. The left bar is the film's steps in order; a gold dot means something is waiting.
Mockups: `docs/design/flow-mock.html`, `docs/design/scene-lines-mock.html`.
Evidence for the sound pipeline: `docs/research/dialogue-spike-2026-09.md`.

## Steps

1. **Script.** Paste or write it. Set once for the film: shape (16:9), look, engine (LTX). Break it down:
   cast, locations, props, scenes. Questions the script can't answer go to the page they belong on.
2. **Cast.** One person at a time. Look (description from the script, generate, "This is Angie"),
   Turnaround, Voice (a voice sample every line is converted to).
3. **Locations** (inside or out). Master wide, then the angles the scenes need (made from the wide),
   times of day, and **Room tone**: one ambience bed per location, used under every shot there.
4. **Props.** Like Cast; optional.
5. **Scene.** Asset drawer on the left. Drag in the location and the people; each person dropped in shows
   their lines from the script. A new character can be added with a line, which is written into the
   script (the script stays the one master copy). Then "Plan the shots".
6. **Shot.** Camera (framing and move as pictures), Frame (a still with the cast and location angle as
   references; choose one), Clip (LTX image-to-video from that frame; takes; choose one).
7. **Edit.** Drawer holds the chosen takes and sound. Timeline tracks: picture, one voice track per
   character, room, effects, music. Share with the instructor or export (mixed down on export).

## How a talking shot is made

1. LTX 2.5 image-to-video from the chosen frame, sound on, the scene's lines in the prompt
   (natural delivery, clean lip sync).
2. Split the sound: voices vs the rest (Demucs); who speaks when (speech-to-text with speakers), each
   speaker matched to a character by their script line.
3. Convert each person's lines to their Cast voice (Chatterbox speech-to-speech), keep each only where
   that person speaks: one track per character, same timing as the picture.
4. Room comes from the location's room tone, not from LTX.
5. Check the words against the script; flag a changed or added line before the student sees it.

Limits: people talking over each other don't separate cleanly; plan shots so speakers take turns.

## Models

| Job | Model (via fal) |
|---|---|
| Script breakdown | Claude |
| Portraits, location wides, shot frames | FLUX 2 pro (+ edit), Qwen multiple-angles |
| Video (one engine per film) | LTX 2.5 image-to-video: start/end frame, camera_motion, 6-20 s |
| Voice | Chatterbox speech-to-speech ($0.015/min) |
| Speaker split | Demucs + ElevenLabs speech-to-text (diarize) |
| Room tone, effects, music | sound-effects and music models already in the registry |
