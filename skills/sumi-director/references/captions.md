# Directing captions

Captions are acted, not added at the end. The Writer writes them, and the Director decides where each one sits and how it behaves, from the story. Ask of every caption: **what should the audience feel when they read this?**

## Writing them

- **Short:** two to six words at a time.
- **They can differ from the voice.** The voice can say a full sentence while the screen shows only the word that hurts: voice says "You never answer the third knock", caption says "NEVER."
- **Silence stays silent.** Do not caption a moment that works better with nothing on screen.
- **One key word** per dramatic caption carries the accent colour. Use accents rarely, so they mean something.

## Placing them

| Place | Use it for |
|---|---|
| `bottom` | Calm storytelling, and the default rhythm of the film |
| `center` | A hit: the word becomes the whole image |
| `top`, `top-left`, `top-right` | Dread from above, or an unseen voice |
| `left`, `right`, `bottom-left`, `bottom-right` | Beside the person speaking, or in the empty space of the frame |
| `{"x": .7, "y": .3}` | An exact spot, for example near a shoulder, a door or a letter |

Put a line near its source: a whisper near the mouth, a knock's word on the door. Never cover a face, a hand doing something important, or the action the audience needs to see.

## How they behave

| Mood | Behaves like | Use it for |
|---|---|---|
| `normal` | The style's usual arrival | Plain storytelling |
| `whisper` | Small and slow | Secrets, fear, tenderness |
| `shout` | Big and hard, with a shake | Anger, a cry, a warning |
| `slam` | Huge, filling the frame | The one biggest moment in a film. Use it once |
| `tremble` | Words shiver | Terror, grief, cold |
| `drift` | Words float away on the air | Memory, loss, wind |
| `slow` | Arrives one patient word at a time | Awe, a final line |

`size` scales any caption further, and `colour` or a named `speaker` changes its colour. `"speakers": {"Mother": "#d98a8a"}` in `shots.json` sets speaker colours.

## Each style's lettering

- **Sumi Dark:** rough, inky letters that land hard, and a key word throws ink.
- **Sumi Light:** pencil letters that write themselves on, on a strip of paper.
- **Sumi Vector:** clean outlined subtitles, with no ink or pencil effects.

## Timing

Use `node ../sumi/tools/captions-from-voice.mjs take.timing.json --start 2.5 --key never` to get word timing from the real voice take, then add `place` and `mood` by hand. The renderer also saves an `.srt` file for uploading to YouTube.

## Example: three captions from one horror scene

```json
[
  {"text": "NEVER.", "start": 2.0, "end": 3.4, "place": "center", "mood": "slam", "key": "never"},
  {"text": "Don't open it.", "start": 11.0, "end": 13.0, "place": {"x": .68, "y": .4}, "mood": "whisper"},
  {"text": "The one behind you isn't me.", "start": 19.5, "end": 23.5, "place": "top", "mood": "tremble", "key": "isn't"}
]
```
