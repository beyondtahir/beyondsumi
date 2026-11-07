/* The Lantern: every autumn a girl sends a lantern to her lost brother. After ten years, one comes back.
   Ink silhouette against a painted dusk, with a warm rim of light and one vivid red ribbon.
   Layers: world (painted once), sunglow (one per shot), dusk, lanternglow, actors (480 fresh drawings), grass, leaves, fade. */
(function () {
  const V = SumiVector, { shape, line, dot, ribbon, limb, wash, track, ease, mix, clamp, glow, trace } = V;
  V.film.title = 'The Lantern';
  const FPS = 24, DRAWINGS = 480;
  const C = { ink: '#14121c', hair: '#0e0d14', hairS: '#2b2838', robe: '#1d1b30', sleeve: '#29263f', fold: '#3a3656', skin: '#120f16', collar: '#d8c4a8', red: '#d2261c', redS: '#8e1610', rim: '#ffb066', lantern: '#f7a838', lanternL: '#ffd27a', lanternS: '#c9651d', flame: '#fff3b8', grass: '#16251d', writing: '#2c1206', pine: '#18251f', torii: '#a5261f', leaf: '#cf3a20', leafD: '#8c2415' };
  let U = 1;
  const LINE = n => n / Math.sqrt(U);
  /* Rounds a closed outline, so nothing reads as cut from straight lines */
  const soft = (pts, rounds = 2) => { let q = pts; for (let r = 0; r < rounds; r++) { const o = []; q.forEach((a, i) => { const b = q[(i + 1) % q.length]; o.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25], [a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }); q = o; } return q; };
  const fill = (pts, colour, o = {}) => shape(soft(pts, o.rounds ?? 2), colour, { line: false, curve: 0, opacity: o.opacity });

  /* ---- The world, painted once ---- */
  const hillY = x => 372 + Math.sin(x * .0028 + .6) * 34 + Math.sin(x * .0009) * 22;
  function ridge(base, amp, seed) {
    randomSeed(seed); const pts = [[-1100, 760]];
    for (let x = -1100; x <= 1100; x += 36) pts.push([x, base - amp * (.3 + .7 * noise(x * .0034 + seed)) - 26 * noise(x * .02 + seed) + random(-4, 4)]);
    pts.push([1100, 760]); return pts;
  }
  function pine(x, y, s) {
    shape(ribbon([[x, y + 6], [x + 14 * s, y - 90 * s], [x - 16 * s, y - 190 * s], [x + 26 * s, y - 300 * s]], 30 * s, 8 * s), C.pine, { line: false, curve: .6 });
    for (const [bx, by, ex, ey] of [[-2, -130, -170, -190], [-6, -190, 150, -250], [10, -260, -120, -320], [24, -300, 120, -350]]) shape(ribbon([[x + bx * s, y + by * s], [x + (bx + ex) * .5 * s, y + (by + ey) * .5 * s - 12 * s], [x + ex * s, y + ey * s]], 13 * s, 4 * s), C.pine, { line: false, curve: .6 });
    for (const [cx, cy, w, h] of [[-170, -204, 118, 30], [150, -264, 112, 28], [-120, -334, 100, 27], [120, -364, 92, 25], [10, -392, 80, 24]]) {
      const blob = []; for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, k = Math.sin(a) < 0 ? 1 + (i % 2) * .22 : 1 + (i % 2) * .08; blob.push([x + (cx + Math.cos(a) * w * k) * s, y + (cy + Math.sin(a) * h * k) * s]); }
      fill(blob, C.pine, { rounds: 1 });
    }
  }
  function torii(x, y, s, col = C.torii) {
    for (const px of [-52, 52]) shape([[x + (px - 8) * s, y + 6], [x + (px + 8) * s, y + 6], [x + (px + 6 * Math.sign(px) * -1 + 6) * s, y - 120 * s], [x + (px + 6 * Math.sign(px) * -1 - 6) * s, y - 120 * s]], col, { line: false, curve: 0 });
    shape([[x - 76 * s, y - 120 * s], [x + 76 * s, y - 120 * s], [x + 88 * s, y - 136 * s], [x, y - 128 * s], [x - 88 * s, y - 136 * s]], '#1c1216', { line: false, curve: .25 });
    shape([[x - 66 * s, y - 100 * s], [x + 66 * s, y - 100 * s], [x + 66 * s, y - 90 * s], [x - 66 * s, y - 90 * s]], col, { line: false, curve: 0 });
  }
  const FRAMES = [[1, 0, 0], [1.7, -211, -96], [1, 0, 0], [1.35, -280, 62], [2.6, 668, 226], [1.7, -660, -390]];
  V.layer('world', {
    drawings: 6, rate: 1, boil: 0,
    /* One painting per shot, at that shot's size, so nothing is ever enlarged */
    draw(n) {
      background('#efe3cf');
      const [z, ox, oy] = FRAMES[n]; push(); translate(ox, oy); scale(z); randomSeed(5);
      for (const [c, y, h] of [['#2c3772', -620, 280], ['#6f5590', -380, 220], ['#c9705f', -210, 200], ['#f0a860', -40, 260]]) wash(c, 255, .16, .18, () => brush.rect(-1000, y, 2000, h + 70));
      brush.wash('#f0622a', 255); brush.circle(-280, -110, 186); brush.noWash();
      wash('#ff8a3c', 150, .1, .35, () => brush.circle(-280, -110, 176));
      brush.wash('#7d6890', 255); brush.polygon(ridge(120, 300, 21)); brush.noWash();
      wash('#6c5a86', 170, .12, .2, () => brush.polygon(ridge(170, 270, 21)));
      brush.wash('#514b73', 255); brush.polygon(ridge(255, 170, 7)); brush.noWash();
      wash('#e6a58a', 70, .25, .3, () => brush.rect(-1000, 196, 2000, 70));
      const hill = [[-1100, 760]]; for (let x = -1100; x <= 1100; x += 100) hill.push([x, hillY(x)]); hill.push([1100, 760]);
      brush.wash('#1f2f26', 255); brush.polygon(hill); brush.noWash();
      wash('#2e4131', 180, .08, .3, () => brush.polygon(hill));
      wash('#7d6890', 60, .2, .5, () => brush.rect(-1000, 60, 2000, 170));
      if (n !== 5) { torii(-210, hillY(-210) + 4, .9); pine(-900, hillY(-900) + 6, .9); }
      pop();
    }
  });

  /* ---- Direction: the figure's place and size in each shot ---- */
  const FEET = hillY(430) + 12;
  const SHOTS = [
    { to: 4.25, cam: { x: 430, y: FEET, s: .82, wide: true, sun: [-280, -110, 1] } },
    { to: 7.25, cam: { x: 520, y: 606, s: 1.394, sun: [-687, -283, 1.7] } },
    { to: 10.75, cam: { x: 430, y: FEET, s: .82, wide: true, sun: [-280, -110, 1] } },
    { to: 13, cam: { x: 300, y: 620, s: 1.107, sun: [-658, -87, 1.35] } },
    { to: 17, cam: { x: 340, y: 1338, s: 2.6, sun: [-60, -60, 2.6] } },
    { to: 99, cam: { x: 71, y: 325, s: .6, gate: true, sun: [-1136, -577, 1.7] } }
  ];
  const camera = t => SHOTS.find(s => t < s.to).cam;
  const onScreen = (c, q) => [c.x + q[0] * c.s, c.y + q[1] * c.s];
  const RELEASE = 2.05, CATCH = 12.35, CLOSE = 13;

  function pose(n) {
    const t = n / FPS, c = camera(t);
    const near = [track(t, [[0, -86], [1.1, -86], [1.95, -122], [2.9, -118], [3.8, -62], [8.7, -62], [9.6, -78], [11.2, -82], [12.2, -128], [CATCH, -128], [12.99, -122], [CLOSE, -128], [14.9, -124], [16.3, -62]]),
      track(t, [[0, -396], [1.1, -396], [1.95, -668], [2.9, -650], [3.8, -384], [8.7, -384], [9.6, -420], [11.2, -440], [12.2, -672], [CATCH, -672], [12.99, -520], [CLOSE, -432], [14.9, -452], [16.3, -396]])];
    let far = [near[0] - 24, near[1] + 10];
    const held = t < RELEASE || t >= CATCH;
    let lantern;
    if (t >= CLOSE) { lantern = { x: track(t, [[CLOSE, -190], [14.9, -186], [16.3, -124]]), y: track(t, [[CLOSE, -500], [14.9, -520], [16.3, -462]]), s: 1.6 }; near[0] = lantern.x + 32; near[1] = lantern.y + 94; far = [lantern.x - 30, lantern.y + 94]; }
    else if (t < RELEASE) lantern = { x: (near[0] + far[0]) / 2 - 6, y: near[1] - 62, s: 1.05 };
    else if (t >= CATCH) lantern = { x: (near[0] + far[0]) / 2 - 8, y: near[1] - 64, s: 1.05 };
    let free = null;
    if (!held) {
      const P = t < 4.25 ? [[RELEASE, 315, -190, .86], [4.25, -130, -372, .5]] : t < 7.25 ? [[4.25, -60, -262, .34], [7.25, -660, -304, .13]] : t < 8.1 ? null : t < 10.75 ? [[8.1, -860, -30, .12], [10.75, -250, -150, .62]] : [[10.75, -430, -250, .72], [CATCH, 150, -222, 1.16]];
      if (P) free = { x: track(t, P.map(k => [k[0], k[1]])) + Math.sin(t * 1.3) * 7, y: track(t, P.map(k => [k[0], k[2]])) + Math.sin(t * 2.1) * 5, s: track(t, P.map(k => [k[0], k[3]])) };
    }
    return {
      t, c, near, far, lantern, free, held,
      nod: track(t, [[0, 5], [1.2, 5], [2.1, 15], [6, 13], [7, -11], [8.7, -12], [9.5, 7], [10.8, 12], [12.2, 18], [CATCH, 12], [CLOSE, -6], [14.3, -13], [15, -13], [16.2, -28], [17, -30]]),
      wind: track(t, [[0, -.3], [7.6, -.3], [8, -.03], [8.9, 1], [12, .6], [15, .26], [17, .1]]),
      rise: track(t, [[11.5, 0], [12.25, 1], [12.85, 0]]),
      sag: track(t, [[5.9, 0], [7.1, 1], [8.8, 1], [9.6, 0]]),
      shake: t > 15.2 ? ease((t - 15.2) / .8) : 0,
      eye: track(t, [[CLOSE, 1], [15.2, 1], [15.8, .08]]),
      turn: track(t, [[CLOSE, 0], [14.5, 1]]),
      flame: t >= 8 ? track(t, [[8, .55], [CATCH, .55], [14, .85]]) : 1
    };
  }

  /* ---- The lantern. "words" 0 is hidden on the far side, 1 is turned full to us ---- */
  const FONT = {
    I: [[[.5, 0], [.5, 1]]], S: [[[.92, .14], [.5, 0], [.1, .2], [.5, .5], [.9, .76], [.5, 1], [.06, .88]]], A: [[[0, 1], [.5, 0]], [[.5, 0], [1, 1]], [[.2, .64], [.8, .64]]],
    W: [[[0, 0], [.24, 1]], [[.24, 1], [.5, .3]], [[.5, .3], [.76, 1]], [[.76, 1], [1, 0]]], T: [[[0, .04], [1, 0]], [[.5, 0], [.5, 1]]], H: [[[.06, 0], [.06, 1]], [[.94, 0], [.94, 1]], [[.06, .5], [.94, .5]]],
    E: [[[.86, 0], [.1, 0], [.1, 1], [.9, 1]], [[.1, .5], [.74, .5]]], M: [[[0, 1], [.1, 0]], [[.1, 0], [.5, .72]], [[.5, .72], [.9, 0]], [[.9, 0], [1, 1]]], L: [[[.1, 0], [.1, 1], [.92, 1]]]
  };
  function writing(turn, weight) {
    if (turn <= .02) return;
    const lines = ['I SAW', 'THEM', 'ALL'], size = 15, step = 18, gap = 8, squeeze = .25 + .75 * turn, dx = (1 - turn) * 26;
    lines.forEach((w, r) => {
      const width = (w.length - 1) * step + size;
      [...w].forEach((ch, i) => {
        if (!FONT[ch]) return;
        const x0 = -width / 2 + i * step, y0 = -36 + r * (size + gap) + (i % 2) * .8;
        FONT[ch].forEach(stroke => line(stroke.map(p => [dx + (x0 + p[0] * size) * squeeze, y0 + p[1] * size]), C.writing, weight));
      });
    });
  }
  function lanternDrawing(x, y, s, n, flame, turn, tilt) {
    const fl = (Math.sin(n * .9) * 2 + Math.sin(n * 1.7) * 1.5) * flame;
    push(); translate(x, y); rotate(tilt * 57.3); scale(s);
    fill([[-30, -46], [30, -46], [50, -20], [54, 2], [50, 22], [30, 46], [-30, 46], [-50, 22], [-54, 2], [-50, -20]], C.lantern);
    fill([[-22, -36], [22, -36], [38, -10], [38, 14], [22, 38], [-22, 38], [-38, 14], [-38, -10]], C.lanternL, { opacity: 120 + 100 * flame });
    fill([[-8 - fl * .3, 42], [8 + fl * .3, 42], [5 * flame, 34], [fl, 30 - 26 * flame * (1 - turn * .6)], [-5 * flame, 34]], C.flame, { opacity: 235 });
    for (const k of [-.72, -.3, .3, .72]) line([[k * 30, -46], [k * 54, 0], [k * 30, 44]], C.lanternS, LINE(1.7));
    fill([[-27, -48], [27, -48], [29, -40], [-29, -40]], C.ink, { rounds: 1 });
    fill([[-29, 40], [29, 40], [27, 47], [-27, 47]], C.ink, { rounds: 1 });
    writing(turn, LINE(3.4));
    pop();
  }

  /* "open" 1 is spread fingers, 0 is closed round the paper */
  function handDrawing(h, ang, open) {
    push(); translate(h[0], h[1]); rotate(ang * 57.3);
    shape([[-2, -14], [18, -16], [25, 0], [18, 15], [-2, 13]], C.skin, { curve: .7, line: false });
    for (const [y, l] of [[-11, 30], [-4, 34], [3, 32], [10, 26]]) shape(ribbon([[16, y], [18 + l * .5, y + (1 - open) * 9], [18 + l * (.45 + .55 * open), y * (1 + open * .5) + (1 - open) * 12]], 7.5, 4.6), C.skin, { curve: .6, line: false });
    shape(ribbon([[6, 12], [14, 23 - (1 - open) * 8], [26, 26 - (1 - open) * 14]], 8.5, 5), C.skin, { curve: .6, line: false });
    pop();
  }
  /* In the close-up the hands cup the lantern from below. Only the fingertips reach its edge, so the words stay clear */
  function cupHand(L, side) {
    const r = 84, at = (deg, rad) => [L.x + side * Math.cos(deg * Math.PI / 180) * rad, L.y + Math.sin(deg * Math.PI / 180) * rad];
    fill([at(78, r + 24), at(90, r + 12), at(72, r + 2), at(30, r + 6), at(36, r + 18), at(58, r + 26)], C.skin);
    [68, 56, 44, 33].forEach(deg => {
      const b = at(deg, r + 6), m = at(deg - 3, r - 4), e = at(deg - 8, r - 22);
      fill(ribbon([b, m, e], 13, 7), C.skin, { rounds: 1 });
      line([at(deg - 3, r + 2), at(deg - 6, r - 8), at(deg - 9, r - 20)], C.rim, LINE(1.3));
    });
  }
  /* The near arm draws in front, the far arm behind. The wide sleeve hangs under gravity and the wind carries it */
  function armDrawing(sh, h, colour, lag) {
    const bendSign = -1;
    const el = limb(sh, h, 142, 136, bendSign), wr = [mix(el[0], h[0], .78), mix(el[1], h[1], .78)], ang = Math.atan2(h[1] - el[1], h[0] - el[0]), hang = 150;
    const from = U > 1.8 ? .4 : .72; shape(ribbon([[mix(el[0], h[0], from), mix(el[1], h[1], from)], [mix(el[0], h[0], (from + 1) / 2), mix(el[1], h[1], (from + 1) / 2)], h], 26, 18), C.skin, { curve: .5, line: false });
    fill([[sh[0] - 22, sh[1] - 16], [sh[0] + 22, sh[1] - 12], [el[0], el[1] - 15], [wr[0] + 2, wr[1] - 14], [wr[0] + 8, wr[1] + 16], [wr[0] + 22 + lag * .8, wr[1] + hang * .55], [mix(wr[0], el[0], .25) + lag, wr[1] + hang * .92], [mix(el[0], sh[0], .15) + lag * .9, Math.max(el[1], sh[1]) + hang * .72], [sh[0] + 28, sh[1] + 98], [sh[0] - 14, sh[1] + 52]], colour);
    line([[mix(wr[0], el[0], .3) + lag * .4, wr[1] + 30], [mix(wr[0], el[0], .25) + lag * .9, wr[1] + hang * .82]], C.fold, LINE(1.6));
    line([[mix(wr[0], el[0], .7), wr[1] + 26], [mix(wr[0], el[0], .7) + lag * .9, wr[1] + hang * .8]], C.fold, LINE(1.3));
    return { ang };
  }

  /* The girl, seen from the side and facing left, with her feet at (0,0). About six and a half heads tall */
  function girl(n, K) {
    const t = K.t, w = K.wind, shake = Math.sin(t * 19) * 1.8 * K.shake, bob = Math.sin(t * 1.5) * 2 - K.rise * 26 + K.sag * 9 + shake;
    const wave = (k, ph) => (Math.sin(t * 5 - k * 4.4 + ph) * 15 + Math.sin(t * 2.4 - k * 2.1 + ph * 1.7) * 10) * k * (.62 + Math.abs(w) * .5);
    const flow = (x, y, len, ph, spread) => { const pts = []; for (let i = 0; i <= 7; i++) { const k = i / 7, up = 1 - Math.min(1, Math.abs(w)) * .86; pts.push([x + spread * k + len * k * w + 4 * k, y + len * k * up + wave(k, ph) + (w > .4 ? -6 * k : 0)]); } return pts; };
    /* Hair, tied high. Strands of different lengths, so it never reads as a slab */
    const cr = Math.cos(K.nod * Math.PI / 180), sr = Math.sin(K.nod * Math.PI / 180), ax = 2 + 36 * cr + 80 * sr, ay = -530 + bob + 36 * sr - 80 * cr;
    [[176, 0, 2, 20, 3], [190, .8, 8, 18, 3], [166, 1.6, -4, 18, 2.5], [204, 2.3, 14, 15, 1.5], [150, 3, -10, 16, 2], [216, 3.7, 20, 8, 1], [130, 4.4, -14, 9, 1]].forEach(([len, ph, sp, a, b]) => shape(ribbon(flow(ax, ay, len, ph, sp), a, b), C.hair, { curve: .6, line: false }));
    if (w > .3) [[230, 5.1, 26], [205, 5.9, -20]].forEach(([len, ph, sp]) => line(flow(ax, ay, len, ph, sp), C.hair, LINE(1.3)));
    /* The far arm and its sleeve */
    const lagF = wave(.9, 1.2) * .7 + 40 * Math.max(0, w), far = armDrawing([8, -498 + bob], K.far, '#191729', lagF);
    K.farAng = K.t >= CLOSE ? -1.05 : far.ang;
    if (K.t < CLOSE) handDrawing(K.far, far.ang, .55);
    /* Sandals, then the robe */
    for (const x of [20, -22]) fill([[x - 44, -6], [x - 36, -22], [x + 18, -32], [x + 24, -4], [x + 22, 2], [x - 46, 3]], C.ink, { rounds: 1 });
    const flare = wave(.95, .5) * .6 + 26 * Math.max(0, w);
    fill([[-10, -528 + bob], [14, -528 + bob], [34, -506 + bob], [42, -430 + bob], [34, -372 + bob], [46, -300], [58, -120], [80 + flare, -24], [-54 + flare * .25, -24], [-48, -120], [-42, -300], [-32, -372 + bob], [-42, -448 + bob], [-24, -510 + bob]], C.robe, { rounds: 1 });
    fill([[10, -500 + bob], [38, -430 + bob], [32, -372 + bob], [44, -300], [56, -120], [74 + flare, -26], [30 + flare * .6, -26], [18, -180], [10, -340 + bob], [16, -430 + bob]], '#141226', { rounds: 1 });
    fill([[-13, -528 + bob], [-1, -528 + bob], [-20, -456 + bob], [-30, -468 + bob]], C.collar, { rounds: 1 });
    line([[-20, -456 + bob], [-14, -404 + bob]], C.fold, LINE(1.6));
    for (const [x0, x1, x2] of [[-22, -30, -44], [2, 6, 12], [24, 38, 58 + flare * .7]]) line([[x0, -340], [x1, -190], [x2, -24]], C.fold, LINE(1.7));
    /* A warm rim down the side that faces the sun */
    line([[-42, -448 + bob], [-34, -400 + bob], [-32, -372 + bob]], C.rim, LINE(1.8));
    line([[-42, -300], [-50, -120], [-53 + flare * .25, -26]], C.rim, LINE(1.8));
    /* The sash, the one vivid colour on her */
    shape([[-33, -404 + bob], [38, -406 + bob], [38, -350 + bob], [-34, -348 + bob]], C.red, { curve: .2, line: false });
    line([[-33, -378 + bob], [38, -380 + bob]], C.redS, LINE(2));
    [[176, 1, 10, 16, 5], [146, 2.2, -8, 13, 4]].forEach(([len, ph, sp, a, b]) => shape(ribbon(flow(38, -372 + bob, len, ph, sp), a, b), C.red, { curve: .6, line: false }));
    /* Head, turning from the neck */
    push(); translate(2, -530 + bob); rotate(K.nod);
    const brow = [[-22, -98], [-30, -84], [-33, -70], [-32, -62], [-36, -53], [-41, -46], [-37, -42], [-36, -38], [-33, -35], [-35, -32], [-32, -28], [-32, -22], [-27, -13], [-16, -8]];
    fill([[4, -108], ...brow, [-9, -2], [-11, 14], [14, 14], [20, -20], [36, -55], [32, -88], [16, -106]], C.skin, { rounds: 1 });
    line(brow.slice(0, 8), C.rim, LINE(U > 1.8 ? 3.4 : 1.6));
    if (U > 1.8) line([[-31, -66 + (1 - K.eye) * 3], [-36, -64 + (1 - K.eye) * 4]], C.rim, LINE(2.4)); /* The lashes catch the light, and fall as her eyes close */
    fill([[-27, -92], [-10, -112], [20, -112], [42, -86], [44, -50], [28, -12], [4, -6], [0, -34], [-4, -58], [-10, -76], [-28, -82]], C.hair);
    [[-24, -92, -32, -72, 5, 0], [-14, -96, -22, -76, 5, 1], [-6, -96, -8, -70, 6, 2]].forEach(([x, y, ex, ey, wd, ph]) => shape(ribbon([[x, y], [(x + ex) / 2 - 1, (y + ey) / 2], [ex + Math.sin(t * 4 + ph) * 2 * Math.abs(w), ey]], wd, 1.5), C.hair, { curve: .6, line: false }));
    line([[-10, -106], [14, -104], [34, -84]], C.hairS, LINE(1.5));
    /* The red ribbon that ties her hair */
    fill([[32, -90], [45, -86], [45, -72], [32, -75]], C.red, { rounds: 1 });
    pop();
    [[120, 3.2, 6, 7, 2], [96, 4, -8, 6, 2]].forEach(([len, ph, sp, a, b]) => shape(ribbon(flow(ax + 6, ay + 4, len, ph, sp), a, b), C.red, { curve: .6, line: false }));
    return { bob, wave };
  }
  function nearArm(K, bob, wave) {
    const lag = wave(.85, 2.1) * .7 + 40 * Math.max(0, K.wind), arm = armDrawing([-2, -498 + bob], K.near, C.sleeve, lag);
    if (K.t >= CLOSE) { cupHand(K.lantern, -1); cupHand(K.lantern, 1); }
    else handDrawing(K.near, arm.ang, K.t >= CATCH ? .3 : K.held ? .4 : .95);
  }

  const PAST = [[-120, -470, 7], [-330, -400, 6], [-560, -480, 6], [-250, -300, 5], [-470, -330, 5], [-680, -400, 5], [-90, -350, 5], [-380, -230, 4], [-610, -270, 4], [-760, -190, 3.5]];
  V.layer('actors', {
    rate: 24, drawings: DRAWINGS,
    draw(n) {
      const K = pose(n), c = K.c; U = c.s;
      /* Ten autumns: the ten she has sent, far away, one light for each year */
      if (K.t >= 4.25 && K.t < 7.25) PAST.forEach(([x, y, r], i) => { const a = clamp((K.t - 4.7 - i * .17) / .3); if (a > 0) { const q = []; for (let j = 0; j < 8; j++) q.push([x + Math.cos(j * .785) * r, y + Math.sin(j * .785) * r]); shape(q, C.lanternL, { line: false, curve: .9, opacity: 230 * a * (1 - i * .04) }); } });
      if (K.free) lanternDrawing(K.free.x, K.free.y, K.free.s, n, K.flame, 0, Math.sin(K.t * 1.6) * .07);
      push(); translate(c.x, c.y); scale(c.s);
      const body = girl(n, K);
      if (K.lantern) lanternDrawing(K.lantern.x, K.lantern.y, K.lantern.s, n, K.flame, K.turn, Math.sin(K.t * 1.4) * .018);
      nearArm(K, body.bob, body.wave);
      pop();
      if (c.gate) torii(71, 660, 8.2, '#2c1517');
    }
  });
  /* Grass in clumps, moving with the wind, some of it in front of her feet */
  V.layer('grass', {
    rate: 24, drawings: DRAWINGS, boil: 0,
    draw(n) {
      const K = pose(n); if (!K.c.wide) return;
      U = 1; randomSeed(63);
      const spots = []; for (let i = 0; i < 38; i++) spots.push([random(-1050, 1050), random(12, 170)]);
      for (const x of [270, 310, 570, 610]) spots.push([x, FEET - hillY(430) + random(2, 14)]);
      spots.forEach(([cx, dy]) => { for (let j = 0; j < 4; j++) {
        const x = cx + random(-18, 18), y = hillY(cx) + dy + random(-3, 3), h = random(26, 62), ph = random(0, 6), lean = K.wind * 34, sway = Math.sin(K.t * 4.2 + ph + x * .01) * (5 + 6 * Math.abs(K.wind)) + lean;
        shape(ribbon([[x, y], [x + sway * .4, y - h * .55], [x + sway * 1.2, y - h]], 5, .8), C.grass, { line: false, curve: .6 });
      } });
    }
  });
  /* Autumn leaves carried by the wind: first drifting left, then swept right when it turns */
  const carried = t => t < 7.9 ? -26 * t : -26 * 7.9 + 330 * Math.min(1, (t - 7.9) / 1) * .5 + Math.max(0, t - 8.9) * track(t, [[8.9, 330], [12, 190], [15, 90]]);
  V.layer('leaves', {
    rate: 24, drawings: DRAWINGS, boil: 0,
    draw(n) {
      const t = n / FPS, far = carried(t); randomSeed(77);
      for (let i = 0; i < 22; i++) {
        const v = random(.6, 1.5), x = ((random(0, 2240) + far * v) % 2240 + 2240) % 2240 - 1120, y = ((random(0, 1200) + t * 34 * v) % 1200) - 600 + Math.sin(t * 2 + i) * 18, s = random(7, 14), a = t * 4 * v + i, sq = .3 + .7 * Math.abs(Math.cos(a)), co = Math.cos(a), si = Math.sin(a), P = (px, py) => [x + px * s * co - py * s * sq * si, y + px * s * si + py * s * sq * co];
        brush.noStroke(); brush.noHatch(); brush.wash(i % 3 ? C.leaf : C.leafD, 240); trace([P(-1.1, 0), P(0, -.6), P(1.1, 0), P(0, .6)], .85, true); brush.noWash();
      }
    }
  });
  /* The sun's own glow sits behind her, so she stays dark against it */
  V.layer('sunglow', {
    kind: 'light', rate: 1, drawings: SHOTS.length,
    draw(n, g) { const c = SHOTS[n].cam; glow(g, V.WIDTH / 2 + c.sun[0], V.HEIGHT / 2 + c.sun[1], 520 * c.sun[2], '255,150,80', .55); }
  });
  /* Night falling in the last shot, under her so she stays dark, and a fade to end on */
  V.layer('dusk', {
    kind: 'light', rate: 24, drawings: DRAWINGS,
    draw(n, g) { const t = n / FPS; if (t < 17) return; g.fillStyle = `rgba(14,12,38,${track(t, [[17, .42], [20, .82]])})`; g.fillRect(0, 0, V.WIDTH, V.HEIGHT); }
  });
  V.layer('fade', {
    kind: 'light', rate: 24, drawings: DRAWINGS,
    draw(n, g) { const t = n / FPS; if (t < 18.6) return; g.fillStyle = `rgba(4,3,10,${ease((t - 18.6) / 1.4)})`; g.fillRect(0, 0, V.WIDTH, V.HEIGHT); }
  });
  V.layer('lanternglow', {
    kind: 'light', rate: 24, drawings: DRAWINGS,
    draw(n, g) {
      const K = pose(n), c = K.c, cx = V.WIDTH / 2, cy = V.HEIGHT / 2;
      if (K.free) { glow(g, cx + K.free.x, cy + K.free.y, 90 + 300 * K.free.s, '255,180,100', .95 * K.flame); return; }
      if (!K.lantern) return;
      const q = onScreen(c, [K.lantern.x, K.lantern.y]);
      glow(g, cx + q[0], cy + q[1], 170 + 290 * K.lantern.s * c.s * .5, '255,180,100', track(K.t, [[0, .9], [CATCH, .8], [14, 1.05], [17, 1.15]]) * (1 + Math.sin(n * .9) * .03 + Math.sin(n * 1.7) * .02));
    }
  });
})();
