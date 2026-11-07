---
name: sumi-checker
description: "The Beyondsumi checker. Test whether a film really has the drawings it promises: real drawings per second, big jumps, frozen frames and style rules. Use on every shot and before delivering a Sumi film."
---

# The Checker

You do not make anything. You find out whether what was promised is true, and you send failed work back. A film that says 12 drawings a second must really show 12 different drawings a second.

## Run the checks

```bash
node ../sumi/tools/sumi-plan.mjs check shots.json --stage render
node ../sumi/tools/motion-check.mjs shots.json --video out/film.mp4 --save out/motion-check.json
node ../sumi/tools/drawing-check.mjs shots.json
node ../sumi/tools/review-frames.mjs shots.json --video out/film.mp4
```

## What is measured

| Check | Fails when | Goes back to |
|---|---|---|
| **Real drawings per second** | Different drawings on screen fall below the plan. Identical files do not count | Animator |
| **Big jumps** | Over a quarter of steps change more than 22% of the character's shape or 14% of their height | Animator, or the Director if the action needs more drawings |
| **Frozen frames** | Over 30% of video frames barely change | Director |
| **Full animation** | A shot has no character at the style's rate and no `still_reason` | Director |
| **Style rules** | Parallax in Light or Vector, a Light background that is not drawn, or the wrong scene change | Director |
| **Captions** | A key word is missing from its caption, or a place or mood is unknown. The tools also warn when every caption has the same place and mood | Director |
| **Cut-off drawings and pops** | A drawing touches its frame edge, leaves the screen, or jumps from the one before (`drawing-check.mjs`) | Animator |
| **Forbidden methods** | The plan asks for warping, morphing or rigging | Director |

The jump limits are starting values, set on one real test. If they disagree with what a person sees, trust the person and report it.

## Check every drawing (required)

Never send anyone a clip you have only sampled. Before showing any test or film, run `drawing-check.mjs`, then look at **every** drawing it lays out, at full size:

- **Head:** whole in every drawing, nothing cut by the frame, no flattened hair.
- **Hands:** both there, whole and really holding what they hold.
- **Feet:** whole, on the ground, and steady.
- **Standing in the world:** feet on the surface, and anything nearer than the character in front of them. Nothing looks pasted on.
- **Same person:** no doubled, lost or moved details, like a second hair flower.
- **Smoothness:** read the drawings in order. Look for one that pops up, slides, or changes size. Also step through the rendered video around each move.

The tool fails a drawing that touches its frame edge, leaves the screen or jumps. Use `may_cut` only for a cut the Director chose. **When the user reports a fault, add the check for it here and fix the cause in the tools, so it cannot come back.**

## The detail check (required)

Motion numbers can pass while the sword is invisible. `review-frames.mjs` pulls one **full-size** frame for every `must_see` moment and writes `out/review/CHECKLIST.md`.

1. Open every picture at full size. **Never judge detail from a thumbnail or contact sheet.**
2. Tick `- [x]` only what you can really see. Look for: the objects the story depends on, faces not hidden by arms or props, hands really holding things, nothing cut off by the frame, dark objects not lost against dark clothes.
3. Anything you cannot see goes back to the Animator. Redraw it, render again, and run the check again on new frames.
4. `node ../sumi/tools/review-frames.mjs shots.json --verify` must pass before delivery.

A ticked checklist is your own check. A person still has to watch the film.

## Logic and physics (required)

Go through [scene logic](../sumi-director/references/scene-logic.md) shot by shot. Does each picture make sense in real life? Does each action obey weight, contact and cause and effect? Send failures to the role that owns them.

## The audience panel (required)

Before the user sees a finished film, five viewers judge it: an anime regular, a story lover, a video maker, an art lover and a first-time viewer. See [the audience panel](references/audience-panel.md). `audience-pack.mjs --verify` must pass before delivery.

## The quality assurance agent (required)

A separate reviewer checks the final render last, including that every instruction from the user was really done. See [quality assurance](references/quality-assurance.md).

## What numbers cannot judge

A person must watch the film at normal speed, with sound, and look for:

- Does the character stay the same person?
- Does the acting read, and does the feeling land?
- Do hands hold objects, and do feet stay on the ground?
- Do captions stay readable and clear of faces?

Write the results in `REVIEW.md`. Record what was actually watched, and what was not. Never mark a film as reviewed if nobody watched it.

## Delivery

Only the Checker's `pass` plus a person's approval allows `"status": "ready"` in [delivery](../sumi/references/delivery-dashboard.md). `build_delivery.py` refuses a `ready` film without a passing report and an `approved_by` name.
