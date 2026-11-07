#!/usr/bin/env node
/* Lip-sync: choose which drawn mouth shows at each moment, from the real speech. Every mouth is a real drawing.

     node lip-sync.mjs take.timing.json --duration 5 --start 1.2 [--rate 12]
     node lip-sync.mjs take.wav --duration 5 --start 1.2 [--rate 12]

   Draw four mouths on the same face and in this order: 1 closed, 2 small, 3 open, 4 round.
   --duration is the shot's length, and --start is where this line begins inside the shot, in seconds.
   A timing file gives real letter timing. A recording alone gives timing from loudness, marked approximate.
   Put the result in the mouth layer as "sequence", with the same "rate". */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { plainError } from './lib/plain-error.mjs';

export const MOUTHS = { closed: 1, small: 2, open: 3, round: 4 };

/* The drawn mouth for one letter, or null when the alphabet has no rule here. */
export function mouthFor(letter) {
  const c = letter.toLowerCase();
  if ('mbpfv'.includes(c)) return MOUTHS.closed;
  if ('aei'.includes(c)) return MOUTHS.open;
  if ('ouwy'.includes(c)) return MOUTHS.round;
  return /[a-z]/.test(c) ? MOUTHS.small : null;
}

/* Letters with times become one mouth per drawing. Pauses close the mouth, and it stays closed after the line. */
export function sequenceFromAlignment(alignment, { duration, start = 0, rate = 12 }) {
  const chars = alignment.characters, from = alignment.character_start_times_seconds, to = alignment.character_end_times_seconds;
  const count = Math.ceil(duration * rate), sequence = [];
  let approximate = false, flip = false;
  for (let n = 0; n < count; n++) {
    const t = n / rate - start, i = chars.findIndex((ch, k) => from[k] <= t && t < to[k]);
    if (i < 0 || /[\s.,!?;:…"'-]/.test(chars[i])) { sequence.push(MOUTHS.closed); continue; }
    const mouth = mouthFor(chars[i]);
    if (mouth) { sequence.push(mouth); continue; }
    approximate = true; flip = !flip;
    sequence.push(flip ? MOUTHS.open : MOUTHS.small);
  }
  return { sequence, approximate };
}

/* Levels from 0 to 1, one for each drawing, become mouths. Loudness cannot tell a round mouth from an open one. */
export function sequenceFromLevels(levels, { duration, start = 0, rate = 12 }) {
  const count = Math.ceil(duration * rate), first = Math.round(start * rate), sequence = [];
  for (let n = 0; n < count; n++) {
    const level = levels[n - first] ?? 0;
    sequence.push(level < .12 ? MOUTHS.closed : level < .45 ? MOUTHS.small : MOUTHS.open);
  }
  return { sequence, approximate: true };
}

export function levelsFromAudio(file, rate) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 29 });
  const size = Math.round(8000 / rate), rms = [];
  for (let at = 0; at + size * 2 <= raw.length; at += size * 2) {
    let sum = 0;
    for (let k = 0; k < size; k++) { const v = raw.readInt16LE(at + k * 2) / 32768; sum += v * v; }
    rms.push(Math.sqrt(sum / size));
  }
  const loud = [...rms].sort((a, b) => a - b)[Math.floor(rms.length * .95)] || 1;
  return rms.map(v => Math.min(1, v / loud));
}

function main() {
  const args = process.argv.slice(2), value = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? Number(args[i + 1]) : fallback; };
  const file = args[0], duration = value('duration'), start = value('start', 0), rate = value('rate', 12);
  if (!file || file.startsWith('--') || !(duration > 0)) throw new Error('Use: lip-sync.mjs take.timing.json --duration 5 --start 1.2 [--rate 12]. A recording works too.');
  if (!existsSync(file)) throw new Error(`Cannot find ${file}. Check the name, and that this is running in the film's folder.`);
  const options = { duration, start, rate };
  const result = /\.json$/i.test(file)
    ? (data => { const timing = data.alignment || data; if (!Array.isArray(timing.characters)) throw new Error('That file has no letter timing. Use the voice tool\'s timing file, or the recording itself.'); return sequenceFromAlignment(timing, options); })(JSON.parse(readFileSync(file, 'utf8')))
    : sequenceFromLevels(levelsFromAudio(file, rate), options);
  console.log(JSON.stringify({ rate, ...result, note: result.approximate ? 'Approximate timing. Say so to the user, and check it by watching.' : 'From real letter timing.' }));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  try { main(); } catch (error) { console.error('Stopped:', plainError(error)); process.exitCode = 1; }
}
