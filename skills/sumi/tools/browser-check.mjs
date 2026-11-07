#!/usr/bin/env node
/* Check that the browser the tools need can really start here, not only that it is installed. Costs nothing.

     node browser-check.mjs */
import { realpathSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Browser, findBrowser } from './lib/browser.mjs';

export async function checkBrowser() {
  if (!findBrowser()) return { ok: false, problem: 'missing', next: 'Install Chrome, Edge or Chromium, from its official site, with the user\'s permission.' };
  let b;
  try {
    b = await Browser.open({ gpu: true });
    const webgl = await b.run(`!!document.createElement('canvas').getContext('webgl2')`);
    return webgl ? { ok: true, webgl } : { ok: false, problem: 'no_webgl', next: 'The browser started, but Sumi Vector needs WebGL, so it cannot be made here. Sumi Dark and Sumi Light can still be made.' };
  } catch (error) {
    return { ok: false, problem: 'blocked', detail: error.message, next: 'The browser is installed, but this app is not letting it start. In Codex, the sandbox blocks it: ask the user to give this project Full access. In ChatGPT Work, continue with the writing, plan and images, then finish the film in Codex or Claude Code. Do not replace it with another way of drawing.' };
  } finally {
    if (b) b.close();
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const result = await checkBrowser();
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.ok ? 0 : 1);
}
