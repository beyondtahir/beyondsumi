---
name: sumi-vector
description: "Make Sumi Vector films: ink silhouettes and flat colour on painted skies, with every drawing painted in JavaScript using p5.brush. Needs no images and no image tool. Use for Sumi Vector, or when the user has no image tool or wants no image cost."
---

# Sumi Vector: drawing with code

The third Beyondsumi style. You are the Artist and Animator, and your brush is JavaScript. Each drawing is painted fresh from a pose, and it costs nothing in images.

The studio is the same as every other style. The [Writer](../sumi-writer/SKILL.md) and [Director](../sumi-director/SKILL.md) work first, then [Sound](../sumi-sound/SKILL.md) for any voice takes, then you, then Sound again for music and effects, the [Checker](../sumi-checker/SKILL.md), the audience panel and quality assurance. Set `"style": "vector"` and `"art_route": "vector"` in `shots.json`.

## The rule

Every drawing is **painted fresh from a pose** written for that drawing. Never bend a finished picture. Drawings are free here, so animate characters at 24 a second.

## How to make it

1. **Read** [how to write a scene](references/scene-guide.md).
2. **Study** [The Lantern](examples/lantern/scene.js), a full 20-second film with a story, [its script](examples/lantern/script.md) and [its plan](examples/lantern/shots.json).
3. **Write the scene** as `scenes/film.js`, following the Director's shots. Keep the world, the characters and the effects on separate layers.
4. **Look at the hardest drawing first,** at full size over its background, before capturing the rest:

   ```bash
   node tools/vector-capture.mjs scenes/film.js frames/test --layer actors --only 160
   ```

5. **Capture every drawing:**

   ```bash
   node tools/vector-capture.mjs scenes/film.js frames --all
   ```

6. **Render and check** with the same tools as every other style:

   ```bash
   node ../sumi/tools/sumi-render.mjs shots.json --audio sound/mix.wav
   node ../sumi/tools/motion-check.mjs shots.json --video out/film.mp4
   node ../sumi/tools/drawing-check.mjs shots.json
   ```

To preview a layer without capturing it, open `engine/film.html?scene=PATH/film.js&layer=actors` in a browser.

## The look

- **Figures:** dark ink silhouettes with big clear shapes, like a wide hanging sleeve, and one warm rim of light on the side facing the light. Flat, opaque colour and no soft gradients. Use one vivid accent, such as a red sash.
- **Outlines:** round every outline before filling it, so nothing looks cut from straight lines. Hair is many strands of different lengths, never one slab.
- **Worlds:** painted watercolour skies and hills, softer than the characters. Paint them once with `boil: 0`.
- **Place:** one or two strong, real details that say where we are, such as a pine or a torii gate.
- **Light:** a separate `light` layer rendered with `"blend": "screen"`. A glow from behind the figure goes in its own layer under the figure, or it washes the silhouette out.
- **No parallax:** every layer has the same depth.
- **Scene changes:** clean cuts and dissolves.

## What it can and cannot do

| Good at | Weaker at |
|---|---|
| Painted skies, weather, light, cloth, hair and grass | Rich faces and detail, where images are better |
| Any amount of movement at no cost | Complex acting from difficult angles |
| Long films, since cost does not grow | |

Direct around the limits: silhouettes against bright sky, profile faces, big clear shapes, hands in clear space. Let hands and objects carry the close-up. Say honestly that faces are simpler than in Sumi Dark and Sumi Light.

Beautiful movement is not a film. Even at 15 seconds it needs a question and a clear answer. Audience panels failed an early Lantern as a "flat puppet with no story", which is why it was remade.

## Reject your own work when

- A figure looks like a doll, a tube, a stick or a Flash puppet, or its hair looks like spikes or a solid block.
- A sleeve or arm crosses the face, or a face touches the object it looks at.
- A bent arm's elbow goes up across the body. Check the `limb` bend direction.
- A hand is not joined to its arm, or a sleeve looks like a wing.
- Something is see-through that should be solid, or a cut-out looks pasted on.
- Strokes or stray marks cross the sky or the face.

## What it needs

Node 22+, Chrome, Edge or Chromium with WebGL, and FFmpeg. The two drawing libraries, p5.js (LGPL-2.1) and p5.brush (MIT), are in `engine/vendor` with their licences, so nothing needs installing. Keep those files as they are. If WebGL does not run, tell the user, because this style cannot work without it.
