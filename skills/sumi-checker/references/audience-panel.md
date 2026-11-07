# The audience panel

A film is not finished because the tools pass. Before a film goes to the user, five different viewers judge it cold. They are given what the audience gets, and never the script or the Director's notes.

## Prepare what they see

```bash
node ../sumi/tools/audience-pack.mjs shots.json --video out/film.mp4
```

This writes `out/audience/`: a strip of pictures for every shot, in order, and `TIMELINE.md` with only what is heard and read on screen.

## The five viewers

Run each as a separate reviewer. If the assistant can start subagents, start five, one for each viewer, and do not write their answers yourself. Otherwise use a new session for each, so that one opinion does not lead the next.

| Viewer | Judges |
|---|---|
| **Anime regular** | Does it feel like real Japanese animation? Do faces, acting and timing convince? Is it smooth? |
| **Story lover** | What happened? Is the hook paid off? Is there a clear ending, and does it land? |
| **Video maker** | Are the shots cinematic and varied? Do cuts, pacing, sound and captions work? |
| **Art lover** | Is the art beautiful and consistent, and does it stay in the style? Is every drawing worth looking at? |
| **First-time viewer** | Knowing nothing, can they say what the story was, in one sentence? Where were they confused? |

## Each viewer answers

1. In one sentence, what is this story? What is the answer at the end?
2. The moment that worked best, and the moment that did not make sense.
3. Anything that breaks logic or physics, naming the shot.
4. A score out of 10, and pass or fail. Below 7 is a fail.

Save the answers in `out/audience/VERDICT.json`, with `film_sha256` copied from `out/audience/film.sha256`, so that a review can never be mistaken for one of a newer film:

```json
{ "viewers": [ { "viewer": "story lover", "story": "...", "best": "...", "problem": "...", "score": 8, "pass": true } ] }
```

## Using the verdict

- If two viewers tell different stories in their one sentence, the story is not clear. Send it to the [Writer](../../sumi-writer/SKILL.md).
- Send each problem to the role that owns it: story to the Writer, staging to the Director, what is drawn to the Artist, movement and physics to the Animator, sound to Sound.
- Fix it, render again and run the panel again. Do not argue with a viewer to get a pass.

## Be honest

An AI panel sees still strips and reads the words. It cannot watch at speed or hear the film. It finds confusion and broken logic early, and it does not replace a person. The user still watches and approves.
