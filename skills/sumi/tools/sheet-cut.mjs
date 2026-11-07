#!/usr/bin/env node
/* Cut an HD drawing sheet into separate frames, line them up and remove the paper.

     node sheet-cut.mjs sheets/walk.png frames/walk --cols 4 --rows 3 --cutout --align ground

   Each frame stays a separate drawing. Lining up only slides a whole frame, like an animator's peg bar;
   it never bends the drawing. */
import { plainError } from './lib/plain-error.mjs';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Browser } from './lib/browser.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOFT_BELOW = 700;     // cells narrower than this look soft at 1080p
const EMPTY_BELOW = .002;   // share of a cell with ink; below this the cell is treated as empty

export async function cut(sheetPath, outDir, { cols, rows, cutout = false, align = 'none', threshold = 34, inset = 0, count = null, gutters = false, panels = false, holes = 0, maxShift = 0 }, shared = null) {
  if (existsSync(outDir) && readdirSync(outDir).length) throw new Error(`${outDir} already has files. Choose a new folder, so approved frames are never overwritten.`);
  if (!(cols >= 1) || !(rows >= 1)) throw new Error('cols and rows must be at least 1');
  const bytes = readFileSync(sheetPath);
  const browser = shared || await Browser.open();
  try {
    if (!shared) await browser.go(pathToFileURL(join(HERE, 'lib/canvas-page.html')).href, 'window.ready === true');
    const size = await browser.run(`loadPicture('sheet', ${JSON.stringify(bytes.toString('base64'))})`);
    const cells = await browser.run(`cutSheet('sheet', ${cols}, ${rows}, ${JSON.stringify({ cutout, align, threshold, inset, count, gutters, panels, holes, maxShift })})`);
    const empty = cells.map((c, i) => (c.share < EMPTY_BELOW ? i + 1 : 0)).filter(Boolean);
    if (empty.length) throw new Error(`Cells ${empty.join(', ')} look empty. Check the grid size, or redraw this sheet.`);
    mkdirSync(outDir, { recursive: true });
    const frames = cells.map((cell, i) => {
      const file = `f${String(i + 1).padStart(4, '0')}.png`;
      writeFileSync(join(outDir, file), Buffer.from(cell.png, 'base64'));
      return { file, shift_x: cell.shiftX, shift_y: cell.shift, ink_share: Math.round(cell.share * 1e4) / 1e4 };
    });
    const { w, h } = cells[0];
    const warnings = w < SOFT_BELOW ? [`Each frame is only ${w}x${h}px and will look soft at 1080p. Use a bigger sheet or fewer cells.`] : [];
    const wild = cells.flatMap((c, i) => (c.wild ? [i + 1] : []));
    if (wild.length) warnings.push(`Drawings ${wild.join(', ')} could not be lined up, because they sit far from the others. Look at them, and redraw if needed.`);
    const report = { sheet: String(sheetPath), sheet_sha256: createHash('sha256').update(bytes).digest('hex'), sheet_size: size, grid: [cols, rows], cell_size: [w, h], cutout, align, frames, warnings };
    writeFileSync(join(outDir, 'cut.json'), JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally {
    if (!shared) browser.close();
  }
}

function value(args, name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}

async function main() {
  const args = process.argv.slice(2);
  const [sheet, out] = args;
  try {
    if (!sheet || !out || !value(args, 'cols') || !value(args, 'rows')) throw new Error('Use: sheet-cut.mjs SHEET.png OUT_FOLDER --cols 4 --rows 3 [--cutout] [--align none|ground|bottom] [--threshold 34] [--inset 0] [--count N]');
    const report = await cut(sheet, out, {
      cols: Number(value(args, 'cols')), rows: Number(value(args, 'rows')), cutout: args.includes('--cutout'), gutters: args.includes('--gutters'), panels: args.includes('--panels'), maxShift: Number(value(args, 'max-shift', 0)), holes: Number(value(args, 'holes', 0)), align: value(args, 'align', 'none'),
      threshold: Number(value(args, 'threshold', 34)), inset: Number(value(args, 'inset', 0)), count: value(args, 'count') ? Number(value(args, 'count')) : null
    });
    console.log(JSON.stringify({ cell_size: report.cell_size, grid: report.grid, frames: report.frames.length, warnings: report.warnings }, null, 2));
  } catch (error) {
    console.error('Stopped:', plainError(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
