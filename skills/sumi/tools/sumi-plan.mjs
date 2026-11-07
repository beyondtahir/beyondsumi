#!/usr/bin/env node
/* Create a Beyondsumi project, enforce each style's rules and count the drawings a film needs.

     node sumi-plan.mjs new FOLDER --style dark --title "My film"
     node sumi-plan.mjs check FOLDER/shots.json [--stage render]
     node sumi-plan.mjs budget FOLDER/shots.json

   Makes no images and starts no paid work. */
import { plainError } from './lib/plain-error.mjs';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const CATALOG = JSON.parse(readFileSync(join(HERE, '../assets/catalog.json'), 'utf8'));
export const STYLES = CATALOG.styles;
export const FPS = CATALOG.output_fps;

const FORBIDDEN = new Set(['warp', 'morph', 'mesh', 'displace', 'displacement', 'interpolate', 'interpolation', 'depth_map', 'optical_flow', 'tween', 'puppet', 'rig', 'living_frame']);
const ROLES = ['background', 'midground', 'character', 'foreground', 'effect'];
const BLENDS = ['normal', 'multiply', 'screen'];
const TRANSITIONS = ['cut', 'dissolve', 'drawn'];
const CAPTION_MOODS = ['normal', 'whisper', 'shout', 'slam', 'tremble', 'drift', 'slow'];
const CAPTION_PLACES = ['bottom', 'top', 'center', 'left', 'right', 'top-left', 'top-right', 'bottom-left', 'bottom-right'];

function findForbidden(value, path = 'plan') {
  if (Array.isArray(value)) return value.flatMap((item, i) => findForbidden(item, `${path}[${i}]`));
  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([k, v]) => [...(FORBIDDEN.has(k.toLowerCase()) ? [`${path}.${k}`] : []), ...findForbidden(v, `${path}.${k}`)]);
  }
  return [];
}

function cameraMoves(shot) {
  const keys = shot.camera || [];
  if (keys.length < 2) return false;
  const value = (k, n, d) => (k[n] === undefined ? d : k[n]);
  return keys.slice(1).some(k => [['x', 0], ['y', 0], ['zoom', 1]].some(([n, d]) => value(k, n, value(keys[0], n, d)) !== value(keys[0], n, d)));
}

/* A layer's sequence is a list of drawing numbers, or a range like "73-135" */
export function sequenceOf(layer) {
  const q = layer.sequence;
  if (typeof q !== 'string') return q;
  const [a, b] = q.split('-').map(Number);
  return Array.from({ length: b - a + 1 }, (_, i) => a + i);
}

export function frameFiles(root, layer) {
  const folder = join(root, layer.frames);
  if (!existsSync(folder) || !statSync(folder).isDirectory()) return [];
  return readdirSync(folder).filter(f => f.endsWith('.png')).sort().map(f => join(folder, f));
}

/* Returns { errors, warnings }. An error stops the film; a warning goes to the Director. */
export function validate(plan, root = null, stage = 'plan') {
  const errors = findForbidden(plan).map(item => `${item}: motion comes from separate drawings. Warping, morphing and rigging are not part of Sumi.`);
  const warnings = [];
  const style = STYLES[plan.style];
  if (!style) return { errors: [...errors, `style must be one of ${Object.keys(STYLES).join(', ')}`], warnings };
  const rules = style.rules;
  if (plan.style === 'vector' && plan.size && plan.size[1] > plan.size[0]) errors.push('Sumi Vector is wide only for now. Make a vertical film in Sumi Dark or Sumi Light.');
  if ((plan.fps ?? FPS) !== FPS) errors.push(`fps must be ${FPS}; smoothness comes from drawings per second, not a higher video rate.`);
  if (!Array.isArray(plan.shots) || !plan.shots.length) return { errors: [...errors, 'At least one shot is required.'], warnings };
  if (plan.style === 'vector' && plan.art_route !== 'vector') errors.push('Sumi Vector is drawn in code: set "art_route": "vector".');
  if (plan.style !== 'vector' && plan.art_route === 'vector') errors.push(`${style.name} is made with images. Only Sumi Vector uses "art_route": "vector".`);
  const seen = new Set(), allCaptions = [];
  let still = 0, total = 0;
  plan.shots.forEach((shot, index) => {
    const sid = shot.id || `shot ${index + 1}`;
    if (seen.has(sid)) errors.push(`${sid}: duplicate shot id`);
    seen.add(sid);
    if (typeof shot.duration !== 'number' || shot.duration <= 0) { errors.push(`${sid}: duration must be a positive number of seconds`); return; }
    total += shot.duration;
    for (const field of ['purpose', 'framing', 'acting', 'camera_reason']) {
      if (!String(shot[field] ?? '').trim()) errors.push(`${sid}: the Director must fill "${field}"`);
    }
    const layers = shot.layers;
    if (!Array.isArray(layers) || !layers.length) { errors.push(`${sid}: needs at least one layer`); return; }
    const names = new Set();
    for (const layer of layers) {
      const label = `${sid}/${layer.name ?? '?'}`;
      if (names.has(layer.name)) errors.push(`${label}: duplicate layer name`);
      names.add(layer.name);
      if (!ROLES.includes(layer.role)) errors.push(`${label}: role must be one of ${ROLES.join(', ')}`);
      if (layer.kind !== 'painting' && layer.kind !== 'drawings') { errors.push(`${label}: kind must be painting or drawings`); continue; }
      if (!BLENDS.includes(layer.blend ?? 'normal')) errors.push(`${label}: blend must be one of ${BLENDS.join(', ')}`);
      if (layer.kind === 'painting') {
        if (!layer.src) errors.push(`${label}: painting needs src`);
        else if (root && stage === 'render' && !existsSync(join(root, layer.src))) errors.push(`${label}: missing ${layer.src}`);
        if (layer.role === 'character' && !shot.still_reason) errors.push(`${label}: a character needs drawn frames, or the shot needs a still_reason from the Director.`);
        if (layer.role === 'background' && rules.background === 'drawn' && !shot.still_reason) errors.push(`${label}: ${style.name} backgrounds are animated with drawn frames, not a still painting.`);
        continue;
      }
      const rate = layer.rate;
      if (typeof rate !== 'number' || rate < 1 || rate > FPS) { errors.push(`${label}: rate must be 1 to ${FPS} drawings per second`); continue; }
      if (!layer.frames) { errors.push(`${label}: drawings need a frames folder`); continue; }
      if (layer.sequence && !sequenceOf(layer).every(n => Number.isInteger(n) && n >= 1)) errors.push(`${label}: sequence counts drawings from 1.`);
      if (layer.role === 'character' && rate < rules.min_character_rate && !layer.hold_reason) errors.push(`${label}: character at ${rate} drawings/s is below ${rules.min_character_rate}. Add drawings, or give a hold_reason.`);
      if (layer.role === 'background' && rules.background === 'drawn' && rate < rules.min_background_rate) errors.push(`${label}: background at ${rate} drawings/s is below ${rules.min_background_rate}.`);
      if (root && stage === 'render') {
        const files = frameFiles(root, layer);
        if (!files.length) errors.push(`${label}: no PNG frames in ${layer.frames}`);
        else {
          const needed = Math.ceil(shot.duration * rate);
          if (!layer.loop && files.length < needed && !layer.hold_last && !layer.hold_reason) errors.push(`${label}: needs ${needed} drawings, has ${files.length}. Draw more, or set hold_last with a reason.`);
        }
      }
    }
    const depths = new Set(layers.map(l => Number(l.depth ?? 1)));
    if (rules.parallax === 'forbidden' && depths.size > 1) errors.push(`${sid}: ${style.name} has no parallax, so every layer must share one depth.`);
    if (rules.parallax === 'separate-images' && cameraMoves(shot) && depths.size < 2 && layers.length > 1) warnings.push(`${sid}: the camera moves but all layers share one depth, so it will read flat.`);
    if (!shot.still_reason && !layers.some(l => l.kind === 'drawings')) errors.push(`${sid}: nothing is drawn frame by frame. Add drawings, or a still_reason from the Director.`);
    if (shot.still_reason) still += shot.duration;
    for (const [n, c] of (shot.captions || []).entries()) {
      const label = `${sid}/caption ${n + 1}`;
      if (!String(c.text ?? '').trim()) errors.push(`${label}: needs text`);
      if (typeof c.start !== 'number' || typeof c.end !== 'number' || c.end <= c.start || c.end > shot.duration + 1e-6) errors.push(`${label}: start and end must fall inside the shot`);
      const words = String(c.text ?? '').split(/\s+/).length;
      if (words > 9) warnings.push(`${label}: ${words} words is long. Use short phrases of two to six words.`);
      const clean = w => String(w).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
      const present = String(c.text ?? '').split(/\s+/).map(clean);
      for (const k of (c.key ? [].concat(c.key) : [])) {
        if (!present.includes(clean(k))) errors.push(`${label}: key word "${k}" is not in the text`);
      }
      if (c.mood && !CAPTION_MOODS.includes(c.mood)) errors.push(`${label}: mood must be one of ${CAPTION_MOODS.join(', ')}`);
      if (typeof c.place === 'string' && !CAPTION_PLACES.includes(c.place)) errors.push(`${label}: place must be one of ${CAPTION_PLACES.join(', ')}, or {"x", "y"} from 0 to 1`);
      if (c.place && typeof c.place === 'object' && !(c.place.x >= 0 && c.place.x <= 1 && c.place.y >= 0 && c.place.y <= 1)) errors.push(`${label}: place x and y must be from 0 to 1`);
      allCaptions.push(c);
    }
    const cast = layers.filter(l => l.role === 'character' && l.frames && l.scale);
    for (const l of cast) for (const m of cast) if (l !== m && l.frames === m.frames && Math.abs(l.scale / m.scale - 1) > .02) { warnings.push(`${sid}: ${l.name} and ${m.name} use the same drawings at different sizes, so she will pop. Cut to a closer shot instead.`); break; }
    if (!String(shot.scene_logic ?? '').trim()) warnings.push(`${sid}: add "scene_logic": where things are, the light, and what is true before and after.`);
    if (!Array.isArray(shot.must_see) || !shot.must_see.length) warnings.push(`${sid}: add "must_see", what this shot must show, for the detail check.`);
    const transition = shot.transition_in ?? { kind: 'cut' };
    const kind = transition.kind ?? 'cut';
    if (!TRANSITIONS.includes(kind)) errors.push(`${sid}: transition kind must be one of ${TRANSITIONS.join(', ')}`);
    else if (index > 0 && !rules.transitions.includes(kind)) errors.push(`${sid}: ${style.name} scene changes must be ${rules.transitions.join(' or ')}, not ${kind}.`);
    if (kind === 'drawn' && !transition.frames) errors.push(`${sid}: a drawn transition needs a frames folder`);
  });
  if (allCaptions.length >= 3) {
    const looks = new Set(allCaptions.map(c => `${JSON.stringify(c.place ?? 'bottom')}|${c.mood ?? 'normal'}`));
    if (looks.size === 1) warnings.push('Every caption has the same place and mood. Direct them from the story: where each one sits, and how it behaves.');
    if (!allCaptions.some(c => c.key)) warnings.push('No caption has a key word. Choose the word that carries each dramatic moment.');
  }
  const spoken = plan.shots.some(s => (s.captions || []).some(c => c.speaker));
  const lipSync = plan.dialogue?.lip_sync;
  if (spoken && !lipSync) warnings.push('Captions have speakers, so decide lip-sync: set "dialogue": {"speech_mode": "...", "lip_sync": "on", "off" or "not_applicable"}.');
  if (lipSync === 'on' && !plan.shots.some(s => (s.layers || []).some(l => l.lip_sync))) warnings.push('Lip-sync is on, but no layer has "lip_sync": true. See the lip-sync guide.');
  if (total && still / total > .2) warnings.push(`Still shots are ${Math.round(still / total * 100)}% of the film. Above 20% it starts to read as a slideshow.`);
  return { errors, warnings };
}

/* Count what must be drawn. Each frames folder is drawn once, so reused cycles cost nothing extra. */
/* Default dollars per sheet, measured November 2026 on GPT Image 2.5 at 4K. For another model, measure one image and pass --price and --price-high. */
export const SHEET_PRICE = { medium: .04, high: .11 };

const style_or_art = (style, art) => (style === 'vector' || art === 'vector' ? 'vector' : 'images');

export function budget(plan, cells = CATALOG.cells_per_sheet, price = SHEET_PRICE) {
  const drawings = new Map(), paintings = new Set();
  let seconds = 0, keys = 0;
  const need = (key, n) => drawings.set(key, Math.max(drawings.get(key) || 0, n));
  for (const shot of plan.shots) {
    seconds += shot.duration;
    for (const layer of shot.layers) {
      if (layer.kind === 'painting') { paintings.add(layer.src); continue; }
      need(layer.frames, layer.loop && layer.cycle ? layer.cycle : Math.ceil(shot.duration * layer.rate));
      if (layer.role === 'character') keys++;
    }
    const t = shot.transition_in || {};
    if (t.kind === 'drawn') need(t.frames, t.count || 12);
  }
  const total = [...drawings.values()].reduce((a, b) => a + b, 0);
  const sheets = [...drawings.values()].reduce((a, n) => a + Math.ceil(n / cells), 0);
  const characters = (plan.characters || []).length;
  const code = plan.art_route === 'vector';
  return {
    art_route: plan.art_route || 'images', seconds: Math.round(seconds * 100) / 100, drawings: total, frame_folders: drawings.size,
    sheets: code ? 0 : sheets, cells_per_sheet: cells, paintings: paintings.size, character_sheets: characters, key_pose_sheets: keys,
    images_if_sheets: code ? 0 : sheets + paintings.size + characters + keys,
    images_if_one_by_one: code ? 0 : total + paintings.size + characters + keys,
    dollars_if_sheets: code ? 0 : Math.round(((sheets + keys) * price.medium + (paintings.size + characters) * price.high) * 100) / 100,
    per_folder: Object.fromEntries(drawings)
  };
}

const HERE_TOOLS = dirname(fileURLToPath(import.meta.url));

export function newProject(folder, style, title, artRoute, shape = 'wide') {
  if (!['wide', 'vertical'].includes(shape)) throw new Error('shape must be wide or vertical');
  if (shape === 'vertical' && style === 'vector') throw new Error('Sumi Vector is wide only for now. Choose wide, or make a vertical film in Sumi Dark or Sumi Light.');
  if (existsSync(folder) && readdirSync(folder).length) throw new Error('That folder already has files in it; choose a new or empty one.');
  if (!STYLES[style]) throw new Error(`style must be one of ${Object.keys(STYLES).join(', ')}`);
  for (const part of ['art', 'sheets', 'frames', 'sound', 'out']) mkdirSync(join(folder, part), { recursive: true });
  const plan = { title, style, art_route: artRoute || 'images', fps: FPS, size: shape === 'vertical' ? [1080, 1920] : [1920, 1080], paper: STYLES[style].paper, characters: [], shots: [] };
  writeFileSync(join(folder, 'shots.json'), JSON.stringify(plan, null, 2) + '\n');
  writeFileSync(join(folder, 'script.md'), `# ${title}\n\nThe Writer saves the approved script here.\n`);
  writeFileSync(join(folder, 'STUDIO.md'), `# ${title}

Style: ${STYLES[style].name}. Art route: ${plan.art_route}. Output: ${FPS} fps.

Each role saves its work here, so any assistant can continue from these files.
Guide the user through every step, as the film guide says: \`references/film-guide.md\` in the sumi skill.

Run commands in this folder. Where a guide says \`../sumi/tools\`, use: \`${HERE_TOOLS}\`
Where the sumi skill's guides say \`tools\`, use the same folder. Where they say \`scripts\`, use: \`${join(HERE_TOOLS, '../scripts')}\`
Where the Sumi Vector guide says \`tools\`, use: \`${join(HERE_TOOLS, '../../sumi-vector/tools')}\`
If these paths are missing, because the film moved or the skill was updated, use the installed skill's own folders.

| Step | Role | Saves | You approved |
|---|---|---|---|
| 1 | Writer | \`script.md\` | |
| 2 | Director | \`shots.json\` | |
| 2b | Voice, if the film has speech | \`sound/\` | |
| 3 | Artist | \`art/\` and \`sheets/\`, or \`scenes/\` for Sumi Vector | |
| 4 | Animator | \`frames/\` and \`out/\` | |
| 5 | Sound | \`sound/\` | |
| 6 | Checker | \`out/motion-check.json\` | |
`);
}

function option(args, name, fallback) {
  const i = args.indexOf('--' + name);
  return i >= 0 ? args[i + 1] : fallback;
}

function main() {
  const [action, target, ...rest] = process.argv.slice(2);
  const usage = 'Use: new FOLDER --style dark --title "My film" [--shape wide|vertical] [--art vector], check shots.json [--stage render], budget shots.json';
  try {
    if (action === 'new') {
      if (!target) throw new Error(usage);
      const unknown = rest.filter(a => a.startsWith('--') && !['--style', '--title', '--art', '--shape'].includes(a));
      if (unknown.length) throw new Error(`I do not know ${unknown.join(', ')}. ${usage}`);
      newProject(target, option(rest, 'style'), option(rest, 'title', 'Untitled'), style_or_art(option(rest, 'style'), option(rest, 'art')), option(rest, 'shape', 'wide'));
      console.log('Created', target);
    } else if (action === 'check' || action === 'budget') {
      const plan = JSON.parse(readFileSync(target, 'utf8'));
      const result = validate(plan, resolve(dirname(target)), action === 'check' ? option(rest, 'stage', 'plan') : 'plan');
      if (action === 'check' || result.errors.length) {
        console.log(JSON.stringify({ ok: !result.errors.length, ...result }, null, 2));
        process.exitCode = result.errors.length ? 1 : 0;
      } else console.log(JSON.stringify(budget(plan, Number(option(rest, 'cells', CATALOG.cells_per_sheet)), { medium: Number(option(rest, 'price', SHEET_PRICE.medium)), high: Number(option(rest, 'price-high', SHEET_PRICE.high)) }), null, 2));
    } else throw new Error(usage);
  } catch (error) {
    console.error('Stopped:', plainError(error));
    process.exitCode = 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main();
