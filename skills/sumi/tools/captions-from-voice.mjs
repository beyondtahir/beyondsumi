#!/usr/bin/env node
/* Turn a voice take's timing file into captions that follow the real speech, word by word.

     node captions-from-voice.mjs take.timing.json --start 12.5 --key never,blade --speaker Mother --chunk 4

   --start is where this take begins inside its shot, in seconds. The result goes in the shot's "captions" list. */
import { plainError } from './lib/plain-error.mjs';
import { readFileSync, realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/* Characters with times become words with times. */
export function wordsFromAlignment(alignment) {
  if (!Array.isArray(alignment?.characters)) throw new Error('That file has no letter timing. Use the timing file from the voice tool.');
  const chars = alignment.characters, starts = alignment.character_start_times_seconds, ends = alignment.character_end_times_seconds;
  const words = [];
  let word = null;
  chars.forEach((ch, i) => {
    if (/\s/.test(ch)) { word = null; return; }
    if (!word) { word = { w: '', at: starts[i], end: ends ? ends[i] : starts[i] }; words.push(word); }
    word.w += ch;
    word.end = ends ? ends[i] : starts[i];
  });
  return words;
}

/* Short phrases: split at a pause, at the end of a sentence, or at the chunk size. */
export function chunk(words, { start = 0, size = 4, key = [], speaker = null, hold = .25 } = {}) {
  const groups = [[]];
  words.forEach((word, i) => {
    groups.at(-1).push(word);
    const next = words[i + 1];
    const ends = /[.!?…]$/.test(word.w) || (next && next.at - word.end > .3) || groups.at(-1).length >= size;
    if (ends && next) groups.push([]);
  });
  return groups.map((group, i) => {
    const after = groups[i + 1]?.[0];
    const end = after ? Math.min(after.at, group.at(-1).end + hold + .25) : group.at(-1).end + hold + .25;
    const caption = { text: group.map(w => w.w).join(' '), start: round(start + group[0].at), end: round(start + end), words: group.map(w => ({ w: w.w, at: round(start + w.at) })) };
    const marked = key.filter(k => group.some(w => w.w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '') === k.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')));
    if (marked.length) caption.key = marked;
    if (speaker) caption.speaker = speaker;
    return caption;
  });
}

const round = v => Math.round(v * 1000) / 1000;

function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
  try {
    if (!args[0]) throw new Error('Give a timing file from a voice take.');
    const data = JSON.parse(readFileSync(args[0], 'utf8'));
    const words = wordsFromAlignment(data.alignment || data);
    if (!words.length) throw new Error('No words found in that timing file.');
    console.log(JSON.stringify(chunk(words, { start: Number(value('start', 0)), size: Number(value('chunk', 4)), key: (value('key', '') || '').split(',').filter(Boolean), speaker: value('speaker', null) }), null, 2));
  } catch (error) {
    console.error('Stopped:', plainError(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
