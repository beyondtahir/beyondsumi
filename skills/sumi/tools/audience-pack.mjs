#!/usr/bin/env node
/* Prepare a finished film for the audience panel: picture strips for each shot, and only what is heard and read.

     node audience-pack.mjs shots.json --video out/film.mp4     (writes out/audience/)
     node audience-pack.mjs shots.json --verify                 (fails unless all five viewers passed)

   See sumi-checker/references/audience-panel.md */
import { createHash } from 'node:crypto';
import { plainError } from './lib/plain-error.mjs';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const VIEWERS = 5, PASS_SCORE = 7;

/* Only what an audience gets: time, and the words on screen. No purpose, no acting notes. */
export function timelineText(plan) {
  const lines = [`# ${plan.title || 'Film'}`, ''];
  let at = 0;
  plan.shots.forEach((shot, i) => {
    lines.push(`Shot ${i + 1}, ${at.toFixed(1)}s to ${(at + shot.duration).toFixed(1)}s: see shot-${String(i + 1).padStart(2, '0')}.png`);
    for (const c of shot.captions || []) lines.push(`  On screen and heard at ${(at + c.start).toFixed(1)}s: "${c.text}"`);
    at += shot.duration;
  });
  return lines.join('\n') + '\n';
}

/* Returns the reasons a verdict has not passed. */
export function checkVerdict(verdict) {
  const list = verdict?.viewers || [];
  const problems = [];
  if (list.length < VIEWERS) problems.push(`Only ${list.length} of ${VIEWERS} viewers answered.`);
  for (const v of list) {
    if (!v.story) problems.push(`${v.viewer || 'A viewer'} did not say what the story was.`);
    if (!(v.score >= PASS_SCORE) || v.pass !== true) problems.push(`${v.viewer || 'A viewer'} did not pass it: ${v.problem || 'no reason given'}`);
  }
  return problems;
}

function main() {
  const args = process.argv.slice(2), planPath = resolve(args[0] || '');
  if (!args[0] || !existsSync(planPath)) throw new Error('Use: audience-pack.mjs shots.json --video out/film.mp4, or --verify');
  const root = dirname(planPath), out = join(root, 'out/audience'), plan = JSON.parse(readFileSync(planPath, 'utf8'));
  if (args.includes('--verify')) {
    const file = join(out, 'VERDICT.json');
    if (!existsSync(file)) throw new Error('No VERDICT.json yet.');
    const problems = checkVerdict(JSON.parse(readFileSync(file, 'utf8')));
    if (problems.length) { console.error(problems.map(p => '- ' + p).join('\n')); process.exitCode = 1; return; }
    console.log('The audience panel passed.');
    return;
  }
  const i = args.indexOf('--video'), video = resolve(root, i >= 0 ? args[i + 1] : 'out/film.mp4');
  if (!existsSync(video)) throw new Error(`No film at ${video}`);
  mkdirSync(out, { recursive: true });
  let at = 0;
  plan.shots.forEach((shot, n) => {
    const count = Math.max(4, Math.min(8, Math.round(shot.duration * 2))), fps = (count / shot.duration).toFixed(3);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', at.toFixed(3), '-t', shot.duration.toFixed(3), '-i', video, '-vf', `fps=${fps},scale=480:-1,tile=4x2:padding=4`, '-frames:v', '1', '-update', '1', join(out, `shot-${String(n + 1).padStart(2, '0')}.png`)]);
    at += shot.duration;
  });
  writeFileSync(join(out, 'TIMELINE.md'), timelineText(plan));
  writeFileSync(join(out, 'film.sha256'), createHash('sha256').update(readFileSync(video)).digest('hex') + '\n');
  console.log(JSON.stringify({ shots: plan.shots.length, folder: out, next: 'Give the panel only this folder. See audience-panel.md.' }, null, 2));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) { console.error('Stopped:', plainError(error)); process.exitCode = 1; }
}
