#!/usr/bin/env node
/* Mix a film's sound from a plain plan. Voice first, music lowered under it, effects on the drawing that causes them.

     node sound-mix.mjs sound/mix.json            (writes sound/mix.wav)
     node sound-mix.mjs --moods                   (lists the bundled music)

   Paths are relative to the plan. A music "mood" comes from the bundled library. Needs FFmpeg. */
import { plainError } from './lib/plain-error.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BANK = join(dirname(fileURLToPath(import.meta.url)), '../assets/sound-library/bundled-bank/music');
export const MOODS = existsSync(BANK) ? readdirSync(BANK).filter(n => existsSync(join(BANK, n, 'harmony.flac'))).sort() : [];
const n3 = v => Number(v).toFixed(3);

/* Volume over time from [[seconds, level], ...], as an FFmpeg expression with straight ramps between keys */
export function volumeExpression(keys) {
  if (keys.length === 1) return String(keys[0][1]);
  let expression = String(keys[keys.length - 1][1]);
  for (let i = keys.length - 1; i > 0; i--) {
    const [a, va] = keys[i - 1], [b, vb] = keys[i];
    expression = `if(lt(t,${n3(b)}),${n3(va)}+(${n3(vb)}-(${n3(va)}))*(t-${n3(a)})/${n3(Math.max(.001, b - a))},${expression})`;
  }
  return `if(lt(t,${n3(keys[0][0])}),${n3(keys[0][1])},${expression})`;
}

/* Returns the problems in a plan. An empty list means it can be mixed */
export function checkPlan(plan, exists = existsSync, root = '.') {
  const problems = [], d = plan.duration;
  if (!(d > 0)) problems.push('duration must be above 0');
  const file = (f, label) => { if (!f || !exists(resolve(root, f))) problems.push(`${label}: missing ${f}`); };
  for (const v of plan.voices || []) { file(v.file, 'voice'); if (v.at >= d) problems.push(`voice ${v.file} starts after the film ends`); }
  for (const m of plan.music || []) {
    if (m.mood) { if (!MOODS.includes(m.mood)) problems.push(`music: no mood called ${m.mood}. Use ${MOODS.join(', ')}`); } else file(m.file, 'music');
    if (!(m.end > (m.start ?? 0))) problems.push('music: end must come after start');
  }
  for (const b of plan.beds || []) file(b.file, 'bed');
  for (const h of plan.hits || []) { file(h.file, 'effect'); if (h.at >= d) problems.push(`effect ${h.file} starts after the film ends`); }
  if (!(plan.music || []).length) problems.push('Every film has background music. Add at least one music entry.');
  if (!(plan.hits || []).length && !(plan.beds || []).length) problems.push('Every film has sound effects. Add at least one.');
  return problems;
}

function loudness(file) {
  const out = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const all = [...out.matchAll(/I:\s+(-?[\d.]+) LUFS/g)];
  return all.length ? Number(all[all.length - 1][1]) : -23;
}

export function buildMix(plan, root) {
  const D = plan.duration, inputs = [], f = [], fx = [];
  const add = (path, loop) => { if (loop) inputs.push('-stream_loop', '-1'); inputs.push('-i', path); return inputs.filter(x => x === '-i').length - 1; };
  const fmt = 'aformat=sample_rates=48000:channel_layouts=stereo';
  const place = at => { const d = Math.round(at * 1000); return `adelay=${d}|${d},apad=whole_dur=${D}`; };
  const voices = (plan.voices || []).map((v, k) => {
    const path = resolve(root, v.file), i = add(path), gain = ((v.lufs ?? -16) - loudness(path)).toFixed(1);
    // Cleaning only: remove rumble and level it. The voice itself is not changed
    f.push(`[${i}:a]${fmt},highpass=f=70,acompressor=threshold=-24dB:ratio=2:attack=10:release=140,volume=${gain}dB,${place(v.at)}[v${k}]`);
    return `[v${k}]`;
  });
  const music = (plan.music || []).map((m, k) => {
    const start = m.start ?? 0, length = m.end - start, inn = m.fade_in ?? 1, out = m.fade_out ?? 1;
    const i = add(m.mood ? join(BANK, m.mood, `${m.part || 'harmony'}.flac`) : resolve(root, m.file), true);
    f.push(`[${i}:a]atrim=0:${n3(length)},asetpts=N/SR/TB,${fmt},afade=t=in:d=${n3(inn)},afade=t=out:st=${n3(length - out)}:d=${n3(out)},volume=${m.gain ?? 5},${place(start)}[m${k}]`);
    return `[m${k}]`;
  });
  f.push(`${music.join('')}amix=inputs=${music.length}:normalize=0[score]`);
  if (voices.length) {
    f.push(`${voices.join('')}amix=inputs=${voices.length}:normalize=0,atrim=0:${D},asplit=2[voice][key]`);
    f.push('[score][key]sidechaincompress=threshold=0.04:ratio=5:attack=30:release=380[bed]');
    fx.push('[voice]', '[bed]');
  } else fx.push('[score]');
  (plan.beds || []).forEach((b, k) => {
    const i = add(resolve(root, b.file), true);
    f.push(`[${i}:a]atrim=0:${D},asetpts=N/SR/TB,${fmt},volume='${volumeExpression(b.volume || [[0, .4]])}':eval=frame[b${k}]`); fx.push(`[b${k}]`);
  });
  (plan.hits || []).forEach((h, k) => {
    const i = add(resolve(root, h.file));
    f.push(`[${i}:a]${fmt},volume=${h.gain ?? .8},${place(h.at)}[x${k}]`); fx.push(`[x${k}]`);
  });
  f.push(`${fx.join('')}amix=inputs=${fx.length}:normalize=0:duration=longest,atrim=0:${D},afade=t=out:st=${n3(D - .6)}:d=0.6,loudnorm=I=${plan.loudness ?? -15}:TP=-1.5:LRA=14,aformat=sample_rates=48000[out]`);
  return { inputs, filter: f.join(';') };
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--moods')) { console.log(MOODS.join('\n')); return; }
  if (!args[0] || !existsSync(args[0])) throw new Error('Use: sound-mix.mjs sound/mix.json');
  const planPath = resolve(args[0]), root = dirname(planPath), plan = JSON.parse(readFileSync(planPath, 'utf8'));
  const problems = checkPlan(plan, existsSync, root);
  if (problems.length) throw new Error(problems.join('; '));
  const { inputs, filter } = buildMix(plan, root), out = resolve(root, plan.out || 'mix.wav');
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, '-map', '[out]', '-c:a', 'pcm_s16le', out], { stdio: ['ignore', 'ignore', 'pipe'] });
  console.log(JSON.stringify({ file: out, loudness_lufs: loudness(out), next: 'A person must listen. Numbers cannot judge how it feels.' }, null, 2));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) { console.error('Stopped:', plainError(error)); process.exitCode = 1; }
}
