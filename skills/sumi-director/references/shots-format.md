# The shot plan: `shots.json`

The Director writes this file. The Artist and Animator work from it, and the renderer and Checker read it.

```json
{
  "title": "The Knock",
  "style": "dark",
  "art_route": "images",
  "fps": 24,
  "size": [1920, 1080],
  "paper": "#f2eee4",
  "characters": ["girl"],
  "shots": [
    {
      "id": "s01",
      "duration": 3.0,
      "purpose": "The audience feels fear before she does",
      "framing": "Wide, girl small on the right, black space on the left",
      "acting": "Breath, stillness, then the eyes and head slowly turn",
      "camera_reason": "A slow push closes in on her, then stops when she freezes",
      "sound_moment": "Silence just before the turn",
      "camera": [{"t": 0, "zoom": 1.0, "x": -20}, {"t": 2.2, "zoom": 1.12, "x": 10}, {"t": 3, "zoom": 1.12, "x": 10}],
      "transition_in": {"kind": "cut"},
      "layers": [
        {"name": "wall", "role": "background", "kind": "painting", "src": "art/wall.png", "scale": 1.4, "depth": 0.3},
        {"name": "smoke", "role": "effect", "kind": "drawings", "frames": "frames/smoke", "rate": 10, "loop": true, "cycle": 12, "blend": "multiply", "depth": 0.6, "x": 500, "y": 400},
        {"name": "girl", "role": "character", "kind": "drawings", "frames": "frames/girl-turn", "rate": 12, "hold_last": true, "scale": 1.5, "x": 1300, "y": 640, "depth": 1.0},
        {"name": "door", "role": "foreground", "kind": "painting", "src": "art/door.png", "depth": 1.8}
      ],
      "captions": [{"text": "Someone was already inside.", "start": 0.5, "end": 2.5}]
    }
  ]
}
```

## Layer fields for the drawing check

`may_cut` lists frame sides a character may be cut by, like `["bottom"]` in a close-up. `big_action: true` allows more change for a body that really bends, stands or runs, in the drawing check and the motion check. Look at those drawings yourself, because the check is looser. `travels: true` is for a character crossing the frame.

## Dialogue

Add `"dialogue": {"speech_mode": "narrator", "lip_sync": "not_applicable"}` at the top of the plan. `speech_mode` is `narrator`, `dialogue`, `both` or `none`, and `lip_sync` is `on`, `off` or `not_applicable`. Ask the user when a character is seen speaking, and recommend on. See [lip-sync](../../sumi-animator/references/lip-sync.md).

## Shot fields

| Field | Meaning |
|---|---|
| `id`, `duration` | Name, and length in seconds |
| `purpose`, `framing`, `acting`, `camera_reason` | Required direction, in plain words |
| `camera` | Keys with `t`, `x`, `y`, `zoom`. Moves start and stop gently unless a key says `"ease": "linear"` |
| `shake` | Optional, e.g. `[{"t": 1.2, "duration": 0.3, "amount": 8}]` |
| `transition_in` | `{"kind": "cut"}`, `{"kind": "dissolve", "duration": 0.5}`, or `{"kind": "drawn", "frames": "frames/ink-wipe", "rate": 12, "count": 12}` |
| `still_reason` | Why this shot may have no drawn movement. Keep still shots rare |
| `scene_logic` | Required. Where things are, the light, what is true before and after, and what to show when. See [scene logic](scene-logic.md) |
| `must_see` | Required. What this shot must show, for the [detail check](../../sumi-checker/SKILL.md): `[{"t": 1.5, "see": ["blade from hand to tip", "face not hidden"]}]`. `t` is seconds into the shot. Name the objects the story depends on |
| `captions` | `text`, `start`, `end`, plus `place`, `mood`, `key`, `speaker`, `size` and `words`. See [directing captions](captions.md) |

## Layer fields

| Field | Meaning |
|---|---|
| `role` | `background`, `midground`, `character`, `foreground` or `effect` |
| `kind` | `drawings` (a folder of frames) or `painting` (one image) |
| `frames` / `src` | Folder of drawings, or the image file |
| `rate` | New drawings per second |
| `loop`, `cycle` | Repeat the drawings; `cycle` is how many must be drawn |
| `hold_last` | Stay on the last drawing after the action ends |
| `travels` | The drawing crosses the frame on purpose, like people running past. The Checker then compares its shape without counting that movement as a jump |
| `hold_reason` | Why this layer may run below the style's minimum rate |
| `sequence` | Optional drawing order, numbered from 1, to reuse frames. `lip-sync.mjs` writes it for mouths |
| `lip_sync` | `true` on a layer of drawn mouths |
| `x`, `y`, `scale` | Position of the centre on the stage, and size |
| `depth` | How much the camera moves it. All layers must match in Light and Vector |
| `blend`, `opacity` | `normal`, `multiply` or `screen`, and how solid it is |
| `start`, `end` | When the layer appears within the shot |

Words like `warp`, `morph`, `rig` or `depth_map` are refused by the tools.
