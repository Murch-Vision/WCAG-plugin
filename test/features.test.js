/** IMPROVEMENTS.md §3 "Эн тэргүүнд" саналуудын тестүүд */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, createPageFactory } from './helpers.js';
import { ACT_RULES, ACT_MAP, actRulesFor } from '../src/wcag/act.js';
import { toEARL, scAnchor } from '../src/core/earl.js';
import { RULES } from '../src/rules/index.js';

let browser;
const { page, cleanup } = createPageFactory(() => browser);
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); cleanup(); });

test('ACT уялдаа: ID бүр 6 тэмдэгт, нэртэй; дүрэм бүр бодитой', () => {
  const ruleIds = new Set(RULES.map((r) => r.id));
  for (const [rule, ids] of Object.entries(ACT_MAP)) {
    assert.ok(ruleIds.has(rule), `ACT map-д байхгүй дүрэм: ${rule}`);
    for (const id of ids) {
      assert.match(id, /^[a-z0-9]{6}$/, id);
      assert.ok(ACT_RULES[id], `нэргүй ACT id: ${id}`);
    }
  }
  assert.deepEqual(actRulesFor('image-alt'), [{ id: '23a2a8', name: 'Image has non-empty accessible name', url: 'https://www.w3.org/WAI/standards-guidelines/act/rules/23a2a8/' }]);
  assert.deepEqual(actRulesFor('target-size'), []);
  assert.ok(Object.keys(ACT_MAP).length >= 35);
});

test('WCAG 2.2 anchor: гарчгаас зөв slug', () => {
  assert.equal(scAnchor('1.1.1'), 'non-text-content');
  assert.equal(scAnchor('1.2.1'), 'audio-only-and-video-only-prerecorded');
  assert.equal(scAnchor('3.3.4'), 'error-prevention-legal-financial-data');
  assert.equal(scAnchor('2.5.8'), 'target-size-minimum');
  assert.equal(scAnchor('4.1.2'), 'name-role-value');
});

test('toEARL: fail → failed, review/generated → cantTell, олдворгүй дүрэм → passed/inapplicable, manual SC → untested', () => {
  const report = {
    tool: { name: 'hurteemj', version: '1.0.0' }, level: 'AA', url: 'https://example.mn/', title: 'T', timestamp: '2026-11-04T00:00:00Z',
    summary: { fail: 2 }, disclaimer: { mn: 'м', en: 'e' },
    findings: [
      { ruleId: 'image-alt', sc: ['1.1.1'], outcome: 'fail', impact: 'critical', selector: '#i', html: '<img>', message: { mn: 'м', en: 'no alt' }, fixed: false },
      { ruleId: 'image-alt', sc: ['1.1.1'], outcome: 'fail', impact: 'critical', selector: '#j', message: 'generated', fixed: true, generated: true, fix: 'AI alt' },
      { ruleId: 'target-size', sc: ['2.5.8'], outcome: 'fail', impact: 'serious', selector: '#t', message: 'small', fixed: true, fix: { mn: 'з', en: 'enlarged' }, fixTier: 'heuristic' },
      { ruleId: 'link-purpose', sc: ['2.4.4'], outcome: 'review', impact: 'moderate', selector: '#l', message: 'vague' },
    ],
    rulesRun: [{ id: 'image-alt', sc: ['1.1.1'], applicable: true }, { id: 'button-name', sc: ['4.1.2'], applicable: true }, { id: 'iframe-title', sc: ['4.1.2', '2.4.1'], applicable: false }],
    criteria: [{ id: '1.3.2', status: 'manual', title: { en: 'Meaningful Sequence' } }, { id: '1.1.1', status: 'fail', title: { en: 'Non-text Content' } }],
  };
  const earl = toEARL(report, { lang: 'en' });
  const a = earl['@graph'].filter((n) => n['@type'] === 'earl:Assertion');
  const by = (pred) => a.filter(pred).map((x) => x.result.outcome);
  assert.deepEqual(by((x) => x.test.endsWith('/23a2a8/')), ['earl:failed', 'earl:cantTell']);
  const ts = a.find((x) => x['hj:rule'] === 'target-size');
  assert.equal(ts.test, 'https://www.w3.org/TR/WCAG22/#target-size-minimum', 'ACT уялдаагүй дүрэм WCAG SC-г тест болгоно');
  assert.equal(ts.result.outcome, 'earl:failed', 'plugin-ийн засвар эх хуудасны үр дүнг өөрчлөхгүй');
  assert.equal(ts.result['hj:fixed'], true);
  assert.deepEqual(by((x) => x['hj:rule'] === 'link-purpose'), ['earl:cantTell', 'earl:cantTell']);
  assert.deepEqual(by((x) => x['hj:rule'] === 'button-name'), ['earl:passed']);
  assert.deepEqual(by((x) => x['hj:rule'] === 'iframe-title'), ['earl:inapplicable']);
  const manual = a.find((x) => x.test.endsWith('#meaningful-sequence'));
  assert.equal(manual.result.outcome, 'earl:untested');
  assert.equal(manual.mode, 'earl:manual');
  assert.equal(a.find((x) => x.test.endsWith('/23a2a8/')).result.pointer['ptr:expression'], '#i');
  assert.ok(earl['@context'].earl && earl['@graph'][0]['@type'].includes('earl:Software'));
  JSON.stringify(earl);
});

test('Гадны (CORS-оор хаалттай) CSS-ийн :focus дүрмийг fetch-ээр уншиж 2.4.7 шалгана', async () => {
  const css = 'a:focus{outline:none} .ok:focus{outline:none} .ok:focus-visible{outline:2px solid #000}';
  for (const fetchStyles of [true, false]) {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.route('https://cdn.example.test/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', headers: { 'access-control-allow-origin': '*' }, body: css }));
    await p.route('https://site.example.test/**', (route) => route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><html lang="mn"><head><title>x</title><link rel="stylesheet" href="https://cdn.example.test/theme.css"></head><body><main><h1>T</h1><a href="#">L</a> <a class="ok" href="#">M</a></main></body></html>' }));
    await p.goto('https://site.example.test/');
    await p.evaluate(() => { window.HurteemjConfig = { auto: false }; });
    await p.addScriptTag({ path: new URL('../dist/hurteemj.js', import.meta.url).pathname });
    const r = await p.evaluate(async (fetchStyles) => {
      // CSSOM-оор уншигдахгүй гэдгийг батлах
      let blocked = false; try { void document.styleSheets[0].cssRules; } catch { blocked = true; }
      const ready = new Promise((res) => document.addEventListener('hurteemj:ready', res, { once: true }));
      const h = Hurteemj.init({ observe: false, widget: false, fix: false, fetchStyles, force: true });
      await ready;
      return { blocked, fv: h.report.findings.filter((f) => f.ruleId === 'focus-visible').map((f) => [f.outcome, f.data?.selector]) };
    }, fetchStyles);
    assert.equal(r.blocked, true, 'cross-origin sheet нь CSSOM-д хаалттай байх ёстой');
    // Гадны CSS уншигдсан: ".ok:focus" нь ".ok:focus-visible"-тэй тул зөрчил биш; "a:focus{outline:none}" олдсон
    // (сайт хаа нэгтээ :focus-visible ашигладаг тул fail биш review — R1 логик)
    if (fetchStyles) assert.deepEqual(r.fv, [['review', 'a:focus']]);
    else assert.deepEqual(r.fv, [], 'fetchStyles=false үед гадны CSS шалгагдахгүй');
    await ctx.close();
  }
});

test('Тодролын кэш: эцгийн solid дэвсгэрийг өвлөх, өөрийн дэвсгэр/gradient-ийг тус тусад нь тооцох', async () => {
  const { p, ctx } = await page(`<main><h1>T</h1>
    <section style="background:#000;color:#fff;padding:8px">
      <p id="a">Цагаан хар дээр</p>
      <p id="b"><span>Үүрлэсэн</span> <em id="b2">текст</em></p>
      <p id="c" style="background:#fff;color:#fff">Өөрийн цагаан дэвсгэр</p>
      <p id="d" style="background:rgba(255,255,255,.9);color:#fff">Хагас тунгалаг</p>
    </section>
    <div style="background:linear-gradient(#fff,#000);padding:8px"><p id="g" style="color:#888">Gradient</p></div>
  </main>`, { fix: false });
  const r = await p.evaluate(() => ({
    fails: H.report.findings.filter((f) => f.ruleId === 'color-contrast' && f.outcome === 'fail').map((f) => f.selector).sort(),
    reviews: H.report.findings.filter((f) => f.ruleId === 'color-contrast' && f.outcome === 'review').map((f) => f.selector),
  }));
  assert.deepEqual(r.fails, ['#c', '#d']);
  assert.deepEqual(r.reviews, ['#g']);
  await ctx.close();
});

test('Тодролын кэш: том хуудсанд хурдан бөгөөд үр дүн ижил', async () => {
  const items = Array.from({ length: 800 }, (_, i) => `<article class="card"><h3>Гарчиг ${i}</h3><p>Агуулга ${i} <span>дэд</span> <a href="/n/${i}">холбоос</a></p><p class="muted">бүдэг ${i}</p></article>`).join('');
  const { p, ctx } = await page(`<style>.card{background:#f6f6f6;margin:4px;padding:8px}.muted{color:#999}a{color:#0b4bd1}</style><main><h1>T</h1>${items}</main>`, { fix: false });
  const r = await p.evaluate(() => ({ ms: H.report.timings['color-contrast'], fails: H.report.findings.filter((f) => f.ruleId === 'color-contrast').length }));
  assert.equal(r.fails, 800, '.muted бүр зөрчил');
  assert.ok(r.ms < 400, `color-contrast ${r.ms}ms`);
  await ctx.close();
});

test('altTextProvider: AI alt нь "generated" — хүн баталгаажуулах; самбарт тусдаа badge', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><img id="i" src="x.png" width="20" height="20"><img id="j" src="y.png" width="20" height="20"></main>', {}, { init: false });
  await p.evaluate(async () => {
    const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, widget: true, auditor: true, fix: 'safe', force: true, altTextProvider: async (src) => (src.endsWith('x.png') ? 'Сүхбаатарын талбай' : '') });
    await ready;
  });
  const r = await p.evaluate(() => {
    const f = H.report.findings.filter((x) => x.ruleId === 'image-alt').map((x) => [x.selector, x.fixed, !!x.generated]);
    H.open();
    const sr = document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot;
    return { f, alt: document.getElementById('i').getAttribute('alt'), gen: document.getElementById('i').getAttribute('data-hj-alt-generated'), summary: H.report.summary.generated, badge: [...sr.querySelectorAll('.badge')].map((b) => b.textContent), earl: H.toEARL()['@graph'].filter((n) => n['hj:rule'] === 'image-alt').map((n) => n.result.outcome) };
  });
  assert.deepEqual(r.f, [['#i', true, true], ['#j', false, false]]);
  assert.equal(r.alt, 'Сүхбаатарын талбай');
  assert.equal(r.gen, 'true');
  assert.equal(r.summary, 1);
  assert.ok(r.badge.includes('AI — баталгаажуулах'));
  assert.deepEqual(r.earl, ['earl:cantTell', 'earl:failed'], '#i (AI alt) → cantTell, #j → failed');
  await ctx.close();
});

test('loadPrefs: серверийн тохиргоог эхний зурагнаас өмнө хэрэглэнэ; алдаа/удаашралд локал руу буцна', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><p id="t">Текст</p></main>', {}, { init: false });
  const fs0 = await p.evaluate(() => parseFloat(getComputedStyle(document.getElementById('t')).fontSize));
  const r = await p.evaluate(async () => {
    const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, widget: false, fix: false, force: true, loadPrefs: async () => ({ fontScale: 1.4, contrast: 'dark', bogus: 1 }) });
    await ready;
    return { fs: parseFloat(getComputedStyle(document.getElementById('t')).fontSize), prefs: H.prefs.get(), stored: JSON.parse(localStorage.getItem('hurteemj:prefs')).fontScale };
  });
  assert.ok(Math.abs(r.fs - fs0 * 1.4) < 0.5);
  assert.equal(r.prefs.contrast, 'dark');
  assert.ok(!('bogus' in r.prefs));
  assert.equal(r.stored, 1.4, 'локал нөөцөд ч хадгална');
  // Алдаа гаргадаг / хэт удаан loadPrefs → локал (саяын 1.4) хэвээр, plugin ажиллана
  const r2 = await p.evaluate(async () => {
    H.destroy();
    const t0 = performance.now();
    const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, widget: false, fix: false, force: true, loadPrefsTimeout: 200, loadPrefs: () => new Promise(() => {}) });
    await ready;
    const slow = performance.now() - t0;
    H.destroy();
    const ready2 = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, widget: false, fix: false, force: true, loadPrefs: async () => { throw new Error('500'); } });
    await ready2;
    return { slow, fontScale: H.prefs.get().fontScale, warnings: H.config.warnings };
  });
  assert.ok(r2.slow < 1500, `timeout ажиллаагүй: ${r2.slow}ms`);
  assert.equal(r2.fontScale, 1.4);
  await ctx.close();
});
