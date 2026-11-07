#!/usr/bin/env node
/* Make one image through OpenAI, and never pay for the same image twice.

     node sheet-image.mjs prompts/walk.txt --out sheets/walk.png --ref art/hero.png
     node sheet-image.mjs prompts/hero.txt --out art/hero.png --quality high --limit 5
     node sheet-image.mjs prompts/hero.txt --record art/hero.png --model any-tool --dollars 0.03
     node sheet-image.mjs --total

   Every image is recorded in images.json beside the project's art, with what it really cost. The same prompt,
   model, size, quality and references give back the saved file at no cost. Use --force to pay for a new one.
   --limit stops before paying once the project has spent that many dollars.
   --record keeps the same ledger for an image made in ANY other tool, at its real price, or 0 if it was free.
   --prices OUTPUT,IMAGE_INPUT,TEXT_INPUT sets dollars per million tokens for other OpenAI models.
   The key comes from OPENAI_API_KEY, or from a file named with --env. It is never printed or saved here.
   Other image tools: follow references/image-savings.md in sumi-artist by hand. */
import { plainError } from './lib/plain-error.mjs';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/* Dollars per million tokens, from OpenAI's pricing page, checked November 2026. Check again before quoting. */
export const PRICES = { output: 30, imageInput: 8, textInput: 5 };
/* Big sheets at medium are the best value we measured. Pass --quality high for character sheets and close-ups. */
export const DEFAULTS = { model: 'gpt-image-2.5-sunburst', size: '3840x2160', quality: 'medium' };
const LEDGER = 'images.json';

export function cacheKey({ prompt, model, size, quality, refs = [] }) {
  const hash = createHash('sha256').update(JSON.stringify({ prompt, model, size, quality }));
  for (const ref of refs) hash.update(ref);
  return hash.digest('hex').slice(0, 24);
}

/* What one image really cost, from the usage the API reports. */
export function costOf(usage = {}, prices = PRICES) {
  const details = usage.input_tokens_details || {};
  const text = details.text_tokens ?? usage.input_tokens ?? 0, image = details.image_tokens ?? 0;
  return (((usage.output_tokens || 0) * prices.output) + text * prices.textInput + image * prices.imageInput) / 1e6;
}

export const overLimit = (spent, limit) => limit > 0 && spent >= limit;

export function ledgerTotal(ledger) {
  const paid = Object.values(ledger.images || {});
  return { images: paid.length, dollars: Math.round(paid.reduce((sum, item) => sum + (item.dollars || 0), 0) * 1000) / 1000, reused: ledger.reused || 0 };
}

function readKey(args) {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY;
  const i = args.indexOf('--env');
  if (i >= 0 && existsSync(args[i + 1])) {
    const line = readFileSync(args[i + 1], 'utf8').split('\n').find(l => l.trim().startsWith('OPENAI_API_KEY='));
    if (line) return line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '');
  }
  throw new Error('No key. Set OPENAI_API_KEY, or name a file with --env.');
}

async function request(key, { prompt, model, size, quality, refs }) {
  const headers = { Authorization: `Bearer ${key}` };
  let response;
  if (refs.length) {
    const form = new FormData();
    for (const [k, v] of Object.entries({ model, prompt, size, quality, n: '1' })) form.append(k, v);
    for (const ref of refs) form.append('image[]', new Blob([readFileSync(ref)], { type: 'image/png' }), basename(ref));
    response = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers, body: form });
  } else {
    response = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ model, prompt, size, quality, n: 1 }) });
  }
  const body = await response.json();
  if (!response.ok) throw new Error(`OpenAI said ${response.status}: ${body.error?.message || 'no detail'}`);
  return { bytes: Buffer.from(body.data[0].b64_json, 'base64'), usage: body.usage || {} };
}

async function main() {
  const args = process.argv.slice(2);
  const value = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
  const ledgerPath = resolve(value('ledger', LEDGER));
  const ledger = existsSync(ledgerPath) ? JSON.parse(readFileSync(ledgerPath, 'utf8')) : { images: {}, reused: 0 };
  if (args.includes('--total')) { console.log(JSON.stringify(ledgerTotal(ledger), null, 2)); return; }
  const promptFile = args[0], recorded = value('record');
  if (recorded || args.includes('--record')) {
    if (!promptFile || !existsSync(promptFile) || !existsSync(recorded)) throw new Error('Use: sheet-image.mjs PROMPT.txt --record FILE.png --model NAME --dollars 0.03');
    const job = { prompt: readFileSync(promptFile, 'utf8').trim(), model: value('model', 'other tool'), size: value('size', 'unknown'), quality: value('quality', 'unknown'), refs: [] };
    const dollars = Number(value('dollars', 0));
    ledger.images[cacheKey(job)] = { file: relative(dirname(ledgerPath), resolve(recorded)), model: job.model, size: job.size, quality: job.quality, refs: [], prompt_file: promptFile, usage: {}, dollars };
    mkdirSync(dirname(ledgerPath), { recursive: true }); writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n');
    console.log(JSON.stringify({ file: recorded, recorded: true, dollars, spent_so_far: ledgerTotal(ledger).dollars }));
    return;
  }
  const out = value('out');
  if (!promptFile || !existsSync(promptFile) || !out) throw new Error('Use: sheet-image.mjs PROMPT.txt --out FILE.png [--ref FILE.png] [--model M] [--size WxH] [--quality high] [--env FILE] [--force]');
  const refs = args.flatMap((a, i) => (a === '--ref' ? [args[i + 1]] : []));
  for (const ref of refs) if (!existsSync(ref)) throw new Error(`Missing reference: ${ref}`);
  const job = { prompt: readFileSync(promptFile, 'utf8').trim(), model: value('model', DEFAULTS.model), size: value('size', DEFAULTS.size), quality: value('quality', DEFAULTS.quality), refs };
  const key = cacheKey({ ...job, refs: refs.map(r => readFileSync(r)) });
  const saved = ledger.images[key], savedFile = saved && resolve(dirname(ledgerPath), saved.file);
  const save = () => { mkdirSync(dirname(ledgerPath), { recursive: true }); writeFileSync(ledgerPath, JSON.stringify(ledger, null, 1) + '\n'); };
  if (saved && existsSync(savedFile) && !args.includes('--force')) {
    if (resolve(out) !== savedFile) { mkdirSync(dirname(resolve(out)), { recursive: true }); writeFileSync(out, readFileSync(savedFile)); }
    ledger.reused = (ledger.reused || 0) + 1; save();
    console.log(JSON.stringify({ file: out, reused: true, dollars: 0, spent_so_far: ledgerTotal(ledger).dollars }));
    return;
  }
  const limit = Number(value('limit', 0));
  if (overLimit(ledgerTotal(ledger).dollars, limit)) throw new Error(`Stopped before paying: $${ledgerTotal(ledger).dollars} is already spent, and the limit is $${limit}. Ask the user first.`);
  const { bytes, usage } = await request(readKey(args), job);
  mkdirSync(dirname(resolve(out)), { recursive: true });
  writeFileSync(out, bytes);
  const custom = value('prices') ? value('prices').split(',').map(Number) : null;
  const dollars = Math.round(costOf(usage, custom ? { output: custom[0], imageInput: custom[1], textInput: custom[2] } : PRICES) * 10000) / 10000;
  ledger.images[key] = { file: relative(dirname(ledgerPath), resolve(out)), model: job.model, size: job.size, quality: job.quality, refs: refs.map(r => basename(r)), prompt_file: promptFile, usage, dollars };
  save();
  console.log(JSON.stringify({ file: out, reused: false, dollars, spent_so_far: ledgerTotal(ledger).dollars }));
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main().catch(error => { console.error('Stopped:', plainError(error)); process.exitCode = 1; });
