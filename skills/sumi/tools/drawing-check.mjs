#!/usr/bin/env node
/* Check every single drawing of every character. Run it before showing anyone a film.

     node drawing-check.mjs shots.json [--out out/review]

   It fails when:
   - a head, hand or foot is cut off, because the drawing touches the edge of its frame or leaves the screen
   - a character pops: the body jumps or changes size from one drawing to the next
   - a Sumi Dark film has no vivid red, or no second vibrant colour, in the art itself
   It also lays out all the drawings of each layer as pictures. Open them at full size and look at the head,
   both hands and the feet, and whether it is the same person in every drawing. Numbers cannot see that.

   A layer field "may_cut": ["bottom"] allows a cut the Director chose, like a close-up with no legs.
   "travels": true allows a character to cross the frame.
   "big_action": true allows three times the change, for a body that really bends or stands up. */
import { plainError } from './lib/plain-error.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from './lib/browser.mjs';
import { frameFiles, sequenceOf } from './sumi-plan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const LIMITS = { touch: 8, popShare: .05, sizeShare: .1, screenMargin: 2 };
const NAMES = { top: 'top edge: the head or hair is cut off', bottom: 'bottom edge: the feet are cut off', left: 'left edge: a hand, sleeve or hair is cut off', right: 'right edge: a hand, sleeve or hair is cut off' };

/* facts: one per drawing, { top, bottom, left, right, cx, cy, touch: {top,...}, w, h, solid }. Pure, so it can be tested. */
export function findProblems(facts, { travels = false, mayCut = [], placed = null, stage = null, bigAction = false, allowBox = false } = {}) {
  const room = bigAction ? 3 : 1;
  const problems = [];
  const boxes = facts.flatMap((f, i) => (f.touch && f.touch.box ? [i + 1] : []));
  if (boxes.length && !allowBox) problems.push({ kind: 'box', drawings: boxes, text: `Drawing${boxes.length > 1 ? 's' : ''} ${boxes.slice(0, 6).join(', ')}: a straight-edged box is left around the drawing, so the cut-out failed` });
  const report = (side, list, reason) => {
    if (list.length && !mayCut.includes(side)) problems.push({ kind: 'cut', side, drawings: list, text: `Drawing${list.length > 1 ? 's' : ''} ${list.join(', ')}: ${reason}` });
  };
  for (const side of ['top', 'bottom', 'left', 'right']) {
    report(side, facts.flatMap((f, i) => (!f.solid && f.touch && f.touch[side] >= LIMITS.touch ? [i + 1] : [])), NAMES[side]);
    if (placed && stage) {
      const out = facts.flatMap((f, i) => {
        if (f.solid || f.empty) return [];
        const y = v => placed.y + (v - f.h / 2) * placed.scale, x = v => placed.x + (v - f.w / 2) * placed.scale, m = LIMITS.screenMargin;
        const gone = { top: y(f.top) < -m, bottom: y(f.bottom) > stage[1] + m, left: x(f.left) < -m, right: x(f.right) > stage[0] + m };
        return gone[side] ? [i + 1] : [];
      });
      if (!travels) report(side, out, `leaves the screen at the ${side}`);
    }
  }
  if (!travels) {
    for (let i = 1; i < facts.length; i++) {
      const a = facts[i - 1], b = facts[i];
      if (a.empty || b.empty || a.solid || b.solid) continue;
      const tall = Math.max(a.bottom - a.top, b.bottom - b.top, 1), moved = Math.hypot(a.cx - b.cx, a.cy - b.cy) / tall, size = Math.abs((a.bottom - a.top) - (b.bottom - b.top)) / tall;
      if (moved > LIMITS.popShare * room) problems.push({ kind: 'pop', drawings: [i, i + 1], text: `Drawings ${i} to ${i + 1}: the body jumps ${Math.round(moved * 100)}% of its height` });
      if (size > LIMITS.sizeShare * room) problems.push({ kind: 'pop', drawings: [i, i + 1], text: `Drawings ${i} to ${i + 1}: the size changes ${Math.round(size * 100)}%` });
    }
  }
  return problems;
}

export async function checkDrawings(browser, plan, root) {
  const out = [], stage = plan.size || [1920, 1080], seen = new Map();
  for (const shot of plan.shots) {
    for (const layer of shot.layers) {
      if (!['character', 'midground'].includes(layer.role) || layer.blend || layer.kind !== 'drawings') continue;
      const files = frameFiles(root, layer);
      if (!files.length) continue;
      if (!seen.has(layer.frames)) {
        const facts = [];
        for (const file of files) {
          await browser.run(`loadPicture('d', ${JSON.stringify(readFileSync(file).toString('base64'))})`);
          facts.push(await browser.run(`drawingFacts('d')`));
        }
        seen.set(layer.frames, facts);
      }
      // A sequence uses only the drawings it names, so only those can show a fault
      const all = seen.get(layer.frames), used = layer.sequence ? sequenceOf(layer).map(n => all[n - 1]).filter(Boolean) : all;
      const problems = findProblems(used, { travels: !!layer.travels, bigAction: !!layer.big_action, allowBox: !!layer.is_full_page || (layer.may_cut || []).length >= 2, mayCut: layer.may_cut || [], placed: { x: layer.x ?? stage[0] / 2, y: layer.y ?? stage[1] / 2, scale: layer.scale ?? 1 }, stage });
      out.push({ shot: shot.id, layer: layer.name, frames: layer.frames, drawings: used.length, problems });
    }
  }
  return out;
}

/* Sumi Dark must always have vivid red and one more vibrant colour in the art itself, not only in the captions. */
export function colourProblems(shots, { minimum = 12 } = {}) {
  const has = kind => shots.filter(s => s[kind] >= minimum).length, problems = [];
  if (!has('red')) problems.push('Sumi Dark needs vivid brush red in the drawings, but there is none. Captions do not count.');
  if (!has('other')) problems.push('Sumi Dark needs one more vibrant colour, such as yellow, in the drawings, but there is none.');
  return problems;
}

async function checkColour(browser, plan, root) {
  const shots = [];
  for (const shot of plan.shots) {
    const total = { red: 0, other: 0 };
    for (const layer of shot.layers) {
      const files = layer.kind === 'drawings' ? frameFiles(root, layer) : layer.src ? [join(root, layer.src)] : [];
      for (const file of [files[0], files[files.length >> 1]].filter(f => f && existsSync(f))) {
        await browser.run(`loadPicture('c', ${JSON.stringify(readFileSync(file).toString('base64'))})`);
        const facts = await browser.run(`colourFacts('c')`);
        total.red = Math.max(total.red, facts.red);
        total.other = Math.max(total.other, facts.other);
      }
    }
    shots.push({ shot: shot.id, ...total });
  }
  return shots;
}

/* All the drawings of a layer, laid out on mid grey, with the frame edge drawn in red. */
export function contactSheets(root, frames, outDir) {
  const name = basename(frames).replace(/[^\w-]/g, '_');
  mkdirSync(outDir, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-pattern_type', 'glob', '-i', join(root, frames, 'f*.png'), '-filter_complex',
    `color=c=0x777777:s=16x16,format=rgb24[g];[g][0:v]scale2ref[g2][d];[g2][d]overlay=shortest=1,scale=384:-1,drawbox=c=red:t=2,tile=5x4:padding=6`, join(outDir, `drawings-${name}-%02d.png`)]);
  return `drawings-${name}-*.png`;
}

async function main() {
  const args = process.argv.slice(2), planPath = resolve(args[0] || '');
  if (!args[0] || !existsSync(planPath)) throw new Error('Use: drawing-check.mjs shots.json [--out out/review]');
  const i = args.indexOf('--out'), root = dirname(planPath), out = resolve(root, i >= 0 ? args[i + 1] : 'out/review');
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const browser = await Browser.open();
  try {
    await browser.go(pathToFileURL(join(HERE, 'lib/canvas-page.html')).href, 'window.ready === true');
    const layers = await checkDrawings(browser, plan, root);
    const sheets = [...new Set(layers.map(l => l.frames))].map(f => contactSheets(root, f, out));
    const bad = layers.filter(l => l.problems.length);
    const colours = plan.style === 'dark' ? await checkColour(browser, plan, root) : [];
    const colourFaults = plan.style === 'dark' ? colourProblems(colours) : [];
    const report = { status: bad.length || colourFaults.length ? 'fail' : 'pass', layers, colours, colour_problems: colourFaults, look_at: sheets, reminder: 'Open every picture at full size. Check the head, both hands, the feet, and that it is the same person.' };
    mkdirSync(out, { recursive: true });
    writeFileSync(join(out, 'drawing-check.json'), JSON.stringify(report, null, 1) + '\n');
    for (const l of bad) for (const p of l.problems) console.log(`${l.shot}/${l.layer}: ${p.text}`);
    console.log(`${report.status.toUpperCase()}: ${layers.length} layers, ${bad.length} with faults. Now look at ${out}/drawings-*.png`);
    for (const fault of colourFaults) console.log(fault);
    if (bad.length || colourFaults.length) process.exitCode = 1;
  } finally {
    browser.close();
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main().catch(error => { console.error('Stopped:', plainError(error)); process.exitCode = 1; });
