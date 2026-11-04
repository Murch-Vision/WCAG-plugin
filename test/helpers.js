/** Playwright тестийн нийтлэг туслахууд */
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
export const { chromium } = require('playwright');
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BUNDLE = path.join(root, 'dist/hurteemj.js');
export const AXE = path.join(root, 'node_modules/axe-core/axe.min.js');
export const fixture = (n) => 'file://' + path.join(root, 'test/fixtures', n);

/**
 * Түр HTML файл үүсгэж file:// хаягаар нээнэ (setContent нь opaque origin тул localStorage хаалттай).
 * Буцаах: { page, ctx, errors } — errors = хуудасны JS алдаанууд.
 */
export function createPageFactory(browserRef) {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'hj-test-'));
  let n = 0;
  async function page(html, cfg = {}, { viewport = { width: 1000, height: 700 }, beforeScript, init = true } = {}) {
    const ctx = await browserRef().newContext({ viewport });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const file = path.join(tmp, `case-${++n}.html`);
    writeFileSync(file, `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Test</title></head><body>${html}</body></html>`);
    await p.goto('file://' + file);
    await p.evaluate(() => { window.HurteemjConfig = { auto: false }; }); // IIFE автоматаар эхлэхгүй
    if (beforeScript) await p.evaluate(beforeScript);
    await p.addScriptTag({ path: BUNDLE });
    if (init) {
      await p.evaluate(async (cfg) => {
        window.__hurteemj?.destroy();
        const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
        window.H = Hurteemj.init({ observe: false, widget: false, force: true, ...cfg });
        await ready;
      }, cfg);
    }
    return { p, ctx, errors };
  }
  return { page, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
}
