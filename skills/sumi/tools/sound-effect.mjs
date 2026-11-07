#!/usr/bin/env node
/* Make one sound effect with ElevenLabs. PAID: each new effect costs credits, so say the cost first.

     node sound-effect.mjs "One heavy fist knock on an old wooden door" --out sound/sfx/knock.mp3 --seconds 1.2

   With no ElevenLabs, make a simple free effect with FFmpeg. It needs no key and no internet:

     node sound-effect.mjs --free wind --out sound/sfx/wind.wav --seconds 4

   The same words and length give back the saved file for free (sound/sfx/effects.json keeps the record).
   The key comes from ELEVENLABS_API_KEY, or the macOS Keychain entry made by the sumi-elevenlabs setup. Never put it in a file here. */
import { plainError } from './lib/plain-error.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Simple effects shaped from noise and tones. Free, but plainer than ElevenLabs. */
export const FREE_EFFECTS = {
  wind: d => `anoisesrc=d=${d}:c=pink:a=.5,highpass=f=150,lowpass=f=900,tremolo=f=.35:d=.7,afade=t=in:d=${d / 4},afade=t=out:st=${d * .7}:d=${d * .3}`,
  rain: d => `anoisesrc=d=${d}:c=white:a=.22,highpass=f=1200,lowpass=f=7000,afade=t=in:d=.3,afade=t=out:st=${Math.max(0, d - .5)}:d=.5`,
  water: d => `anoisesrc=d=${d}:c=brown:a=.7,highpass=f=120,lowpass=f=1100,tremolo=f=1.6:d=.55,afade=t=in:d=.4,afade=t=out:st=${Math.max(0, d - .6)}:d=.6`,
  fire: d => `anoisesrc=d=${d}:c=pink:a=.4,highpass=f=300,lowpass=f=3500,tremolo=f=9:d=.8,afade=t=in:d=.2,afade=t=out:st=${Math.max(0, d - .4)}:d=.4`,
  whoosh: d => `anoisesrc=d=${d}:c=pink:a=.8,bandpass=f=900:w=1200,afade=t=in:d=${d * .5}:curve=exp,afade=t=out:st=${d * .5}:d=${d * .5}:curve=exp`,
  thud: d => `sine=f=62:d=${d},volume=1.6,afade=t=out:d=${d}:curve=exp`,
  knock: d => `anoisesrc=d=${d}:c=brown:a=1,lowpass=f=650,afade=t=out:d=${Math.min(d, .16)}:curve=exp`,
  step: d => `anoisesrc=d=${d}:c=brown:a=.8,bandpass=f=420:w=500,afade=t=out:d=${Math.min(d, .12)}:curve=exp`
};

export function freeEffect(name, out, seconds) {
  if (!FREE_EFFECTS[name]) throw new Error('Free effects are: ' + Object.keys(FREE_EFFECTS).join(', '));
  mkdirSync(dirname(resolve(out)), { recursive: true });
  const source = ['-f', 'lavfi', '-i', FREE_EFFECTS[name](seconds).replace(/([=:])\.(\d)/g, '$10.$2')];
  /* Every effect is brought to the same peak, so none comes out too quiet to hear. */
  const measured = spawnSync('ffmpeg', ['-hide_banner', ...source, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
  const peak = Number((measured.match(/max_volume: (-?[\d.]+) dB/) || [])[1] ?? -6);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...source, '-af', `volume=${(-6 - peak).toFixed(1)}dB,apad=pad_dur=0.3,atrim=0:${seconds + .3}`, '-ar', '44100', '-ac', '2', resolve(out)]);
  return { file: out, free: true, credits: 0 };
}

export const effectKey = (text, seconds) => createHash('sha256').update(JSON.stringify({ text, seconds })).digest('hex').slice(0, 24);

function readKey() {
  if (process.env.ELEVENLABS_API_KEY) return process.env.ELEVENLABS_API_KEY.trim();
  if (process.platform === 'darwin') {
    try { return execFileSync('/usr/bin/security', ['find-generic-password', '-s', 'com.codex.personal.elevenlabs-voice', '-w'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* not saved */ }
  }
  throw new Error('No ElevenLabs key. Set ELEVENLABS_API_KEY, or run the sumi-elevenlabs setup.');
}

async function main() {
  const args = process.argv.slice(2), value = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
  if (args.includes('--free')) {
    const seconds = Number(value('seconds', 2));
    if (!value('out') || !(seconds >= .1 && seconds <= 30)) throw new Error('Use: sound-effect.mjs --free NAME --out FILE.wav [--seconds 2]');
    console.log(JSON.stringify(freeEffect(value('free'), value('out'), seconds)));
    return;
  }
  const text = args[0], out = value('out'), seconds = Number(value('seconds', 2));
  if (!text || text.startsWith('--') || !out) throw new Error('Use: sound-effect.mjs "what it sounds like" --out FILE.mp3 [--seconds 2]');
  if (!(seconds >= .5 && seconds <= 30)) throw new Error('seconds must be from 0.5 to 30');
  const file = resolve(out), recordPath = join(dirname(file), 'effects.json'), record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf8')) : {}, key = effectKey(text, seconds), saved = record[key];
  mkdirSync(dirname(file), { recursive: true });
  if (saved && existsSync(resolve(dirname(file), saved.file))) {
    if (resolve(dirname(file), saved.file) !== file) writeFileSync(file, readFileSync(resolve(dirname(file), saved.file)));
    console.log(JSON.stringify({ file: out, reused: true, credits: 0 }));
    return;
  }
  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', { method: 'POST', headers: { 'xi-api-key': readKey(), 'Content-Type': 'application/json' }, body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: .5 }) });
  if (!response.ok) throw new Error(`ElevenLabs said ${response.status}: ${(await response.text()).slice(0, 200)}`);
  writeFileSync(file, Buffer.from(await response.arrayBuffer()));
  const credits = Number(response.headers.get('character-cost') || 0);
  record[key] = { file: relative(dirname(file), file), text, seconds, credits };
  writeFileSync(recordPath, JSON.stringify(record, null, 1) + '\n');
  console.log(JSON.stringify({ file: out, reused: false, credits }));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main().catch(error => { console.error('Stopped:', plainError(error)); process.exitCode = 1; });
