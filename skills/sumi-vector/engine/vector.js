/* Sumi Vector engine: every drawing is painted fresh with p5.brush and Canvas 2D. No images and no image cost.
   A scene registers layers. Each layer returns one drawing for a drawing number, on a transparent frame. */
(function () {
  const WIDTH = 1920, HEIGHT = 1080;
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const ease = u => { u = clamp(u); return u * u * (3 - 2 * u); };
  const mix = (a, b, t) => a + (b - a) * t;

  /* Acting keys: the value at time t, eased between [time, value] pairs */
  function track(t, keys) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) if (t <= keys[i][0]) return mix(keys[i - 1][1], keys[i][1], ease((t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0])));
    return keys[keys.length - 1][1];
  }
  /* Squash and stretch that keeps the same area. Draw the shape fresh at this width and height; never warp a finished drawing */
  const squash = height => ({ h: height, w: 1 / Math.sqrt(height) });

  /* The pen: clean cel lines and flat colour. "unit" keeps line weight even when a shot is drawn large */
  const pen = { line: '#17151c', brush: 'rotring', weight: .62, unit: 1 };
  function trace(points, curve, closed) {
    brush.beginShape(curve);
    points.forEach(q => brush.vertex(q[0], q[1], q[2] ?? 1));
    brush.endShape(closed ? CLOSE : undefined);
  }
  function shape(points, colour, o = {}) {
    const curve = o.curve ?? .45;
    brush.noHatch(); brush.noFill(); brush.noStroke();
    if (colour) { brush.wash(colour, o.opacity ?? 255); trace(points, curve, true); brush.noWash(); }
    if (o.line !== false) { brush.set(pen.brush, o.lineColour || pen.line, (o.lw || 1) * pen.weight); trace(points, curve, true); brush.noStroke(); }
  }
  function line(points, colour, weight, name) {
    brush.noFill(); brush.noWash(); brush.noHatch();
    brush.set(name || pen.brush, colour, weight);
    brush.spline(points, .55);
    brush.noStroke();
  }
  function dot(x, y, r, colour, opacity = 255) { brush.noStroke(); brush.noHatch(); brush.noFill(); brush.wash(colour, opacity); brush.circle(x, y, r); brush.noWash(); }
  /* A tapered ribbon along a line, for hair, cloth, grass and fingers */
  function ribbon(path, w0, w1) {
    const a = [], b = [];
    path.forEach((q, i) => {
      const p = path[Math.max(0, i - 1)], r = path[Math.min(path.length - 1, i + 1)], dx = r[0] - p[0], dy = r[1] - p[1], l = Math.hypot(dx, dy) || 1, w = mix(w0, w1, i / (path.length - 1)) / 2;
      a.push([q[0] - dy / l * w, q[1] + dx / l * w]); b.unshift([q[0] + dy / l * w, q[1] - dx / l * w]);
    });
    return a.concat(b);
  }
  /* Where an elbow or knee sits, so limbs keep their length */
  function limb(a, b, l1, l2, bend) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, d = Math.min(L, (l1 + l2) * .999), along = (l1 * l1 - l2 * l2 + d * d) / (2 * d), up = Math.sqrt(Math.max(0, l1 * l1 - along * along));
    return [a[0] + dx / L * along - dy / L * up * bend, a[1] + dy / L * along + dx / L * up * bend];
  }
  /* A painted watercolour wash, for skies, hills and paper */
  function wash(colour, opacity, bleed, texture, draw) {
    brush.noStroke(); brush.noHatch(); brush.fill(colour, opacity); brush.fillBleed(bleed, 'out', 90); brush.fillTexture(texture, texture); draw(); brush.noFill();
  }
  /* Light on the transparent 2D layer. Render this layer with "blend": "screen" */
  function glow(g, x, y, radius, rgb, power) {
    const a = g.createRadialGradient(x, y, 0, x, y, radius);
    a.addColorStop(0, `rgba(${rgb},${.62 * power})`); a.addColorStop(.25, `rgba(${rgb},${.26 * power})`); a.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = a; g.fillRect(0, 0, WIDTH, HEIGHT);
  }

  const layers = {}, film = { title: '', fps: 24 };
  function layer(name, spec) { layers[name] = spec; }
  let job = null, panel = null;

  window.setup = function () {
    pixelDensity(1); createCanvas(WIDTH, HEIGHT, WEBGL); angleMode(DEGREES); noLoop();
    brush.scaleBrushes(2.2);
    panel = document.createElement('canvas'); panel.width = WIDTH; panel.height = HEIGHT;
    panel.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none';
    document.body.appendChild(panel);
    window.ready = true;
    if (!new URLSearchParams(location.search).get('capture')) preview();
  };
  window.draw = function () {
    if (!job) return;
    const spec = layers[job.name], n = job.n;
    panel.getContext('2d').clearRect(0, 0, WIDTH, HEIGHT);
    clear();
    if (spec.kind === 'light') { spec.draw(n, panel.getContext('2d')); return; }
    /* A line boils on twos. A layer with "boil": 0 holds still */
    randomSeed(spec.boil === 0 ? 5 : 1000 + Math.floor(n / 2) * 7); noiseSeed(4);
    spec.draw(n);
  };
  async function paint(name, n) {
    job = { name, n }; await redraw();
    await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
    return true;
  }
  /* In a normal browser: plays one layer, chosen with ?layer=NAME */
  async function preview() {
    const q = new URLSearchParams(location.search), name = q.get('layer') || Object.keys(layers)[0], spec = layers[name];
    document.body.style.background = '#777';
    for (let n = 0; ; n = (n + 1) % (spec.drawings || 1)) { await paint(name, n); await new Promise(done => setTimeout(done, 1000 / (spec.rate || 24))); }
  }
  window.SumiVector = { WIDTH, HEIGHT, clamp, ease, mix, track, squash, pen, trace, shape, line, dot, ribbon, limb, wash, glow, layer, film, layers };
  window.VECTOR = {
    info: () => ({ title: film.title, layers: Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, { drawings: v.drawings || 1, rate: v.rate || 24 }])) }),
    paint
  };
})();
