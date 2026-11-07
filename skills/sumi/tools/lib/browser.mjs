/* Starts a browser with no window and talks to it directly. Needs Node 22+ and Chrome, Edge or Chromium. No packages. */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
];

export function findBrowser() {
  for (const name of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge']) {
    try {
      const found = execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().split('\n')[0];
      if (found) return found;
    } catch { /* not this one */ }
  }
  return PLACES.find(existsSync) || null;
}

const sleep = ms => new Promise(done => setTimeout(done, ms));

export class Browser {
  static async open({ gpu = false } = {}) {
    if (typeof WebSocket === 'undefined') throw new Error('Node 22 or newer is required.');
    const path = findBrowser();
    if (!path) throw new Error('No Chrome, Edge or Chromium found. Please install one.');
    const b = new Browser();
    b.dir = mkdtempSync(join(tmpdir(), 'sumi-browser-'));
    b.process = spawn(path, ['--headless=new', ...(gpu ? ['--ignore-gpu-blocklist', '--enable-webgl', '--enable-unsafe-swiftshader'] : ['--disable-gpu']), '--hide-scrollbars', '--remote-debugging-port=0', '--remote-allow-origins=*',
      '--allow-file-access-from-files', '--no-first-run', '--no-default-browser-check', `--user-data-dir=${b.dir}`, 'about:blank'], { stdio: 'ignore' });
    const portFile = join(b.dir, 'DevToolsActivePort');
    for (let i = 0; i < 150 && !(existsSync(portFile) && readFileSync(portFile, 'utf8').trim()); i++) await sleep(100);
    if (!existsSync(portFile)) { b.close(); throw new Error('The browser did not start. If this app runs commands in a sandbox, as Codex does, the sandbox is blocking it: ask the user to give this project Full access, then try again.'); }
    const port = readFileSync(portFile, 'utf8').split('\n')[0].trim();
    const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    b.ws = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
    await new Promise((ok, no) => { b.ws.onopen = ok; b.ws.onerror = () => no(new Error('Could not connect to the browser.')); });
    b.id = 0; b.waiting = new Map();
    b.ws.onmessage = event => {
      const reply = JSON.parse(event.data);
      const job = b.waiting.get(reply.id);
      if (!job) return;
      b.waiting.delete(reply.id);
      reply.error ? job.no(new Error(reply.error.message)) : job.ok(reply.result);
    };
    await b.call('Page.enable');
    await b.call('Runtime.enable');
    return b;
  }

  call(method, params = {}) {
    const id = ++this.id;
    return new Promise((ok, no) => {
      /* A browser that stops answering must not freeze the film without a word. */
      const timer = setTimeout(() => {
        this.waiting.delete(id);
        no(new Error('The browser stopped responding. Close other heavy apps and try this step again.'));
      }, 180000);
      timer.unref?.();
      this.waiting.set(id, { ok: value => { clearTimeout(timer); ok(value); }, no: error => { clearTimeout(timer); no(error); } });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async run(expression) {
    const result = await this.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) {
      const d = result.exceptionDetails;
      throw new Error((d.exception && d.exception.description) || d.text || 'Page error');
    }
    return result.result.value;
  }

  async go(url, ready, tries = 400) {
    const opened = await this.call('Page.navigate', { url });
    /* Some hosted browsers, like ChatGPT's, block opening files. Our page needs no other files, so load its HTML directly. */
    if ((opened.errorText || process.env.SUMI_INLINE_PAGES) && url.startsWith('file:')) {
      await this.call('Page.navigate', { url: 'about:blank' });
      const { frameTree } = await this.call('Page.getFrameTree');
      await this.call('Page.setDocumentContent', { frameId: frameTree.frame.id, html: readFileSync(fileURLToPath(url.split('?')[0]), 'utf8') });
    }
    for (let i = 0; i < tries; i++) {
      try { if (await this.run(ready)) return; } catch { /* still loading */ }
      await sleep(25);
    }
    throw new Error('The page did not load: ' + url);
  }

  async size(width, height) {
    await this.call('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
    await this.call('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  }

  async screenshot() {
    return Buffer.from((await this.call('Page.captureScreenshot', { format: 'png', fromSurface: true })).data, 'base64');
  }

  close() {
    try { this.ws && this.ws.close(); } catch { /* closing anyway */ }
    if (this.process) this.process.kill();
    const dir = this.dir;
    if (dir) setTimeout(() => { try { rmSync(dir, { recursive: true, force: true }); } catch { /* temp folder */ } }, 300).unref();
  }
}
