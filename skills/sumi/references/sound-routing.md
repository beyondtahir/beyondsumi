# Sound routing

Every film has background music and sound effects, with or without narration.

| Part | Comes from |
|---|---|
| **Voice** | Voicebox first, then ElevenLabs, or the user's own recording, or none |
| **Music** | [The bundled library](sound-library.md), or music the user supplies |
| **Effects** | ElevenLabs sound effects with `sound-effect.mjs`, files the user supplies, or simple free effects with `sound-effect.mjs --free` |
| **Mix** | `sound-mix.mjs`, which needs only FFmpeg |

## Steps

1. **Plan cues from the picture:** the frame, what visibly causes the sound, and why it matters. Put real silence before the big moments.
2. **Say the cost before paying:** count new effects and voice lines. Each ElevenLabs effect costs credits, and an existing file costs nothing.
3. **Make effects:**

   ```bash
   node ../sumi/tools/sound-effect.mjs "One heavy fist knock on an old wooden door" --out sound/sfx/knock.mp3 --seconds 1.2
   ```

4. **Write `sound/mix.json`,** then mix:

   ```bash
   node ../sumi/tools/sound-mix.mjs sound/mix.json
   ```

```json
{
  "duration": 30,
  "loudness": -15,
  "voices": [{ "file": "takes/line1.mp3", "at": 0.4, "lufs": -16 }],
  "music": [{ "mood": "dread", "part": "harmony", "start": 0, "end": 15, "fade_in": 1.5, "fade_out": 0.6, "gain": 6 }],
  "beds": [{ "file": "sfx/wind.mp3", "volume": [[0, 0.5], [14, 0.5], [14.3, 0], [30, 0]] }],
  "hits": [{ "file": "sfx/knock.mp3", "at": 4.45, "gain": 1 }]
}
```

- **`voices`** are cleaned and levelled, never changed. Music lowers under them automatically.
- **`music`** uses a library `mood` and `part` (`harmony`, `melody` or `rhythm`), or your own `file`. It repeats to fill its time.
- **`beds`** are continuous sounds, like wind or a room, with volume over time.
- **`hits`** are single effects, placed at a second in the film.

## With no ElevenLabs

Voicebox and library music cost nothing. For effects, use the user's own files, or make simple free ones with `sound-effect.mjs --free`: wind, rain, water, fire, whoosh, thud, knock and step. Tell the user these are plainer than ElevenLabs effects, and that nobody has reviewed them by ear yet. Every film still has effects.

## Check it

Read the finished mix back with a transcription, if you have one, to catch buried lines. A person must listen before the film is called finished, because numbers cannot judge how it feels.
