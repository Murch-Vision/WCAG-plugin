import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fx = (n) => 'file://' + path.join(root, 'test/fixtures', n);
const BUNDLE = path.join(root, 'dist/hurteemj.js');
const AXE = path.join(root, 'node_modules/axe-core/axe.min.js');
let browser;
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); });

async function load(name, cfg = {}, { viewport } = {}) {
  const ctx = await browser.newContext({ viewport: viewport || { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(fx(name));
  await page.addScriptTag({ path: BUNDLE });
  await page.evaluate(async (cfg) => {
    window.__hurteemj?.destroy();
    const p = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, force: true, ...cfg });
    await p;
  }, cfg);
  return { page, ctx, errors };
}
const summary = (page) => page.evaluate(() => ({
  fails: H.report.findings.filter((f) => f.outcome === 'fail').map((f) => f.ruleId),
  fixed: H.report.findings.filter((f) => f.fixed).map((f) => f.ruleId),
  reviews: H.report.findings.filter((f) => f.outcome === 'review').map((f) => f.ruleId),
  errors: H.report.errors,
}));

test('Цэвэр хуудас: худал эерэг зөрчилгүй', async () => {
  const { page, ctx, errors } = await load('clean.html', { fix: false });
  const s = await summary(page);
  assert.deepEqual(s.fails, []);
  assert.deepEqual(s.errors, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Зөрчлийн хуудас: WCAG 2.2-ын гол зөрчлүүдийг илрүүлнэ', async () => {
  const { page, ctx } = await load('violations.html', { fix: false, deep: true });
  const s = await summary(page);
  const expected = ['meta-viewport', 'image-alt', 'image-alt-quality', 'label', 'accessible-auth-paste', 'accessible-auth-autocomplete',
    'click-without-keyboard', 'button-name', 'link-name', 'aria-valid-role', 'aria-valid-attr', 'aria-required-attr', 'html-lang',
    'lang-valid', 'document-title', 'empty-heading', 'list-structure', 'text-spacing-important', 'text-spacing-clip', 'media-autoplay',
    'marquee-blink', 'color-contrast', 'link-in-text-block', 'non-text-contrast', 'autocomplete-valid', 'error-identification',
    'select-auto-navigation', 'focus-visible', 'focus-not-obscured', 'target-size', 'tabindex-positive', 'scrollable-region-focusable',
    'label-in-name', 'aria-hidden-focus', 'iframe-title', 'nested-interactive', 'dialog-name', 'required-indicator'];
  for (const id of expected) assert.ok(s.fails.includes(id), `илрүүлээгүй: ${id}`);
  // Хуудас ачаалахад аль хэдийн байсан .toast нь динамик status message биш тул зөвхөн review
  for (const id of ['video-captions', 'heading-order', 'link-purpose', 'table-headers', 'status-messages']) assert.ok(s.reviews.includes(id), `review алга: ${id}`);
  assert.ok(!s.fails.includes('status-messages'), 'статик мэдэгдлийг fail гэж үзэх ёсгүй');
  assert.deepEqual(s.errors, []);
  // WCAG 2.2-ын шинэ SC-үүд тайланд тусгагдсан
  const sc = await page.evaluate(() => H.report.criteria.filter((c) => c.new22).map((c) => `${c.id}:${c.status}`));
  assert.ok(sc.includes('2.4.11:fail') && sc.includes('2.5.8:fail') && sc.includes('3.3.8:fail'), sc.join());
  await ctx.close();
});

test('Safe засвар зөвхөн эрсдэлгүй засварыг хийнэ, heuristic илүү ихийг', async () => {
  const a = await load('violations.html', { fix: 'safe', lang: 'mn' });
  const sa = await summary(a.page);
  for (const id of ['meta-viewport', 'html-lang', 'bypass', 'focus-visible', 'focus-not-obscured', 'link-in-text-block', 'required-indicator']) assert.ok(sa.fixed.includes(id), `safe: ${id}`);
  for (const id of ['color-contrast', 'button-name', 'target-size', 'click-without-keyboard']) assert.ok(!sa.fixed.includes(id), `safe горимд хийх ёсгүй: ${id}`);
  const lang = await a.page.evaluate(() => document.documentElement.lang);
  assert.equal(lang, 'mn');
  await a.ctx.close();

  const b = await load('violations.html', { fix: 'heuristic', lang: 'mn' });
  const sb = await summary(b.page);
  assert.ok(sb.fixed.length > sa.fixed.length);
  const res = await b.page.evaluate(() => ({
    btn: document.getElementById('btn-empty').getAttribute('aria-label'),
    color: getComputedStyle(document.getElementById('low-contrast')).color,
    div: [document.getElementById('div-click').getAttribute('role'), document.getElementById('div-click').tabIndex],
  }));
  assert.equal(res.btn, 'Хайх');
  assert.deepEqual(res.div, ['button', 0]);
  // Засварын дараа бие даасан аудит contrast зөрчил олохгүй
  const after = await b.page.evaluate(() => Hurteemj.auditPage().findings.filter((f) => f.outcome === 'fail').map((f) => f.ruleId));
  for (const id of ['color-contrast', 'button-name', 'meta-viewport', 'html-lang', 'focus-visible', 'empty-heading', 'target-size']) assert.ok(!after.includes(id), `засварын дараа үлдсэн: ${id}`);
  // div дээр Enter дарахад click ажиллана
  const clicked = await b.page.evaluate(() => { let n = 0; const d = document.getElementById('div-click'); d.onclick = () => n++; d.focus(); d.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); return n; });
  assert.equal(clicked, 1);
  await b.ctx.close();
});

test('revert() бүх засварыг буцааж DOM-ыг анхны байдалд оруулна', async () => {
  const { page, ctx } = await load('violations.html', { fix: false, widget: false });
  // Атрибутын дарааллаас үл хамаарах каноник хэлбэр
  const canon = () => page.evaluate(() => {
    // style атрибутыг CSSOM-оор нормчилно ("20px !important" ↔ "20px !important;" ижил утгатай)
    const attr = (n, a) => (a.name === 'style' ? n.style.cssText : a.value);
    const walk = (n) => n.nodeType === 3 ? n.textContent : n.nodeType !== 1 || n.hasAttribute('data-hurteemj-ui') ? '' :
      `<${n.localName}${[...n.attributes].map((a) => ` ${a.name}="${attr(n, a)}"`).sort().join('')}>${[...n.childNodes].map(walk).join('')}</${n.localName}>`;
    return walk(document.body);
  });
  const before = await canon();
  await page.evaluate(() => H.fix({ tier: 'heuristic' }));
  assert.notEqual(before, await canon());
  await page.evaluate(() => H.revert());
  assert.equal(await canon(), before);
  await ctx.close();
});

test('Ignore selector болон rule тохиргоо', async () => {
  const { page, ctx } = await load('violations.html', { fix: false, ignore: ['#form-x', 'form'], rules: { 'color-contrast': false, 'target-size': { impact: 'minor' } } });
  const s = await page.evaluate(() => H.report.findings.map((f) => [f.ruleId, f.selector, f.impact]));
  assert.ok(!s.some(([r]) => r === 'color-contrast'));
  assert.ok(!s.some(([, sel]) => /^#(in-|pw|ghost|sel-nav)/.test(sel || '')));
  assert.ok(s.filter(([r]) => r === 'target-size').every(([, , i]) => i === 'minor'));
  await ctx.close();
});

test('Самбар: гарын удирдлага, ARIA төлөв, Esc, фокус буцах', async () => {
  const { page, ctx } = await load('clean.html', { fix: false });
  await page.keyboard.press('Alt+Shift+A');
  const st = await page.evaluate(() => {
    const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
    return { expanded: sr.querySelector('.launcher').getAttribute('aria-expanded'), hidden: sr.querySelector('#hj-panel').hidden, focus: sr.activeElement?.id };
  });
  assert.deepEqual(st, { expanded: 'true', hidden: false, focus: 'hj-title' });
  // Tab-аар switch хүрч Space дарахад aria-checked өөрчлөгдөнө
  const toggled = await page.evaluate(() => {
    const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
    sr.querySelector('[data-pref="textSpacing"]').focus();
    return sr.activeElement.dataset.pref;
  });
  assert.equal(toggled, 'textSpacing');
  await page.keyboard.press('Space');
  const after = await page.evaluate(() => {
    const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
    return { checked: sr.querySelector('[data-pref="textSpacing"]').getAttribute('aria-checked'), focus: sr.activeElement?.dataset.pref, lh: getComputedStyle(document.querySelector('main p')).lineHeight, fs: parseFloat(getComputedStyle(document.querySelector('main p')).fontSize), stored: JSON.parse(localStorage.getItem('hurteemj:prefs')).textSpacing };
  });
  assert.equal(after.checked, 'true');
  assert.equal(after.focus, 'textSpacing', 'фокус хадгалагдана');
  assert.equal(parseFloat(after.lh), after.fs * 1.5);
  assert.equal(after.stored, true);
  await page.keyboard.press('Escape');
  const closed = await page.evaluate(() => {
    const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
    return { hidden: sr.querySelector('#hj-panel').hidden, focus: sr.activeElement?.className };
  });
  assert.deepEqual(closed, { hidden: true, focus: 'launcher' });
  // Дахин ачаалахад тохиргоо хадгалагдсан
  await page.reload();
  await page.addScriptTag({ path: BUNDLE });
  await page.waitForFunction(() => window.__hurteemj);
  await page.waitForTimeout(100);
  const lh = await page.evaluate(() => { const p = document.querySelector('main p'); return parseFloat(getComputedStyle(p).lineHeight) / parseFloat(getComputedStyle(p).fontSize); });
  assert.equal(lh, 1.5);
  await ctx.close();
});

test('Самбар нээлттэй үед axe-core зөрчилгүй (WCAG 2.2 AA), монгол ба англи', async () => {
  for (const uiLang of ['mn', 'en']) {
    const { page, ctx } = await load('clean.html', { fix: false, auditor: true, uiLang, statementUrl: '/a11y', feedbackUrl: 'mailto:a@b.mn' });
    await page.evaluate(() => H.open());
    await page.addScriptTag({ path: AXE });
    const v = await page.evaluate(async () => {
      const r = await axe.run(document.querySelector('[data-hurteemj-ui="widget"]'), { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
      return r.violations.map((x) => `${x.id}: ${x.nodes.map((n) => n.target.join('>')).join(', ')}`);
    });
    assert.deepEqual(v, [], uiLang);
    // Самбарын дотоод аудит: өөрийнхөө shadow DOM-д мөн адил
    const own = await page.evaluate(() => {
      const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
      const small = [...sr.querySelectorAll('button, select, input, a')].filter((el) => { const r = el.getBoundingClientRect(); return r.width && (r.height < 24 || r.width < 24); }).map((e) => e.outerHTML.slice(0, 80));
      return small;
    });
    assert.deepEqual(own, [], 'самбарын товч 24px-ээс бага');
    await ctx.close();
  }
});

test('Самбар 320px дэлгэцэнд хэвтээ гүйлгэлтгүй (1.4.10)', async () => {
  const { page, ctx } = await load('clean.html', { fix: false, auditor: true }, { viewport: { width: 320, height: 640 } });
  await page.evaluate(() => H.open());
  const r = await page.evaluate(() => {
    const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
    const p = sr.querySelector('#hj-panel').getBoundingClientRect();
    const body = sr.querySelector('.body');
    return { left: p.left, right: p.right, overflow: body.scrollWidth - body.clientWidth, doc: document.documentElement.scrollWidth };
  });
  assert.ok(r.left >= 0 && r.right <= 320, JSON.stringify(r));
  assert.ok(r.overflow <= 1, JSON.stringify(r));
  assert.ok(r.doc <= 320, JSON.stringify(r));
  await ctx.close();
});

test('Текст томруулах, бэлэн профайл, reset', async () => {
  const { page, ctx } = await load('clean.html', { fix: false });
  const fs0 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize));
  await page.evaluate(() => H.prefs.applyProfile('lowVision'));
  const r = await page.evaluate(() => ({ fs: parseFloat(getComputedStyle(document.querySelector('h1')).fontSize), bg: getComputedStyle(document.body).backgroundColor, prefs: H.prefs.get() }));
  assert.ok(Math.abs(r.fs - fs0 * 1.3) < 0.5, `${r.fs} vs ${fs0 * 1.3}`);
  assert.equal(r.prefs.contrast, 'light');
  await page.evaluate(() => H.prefs.reset());
  const fs2 = await page.evaluate(() => parseFloat(getComputedStyle(document.querySelector('h1')).fontSize));
  assert.equal(fs2, fs0);
  await ctx.close();
});

test('SPA: динамик контентыг MutationObserver-ээр шалгаж засна', async () => {
  const { page, ctx } = await load('clean.html', { fix: 'safe', observe: true });
  await page.evaluate(() => {
    const d = document.createElement('div');
    d.innerHTML = '<div class="toast">Захиалга баталгаажлаа</div><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" id="dyn-img" width="40" height="40">';
    document.querySelector('main').appendChild(d);
  });
  await page.waitForFunction(() => H.report.findings.some((f) => f.ruleId === 'image-alt' && f.selector === '#dyn-img'), null, { timeout: 5000 });
  const role = await page.evaluate(() => document.querySelector('.toast:not([role="status"][class="toast"]):last-of-type')?.getAttribute('role') || [...document.querySelectorAll('.toast')].pop().getAttribute('role'));
  assert.equal(role, 'status');
  await ctx.close();
});

test('Хуудасны өөрийн товчоор нээх (data-hurteemj-open) ба launcher: false', async () => {
  const { page, ctx } = await load('clean.html', { fix: false, launcher: false });
  await page.evaluate(() => { const b = document.createElement('button'); b.textContent = 'Хүртээмж'; b.id = 'mine'; b.setAttribute('data-hurteemj-open', ''); document.querySelector('header').appendChild(b); });
  await page.click('#mine');
  const open = await page.evaluate(() => !document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot.querySelector('#hj-panel').hidden);
  assert.ok(open);
  await page.keyboard.press('Escape');
  const focus = await page.evaluate(() => document.activeElement.id);
  assert.equal(focus, 'mine');
  await ctx.close();
});

test('Тайлан илгээх (onReport) нь DOM node, оруулсан утгагүй JSON өгнө', async () => {
  const { page, ctx } = await load('violations.html', { fix: false, widget: false, reportEndpoint: null });
  const json = await page.evaluate(() => { document.getElementById('in-noname').setAttribute('value', 'нууц мэдээлэл'); return JSON.stringify(H.toJSON()); });
  const obj = JSON.parse(json);
  assert.ok(obj.findings.length > 10);
  assert.ok(!('node' in obj.findings[0]));
  assert.equal(obj.standard, 'WCAG 2.2 (ISO/IEC 40500)');
  await ctx.close();
});
