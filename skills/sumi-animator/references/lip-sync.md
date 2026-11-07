# Lip-sync

Use this when a character is seen speaking. Each new film records the choice in `shots.json`:

```json
"dialogue": { "speech_mode": "narrator | dialogue | both | none", "lip_sync": "on | off | not_applicable" }
```

Recommend **on** for character dialogue. Use `not_applicable` when there is no speech or only a narrator. Never move a character's mouth to a narrator's words. A character seen from behind or off screen needs no mouth movement.

## Steps

1. **Finish the voice first.** Mouths follow the final recording, so never time them to a draft take.
2. **Draw four mouths** on one small sheet, on the checked face, at the same head angle: 1 closed, 2 small, 3 open, 4 round. Keep the jaw, cheeks, eyes and hair in place. Add the sheet to the image count you show the user. Draw a new set for each new head angle. In Sumi Vector, paint the four mouths in code.
3. **Make the timing:**

   ```bash
   node ../sumi/tools/lip-sync.mjs sound/line-1.timing.json --duration 5 --start 1.2
   ```

   A recording with no timing file works too, using loudness. Tell the user this is approximate.
4. **Add the mouth layer** above the held face:

   ```json
   {"name": "mouth", "role": "effect", "kind": "drawings", "frames": "frames/girl-mouths", "rate": 12, "lip_sync": true, "sequence": [1, 2, 3, 1], "x": 960, "y": 410, "scale": 1, "hold_reason": "Mouth only, on a held face"}
   ```

5. **Act the line.** Mouths alone look dead, so draw the eyes, brows, breath and hands to match the feeling, and let the head move on the big words.
6. **Check it at normal speed with the sound on.** The mouth should open with the first sound, close at every pause and stay closed after the line. If the head moves, the mouth must move with it, in the same drawing.

## Rules

- Do not loop mouth flaps.
- Do not stretch or cut a user's recording to fit the mouths.
- Never call timing exact if it came from loudness.
