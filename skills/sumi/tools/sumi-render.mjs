#!/usr/bin/env node
/* Render a Beyondsumi film from shots.json, using the browser's canvas and FFmpeg.

     node sumi-render.mjs PROJECT/shots.json [--shot s01] [--scale .5] [--audio sound/mix.wav] [--out out/film.mp4]

   A layer can only show a drawing or painting and move it as a whole. There is no way to warp, morph or bend
   a picture here: motion comes from separate drawings. Parallax is layers moving at their own depth. */
import { plainError } from './lib/plain-error.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from './lib/browser.mjs';
import { FPS, frameFiles, validate, sequenceOf } from './sumi-plan.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export const smooth = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

/* Camera between keys, starting and stopping gently unless a key says linear. */
export function cameraAt(shot, t) {
  const keys = [...(shot.camera?.length ? shot.camera : [{ t: 0 }])].sort((a, b) => (a.t || 0) - (b.t || 0));
  const out = { x: keys[0].x ?? 0, y: keys[0].y ?? 0, zoom: keys[0].zoom ?? 1 };
  for (let i = 0; i + 1 < keys.length; i++) {
    const a = keys[i], b = keys[i + 1], ta = a.t || 0, tb = b.t || 0;
    if (t < ta) break;
    let u = tb <= ta ? 1 : Math.min(1, (t - ta) / (tb - ta));
    if (b.ease !== 'linear') u = smooth(u);
    for (const [name, fallback] of [['x', 0], ['y', 0], ['zoom', 1]]) {
      const start = a[name] ?? (i === 0 ? fallback : out[name]);
      const from = i === 0 ? start : keyValue(keys, i, name, fallback);
      out[name] = from + ((b[name] ?? from) - from) * u;
    }
  }
  for (const shake of shot.shake || []) {
    const age = t - shake.t, length = shake.duration ?? .3;
    if (age >= 0 && age < length) {
      const fade = 1 - age / length, step = Math.floor(t * FPS);
      out.x += Math.sin(step * 2.4) * (shake.amount ?? 8) * fade;
      out.y += Math.cos(step * 3.1) * (shake.amount ?? 8) * fade;
    }
  }
  return out;
}

function keyValue(keys, index, name, fallback) {
  for (let i = index; i >= 0; i--) if (keys[i][name] !== undefined) return keys[i][name];
  return fallback;
}

/* Which drawing shows at time t. A new drawing appears "rate" times a second. */
export function drawingIndex(layer, t, count) {
  const order = sequenceOf(layer);
  const length = order ? order.length : count;
  const raw = Math.floor(t * layer.rate + 1e-6);
  const step = layer.loop ? raw % length : Math.min(raw, length - 1);
  return order ? order[step] - 1 : step;
}

/* Words from the voice timing when present; otherwise spread across the first part of the caption. */
export function captionWords(c) {
  const clean = w => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const keys = new Set((c.key ? [].concat(c.key) : []).map(clean));
  const isKey = w => keys.has(clean(w));
  if (c.words) return c.words.map(w => ({ w: w.w, at: w.at, key: isKey(w.w) }));
  const parts = c.text.split(/\s+/).filter(Boolean), span = Math.min(.7, (c.end - c.start) * .55);
  return parts.map((w, i) => ({ w, at: c.start + span * i / parts.length, key: isKey(w) }));
}

export function captionFrame(c, t, plan, scale) {
  const speakers = plan.speakers || {};
  return { style: plan.caption_style || plan.style, words: captionWords(c), t, start: c.start, end: c.end, scale, colour: c.colour || (c.speaker && speakers[c.speaker]) || null, place: c.place || null, mood: c.mood || 'normal', size: c.size || 1 };
}

/* Captions as an .srt file, for uploading to YouTube. */
export function toSrt(plan) {
  const stamp = s => {
    const ms = Math.round(s * 1000), pad = (v, n = 2) => String(v).padStart(n, '0');
    return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
  };
  let at = 0, n = 0;
  const out = [];
  for (const shot of plan.shots) {
    for (const c of shot.captions || []) out.push(`${++n}\n${stamp(at + c.start)} --> ${stamp(at + c.end)}\n${c.text}\n`);
    at += Math.round(shot.duration * FPS) / FPS;
  }
  return out.join('\n');
}

const KEEP_PICTURES = 120;

export function timeline(plan) {
  let at = 0;
  const items = plan.shots.map(shot => {
    const count = Math.round(shot.duration * FPS);
    const item = { shot, start: at, count };
    at += count;
    return item;
  });
  return { items, total: at };
}

export async function render(plan, root, outPath, { scale = 1, audio = null, only = null } = {}) {
  const [baseW, baseH] = plan.size || [1920, 1080];
  const w = Math.round(baseW * scale / 2) * 2, h = Math.round(baseH * scale / 2) * 2;
  let { items } = timeline(plan);
  if (only) {
    items = items.filter(i => i.shot.id === only);
    if (!items.length) throw new Error(`No shot called ${only}`);
  }
  mkdirSync(dirname(outPath), { recursive: true });
  const browser = await Browser.open();
  const args = ['-v', 'error', '-y', '-f', 'image2pipe', '-c:v', 'png', '-r', String(FPS), '-i', '-'];
  if (audio) args.push('-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest');
  args.push('-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', outPath);
  const encoder = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'inherit'] });
  const finished = new Promise((ok, no) => {
    encoder.on('error', () => no(new Error('FFmpeg was not found. Please install it.')));
    encoder.on('close', code => (code ? no(new Error('FFmpeg could not encode this film.')) : ok()));
  });
  encoder.stdin.on('error', () => {});
  try {
    await browser.go(pathToFileURL(join(HERE, 'lib/canvas-page.html')).href, 'window.ready === true');
    await browser.run(`openStage(${w}, ${h}, ${JSON.stringify(plan.paper || '#f3efe6')})`);

    const loaded = new Set(), filesOf = new Map();
    const files = layer => {
      if (!filesOf.has(layer.frames)) filesOf.set(layer.frames, frameFiles(root, layer));
      return filesOf.get(layer.frames);
    };
    // Keep only recent pictures in memory, so a long film or a crowd of layers cannot run out
    const load = async path => {
      if (loaded.has(path)) loaded.delete(path);
      else await browser.run(`loadPicture(${JSON.stringify(path)}, ${JSON.stringify(readFileSync(path).toString('base64'))})`);
      loaded.add(path);
      if (loaded.size > KEEP_PICTURES) {
        const oldest = loaded.values().next().value;
        loaded.delete(oldest);
        await browser.run(`dropPicture(${JSON.stringify(oldest)})`);
      }
      return path;
    };
    const scene = async (shot, t) => {
      const camera = cameraAt(shot, t), out = [];
      for (const layer of shot.layers) {
        if (t < (layer.start ?? 0) || t >= (layer.end ?? Infinity)) continue;
        const local = t - (layer.start ?? 0);
        let path;
        if (layer.kind === 'painting') path = join(root, layer.src);
        else { const list = files(layer); path = list[drawingIndex(layer, local, list.length)]; }
        const depth = Number(layer.depth ?? 1);
        out.push({
          key: await load(path), scale: Number(layer.scale ?? 1) * scale, opacity: Number(layer.opacity ?? 1), blend: layer.blend || 'normal',
          zoom: 1 + (camera.zoom - 1) * depth, x: Number(layer.x ?? baseW / 2) * scale, y: Number(layer.y ?? baseH / 2) * scale,
          ox: camera.x * depth * scale, oy: camera.y * depth * scale
        });
      }
      return out;
    };

    let written = 0;
    for (let n = 0; n < items.length; n++) {
      const { shot, count } = items[n];
      const next = items[n + 1]?.shot;
      const here = shot.transition_in?.kind === 'drawn' ? shot.transition_in : null;
      const coming = next?.transition_in?.kind === 'drawn' ? next.transition_in : null;
      const dissolve = next?.transition_in?.kind === 'dissolve' ? (next.transition_in.duration ?? .5) : 0;
      for (let f = 0; f < count; f++) {
        const t = f / FPS, left = (count - f) / FPS;
        const frame = { layers: await scene(shot, t), captions: [], overlays: [] };
        for (const c of shot.captions || []) {
          if (c.start <= t && t < c.end) frame.captions.push(captionFrame(c, t, plan, scale));
        }
        if (dissolve && left <= dissolve) frame.incoming = { layers: await scene(next, 0), mix: smooth(1 - left / dissolve) };
        // A drawn scene change straddles the cut, so the ink covers the switch
        for (const [transition, when] of [[here, null], [coming, null]].map(([tr], i) => {
          if (!tr) return [null, 0];
          const length = files(tr).length / (tr.rate ?? 12);
          return [tr, i === 0 ? t + length / 2 : length / 2 - left];
        })) {
          if (!transition) continue;
          const list = files(transition), rate = transition.rate ?? 12, i = Math.floor(when * rate);
          if (when >= 0 && i < list.length) frame.overlays.push(await load(list[i]));
        }
        const png = Buffer.from(await browser.run(`renderFrame(${JSON.stringify(frame)})`), 'base64');
        if (!encoder.stdin.write(png)) await new Promise(ok => encoder.stdin.once('drain', ok));
        written++;
      }
    }
    encoder.stdin.end();
    await finished;
    return { out: String(outPath), frames: written, seconds: Math.round(written / FPS * 100) / 100, size: [w, h] };
  } catch (error) {
    encoder.stdin.destroy();
    encoder.kill();
    throw error;
  } finally {
    browser.close();
  }
}

function value(args, name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  try {
    if (!args[0]) throw new Error('Use: sumi-render.mjs shots.json [--shot id] [--scale .5] [--audio file] [--out file.mp4]');
    const planPath = resolve(args[0]), root = dirname(planPath), plan = JSON.parse(readFileSync(planPath, 'utf8'));
    const { errors, warnings } = validate(plan, root, 'render');
    warnings.forEach(w => console.error('Director note:', w));
    if (errors.length) { console.log(JSON.stringify({ ok: false, errors }, null, 2)); process.exitCode = 1; return; }
    const scale = Number(value(args, 'scale', 1));
    const out = value(args, 'out') ? resolve(value(args, 'out')) : join(root, 'out', scale !== 1 ? 'draft.mp4' : 'film.mp4');
    const result = await render(plan, root, out, { scale, audio: value(args, 'audio'), only: value(args, 'shot') });
    const srt = toSrt(plan);
    if (srt) {
      result.captions_file = out.replace(/\.mp4$/, '') + '.srt';
      writeFileSync(result.captions_file, srt);
    }
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Stopped:', plainError(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
