# The sound library

Twelve original music themes come with this skill, in `assets/sound-library/bundled-bank/music`. Each theme has `harmony`, `melody` and usually `rhythm` parts, so music can build as the story does.

| Mood | Suits |
|---|---|
| `dread`, `suspense`, `mystery` | Horror, tension, secrets |
| `grief`, `tender`, `love` | Loss, closeness, romance |
| `hope`, `resolve`, `wonder` | Endings, turning points, awe |
| `journey`, `documentary`, `battle` | Travel, explanation, conflict |

List them with `node tools/sound-mix.mjs --moods`.

- **Build sections:** bring in `harmony` first and `melody` later, change mood at the turning point, and stop dead when the story needs silence.
- **Set levels in the mix:** the raw files are quiet, so a `gain` of 5 to 7 is normal.
- **Short themes repeat:** themes run about 18 to 32 seconds, and `sound-mix.mjs` repeats them to fill the time. Listen for the join on long sections.
- **Not yet fully reviewed by ear:** they have been used in demo films, but a person must still listen to each film.

The themes may be used in commercial productions. See `assets/sound-library/ORIGINAL-AUDIO-LICENSE.txt`.

The library holds no sound effects files. For free effects, `sound-effect.mjs --free` makes wind, rain, water, fire, whoosh, thud, knock and step. See [sound routing](sound-routing.md).
