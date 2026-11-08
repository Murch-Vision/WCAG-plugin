/** Скан үйлчилгээ (server/): API, нэвтрэлт, SSRF, crawl, тайлан, webhook, хуваарь, самбар */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { startServer } from '../server/index.js';
import { isPrivateAddress, normalizeTargetUrl, assertPublicUrl } from '../src/node/netguard.js';
import { sameOriginLinks } from '../src/node/scan.js';
import { computeScore, aggregateScore, gradeOf } from '../src/core/score.js';
import { csvReport } from '../src/node/report.js';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const AXE = require.resolve('axe-core/axe.min.js');

// ---------- туршилтын сайт ----------
const PAGES = {
  '/': '<!doctype html><html lang="mn"><head><title>Нүүр</title></head><body><main><h1>Нүүр</h1><p><a href="/a">А хуудас</a> <a href="/b#x">Б хуудас</a> <a href="/file.pdf">PDF</a> <a href="https://example.org/">Гадны</a> <a href="/logout">Гарах</a></p><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" width="20" height="20"></main></body></html>',
  '/a': '<!doctype html><html lang="mn"><head><title>А</title></head><body><main><h1>А</h1><p>Цэвэр хуудас. <a href="/">Нүүр</a></p></main></body></html>',
  '/b': '<!doctype html><html><head><title></title></head><body><button></button><input></body></html>',
  '/clean': '<!doctype html><html lang="mn"><head><title>Цэвэр</title></head><body><main><h1>Цэвэр</h1><p>Хүртээмжтэй хуудас.</p></main></body></html>',
};
let site, siteUrl, hook, hookUrl, app, base, H, browser;
const hooks = [];
const SECRET = 'test-secret';

function listen(handler) {
  return new Promise((resolve) => { const s = http.createServer(handler); s.listen(0, '127.0.0.1', () => resolve(s)); });
}
const api = async (path, { method = 'GET', body, key } = {}) => {
  const headers = { authorization: `Bearer ${key ?? app.bootstrapKey}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const r = await fetch(base + path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch { /* not json */ }
  return { status: r.status, json, text, headers: r.headers };
};
async function waitScan(id, ms = 120_000) {
  const t0 = Date.now();
  for (;;) {
    const { json } = await api(`/api/scans/${id}`);
    if (!['queued', 'running'].includes(json.scan.status)) return json;
    if (Date.now() - t0 > ms) throw new Error('scan timeout');
    await new Promise((r) => setTimeout(r, 500));
  }
}

before(async () => {
  site = await listen((req, res) => {
    const p = new URL(req.url, 'http://x').pathname;
    if (p === '/file.pdf') { res.writeHead(200, { 'content-type': 'application/pdf' }); return res.end('%PDF'); }
    const body = PAGES[p];
    res.writeHead(body ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
    res.end(body || 'not found');
  });
  siteUrl = `http://127.0.0.1:${site.address().port}`;
  hook = await listen((req, res) => {
    let b = '';
    req.on('data', (c) => { b += c; });
    req.on('end', () => { hooks.push({ headers: req.headers, body: b }); res.writeHead(204); res.end(); });
  });
  hookUrl = `http://127.0.0.1:${hook.address().port}/hook`;
  app = await startServer({ port: 0, host: '127.0.0.1', dbFile: ':memory:', allowPrivate: true, quiet: true, webhookSecret: SECRET, concurrency: 2, maxPages: 10, tickMs: 200 });
  base = `http://127.0.0.1:${app.port}`;
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
  await app?.close();
  site?.close(); hook?.close();
});

// ---------- unit ----------
test('netguard: дотоод хаягийг таних', async () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.5.4', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fd00::1', 'fe80::1']) assert.ok(isPrivateAddress(ip), ip);
  for (const ip of ['8.8.8.8', '172.32.0.1', '202.131.0.1', '2001:4860:4860::8888']) assert.ok(!isPrivateAddress(ip), ip);
  assert.equal(normalizeTargetUrl('example.mn/path#x'), 'https://example.mn/path');
  assert.throws(() => normalizeTargetUrl('file:///etc/passwd'), /http/);
  assert.throws(() => normalizeTargetUrl('https://user:pw@example.mn'), /нууц үг/);
  await assert.rejects(assertPublicUrl('http://localhost:8080'), /Дотоод/);
  await assert.rejects(assertPublicUrl('http://[::1]/'), /Дотоод/);
  await assert.rejects(assertPublicUrl('http://169.254.169.254/latest/meta-data'), /Дотоод/);
  assert.equal(await assertPublicUrl('http://127.0.0.1/', { allowPrivate: true }), 'http://127.0.0.1/');
});

test('score: жинлэсэн дүрмийн хувь, review оноо бууруулахгүй', () => {
  const report = {
    rulesRun: [{ id: 'image-alt', applicable: true }, { id: 'button-name', applicable: true }, { id: 'link-purpose', applicable: true }, { id: 'iframe-title', applicable: false }],
    findings: [
      { ruleId: 'image-alt', outcome: 'fail', impact: 'critical' },
      { ruleId: 'image-alt', outcome: 'fail', impact: 'critical' },
      { ruleId: 'link-purpose', outcome: 'review', impact: 'moderate' },
    ],
  };
  const s = computeScore(report);
  // image-alt (10) унасан, button-name (10) + link-purpose (3) давсан → 13/23
  assert.equal(s.score, Math.round((13 / 23) * 100));
  assert.deepEqual(s.rules, { passed: 2, failed: 1, applicable: 3 });
  assert.equal(computeScore({ rulesRun: [], findings: [] }).score, null);
  assert.equal(aggregateScore([80, null, 90]), 85);
  assert.deepEqual([95, 75, 55, 10].map((v) => gradeOf(v).id), ['good', 'fair', 'poor', 'bad']);
});

test('crawl: ижил origin, файл/гадны/logout/hash-ийг хасна', () => {
  const links = ['/a', '/b#x', '/b', '/file.pdf', 'https://example.org/', '/logout', 'mailto:a@b.mn', '/a?q=1'];
  assert.deepEqual(sameOriginLinks(links, 'https://site.mn/'), ['https://site.mn/a', 'https://site.mn/b', 'https://site.mn/a?q=1']);
});

test('CSV: Excel formula injection-аас сэргийлнэ', () => {
  const csv = csvReport([{ viewport: 'desktop', report: { url: 'https://x.mn', findings: [{ ruleId: 'r', outcome: 'fail', impact: 'minor', sc: ['1.1.1'], selector: '=HYPERLINK("http://evil")', message: 'a,b' }] } }]);
  assert.match(csv, /'=HYPERLINK/);
  assert.match(csv, /"a,b"/);
});

// ---------- API ----------
test('Нэвтрэлт: түлхүүргүй 401, буруу түлхүүр 401, health нийтэд нээлттэй', async () => {
  assert.equal((await fetch(`${base}/api/sites`)).status, 401);
  assert.equal((await api('/api/sites', { key: 'hj_wrong' })).status, 401);
  const h = await fetch(`${base}/api/health`);
  assert.equal(h.status, 200);
  assert.equal((await h.json()).ok, true);
  assert.equal(h.headers.get('x-content-type-options'), 'nosniff');
});

test('Оролтын шалгалт: буруу URL, түвшин, JSON', async () => {
  assert.equal((await api('/api/scans', { method: 'POST', body: { url: 'ftp://x.mn' } })).status, 400);
  assert.equal((await api('/api/sites', { method: 'POST', body: { url: 'https://x.mn', level: 'B' } })).status, 400);
  const bad = await fetch(`${base}/api/scans`, { method: 'POST', headers: { authorization: `Bearer ${app.bootstrapKey}`, 'content-type': 'application/json' }, body: '{oops' });
  assert.equal(bad.status, 400);
  const noCt = await fetch(`${base}/api/scans`, { method: 'POST', headers: { authorization: `Bearer ${app.bootstrapKey}` }, body: '{}' });
  assert.equal(noCt.status, 415);
});

test('SSRF: allowPrivate=false үед дотоод хаягийг API түвшинд хаана', async () => {
  const strict = await startServer({ port: 0, host: '127.0.0.1', dbFile: ':memory:', allowPrivate: false, quiet: true });
  try {
    const r = await fetch(`http://127.0.0.1:${strict.port}/api/scans`, { method: 'POST', headers: { authorization: `Bearer ${strict.bootstrapKey}`, 'content-type': 'application/json' }, body: JSON.stringify({ url: siteUrl }) });
    assert.equal(r.status, 400);
    assert.equal((await r.json()).code, 'URL_BLOCKED');
  } finally { await strict.close(); }
});

test('Сайт бүртгэж crawl хийнэ: оноо, хуудсууд, тайлан, webhook (HMAC), badge', async () => {
  const created = await api('/api/sites', { method: 'POST', body: { url: `${siteUrl}/`, name: 'Туршилт', maxPages: 5, viewports: ['desktop', 'mobile'], webhookUrl: hookUrl } });
  assert.equal(created.status, 201);
  const { scan, site: s } = created.json;
  assert.equal(scan.status, 'queued');
  const done = await waitScan(scan.id);
  assert.equal(done.scan.status, 'done', done.scan.error);
  // / , /a , /b — PDF, гадны, logout хасагдсан; дэлгэц тус бүр
  const urls = [...new Set(done.pages.map((p) => new URL(p.url).pathname))].sort();
  assert.deepEqual(urls, ['/', '/a', '/b']);
  assert.equal(done.pages.length, 6);
  assert.ok(done.pages.every((p) => typeof p.score === 'number'));
  const b = done.pages.find((p) => p.url.endsWith('/b') && p.viewport === 'desktop');
  const a = done.pages.find((p) => p.url.endsWith('/a') && p.viewport === 'desktop');
  assert.ok(b.score < a.score, `b ${b.score} < a ${a.score}`);
  assert.equal(typeof done.scan.score, 'number');
  assert.ok(done.scan.summary.criteria.list.length > 0);

  // Тайлангууд
  const html = await api(`/api/scans/${scan.id}/report.html`);
  assert.equal(html.status, 200);
  assert.match(html.headers.get('content-security-policy'), /sandbox/);
  assert.match(html.text, /Нийт оноо/);
  const earl = await api(`/api/scans/${scan.id}/report.earl.json`);
  assert.ok(earl.json['@graph'].some((n) => n.result?.outcome === 'earl:failed'));
  const csv = await api(`/api/scans/${scan.id}/report.csv?download=1`);
  assert.match(csv.headers.get('content-disposition'), /attachment/);
  const page = await api(`/api/scans/${scan.id}/pages/${b.id}`);
  assert.ok(page.json.page.report.findings.some((f) => f.ruleId === 'button-name'));

  // Webhook + HMAC
  for (let i = 0; i < 40 && !hooks.length; i++) await new Promise((r) => setTimeout(r, 100));
  assert.equal(hooks.length, 1);
  const sig = createHmac('sha256', SECRET).update(hooks[0].body).digest('hex');
  assert.equal(hooks[0].headers['x-hurteemj-signature'], `sha256=${sig}`);
  const payload = JSON.parse(hooks[0].body);
  assert.equal(payload.event, 'scan.completed');
  assert.equal(payload.scan.score, done.scan.score);

  // Badge (нэвтрэлтгүй, токеноор)
  const badge = await fetch(`${base}${s.badgeUrl}`);
  assert.equal(badge.status, 200);
  assert.match(badge.headers.get('content-type'), /svg/);
  assert.match(await badge.text(), new RegExp(`${done.scan.score}/100`));
  assert.equal((await fetch(`${base}/badge/guess.svg`)).status, 404);

  // Сайтын жагсаалт ба түүх
  const list = await api('/api/sites');
  const row = list.json.sites.find((x) => x.id === s.id);
  assert.equal(row.lastScan.score, done.scan.score);
  assert.equal(row.history.length, 1);

  // Давхар бүртгэл 409
  assert.equal((await api('/api/sites', { method: 'POST', body: { url: `${siteUrl}/` } })).status, 409);
});

test('POST /api/scans: URL-аар шууд (сайтыг автоматаар үүсгэнэ), цуцлах, audit log', async () => {
  const r = await api('/api/scans', { method: 'POST', body: { url: `${siteUrl}/clean`, maxPages: 1 } });
  assert.equal(r.status, 202);
  const done = await waitScan(r.json.scan.id);
  assert.equal(done.scan.status, 'done');
  assert.equal(done.scan.score, 100);
  // Цуцлах: олон хуудастай скан эхлүүлээд шууд цуцална
  const c = await api(`/api/sites/${r.json.site.id}/scans`, { method: 'POST', body: { maxPages: 5 } });
  const del = await api(`/api/scans/${c.json.scan.id}`, { method: 'DELETE' });
  assert.equal(del.json.scan.status, 'canceled');
  const log = await api('/api/log');
  const actions = log.json.log.map((l) => l.action);
  assert.ok(actions.includes('scan.create') && actions.includes('scan.cancel'));
});

test('Хуваарь: хугацаа нь болсон сайтыг автоматаар шалгана', async () => {
  const r = await api('/api/sites', { method: 'POST', body: { url: `${siteUrl}/a`, schedule: 'daily', scanNow: false } });
  assert.equal(r.json.scan, null);
  // next_run_at-ийг өнгөрсөн болгож хуваарийн tick-ийг дуудна
  app.db.updateSite(r.json.site.id, { nextRunAt: new Date(Date.now() - 1000).toISOString() });
  app.queue.tick();
  const scans = (await api(`/api/scans?siteId=${r.json.site.id}`)).json.scans;
  assert.equal(scans.length, 1);
  assert.equal(scans[0].source, 'schedule');
  const next = app.db.getSite(r.json.site.id).nextRunAt;
  assert.ok(new Date(next) > new Date(Date.now() + 23 * 3600e3), 'дараагийн шалгалт ~24 цагийн дараа');
  await waitScan(scans[0].id);
});

test('API түлхүүр: үүсгэх, ашиглах, цуцлах; өөрийгөө цуцлахгүй', async () => {
  const c = await api('/api/keys', { method: 'POST', body: { name: 'CI' } });
  assert.equal(c.status, 201);
  const k = c.json.key.key;
  assert.match(k, /^hj_/);
  assert.equal((await api('/api/me', { key: k })).json.key.name, 'CI');
  assert.ok(!JSON.stringify((await api('/api/keys')).json).includes(k), 'түлхүүрийн утга дахин харагдах ёсгүй');
  const me = (await api('/api/me')).json.key.id;
  assert.equal((await api(`/api/keys/${me}`, { method: 'DELETE' })).status, 400);
  assert.equal((await api(`/api/keys/${c.json.key.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await api('/api/me', { key: k })).status, 401);
});

test('Самбар: CSP, нэвтрэх, axe-core зөрчилгүй (WCAG 2.2 AA), гараар удирдах', async () => {
  // 1) Жинхэнэ CSP-тэй: самбар ба виджет CSP зөрчилгүй ажиллана
  const strict = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const sp = await strict.newPage();
  const cspErrors = [];
  sp.on('console', (m) => { if (m.type() === 'error') cspErrors.push(m.text()); });
  const res = await sp.goto(`${base}/`);
  assert.match(res.headers()['content-security-policy'], /script-src 'self' 'nonce-/);
  await sp.evaluate((k) => sessionStorage.setItem('hj-scanner-key', k), app.bootstrapKey);
  for (const h of ['#/', '#/settings']) { await sp.goto(`${base}/${h}`); await sp.waitForSelector('h1'); await sp.waitForTimeout(200); }
  await sp.waitForFunction(() => document.querySelector('[data-hurteemj-ui="widget"]'));
  assert.deepEqual(cspErrors, [], 'CSP зөрчил');
  await strict.close();
  // 2) axe-core-ийг оруулахын тулд CSP-ийг тойрно (зөвхөн тестэд)
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, bypassCSP: true });
  const p = await ctx.newPage();
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(`${base}/`);
  await p.waitForSelector('#key');
  // Хоосон илгээхэд алдааг талбартай холбож зарлана
  await p.click('button[type=submit]');
  assert.equal(await p.getAttribute('#key', 'aria-invalid'), 'true');
  await p.fill('#key', app.bootstrapKey);
  await p.keyboard.press('Enter');
  await p.waitForSelector('table');
  assert.equal(await p.evaluate(() => document.activeElement.tagName), 'H1', 'хуудас солигдоход фокус гарчиг руу');
  const runAxe = async () => {
    await p.addScriptTag({ path: AXE });
    return p.evaluate(async () => (await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] } })).violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).slice(0, 3).join(' | ')}`));
  };
  assert.deepEqual(await runAxe(), [], 'сайтуудын жагсаалт');
  const scanId = (await api('/api/scans?status=done&limit=1')).json.scans[0].id;
  await p.goto(`${base}/#/scans/${scanId}`);
  await p.waitForSelector('.hero');
  await p.click('details[data-page] > summary');
  await p.waitForSelector('details[data-page] .rule, details[data-page] .pad');
  assert.deepEqual(await runAxe(), [], 'шалгалтын дэлгэрэнгүй');
  const siteId = (await api('/api/sites')).json.sites[0].id;
  await p.goto(`${base}/#/sites/${siteId}`);
  await p.waitForSelector('#site-form');
  assert.deepEqual(await runAxe(), [], 'сайтын хуудас');
  await p.goto(`${base}/#/settings`);
  await p.waitForSelector('#key-form');
  assert.deepEqual(await runAxe(), [], 'тохиргоо');
  // Самбар өөрийн хүртээмжийн шалгалтаар ч цэвэр
  const own = await p.evaluate(() => Hurteemj.auditPage({ ignore: ['[data-hurteemj-ui]'] }).findings.filter((f) => f.outcome === 'fail').map((f) => `${f.ruleId} ${f.selector}`));
  assert.deepEqual(own, []);
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('Самбар 320px өргөнд хэвтээ гүйлгэлтгүй', async () => {
  const ctx = await browser.newContext({ viewport: { width: 320, height: 640 } });
  const p = await ctx.newPage();
  await p.goto(`${base}/`);
  await p.evaluate((k) => sessionStorage.setItem('hj-scanner-key', k), app.bootstrapKey);
  for (const h of ['#/', '#/settings']) {
    await p.goto(`${base}/${h}`);
    await p.waitForSelector('h1');
    await p.waitForTimeout(200);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(sw <= 320, `${h}: scrollWidth ${sw}`);
  }
  await ctx.close();
});
