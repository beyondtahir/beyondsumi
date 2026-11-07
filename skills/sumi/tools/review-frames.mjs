#!/usr/bin/env node
/* The detail check. Numbers cannot tell you a blade is missing, so someone must look.
   Pulls one full-size frame for every moment the Director named in "must_see", and writes a checklist.

     node review-frames.mjs shots.json --video out/film.mp4          (writes out/review/)
     node review-frames.mjs shots.json --verify                      (fails until every item is ticked)

   Open each image at full size. Never judge from a thumbnail or contact sheet: that is how detail goes missing.
   Tick "- [x]" only for what you can really see in the picture. */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function moments(plan) {
  let at = 0;
  const out = [], missing = [];
  for (const shot of plan.shots) {
    const list = shot.must_see || [];
    if (!list.length) missing.push(shot.id);
    list.forEach((item, i) => {
      if (typeof item.t !== 'number' || item.t < 0 || item.t >= shot.duration) throw new Error(`${shot.id}: must_see time ${item.t} is outside the shot`);
      out.push({ shot: shot.id, time: at + item.t, file: `${shot.id}-${i + 1}.png`, see: item.see || [] });
    });
    at += shot.duration;
  }
  return { list: out, missing };
}

export function checklist(plan, list) {
  const lines = [`# Detail check: ${plan.title || 'film'}`, '', 'Open each picture at full size. Tick an item only if you can really see it. If not, send it back to the Animator and redraw.', ''];
  for (const m of list) {
    lines.push(`## ${m.shot}, ${m.time.toFixed(2)}s`, '', `![${m.shot}](${m.file})`, '');
    for (const thing of m.see) lines.push(`- [ ] ${thing}`);
    lines.push('');
  }
  const layers = new Map();
  for (const shot of plan.shots || []) for (const layer of shot.layers || []) if (layer.role === 'character' && layer.kind === 'drawings') layers.set(layer.frames, layer.name);
  if (layers.size) {
    lines.push('## Every drawing', '', 'Run drawing-check.mjs, then open each drawings-*.png at full size. Do not tick from a few samples.', '');
    for (const name of layers.values()) lines.push(`- [ ] ${name}: head whole in every drawing`, `- [ ] ${name}: both hands whole and holding what they hold`, `- [ ] ${name}: feet whole and steady, no pops`, `- [ ] ${name}: the same person throughout, with no doubled or lost details`);
    lines.push('');
  }
  return lines.join('\n');
}

/* Returns the problems still open. A checklist with nothing ticked or anything unticked has not passed. */
export function verify(text) {
  const open = [...text.matchAll(/^- \[ \] (.+)$/gm)].map(m => m[1]);
  const done = [...text.matchAll(/^- \[[xX]\] /gm)].length;
  if (!open.length && !done) return ['The checklist has no items.'];
  return open;
}

function main() {
  const args = process.argv.slice(2), planPath = resolve(args[0] || '');
  if (!args[0] || !existsSync(planPath)) { console.error('Give the path to shots.json.'); process.exit(1); }
  const value = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
  const root = dirname(planPath), out = resolve(root, value('out') || 'out/review'), file = join(out, 'CHECKLIST.md');
  if (args.includes('--verify')) {
    if (!existsSync(file)) { console.error('No checklist yet. Run this tool with --video first.'); process.exit(1); }
    const open = verify(readFileSync(file, 'utf8'));
    if (open.length) { console.error(`Detail check not passed. Still open:\n- ${open.join('\n- ')}`); process.exit(1); }
    console.log('Detail check passed.');
    return;
  }
  const plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const { list, missing } = moments(plan);
  if (missing.length) { console.error(`The Director must add "must_see" to: ${missing.join(', ')}`); process.exit(1); }
  const video = resolve(root, value('video') || 'out/film.mp4');
  if (!existsSync(video)) { console.error(`No film at ${video}.`); process.exit(1); }
  mkdirSync(out, { recursive: true });
  for (const m of list) execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', m.time.toFixed(3), '-i', video, '-frames:v', '1', join(out, m.file)]);
  writeFileSync(file, checklist(plan, list));
  console.log(JSON.stringify({ frames: list.length, checklist: file, next: 'Open every picture at full size, tick what you can really see, then run --verify.' }, null, 2));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
