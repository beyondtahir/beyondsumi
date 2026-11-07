#!/usr/bin/env node
/* The Checker: does the film really have the drawings it promises?

     node motion-check.mjs PROJECT/shots.json --video PROJECT/out/film.mp4 [--save out/motion-check.json]
     node motion-check.mjs --video any-film.mp4      (video evidence only; it can never pass)

   It counts real different drawings from the frame files, finds big jumps between them, and measures frozen
   frames in the finished video. Numbers cannot judge beauty, so a person still has to watch the film. */
import { plainError } from './lib/plain-error.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from './lib/browser.mjs';
import { FPS, STYLES, frameFiles, sequenceOf } from './sumi-plan.mjs';
import { checkDrawings } from './drawing-check.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LIMITS = {
  rateTolerance: .85,  // real drawings per second may fall this far below the plan before failing
  jumpShape: .22,      // share of the character's shape that may change between two drawings
  jumpSize: .14,       // a drawing's height changing more than this in one step
  maxJumpShare: .25,   // more jumpy steps than this fails the layer
  maxFrozen: .30,      // more near-identical video frames than this fails the film
  frozenDiff: .05
};

const sha = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function sequenceFor(layer, duration, count) {
  const steps = Math.max(1, Math.ceil(duration * layer.rate)), order = sequenceOf(layer), length = order ? order.length : count;
  return Array.from({ length: steps }, (_, s) => {
    const i = layer.loop ? s % length : Math.min(s, length - 1);
    return order ? order[i] - 1 : i;
  });
}

async function checkLayer(browser, root, shot, layer) {
  const files = frameFiles(root, layer), label = `${shot.id}/${layer.name}`;
  if (!files.length) return { layer: label, status: 'fail', reason: 'no frames found', problems: ['no frames found'] };
  const order = sequenceFor(layer, shot.duration, files.length);
  const cache = new Map();
  const hashes = order.map(i => { if (!cache.has(i)) cache.set(i, sha(files[i])); return cache.get(i); });
  const changedAt = [];
  hashes.forEach((h, n) => { if (n && h !== hashes[n - 1]) changedAt.push(n); });
  // Speed is measured while the drawings actually change. A planned hold is reported separately.
  let realRate = 0, hold = shot.duration;
  if (changedAt.length) {
    const acting = (changedAt.at(-1) - changedAt[0] + 1) / layer.rate;
    realRate = changedAt.length / acting;
    hold = shot.duration - acting;
  }
  const result = {
    layer: label, role: layer.role, planned_rate: layer.rate, real_drawings_per_second: Math.round(realRate * 100) / 100,
    unique_drawings: new Set(hashes).size, held_seconds: Math.round(Math.max(0, hold) * 100) / 100
  };
  const problems = [];
  if (realRate < layer.rate * LIMITS.rateTolerance && !layer.hold_reason) problems.push(`only ${realRate.toFixed(1)} real drawings/s against ${layer.rate} planned; identical files do not count`);
  if (layer.role === 'character') {
    const unique = [...new Set(order)], shapes = [];
    for (const i of unique) {
      await browser.run(`loadPicture('c', ${JSON.stringify(readFileSync(files[i]).toString('base64'))})`);
      shapes.push(new Set(await browser.run(`silhouette('c')`)));
    }
    const jumps = [], steps = [];
    for (let n = 1; n < shapes.length; n++) {
      const a = shapes[n - 1];
      let b = shapes[n];
      // Someone entering or leaving the frame is not a jump
      if (Math.min(a.size, b.size) < 400) { steps.push(0); continue; }
      // A layer the Director marked "travels" crosses the frame on purpose, so compare the drawings
      // with their centres lined up. A real pop in the drawing still shows.
      if (layer.travels) {
        const centre = s => { let x = 0, y = 0; for (const v of s) { x += v & 255; y += v >> 8; } return [x / s.size, y / s.size]; };
        const [ax, ay] = centre(a), [bx, by] = centre(b), dx = Math.round(ax - bx), dy = Math.round(ay - by);
        const moved = new Set();
        for (const v of b) { const x = (v & 255) + dx, y = (v >> 8) + dy; if (x >= 0 && x < 256 && y >= 0 && y < 256) moved.add(y * 256 + x); }
        b = moved;
      }
      let both = 0;
      for (const v of a) if (b.has(v)) both++;
      const union = a.size + b.size - both, change = union ? (union - both) / union : 0;
      const height = s => { if (!s.size) return 0; const rows = [...s].map(v => v >> 8); return Math.max(...rows) - Math.min(...rows) + 1; };
      const ha = height(a), hb = height(b), size = Math.max(ha, hb) ? Math.abs(ha - hb) / Math.max(ha, hb) : 0;
      steps.push(Math.round(change * 1000) / 1000);
      // A body that really bends, stands or runs changes shape more. The Director marks it, and a person must look at it
      const room = layer.big_action ? 2 : 1;
      if (change > LIMITS.jumpShape * room || size > LIMITS.jumpSize * room) jumps.push({ step: `${n}-${n + 1}`, shape_change: Math.round(change * 1000) / 1000, size_change: Math.round(size * 1000) / 1000 });
    }
    result.big_jumps = jumps;
    result.shape_change_per_step = steps;
    if (jumps.length / Math.max(1, shapes.length - 1) > LIMITS.maxJumpShare) problems.push(`${jumps.length} of ${shapes.length - 1} steps jump too far. Split the action across more drawings.`);
  }
  result.status = problems.length ? 'fail' : 'pass';
  if (problems.length) result.problems = problems;
  return result;
}

export function checkVideo(path) {
  const width = 320, height = 180;
  const run = spawnSync('ffmpeg', ['-v', 'error', '-i', String(path), '-vf', `scale=${width}:${height}`, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { maxBuffer: 2 ** 31 });
  if (run.status !== 0 || !run.stdout) throw new Error('Could not read the video. Check that the film exists at that path and that FFmpeg is installed.');
  const size = width * height, count = Math.floor(run.stdout.length / size);
  if (count < 2) throw new Error('The video has too few frames.');
  const stream = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=r_frame_rate,width,height', '-of', 'json', String(path)]).toString()).streams[0];
  const [a, b] = stream.r_frame_rate.split('/').map(Number), fps = a / b;
  const diff = (i, j) => { let sum = 0; for (let p = 0; p < size; p++) sum += Math.abs(run.stdout[i * size + p] - run.stdout[j * size + p]); return sum / size; };
  const near = [], apart = [];
  for (let i = 1; i < count; i++) near.push(diff(i, i - 1));
  // Each drawing often shows for two frames, so compare frames two apart.
  for (let i = 2; i < count; i++) apart.push(diff(i, i - 2));
  const frozen = (apart.length ? apart : near).filter(v => v < LIMITS.frozenDiff).length / (apart.length || near.length);
  const biggest = near.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]).slice(0, 5).map(([v, i]) => ({ second: Math.round((i + 1) / fps * 100) / 100, change: Math.round(v * 10) / 10 }));
  const middle = [...near].sort((x, y) => x - y)[near.length >> 1];
  return { frames: count, seconds: Math.round(count / fps * 100) / 100, fps: Math.round(fps * 1000) / 1000, size: [stream.width, stream.height], frozen_share: Math.round(frozen * 1000) / 1000, median_change: Math.round(middle * 1000) / 1000, biggest_changes: biggest };
}

export async function runCheck(planPath, video, shared = null) {
  const report = { status: 'pass', layers: [], problems: [], watch_it_yourself: 'Numbers cannot judge acting or beauty. A person must watch the film at normal speed.' };
  if (planPath) {
    const plan = JSON.parse(readFileSync(planPath, 'utf8')), root = dirname(resolve(planPath)), rules = STYLES[plan.style].rules;
    report.style = plan.style;
    const browser = shared || await Browser.open();
    try {
      if (!shared) await browser.go(pathToFileURL(join(HERE, 'lib/canvas-page.html')).href, 'window.ready === true');
      let drawn = 0, total = 0;
      for (const shot of plan.shots) {
        total += shot.duration;
        let moving = false;
        for (const layer of shot.layers) {
          if (layer.kind !== 'drawings') continue;
          const result = await checkLayer(browser, root, shot, layer);
          report.layers.push(result);
          if (result.status === 'fail') report.problems.push(`${result.layer}: ${result.problems.join('; ')}`);
          if (layer.role === 'character' && result.real_drawings_per_second >= rules.min_character_rate * LIMITS.rateTolerance) moving = true;
        }
        if (moving) drawn += shot.duration;
        else if (!shot.still_reason) report.problems.push(`${shot.id}: no character animates at ${rules.min_character_rate} drawings/s, and the Director gave no still_reason`);
      }
      report.drawing_check = await checkDrawings(browser, plan, root);
      for (const l of report.drawing_check) for (const fault of l.problems) report.problems.push(`${l.shot}/${l.layer}: ${fault.text}`);
      report.seconds_with_full_character_animation = Math.round(drawn * 100) / 100;
      report.share_with_full_character_animation = total ? Math.round(drawn / total * 1000) / 1000 : 0;
    } finally {
      if (!shared) browser.close();
    }
  } else {
    report.status = 'evidence-only';
    report.problems.push('No shot plan was given, so real drawings cannot be counted. This video cannot pass by itself.');
  }
  if (video) {
    report.video = checkVideo(video);
    if (report.video.frozen_share > LIMITS.maxFrozen) report.problems.push(`${Math.round(report.video.frozen_share * 100)}% of frames are frozen. It will read as a slideshow.`);
    if (planPath && report.video.fps !== FPS) report.problems.push(`Video is ${report.video.fps} fps; expected ${FPS}.`);
  } else if (planPath) report.problems.push('No finished video was given, so frozen frames were not measured.');
  if (report.problems.length && report.status === 'pass') report.status = 'fail';
  return report;
}

function value(args, name) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  const args = process.argv.slice(2);
  const plan = args[0] && !args[0].startsWith('--') ? args[0] : null;
  try {
    if (!plan && !value(args, 'video')) throw new Error('Give a shot plan, a video, or both.');
    const report = await runCheck(plan, value(args, 'video'));
    const text = JSON.stringify(report, null, 2);
    if (value(args, 'save')) {
      mkdirSync(dirname(resolve(value(args, 'save'))), { recursive: true });
      writeFileSync(value(args, 'save'), text + '\n');
    }
    console.log(text);
    process.exitCode = report.status === 'pass' ? 0 : 1;
  } catch (error) {
    console.error('Stopped:', plainError(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
