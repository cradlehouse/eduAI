# Status (28 Sep 2026)

## Working end to end (tested with "Last Call (test)", project bdf29611…, $5 cap)
Script breakdown → Cast (looks, voices) → Locations (master wide, angles, room tone) → Scene (drawer,
lines pop-up, new character written into the script, undo) → Plan the shots → Frames → LTX clips →
voice split per character → Edit timeline → Export (our own audio mix, 12–14 s film).

## Open
- **Rain indoors**: fix deployed (INT. prompts drop weather words), not yet re-tested. ~$1.40 to re-run
  the two test shots; the test project has ~$1.90 left.
- **Built 28 Sep, not yet deployed or tried live** (needs migration 0129, a web deploy, a push for Render):
  - Frame check: Claude (Opus 5.5, low effort) looks at each new frame beside the Cast looks and flags
    someone not in Cast, the wrong face, a missing person, or weather indoors. Flags only; the student still
    chooses. Stored per frame in `shots.intent.checks`.
  - Cast tick: done when everyone has a look and everyone with a line has a voice.
  - Music: made on the Edit page (Stable Audio, a hidden "Music" style entry), plays under the whole film,
    loops if shorter, own level. Per-character voice levels now reach the export mix.
  - Real voices: an instructor records a voice-only release (guardian signer if under 18) together with
    the recording on the Cast Voice tab; the orchestrator re-reads the newest voice release before every
    split and keeps LTX's voice otherwise. Following the existing minors rule, a take chosen by a student
    under 18 keeps the performed voice for a real-voice character (an instructor chooses those takes).
- Orchestrator DB tests: two fail on the LTX estimate (54 vs 24 cents), before and after these changes.
- Warehouse demo project has no script; Tim's duplicate location entry there is still undeleted.

## Accounts and keys
- QA logins: qa-admin@eduai.test, qa-student@eduai.test (passwords in the seed notes, not here).
- fal: Render holds the orchestrator's key. Test keys pasted in chat were deleted by Tim.
- The Anthropic key pasted in an earlier chat should be rotated.
