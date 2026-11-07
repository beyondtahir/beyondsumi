# How to write a Sumi Vector scene

A scene is one JavaScript file. It registers layers, and each layer paints one drawing on request, on a transparent frame. The engine sets up p5.js and p5.brush for you.

```js
(function () {
  const V = SumiVector, { shape, line, track } = V;
  V.film.title = 'The Knock';

  V.layer('world', { drawings: 1, rate: 1, boil: 0, draw() { background('#efe3cf'); /* paint once */ } });

  V.layer('hero', {
    rate: 24, drawings: 72,
    draw(n) {
      const t = n / 24, lift = track(t, [[0, 0], [1, 1], [3, .4]]);
      shape([[-40, -200 - lift * 30], [40, -200], [50, 0], [-50, 0]], '#2f4178');
    }
  });
})();
```

The canvas centre is `(0, 0)`, and the frame is 1920 by 1080.

## Layers

| Option | Meaning |
|---|---|
| `draw(n)` | Paints drawing number `n`. It must give the same result every time for the same `n` |
| `rate`, `drawings` | New drawings per second, and how many |
| `boil` | Lines change slightly on twos, so they feel alive. Set `0` for worlds and anything that should hold still |
| `kind: 'light'` | Draws on a 2D canvas, for glows. `draw(n, g)` gets its context |

Each layer becomes a folder of frames. `shots.json` then uses them like any other film. Give each shot its part with `"sequence": "73-135"`.

## Tools

| Tool | Draws |
|---|---|
| `shape(points, colour, {curve, line, lw})` | A filled shape with a clean outline |
| `line(points, colour, weight, brushName)` | A stroke |
| `ribbon(path, w0, w1)` | Points for a tapered band, for hair, cloth, grass and fingers. Pass them to `shape` |
| `dot(x, y, r, colour)` | A solid circle |
| `limb(a, b, l1, l2, bend)` | Where an elbow or knee sits, so limbs keep their length |
| `wash(colour, opacity, bleed, texture, draw)` | A watercolour wash over what `draw()` paints |
| `glow(g, x, y, radius, 'r,g,b', power)` | Light, on a `light` layer |
| `track(t, keys)` | Acting keys: a value that eases between `[time, value]` pairs |
| `squash(h)` | Width and height that keep the same area |

You can also call [p5.brush](../engine/vendor/LICENSE-p5.brush.md) directly, such as `brush.set('charcoal', colour, 2)`. Its brushes include `2B`, `HB`, `2H`, `cpencil`, `pen`, `rotring`, `spray`, `marker` and `charcoal`. Angles are in degrees.

## Acting

- **Write `pose(n)`:** one function returning the character's whole state for that drawing: gaze, mouth, hands and wind.
- **Track feelings, not only movement:** eyes lift, then the mouth parts, then the arm follows.
- **Follow-through:** hair and cloth arrive later than the body. Make each point along a ribbon lag in time.
- **Squash and stretch, lightly:** draw the shape fresh at the new size. Keep it subtle, because this is not a bouncing cartoon.
- **Keep shots at their own size:** draw actors at each shot's scale inside the layer, so lines stay clean. Divide line weight by the shot's scale.

## Avoid these

- Do not name your own function `line`, `shape`, `stroke`, `key` or `lerp` at the top level, because p5 uses those names. Keep your code inside a function, as in the example.
- A fill can show what is behind it, so use `brush.wash(colour, 255)` underneath anything solid.
- Separate colour stops in a sky can tear. Overlap them, and look at the result.

Copy no existing character or artwork. Check every result with [scene logic](../../sumi-director/references/scene-logic.md) and [action, physics and acting](../../sumi-animator/references/action-and-acting.md).
