/* Tests for the planner, cutter, renderer, checker and Vector engine. Run: node --test tests/*.mjs */
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from '../skills/sumi/tools/lib/browser.mjs';
import { STYLES, budget, newProject, validate } from '../skills/sumi/tools/sumi-plan.mjs';
import { cut } from '../skills/sumi/tools/sheet-cut.mjs';
import { cameraAt, captionWords, drawingIndex, render, toSrt } from '../skills/sumi/tools/sumi-render.mjs';
import { chunk, wordsFromAlignment } from '../skills/sumi/tools/captions-from-voice.mjs';
import { runCheck } from '../skills/sumi/tools/motion-check.mjs';
import { captureLayer, openScene } from '../skills/sumi-vector/tools/vector-capture.mjs';
import { MOODS, buildMix, checkPlan, volumeExpression } from '../skills/sumi/tools/sound-mix.mjs';
import { effectKey } from '../skills/sumi/tools/sound-effect.mjs';
import { checklist, moments, verify } from '../skills/sumi/tools/review-frames.mjs';
import { DEFAULTS, cacheKey, costOf, ledgerTotal, overLimit } from '../skills/sumi/tools/sheet-image.mjs';
import { findProblems } from '../skills/sumi/tools/drawing-check.mjs';
import { checkVerdict, timelineText } from '../skills/sumi/tools/audience-pack.mjs';

const R = join(dirname(fileURLToPath(import.meta.url)), '..');
const PAGE = pathToFileURL(join(R, 'skills/sumi/tools/lib/canvas-page.html')).href;
const shot = extra => ({ id: 's01', duration: 1, purpose: 'p', framing: 'f', acting: 'a', camera_reason: 'c', layers: [{ name: 'hero', role: 'character', kind: 'drawings', frames: 'frames/hero', rate: 12 }], ...extra });
const plan = (style = 'dark', extra = {}) => ({ title: 'T', style, art_route: style === 'vector' ? 'vector' : 'images', fps: 24, size: [320, 180], paper: '#f4f0e6', shots: [shot(extra)] });
const two = [{ name: 'bg', role: 'background', kind: 'drawings', frames: 'frames/bg', rate: 8 }, { name: 'hero', role: 'character', kind: 'drawings', frames: 'frames/hero', rate: 12 }];

describe('style rules', () => {
  test('a good plan passes in every style', () => {
    for (const style of Object.keys(STYLES)) assert.deepEqual(validate(plan(style, { layers: two })).errors, [], style);
  });
  test('warping words are refused anywhere', () => {
    const p = plan();
    p.shots[0].layers[0].warp = { amount: 1 };
    p.morph = true;
    assert.equal(validate(p).errors.filter(e => e.includes('Warping')).length, 2);
  });
  test('a painted character needs a story reason', () => {
    const layers = [{ name: 'hero', role: 'character', kind: 'painting', src: 'a.png' }];
    assert.ok(validate(plan('dark', { layers })).errors.some(e => e.includes('needs drawn frames')));
    assert.deepEqual(validate(plan('dark', { layers, still_reason: 'A held shock' })).errors, []);
  });
  test('a slow character needs a hold reason', () => {
    const layers = [{ name: 'hero', role: 'character', kind: 'drawings', frames: 'frames/hero', rate: 4 }];
    assert.ok(validate(plan('dark', { layers })).errors.some(e => e.includes('below 12')));
    layers[0].hold_reason = 'Frozen with fear';
    assert.deepEqual(validate(plan('dark', { layers })).errors, []);
  });
  test('parallax is allowed only in Dark', () => {
    const layers = [{ ...two[0], depth: .3 }, { ...two[1], depth: 1 }];
    assert.deepEqual(validate(plan('dark', { layers })).errors, []);
    for (const style of ['light', 'vector']) assert.ok(validate(plan(style, { layers })).errors.some(e => e.includes('no parallax')), style);
  });
  test('Light backgrounds must be drawn', () => {
    const layers = [{ name: 'bg', role: 'background', kind: 'painting', src: 'bg.png' }, two[1]];
    assert.ok(validate(plan('light', { layers })).errors.some(e => e.includes('animated with drawn frames')));
    assert.deepEqual(validate(plan('vector', { layers })).errors, []);
  });
  test('scene changes follow each style', () => {
    for (const [style, kind, good] of [['vector', 'drawn', false], ['vector', 'dissolve', true], ['light', 'dissolve', false], ['dark', 'dissolve', false], ['dark', 'drawn', true]]) {
      const p = plan(style, { layers: two });
      p.shots.push(shot({ id: 's02', layers: two, transition_in: { kind, frames: 'frames/t' } }));
      assert.equal(validate(p).errors.some(e => e.includes('scene changes must be')), !good, `${style} ${kind}`);
    }
  });
  test('the Director must fill direction', () => {
    const p = plan();
    delete p.shots[0].purpose;
    assert.ok(validate(p).errors.some(e => e.includes('"purpose"')));
  });
  test('the budget counts a reused cycle once', () => {
    const loop = { name: 'smoke', role: 'effect', kind: 'drawings', frames: 'frames/smoke', rate: 10, loop: true, cycle: 12 };
    const p = { ...plan(), characters: ['hero'], shots: [shot({ id: 'a', duration: 2, layers: [two[1], loop] }), shot({ id: 'b', duration: 4, layers: [{ ...two[1], frames: 'frames/hero2' }, loop] })] };
    const b = budget(p);
    assert.equal(b.drawings, 24 + 48 + 12);
    assert.equal(b.sheets, 2 + 4 + 1);
    assert.equal(b.images_if_sheets, 7 + 1 + 2);
  });
  test('the Vector route uses no images', () => {
    const b = budget({ ...plan(), art_route: 'vector' });
    assert.equal(b.images_if_sheets, 0);
    assert.equal(b.images_if_one_by_one, 0);
  });
});

describe('directed captions', () => {
  const withCaptions = (captions, style = 'dark') => plan(style, { layers: two, captions });
  test('a director can place and act a caption', () => {
    assert.deepEqual(validate(withCaptions([{ text: 'NEVER.', start: 0, end: .5, place: 'center', mood: 'slam', key: 'never' }, { text: 'Do not board the 8:15.', start: .5, end: 1, place: { x: .3, y: .2 }, key: '8:15' }])).errors, []);
  });
  test('unknown moods, places and key words are refused', () => {
    const errors = validate(withCaptions([{ text: 'Hello', start: 0, end: 1, mood: 'wobble', place: 'nowhere', key: 'gone' }])).errors.join();
    for (const word of ['mood must be', 'place must be', 'is not in the text']) assert.ok(errors.includes(word), word);
  });
  test('a caption must stay inside its shot', () => {
    assert.ok(validate(withCaptions([{ text: 'Late', start: .5, end: 3 }])).errors.some(e => e.includes('inside the shot')));
  });
  test('captions that are all the same get a warning', () => {
    const same = [0, .3, .6].map(start => ({ text: 'Plain words', start, end: start + .2 }));
    assert.ok(validate(withCaptions(same)).warnings.some(w => w.includes('same place and mood')));
    same[1] = { ...same[1], place: 'center', mood: 'slam' };
    assert.ok(!validate(withCaptions(same)).warnings.some(w => w.includes('same place and mood')));
  });
  test('words spread across a caption and key words match', () => {
    const words = captionWords({ text: 'Do not board the 8:15.', start: 1, end: 3, key: '8:15' });
    assert.equal(words.length, 5);
    assert.equal(words[0].at, 1);
    assert.ok(words[4].key && !words[0].key);
  });
  test('voice timing becomes short captions, split at pauses', () => {
    const text = 'No blade. Only the story.';
    const starts = [...text].map((_, i) => i * .05);
    const words = wordsFromAlignment({ characters: [...text], character_start_times_seconds: starts, character_end_times_seconds: starts.map(s => s + .05) });
    assert.deepEqual(words.map(w => w.w), ['No', 'blade.', 'Only', 'the', 'story.']);
    const caps = chunk(words, { start: 2, key: ['blade'] });
    assert.deepEqual(caps.map(c => c.text), ['No blade.', 'Only the story.']);
    assert.equal(caps[0].start, 2);
    assert.deepEqual(caps[0].key, ['blade']);
  });
  test('captions become an srt file with film time', () => {
    const p = plan();
    p.shots.push(shot({ id: 's02', captions: [{ text: 'Second', start: .5, end: 1 }] }));
    assert.match(toSrt(p), /00:00:01,500 --> 00:00:02,000\nSecond/);
  });
});

describe('timing', () => {
  test('a new drawing arrives at the planned rate', () => {
    assert.deepEqual([0, 1, 2, 3, 4, 5].map(f => drawingIndex({ rate: 12 }, f / 24, 12)), [0, 0, 1, 1, 2, 2]);
  });
  test('it stops on the last drawing, or loops', () => {
    assert.equal(drawingIndex({ rate: 12 }, 5, 12), 11);
    assert.equal(drawingIndex({ rate: 12, loop: true }, 1, 12), 0);
  });
  test('a sequence reuses frames', () => assert.equal(drawingIndex({ rate: 12, sequence: [3, 1] }, 1 / 12, 5), 0));
  test('the camera starts and stops gently', () => {
    const s = { camera: [{ t: 0, x: 0 }, { t: 1, x: 100 }] };
    assert.ok(Math.abs(cameraAt(s, .5).x - 50) < 1);
    assert.ok(cameraAt(s, .1).x < 10);
    assert.equal(cameraAt(s, 2).x, 100);
  });
});

describe('with a browser', () => {
  let tmp, browser;
  before(async () => {
    tmp = mkdtempSync(join(tmpdir(), 'sumi-test-'));
    browser = await Browser.open();
    await browser.go(PAGE, 'window.ready === true');
  });
  after(() => { browser.close(); rmSync(tmp, { recursive: true, force: true }); });

  const png = base64 => Buffer.from(base64, 'base64');
  async function figure(path, x, size = [320, 180]) {
    const data = await browser.run(`(() => { const [c, g] = surface(${size[0]}, ${size[1]}); g.fillStyle = '#141414'; g.beginPath(); g.ellipse(${x + 30}, 60, 30, 30, 0, 0, 7); g.fill(); g.fillRect(${x + 10}, 90, 40, 70); return pngOf(c); })()`);
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, png(data));
  }
  async function frames(root, name, count, step) {
    for (let n = 0; n < count; n++) await figure(join(root, 'frames', name, `f${String(n + 1).padStart(4, '0')}.png`), 20 + n * step);
  }
  function project(name) {
    const root = join(tmp, name);
    mkdirSync(root, { recursive: true });
    return root;
  }
  async function sheet(path, { empty = -1, ground = true } = {}) {
    const data = await browser.run(`(() => { const s = 120, [c, g] = surface(s * 4, s * 3); g.fillStyle = 'rgb(244,240,230)'; g.fillRect(0, 0, s * 4, s * 3);
      for (let n = 0; n < 12; n++) { if (n === ${empty}) continue; const x = (n % 4) * s, y = Math.floor(n / 4) * s, drop = n % 3 * 4;
        g.fillStyle = 'rgb(20,20,20)'; g.beginPath(); g.arc(x + 45 + n, y + 45, 28, 0, 7); g.fill();
        g.fillStyle = 'rgb(244,240,230)'; g.fillRect(x + 38 + n, y + 38, 12, 12);
        ${ground ? "g.fillStyle = 'rgb(15,15,15)'; g.fillRect(x + 5, y + 95 + drop, 110, 4);" : ''} }
      return pngOf(c); })()`);
    writeFileSync(path, png(data));
    return path;
  }
  const pixel = async (path, x, y) => {
    await browser.run(`loadPicture('p', ${JSON.stringify(readFileSync(path).toString('base64'))})`);
    return browser.run(`(() => { const p = pictures.get('p'), [, g] = surface(p.width, p.height); g.drawImage(p, 0, 0); return [...g.getImageData(${x}, ${y}, 1, 1).data]; })()`);
  };

  test('it cuts every frame in order', async () => {
    const root = project('cut1');
    const report = await cut(await sheet(join(root, 's.png')), join(root, 'out'), { cols: 4, rows: 3 }, browser);
    assert.equal(report.frames.length, 12);
    assert.ok(existsSync(join(root, 'out/f0012.png')) && existsSync(join(root, 'out/cut.json')));
    assert.ok(report.warnings.length, 'warns that frames are soft');
  });
  test('the ground line lines up whole frames', async () => {
    const root = project('cut2');
    const report = await cut(await sheet(join(root, 's.png')), join(root, 'out'), { cols: 4, rows: 3, align: 'ground' }, browser);
    assert.deepEqual(report.frames.slice(0, 3).map(f => f.shift_y), [4, 0, -4]);
  });
  test('cutout removes outside paper and keeps enclosed paper', async () => {
    const root = project('cut3');
    await cut(await sheet(join(root, 's.png'), { ground: false }), join(root, 'out'), { cols: 4, rows: 3, cutout: true }, browser);
    assert.ok((await pixel(join(root, 'out/f0001.png'), 3, 3))[3] < 10);
    assert.ok((await pixel(join(root, 'out/f0001.png'), 44, 44))[3] > 200);
  });
  test('an empty cell stops the cut', async () => {
    const root = project('cut4');
    await assert.rejects(cut(await sheet(join(root, 's.png'), { empty: 5 }), join(root, 'out'), { cols: 4, rows: 3 }, browser), /empty/);
  });
  test('it never overwrites frames', async () => {
    const root = project('cut5'), s = await sheet(join(root, 's.png'));
    await cut(s, join(root, 'out'), { cols: 4, rows: 3 }, browser);
    await assert.rejects(cut(s, join(root, 'out'), { cols: 4, rows: 3 }, browser), /already has files/);
  });

  test('real drawings pass', async () => {
    const root = project('r1');
    await frames(root, 'hero', 12, 2);
    const p = plan(), path = join(root, 'shots.json'), out = join(root, 'out/film.mp4');
    writeFileSync(path, JSON.stringify(p));
    assert.equal((await render(p, root, out)).frames, 24);
    const report = await runCheck(path, out, browser);
    assert.equal(report.status, 'pass', report.problems.join());
    assert.equal(report.layers[0].unique_drawings, 12);
    assert.ok(Math.abs(report.layers[0].real_drawings_per_second - 12) <= 1);
  });
  test('one image copied twelve times fails', async () => {
    const root = project('r2');
    await frames(root, 'hero', 12, 0);
    const p = plan(), path = join(root, 'shots.json'), out = join(root, 'out/film.mp4');
    writeFileSync(path, JSON.stringify(p));
    await render(p, root, out);
    const report = await runCheck(path, out, browser);
    assert.equal(report.status, 'fail');
    assert.equal(report.layers[0].unique_drawings, 1);
    assert.ok(report.problems.some(x => x.includes('frozen')));
  });
  test('big jumps are reported', async () => {
    const root = project('r3');
    await frames(root, 'hero', 12, 12);
    const p = plan(), path = join(root, 'shots.json'), out = join(root, 'out/film.mp4');
    writeFileSync(path, JSON.stringify(p));
    await render(p, root, out);
    const report = await runCheck(path, out, browser);
    assert.ok(report.layers[0].big_jumps.length);
    assert.equal(report.status, 'fail');
  });
  test('a layer marked travels may cross the frame, but others may not', async () => {
    const root = project('r3b');
    await frames(root, 'hero', 12, 12);
    const p = plan();
    p.shots[0].layers[0].travels = true;
    const path = join(root, 'shots.json'), out = join(root, 'out/film.mp4');
    writeFileSync(path, JSON.stringify(p));
    await render(p, root, out);
    const report = await runCheck(path, out, browser);
    assert.equal(report.layers[0].big_jumps.length, 0);
    assert.equal(report.status, 'pass', report.problems.join());
  });
  test('a video alone can never pass', async () => {
    const root = project('r4');
    await frames(root, 'hero', 12, 2);
    const out = join(root, 'out/film.mp4');
    await render(plan(), root, out);
    assert.equal((await runCheck(null, out)).status, 'evidence-only');
  });
  test('far layers move less than near ones', async () => {
    const root = project('r5');
    await frames(root, 'hero', 2, 0);
    const mid = n => execFileSync('ffmpeg', ['-v', 'error', '-i', join(root, `out/${n}.mp4`), '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
    const leftEdge = buffer => { const row = 80 * 320; for (let x = 0; x < 320; x++) if (buffer[row + x] < 90) return x; return -1; };
    for (const [name, depth] of [['near', 1], ['far', .25]]) {
      const layers = [{ name: 'hero', role: 'character', kind: 'drawings', frames: 'frames/hero', rate: 12, loop: true, depth }];
      await render(plan('dark', { layers, camera: [{ t: 0, x: -40 }] }), root, join(root, `out/${name}.mp4`));
    }
    assert.ok(Math.abs((leftEdge(mid('near')) - leftEdge(mid('far'))) - 30) <= 3);
  });
  test('directed captions draw in every style', async () => {
    for (const style of ['dark', 'light', 'original']) {
      const root = project('c-' + style);
      await frames(root, 'hero', 12, 2);
      await frames(root, 'bg', 12, 0);
      const p = plan(style, { layers: [{ ...two[0], loop: true }, { ...two[1] }], captions: [{ text: 'NEVER.', start: .1, end: .9, place: 'center', mood: 'slam', key: 'never' }] });
      const out = join(root, 'out/film.mp4');
      await render(p, root, out);
      const size = 320 * 180;
      const grab = n => execFileSync('ffmpeg', ['-v', 'error', '-i', out, '-vf', `select=eq(n\\,${n})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
      const a = grab(0), b = grab(12);
      let changed = 0;
      for (let i = 0; i < size; i++) if (Math.abs(a[i] - b[i]) > 30) changed++;
      assert.ok(changed > 500, `${style}: the caption should change the picture`);
    }
  });
  test('a drawn scene change covers the cut', async () => {
    const root = project('r6');
    await frames(root, 'hero', 12, 2);
    mkdirSync(join(root, 'frames/ink'), { recursive: true });
    const black = await browser.run(`(() => { const [c, g] = surface(320, 180); g.fillStyle = '#000'; g.fillRect(0, 0, 320, 180); return pngOf(c); })()`);
    for (let n = 1; n <= 6; n++) writeFileSync(join(root, `frames/ink/f000${n}.png`), png(black));
    const p = plan();
    p.shots.push(shot({ id: 's02', transition_in: { kind: 'drawn', frames: 'frames/ink', rate: 12, count: 6 } }));
    const out = join(root, 'out/film.mp4');
    assert.equal((await render(p, root, out)).frames, 48);
    const f = execFileSync('ffmpeg', ['-v', 'error', '-i', out, '-vf', 'select=eq(n\\,24)', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 1 << 26 });
    assert.ok(f.reduce((a, b) => a + b, 0) / f.length < 40);
  });

  test('new projects refuse to overwrite', () => {
    const folder = join(tmp, 'film');
    newProject(folder, 'light', 'My film');
    assert.ok(existsSync(join(folder, 'STUDIO.md')));
    assert.match(readFileSync(join(folder, "STUDIO.md"), "utf8"), /film-guide/);
    assert.equal(JSON.parse(readFileSync(join(folder, 'shots.json'))).style, 'light');
    assert.throws(() => newProject(folder, 'light', 'My film'));
  });
});

describe('Vector engine', () => {
  const dir = join(R, 'skills/sumi-vector/examples/lantern');
  let tmp;
  before(() => { tmp = mkdtempSync(join(tmpdir(), 'sumi-vector-')); });
  after(() => rmSync(tmp, { recursive: true, force: true }));
  test('the example paints real, different drawings on transparent frames', async () => {
    const browser = await openScene(join(dir, 'scene.js'));
    try {
      const info = await browser.run('VECTOR.info()');
      assert.equal(info.layers.actors.drawings, 480);
      assert.equal((await captureLayer(browser, 'actors', join(tmp, 'a'), { only: [10, 11] })).drawings, 2);
      const a = readFileSync(join(tmp, 'a/f0011.png')), b = readFileSync(join(tmp, 'a/f0012.png'));
      assert.notDeepEqual(a, b, 'the next drawing must be new');
      await assert.rejects(captureLayer(browser, 'actors', join(tmp, 'a'), { only: [1] }), /already has files/);
    } finally {
      browser.close();
    }
  });
  test('the example plan follows the rules', () => {
    assert.deepEqual(validate(JSON.parse(readFileSync(join(dir, 'shots.json')))).errors, []);
  });
  test('Vector must use the vector route, and Dark and Light must not', () => {
    const shot = { id: 's', duration: 1, purpose: 'p', framing: 'f', acting: 'a', camera_reason: 'c', layers: [{ name: 'h', role: 'character', kind: 'drawings', rate: 24, frames: 'f' }] };
    assert.ok(validate({ style: 'vector', art_route: 'images', shots: [shot] }).errors.some(e => e.includes('drawn in code')));
    assert.ok(validate({ style: 'dark', art_route: 'vector', shots: [shot] }).errors.some(e => e.includes('made with images')));
    assert.ok(!('original' in STYLES));
  });
});

describe('Sound', () => {
  const ok = () => true, plan = { duration: 10, music: [{ mood: 'hope', start: 0, end: 10 }], hits: [{ file: 'a.mp3', at: 1 }] };
  test('every film needs music and effects', () => {
    assert.deepEqual(checkPlan(plan, ok), []);
    assert.ok(checkPlan({ duration: 10, hits: plan.hits }, ok).some(p => p.includes('music')));
    assert.ok(checkPlan({ duration: 10, music: plan.music }, ok).some(p => p.includes('effects')));
  });
  test('it refuses an unknown mood, a missing file, and sound after the end', () => {
    assert.ok(checkPlan({ ...plan, music: [{ mood: 'nope', end: 5 }] }, ok).some(p => p.includes('nope')));
    assert.ok(checkPlan(plan, () => false).some(p => p.includes('missing')));
    assert.ok(checkPlan({ ...plan, hits: [{ file: 'a.mp3', at: 11 }] }, ok).some(p => p.includes('after the film')));
  });
  test('all twelve moods are bundled', () => { assert.equal(MOODS.length, 12); });
  test('music is lowered only when there is a voice', () => {
    assert.ok(!buildMix(plan, '.').filter.includes('sidechaincompress'));
  });
  test('volume keys ramp in order', () => {
    assert.equal(volumeExpression([[0, .4]]), '0.4');
    assert.match(volumeExpression([[0, 1], [2, 0]]), /lt\(t,2\.000\)/);
  });
  test('the same effect request has the same key', () => {
    assert.equal(effectKey('knock', 1), effectKey('knock', 1));
    assert.notEqual(effectKey('knock', 1), effectKey('knock', 2));
  });
});

describe('Detail check', () => {
  const plan = { title: 'T', shots: [
    { id: 'a', duration: 2, must_see: [{ t: 1, see: ['the blade'] }] },
    { id: 'b', duration: 3, must_see: [{ t: .5, see: ['the hand', 'the guard'] }] }
  ] };
  test('it names the frame for each moment, counting from the film start', () => {
    const { list, missing } = moments(plan);
    assert.deepEqual(missing, []);
    assert.deepEqual(list.map(m => m.time), [1, 2.5]);
  });
  test('a shot with no must_see is reported, and a time outside the shot is refused', () => {
    assert.deepEqual(moments({ shots: [{ id: 'x', duration: 1 }] }).missing, ['x']);
    assert.throws(() => moments({ shots: [{ id: 'x', duration: 1, must_see: [{ t: 2, see: ['y'] }] }] }), /outside the shot/);
  });
  test('it only passes when every item has been ticked', () => {
    const text = checklist(plan, moments(plan).list);
    assert.deepEqual(verify(text), ['the blade', 'the hand', 'the guard']);
    assert.deepEqual(verify(text.replaceAll('- [ ]', '- [x]')), []);
    assert.equal(verify('# nothing here').length, 1);
  });
  test('the plan warns when a shot says nothing about what must be seen', () => {
    const shot = { id: 's', duration: 1, purpose: 'p', framing: 'f', acting: 'a', camera_reason: 'c', layers: [{ name: 'h', role: 'character', kind: 'drawings', rate: 24, frames: 'frames/h' }] };
    assert.ok(validate({ style: 'dark', shots: [shot] }).warnings.some(w => w.includes('must_see')));
    assert.ok(!validate({ style: 'dark', shots: [{ ...shot, must_see: [{ t: .5, see: ['x'] }] }] }).warnings.some(w => w.includes('must_see')));
  });
});

describe('Image savings', () => {
  const job = { prompt: 'a', model: 'm', size: '3840x2160', quality: 'high', refs: [] };
  test('the same request has the same key, and any change makes a new one', () => {
    assert.equal(cacheKey(job), cacheKey({ ...job }));
    assert.notEqual(cacheKey(job), cacheKey({ ...job, prompt: 'b' }));
    assert.notEqual(cacheKey(job), cacheKey({ ...job, refs: [Buffer.from('x')] }));
  });
  test('cost comes from the usage the tool reports', () => {
    assert.ok(Math.abs(costOf({ output_tokens: 1000000 }) - 30) < 1e-9);
    assert.ok(Math.abs(costOf({ output_tokens: 0, input_tokens_details: { image_tokens: 1000000, text_tokens: 0 } }) - 8) < 1e-9);
  });
  test('the default is a big sheet at medium, and a limit stops spending', () => {
    assert.equal(DEFAULTS.size, '3840x2160');
    assert.equal(DEFAULTS.quality, 'medium');
    assert.equal(overLimit(5, 5), true);
    assert.equal(overLimit(4.9, 5), false);
    assert.equal(overLimit(100, 0), false);
  });
  test('the budget gives dollars at the prices it is told', () => {
    const plan = { style: 'dark', art_route: 'images', characters: ['a'], shots: [{ duration: 1, layers: [{ kind: 'drawings', role: 'character', frames: 'f', rate: 12 }] }] };
    assert.equal(budget(plan, 12, { medium: 1, high: 10 }).dollars_if_sheets, 12);
  });
  test('the ledger adds up what was paid', () => {
    assert.deepEqual(ledgerTotal({ images: { a: { dollars: .1 }, b: { dollars: .04 } }, reused: 3 }), { images: 2, dollars: .14, reused: 3 });
  });
});

describe('Drawing check', () => {
  const good = (o = {}) => ({ w: 700, h: 700, top: 40, bottom: 660, left: 200, right: 500, cx: 350, cy: 350, touch: { top: 0, bottom: 0, left: 0, right: 0 }, ...o });
  test('a good set of drawings passes', () => {
    assert.deepEqual(findProblems([good(), good({ cx: 354 }), good({ cx: 358 })]), []);
  });
  test('a head cut by the frame fails, and names the drawing', () => {
    const [p] = findProblems([good(), good({ top: 0, touch: { top: 90, bottom: 0, left: 0, right: 0 } })]);
    assert.equal(p.side, 'top');
    assert.deepEqual(p.drawings, [2]);
    assert.match(p.text, /head/);
  });
  test('a chosen cut is allowed', () => {
    assert.deepEqual(findProblems([good({ touch: { top: 0, bottom: 90, left: 0, right: 0 } })], { mayCut: ['bottom'] }), []);
  });
  test('one drawing popping out of place fails, even when the rest are fine', () => {
    const list = [good(), good(), good({ cy: 250, top: -60, bottom: 560 }), good()];
    assert.ok(findProblems(list).filter(p => p.kind === 'pop').length >= 2);
  });
  test('a character crossing the frame on purpose does not count as a pop', () => {
    assert.deepEqual(findProblems([good(), good({ cx: 500 })], { travels: true }), []);
  });
  test('a real bend is allowed more change, but a wild jump still fails', () => {
    const bend = [good(), good({ cy: 390, top: 90 })], wild = [good(), good({ cy: 650, top: 300, bottom: 1000 })];
    assert.ok(findProblems(bend).length > 0);
    assert.deepEqual(findProblems(bend, { bigAction: true }), []);
    assert.ok(findProblems(wild, { bigAction: true }).length > 0);
  });
  test('a box left by a failed cut-out fails', () => {
    const [p] = findProblems([good({ touch: { top: 0, bottom: 0, left: 0, right: 0, box: true } })]);
    assert.equal(p.kind, 'box');
  });
  test('a drawing placed off the screen fails', () => {
    const list = [good({ top: 40 })];
    assert.equal(findProblems(list, { placed: { x: 960, y: 200, scale: 1 }, stage: [1920, 1080] })[0].side, 'top');
  });
});

describe('Audience panel', () => {
  const v = o => ({ viewer: 'x', story: 's', score: 8, pass: true, ...o });
  test('five passing viewers pass', () => { assert.deepEqual(checkVerdict({ viewers: [v(), v(), v(), v(), v()] }), []); });
  test('too few viewers, a low score or no story fails', () => {
    assert.equal(checkVerdict({ viewers: [v()] }).length, 1);
    assert.ok(checkVerdict({ viewers: [v(), v(), v(), v(), v({ score: 5, pass: false })] }).length);
    assert.ok(checkVerdict({ viewers: [v(), v(), v(), v(), v({ story: '' })] }).length);
  });
  test('the viewers get only what the audience gets', () => {
    const text = timelineText({ title: 'T', shots: [{ duration: 2, purpose: 'SECRET', captions: [{ text: 'Hello', start: .5 }] }] });
    assert.match(text, /Hello/);
    assert.doesNotMatch(text, /SECRET/);
  });
});

test('free sound effects need no key and make real sound', async () => {
  const { FREE_EFFECTS, freeEffect } = await import('../skills/sumi/tools/sound-effect.mjs');
  const dir = mkdtempSync(join(tmpdir(), 'sumi-fx-'));
  for (const name of Object.keys(FREE_EFFECTS)) {
    const out = join(dir, name + '.wav');
    assert.equal(freeEffect(name, out, 0.5).credits, 0);
    assert.ok(readFileSync(out).length > 20000, name);
  }
  assert.throws(() => freeEffect('thunder', join(dir, 'x.wav'), 1));
  rmSync(dir, { recursive: true });
});

test('lip-sync follows the speech and closes at pauses', async () => {
  const { sequenceFromAlignment, sequenceFromLevels, MOUTHS } = await import('../skills/sumi/tools/lip-sync.mjs');
  const alignment = { characters: ['m', 'a', ' ', 'o'], character_start_times_seconds: [0, .1, .3, .5], character_end_times_seconds: [.1, .3, .5, .7] };
  const { sequence, approximate } = sequenceFromAlignment(alignment, { duration: 1, start: 0, rate: 10 });
  assert.deepEqual(sequence.slice(0, 9), [MOUTHS.closed, MOUTHS.open, MOUTHS.open, MOUTHS.closed, MOUTHS.closed, MOUTHS.round, MOUTHS.round, MOUTHS.closed, MOUTHS.closed]);
  assert.equal(approximate, false);
  assert.equal(sequenceFromAlignment({ characters: ['\u0627'], character_start_times_seconds: [0], character_end_times_seconds: [1] }, { duration: 1 }).approximate, true);
  assert.deepEqual(sequenceFromLevels([0, .3, .9], { duration: .4, start: 0, rate: 10 }), { sequence: [1, 2, 3, 1], approximate: true });
});

test('Sumi Dark needs red and one more vibrant colour in the art', async () => {
  const { colourProblems } = await import('../skills/sumi/tools/drawing-check.mjs');
  assert.equal(colourProblems([{ red: 50, other: 50 }]).length, 0);
  assert.equal(colourProblems([{ red: 0, other: 50 }]).length, 1);
  assert.equal(colourProblems([{ red: 3, other: 2 }]).length, 2);
});

test('failures are explained in plain words', async () => {
  const { plainError } = await import('../skills/sumi/tools/lib/plain-error.mjs');
  assert.match(plainError(Object.assign(new Error('spawnSync ffmpeg ENOENT'), { code: 'ENOENT', path: 'ffmpeg' })), /FFmpeg is missing/);
  assert.match(plainError(Object.assign(new Error('x'), { code: 'ENOENT', path: 'a.json' })), /Cannot find a\.json/);
  assert.match(plainError(Object.assign(new Error('x'), { code: 'EPERM', path: 'f' })), /Full access/);
});
