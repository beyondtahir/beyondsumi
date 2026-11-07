#!/usr/bin/env node
/* Capture a Sumi Vector scene, drawing by drawing, ready for sumi-render.mjs.

     node vector-capture.mjs scene.js frames/ --all             (each layer into frames/LAYER/)
     node vector-capture.mjs scene.js frames/hero --layer hero [--first 12]
     node vector-capture.mjs scene.js frames/hero --layer hero --only 36,110
     node vector-capture.mjs scene.js --info

   Each drawing becomes fNNNN.png with transparency. Needs a browser with WebGL. */
import { plainError } from '../../sumi/tools/lib/plain-error.mjs';
import { existsSync, mkdirSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from '../../sumi/tools/lib/browser.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export async function openScene(scene) {
  const browser = await Browser.open({ gpu: true });
  await browser.size(1920, 1080);
  const query = new URLSearchParams({ capture: '1', scene: pathToFileURL(resolve(scene)).href });
  const page = pathToFileURL(join(HERE, '../engine/film.html')).href + '?' + query;
  try {
    await browser.go(page, 'window.ready === true && typeof VECTOR === "object"', 2000);
    if (!await browser.run('Object.keys(SumiVector.layers).length')) throw new Error('The scene registers no layers.');
    const errors = await browser.run('window.ERRORS');
    if (errors.length) throw new Error(errors.join('; '));
  } catch (error) {
    const seen = await browser.run('JSON.stringify(window.ERRORS || [])').catch(() => '[]');
    browser.close();
    throw new Error(`${error.message} ${seen}`);
  }
  return browser;
}

export async function captureLayer(browser, name, outDir, { first = null, only = null } = {}) {
  const info = await browser.run('VECTOR.info()'), layer = info.layers[name];
  if (!layer) throw new Error(`Choose a layer from: ${Object.keys(info.layers).join(', ')}`);
  if (existsSync(outDir) && readdirSync(outDir).length) throw new Error(`${outDir} already has files. Choose a new folder, so approved frames are never overwritten.`);
  mkdirSync(outDir, { recursive: true });
  const list = only || Array.from({ length: first || layer.drawings }, (_, i) => i);
  for (const i of list) {
    await browser.run(`VECTOR.paint(${JSON.stringify(name)}, ${i})`);
    writeFileSync(join(outDir, `f${String(i + 1).padStart(4, '0')}.png`), await browser.screenshot());
  }
  return { layer: name, drawings: list.length, out: String(outDir) };
}

async function main() {
  const args = process.argv.slice(2), [scene, out] = args;
  const value = name => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : null; };
  let browser;
  try {
    if (!scene || !existsSync(scene)) throw new Error('Give a scene file.');
    browser = await openScene(scene);
    const info = await browser.run('VECTOR.info()');
    if (args.includes('--info')) { console.log(JSON.stringify(info, null, 2)); return; }
    if (!out || out.startsWith('--')) throw new Error('Give an output folder.');
    const all = args.includes('--all'), names = all ? Object.keys(info.layers) : [value('layer')];
    if (!names[0]) throw new Error(`Use --all, or --layer with one of: ${Object.keys(info.layers).join(', ')}`);
    const opts = { first: value('first') ? Number(value('first')) : null, only: value('only') ? value('only').split(',').map(Number) : null }, results = [];
    for (const name of names) {
      const start = Date.now();
      results.push({ ...await captureLayer(browser, name, all ? join(out, name) : out, opts), seconds: (Date.now() - start) / 1000 });
    }
    console.log(JSON.stringify(results, null, 2));
  } catch (error) {
    console.error('Stopped:', plainError(error));
    process.exitCode = 1;
  } finally {
    if (browser) browser.close();
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
