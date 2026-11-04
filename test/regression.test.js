/** Хяналтын (review) явцад олдсон алдаануудын regression тестүүд */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = path.join(root, 'dist/hurteemj.js');
const tmp = mkdtempSync(path.join(os.tmpdir(), 'hj-regression-'));
let browser;
let n = 0;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); rmSync(tmp, { recursive: true, force: true }); });

/** Хуудсыг file:// хаягаар нээнэ: setContent нь opaque origin (localStorage хаалттай) бөгөөд inline script-ийг давхар ажиллуулдаг */
async function page(html, cfg = {}) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 700 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  const file = path.join(tmp, `case-${++n}.html`);
  writeFileSync(file, `<!doctype html><html lang="mn"><head><meta charset="utf-8"><title>Regression</title></head><body>${html}</body></html>`);
  await p.goto('file://' + file);
  await p.evaluate(() => { window.HurteemjConfig = { auto: false }; }); // IIFE автоматаар эхлэхгүй — зөвхөн тестийн init
  await p.addScriptTag({ path: BUNDLE });
  await p.evaluate(async (cfg) => {
    window.__hurteemj?.destroy();
    const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, widget: false, force: true, ...cfg });
    await ready;
  }, cfg);
  return { p, ctx, errors };
}

test('Хэсэгчилсэн аудит ижил олдворыг давхардуулахгүй (mergeFindings)', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><div id="box"><img id="i1" src="x.png" width="10" height="10"></div></main>', { fix: false });
  const before = await p.evaluate(() => H.report.findings.filter((f) => f.ruleId === 'image-alt').length);
  assert.equal(before, 1);
  // Ижил элементийг агуулсан хэсгийг 3 удаа дахин шалгана
  for (let i = 0; i < 3; i++) await p.evaluate(() => H.audit({ scope: document.getElementById('box') }));
  const after = await p.evaluate(() => H.report.findings.filter((f) => f.ruleId === 'image-alt').length);
  assert.equal(after, 1);
  // Элемент устсан бол олдвор нь тайлангаас арилна
  await p.evaluate(async () => { document.getElementById('i1').remove(); await H.audit({ scope: document.getElementById('box') }); });
  assert.equal(await p.evaluate(() => H.report.findings.filter((f) => f.ruleId === 'image-alt').length), 0);
  await ctx.close();
});

test('Статик мэдэгдэл = review, динамик = fail + role=status; динамик засвар давхардахгүй', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><div class="alert">Энэ хуудас туршилтын горимд байна</div></main>', { fix: 'safe', observe: true });
  const stat = await p.evaluate(() => H.report.findings.filter((f) => f.ruleId === 'status-messages').map((f) => f.outcome));
  assert.deepEqual(stat, ['review']);
  assert.equal(await p.evaluate(() => document.querySelector('.alert').getAttribute('role')), null, 'статик контентод role нэмэх ёсгүй');
  await p.evaluate(() => { const d = document.createElement('div'); d.className = 'toast'; d.id = 'dyn'; d.textContent = 'Хадгалагдлаа'; document.querySelector('main').appendChild(d); });
  await p.waitForFunction(() => document.getElementById('dyn')?.getAttribute('role') === 'status', null, { timeout: 5000 });
  const n = await p.evaluate(() => H.report.findings.filter((f) => f.ruleId === 'status-messages' && f.selector === '#dyn').length);
  assert.equal(n, 1);
  await ctx.close();
});

test('Paste probe: утгатай/фокустай талбарыг хөндөхгүй; засвар idempotent; жинхэнэ paste нээлттэй', async () => {
  const html = `<form><label for="pw">Нууц үг</label><input id="pw" type="password" autocomplete="current-password">
    <label for="pw2">Нууц үг 2</label><input id="pw2" type="password" autocomplete="current-password" value="secret"></form>
    <script>
      window.pasteCalls = 0;
      for (const id of ['pw', 'pw2']) document.getElementById(id).addEventListener('paste', (e) => { window.pasteCalls++; e.preventDefault(); e.target.value = ''; });
    </script>`;
  const { p, ctx } = await page(html, { fix: 'heuristic' });
  const r1 = await p.evaluate(() => ({
    found: H.report.findings.filter((f) => f.ruleId === 'accessible-auth-paste').map((f) => [f.selector, f.fixed]),
    pw2: document.getElementById('pw2').value,
    listeners: H.changes().filter((c) => c.type === 'listener').length,
  }));
  assert.deepEqual(r1.found, [['#pw', true]], 'зөвхөн хоосон талбарт probe хийнэ');
  assert.equal(r1.pw2, 'secret', 'утгатай талбар өөрчлөгдөх ёсгүй');
  assert.equal(r1.listeners, 1);
  // Дахин аудит хийхэд давхар listener нэмэхгүй, давхар fail гаргахгүй
  await p.evaluate(() => H.audit());
  const r2 = await p.evaluate(() => ({ listeners: H.changes().filter((c) => c.type === 'listener').length, fails: H.report.findings.filter((f) => f.ruleId === 'accessible-auth-paste' && !f.fixed).length }));
  assert.equal(r2.listeners, 1);
  assert.equal(r2.fails, 0);
  // Хэрэглэгчийн жинхэнэ paste сайтын хориг handler-т хүрэхгүй
  const real = await p.evaluate(() => { window.pasteCalls = 0; const el = document.getElementById('pw'); const ev = new Event('paste', { bubbles: true, cancelable: true }); el.dispatchEvent(ev); return { calls: window.pasteCalls, prevented: ev.defaultPrevented }; });
  assert.deepEqual(real, { calls: 0, prevented: false });
  // Revert хийсний дараа сайтын handler дахин ажиллана
  await p.evaluate(() => H.revert('accessible-auth-paste'));
  const reverted = await p.evaluate(() => { const el = document.getElementById('pw'); const ev = new Event('paste', { bubbles: true, cancelable: true }); el.dispatchEvent(ev); return { prevented: ev.defaultPrevented, mark: el.getAttribute('data-hj-fixed') }; });
  assert.deepEqual(reverted, { prevented: true, mark: null });
  await ctx.close();
});

test('Самбар хаахад фокус нээхээс өмнөх элемент рүү буцна; байхгүй бол launcher руу', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><button id="mine" data-hurteemj-open>Хүртээмж</button><a href="#" id="lnk">Холбоос</a></main>', { fix: false, widget: true });
  const launcherFocused = () => p.evaluate(() => document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot.activeElement?.className === 'launcher');
  // 1) Хуудасны өөрийн товчоор (launcher харагдаж байсан ч) → тэр товч руу
  await p.click('#mine');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'mine');
  // 2) Товчлолоор, фокус холбоос дээр байхад → холбоос руу
  await p.focus('#lnk');
  await p.keyboard.press('Alt+Shift+A');
  await p.keyboard.press('Escape');
  assert.equal(await p.evaluate(() => document.activeElement.id), 'lnk');
  // 3) Товчлолоор, фокус body дээр байхад → launcher руу
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('Alt+Shift+A');
  await p.keyboard.press('Escape');
  assert.equal(await launcherFocused(), true);
  await ctx.close();
});

test('Гэмтсэн localStorage утга plugin-ийг унагахгүй, анхдагч руу буцна', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><p>Текст</p></main>', { fix: false });
  await p.evaluate(() => localStorage.setItem('hurteemj:prefs', JSON.stringify({ fontScale: 'abc', contrast: 'neon', textSpacing: 'yes', __proto__: { polluted: true }, evil: 1 })));
  await p.reload();
  await p.addScriptTag({ path: BUNDLE });
  await p.waitForFunction(() => window.__hurteemj);
  const prefs = await p.evaluate(() => __hurteemj.prefs.get());
  assert.equal(prefs.fontScale, 1);
  assert.equal(prefs.contrast, 'default');
  assert.equal(prefs.textSpacing, false);
  assert.ok(!('evil' in prefs) && !('polluted' in prefs));
  await p.evaluate(() => __hurteemj.prefs.set({ fontScale: 99 }));
  assert.equal(await p.evaluate(() => __hurteemj.prefs.get().fontScale), 2);
  await ctx.close();
});

test('Буруу тохиргоо анхдагч руу буцаж, warnings-д бүртгэгдэнэ; toJSON data-д DOM node байхгүй', async () => {
  const { p, ctx, errors } = await page('<main><h1>T</h1><div aria-hidden="true"><a href="#">x</a></div></main>', { fix: false, level: 'ultra', position: 'middle', reportSampleRate: '5', fix: 'maybe' });
  const r = await p.evaluate(() => ({ level: H.config.level, pos: H.config.position, rate: H.config.reportSampleRate, fix: H.config.fix, warnings: H.config.warnings.length, json: JSON.stringify(H.toJSON()) }));
  assert.equal(r.level, 'AA');
  assert.equal(r.pos, 'bottom-right');
  assert.equal(r.rate, 1);
  assert.equal(r.fix, 'safe');
  assert.equal(r.warnings, 3);
  const json = JSON.parse(r.json);
  const ah = json.findings.find((f) => f.ruleId === 'aria-hidden-focus');
  assert.ok(ah && !('container' in (ah.data || {})), 'data.container (DOM node) серийлэгдэх ёсгүй');
  assert.equal(ah.data.count, 1);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('destroy() бүх hook-ийг цэвэрлэнэ (history, observer, widget)', async () => {
  const { p, ctx } = await page('<main><h1>T</h1></main>', { fix: 'safe', widget: true, observe: true });
  const r = await p.evaluate(() => {
    const before = { push: history.pushState, widget: !!document.querySelector('[data-hurteemj-ui="widget"]') };
    __hurteemj.destroy();
    return { patched: before.push !== history.pushState, widgetBefore: before.widget, widgetAfter: !!document.querySelector('[data-hurteemj-ui="widget"]'), styles: document.querySelectorAll('style[data-hurteemj-ui]').length, api: !!window.__hurteemj };
  });
  assert.deepEqual(r, { patched: true, widgetBefore: true, widgetAfter: false, styles: 0, api: false });
  await ctx.close();
});
