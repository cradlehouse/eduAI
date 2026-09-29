# Status (28 Sep 2026)

## Working end to end (tested with "Last Call (test)", project bdf29611…, $5 cap)
Script breakdown → Cast (looks, voices) → Locations (master wide, angles, room tone) → Scene (drawer,
lines pop-up, new character written into the script, undo) → Plan the shots → Frames → LTX clips →
voice split per character → Edit timeline → Export (our own audio mix, 12–14 s film).

## Open
- **Rain indoors**: fix deployed (INT. prompts drop weather words), not yet re-tested. ~$1.40 to re-run
  the two test shots; the test project has ~$1.90 left.
- **Frame check** (proposed, not built): Claude looks at each frame and flags someone not in Cast, the
  wrong face, or weather indoors before a student builds a clip on it.
- Cast tick in the left bar only checks looks, not voices.
- Music track in Edit is a placeholder. Per-character level sliders don't reach the export mix yet
  (voice / picture / room levels do).
- Voice samples: stock voices only; real voices need the release flow.
- Warehouse demo project has no script; Tim's duplicate location entry there is still undeleted.

## Accounts and keys
- QA logins: qa-admin@eduai.test, qa-student@eduai.test (passwords in the seed notes, not here).
- fal: Render holds the orchestrator's key. Test keys pasted in chat were deleted by Tim.
- The Anthropic key pasted in an earlier chat should be rotated.
