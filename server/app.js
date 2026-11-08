/**
 * HTTP API + самбарын статик файл. Хамааралгүй (node:http).
 *
 * Нэвтрэлт: `Authorization: Bearer hj_…` эсвэл `X-API-Key: hj_…`.
 * Нийтэд нээлттэй: GET /api/health, GET /badge/:token.svg, самбарын статик файлууд.
 */
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPublicUrl, BlockedUrlError } from '../src/node/netguard.js';
import { htmlReport, csvReport } from '../src/node/report.js';
import { toEARL } from '../src/core/earl.js';
import { gradeOf, GRADES } from '../src/core/score.js';
import { CRITERIA } from '../src/wcag/criteria.js';
import { nextRun } from './queue.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(here, 'public');
const DIST = path.join(here, '..', 'dist');
const VERSION = JSON.parse(await readFile(path.join(here, '..', 'package.json'), 'utf8')).version;

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const SECURITY_HEADERS = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'no-referrer',
  'x-frame-options': 'DENY',
  'cross-origin-opener-policy': 'same-origin',
};

class HttpError extends Error {
  constructor(status, message, code) { super(message); this.status = status; this.code = code; }
}

const LEVELS = ['A', 'AA', 'AAA'];
const VIEWPORTS = ['desktop', 'mobile'];
const SCHEDULES = [null, 'hourly', 'daily', 'weekly'];

export function createApp({ db, queue, config }) {
  const routes = [];
  const route = (method, pattern, handler, { auth = true } = {}) => {
    const keys = [];
    const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    routes.push({ method, re, keys, handler, auth });
  };

  // ---------- туслахууд ----------
  const send = (res, status, body, headers = {}) => {
    const isBuf = Buffer.isBuffer(body) || typeof body === 'string';
    res.writeHead(status, { ...SECURITY_HEADERS, ...(isBuf ? {} : { 'content-type': 'application/json; charset=utf-8' }), 'cache-control': 'no-store', ...headers });
    res.end(isBuf ? body : JSON.stringify(body));
  };
  async function readJson(req) {
    const ct = req.headers['content-type'] || '';
    if (!/application\/json/.test(ct)) throw new HttpError(415, 'Content-Type: application/json шаардлагатай');
    let size = 0;
    const chunks = [];
    for await (const c of req) {
      size += c.length;
      if (size > 256 * 1024) throw new HttpError(413, 'Хүсэлт хэт том');
      chunks.push(c);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw new HttpError(400, 'JSON буруу'); }
  }
  const authKey = (req) => {
    const h = req.headers.authorization || '';
    const m = /^Bearer\s+(\S+)$/i.exec(h);
    return m ? m[1] : req.headers['x-api-key'];
  };
  const int = (v, d, min, max) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };

  /** Хэрэглэгчийн өгсөн сайтын тохиргоог шалгана */
  async function siteInput(b, { partial = false } = {}) {
    const out = {};
    if (!partial || b.url !== undefined) {
      try { out.url = await assertPublicUrl(b.url, { allowPrivate: config.allowPrivate }); } catch (e) { throw new HttpError(400, e.message, e.code); }
    }
    if (b.name !== undefined) out.name = String(b.name || '').slice(0, 120) || null;
    if (b.level !== undefined) {
      const lv = String(b.level).toUpperCase();
      if (!LEVELS.includes(lv)) throw new HttpError(400, 'level нь A|AA|AAA');
      out.level = lv;
    }
    if (b.maxPages !== undefined) out.maxPages = int(b.maxPages, 1, 1, config.maxPages);
    if (b.viewports !== undefined) {
      const v = (Array.isArray(b.viewports) ? b.viewports : [b.viewports]).filter((x) => VIEWPORTS.includes(x));
      if (!v.length) throw new HttpError(400, `viewports нь ${VIEWPORTS.join('|')}`);
      out.viewports = [...new Set(v)];
    }
    if (b.ignore !== undefined) out.ignore = (Array.isArray(b.ignore) ? b.ignore : String(b.ignore).split(',')).map((s) => String(s).trim()).filter(Boolean).slice(0, 50);
    if (b.schedule !== undefined) {
      const sc = b.schedule || null;
      if (!SCHEDULES.includes(sc)) throw new HttpError(400, 'schedule нь hourly|daily|weekly|null');
      out.schedule = sc;
      out.nextRunAt = nextRun(sc);
    }
    if (b.webhookUrl !== undefined) {
      if (!b.webhookUrl) out.webhookUrl = null;
      else {
        let u;
        try { u = new URL(b.webhookUrl); } catch { throw new HttpError(400, 'webhookUrl буруу'); }
        if (!/^https?:$/.test(u.protocol)) throw new HttpError(400, 'webhookUrl нь http(s) байна');
        out.webhookUrl = u.href;
      }
    }
    return out;
  }

  const scanOptions = (site, b = {}) => ({
    level: b.level ? String(b.level).toUpperCase() : site.level,
    maxPages: b.maxPages ? int(b.maxPages, site.maxPages, 1, config.maxPages) : site.maxPages,
    viewports: Array.isArray(b.viewports) && b.viewports.filter((x) => VIEWPORTS.includes(x)).length ? b.viewports.filter((x) => VIEWPORTS.includes(x)) : site.viewports,
    ignore: site.ignore,
    lang: b.lang === 'en' ? 'en' : 'mn',
  });

  function startScan(site, body, keyId, source = 'api') {
    const options = scanOptions(site, body);
    if (!LEVELS.includes(options.level)) throw new HttpError(400, 'level нь A|AA|AAA');
    const scan = db.createScan({ siteId: site.id, url: site.url, options, source });
    db.log(keyId, 'scan.create', scan.id, { site: site.id, url: site.url });
    queue.enqueue(scan.id);
    return scan;
  }

  const publicSite = (s) => ({ ...s, badgeUrl: `/badge/${s.badgeToken}.svg` });

  // ---------- нийтийн ----------
  route('GET', '/api/health', () => ({ ok: true, version: VERSION, queue: queue.stats() }), { auth: false });

  route('GET', '/badge/:token', ({ params, res }) => {
    const token = params.token.replace(/\.svg$/, '');
    const site = db.getSiteByBadge(token);
    if (!site) throw new HttpError(404, 'Олдсонгүй');
    const last = db.listScans({ siteId: site.id, status: 'done', limit: 1 })[0];
    send(res, 200, badgeSvg(last?.score ?? null), { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=300' });
  }, { auth: false });

  // ---------- мета ----------
  route('GET', '/api/me', ({ key }) => ({ key: { id: key.id, name: key.name }, version: VERSION, limits: { maxPages: config.maxPages, allowPrivate: config.allowPrivate } }));
  route('GET', '/api/criteria', () => ({ criteria: CRITERIA, grades: GRADES }));
  route('GET', '/api/log', ({ query }) => ({ log: db.listLog(int(query.get('limit'), 100, 1, 1000)) }));

  // ---------- сайт ----------
  route('GET', '/api/sites', () => ({ sites: db.listSites().map(publicSite) }));
  route('POST', '/api/sites', async ({ req, key }) => {
    const b = await readJson(req);
    const input = await siteInput(b);
    if (db.findSiteByUrl(input.url)) throw new HttpError(409, 'Энэ хаяг аль хэдийн бүртгэлтэй');
    const site = db.createSite(input);
    db.log(key.id, 'site.create', String(site.id), { url: site.url });
    const scan = b.scanNow === false ? null : startScan(site, {}, key.id);
    return [201, { site: publicSite(site), scan }];
  });
  route('GET', '/api/sites/:id', ({ params }) => {
    const site = db.getSite(int(params.id, 0, 0, 1e12));
    if (!site) throw new HttpError(404, 'Сайт олдсонгүй');
    return { site: publicSite(site), scans: db.listScans({ siteId: site.id, limit: 50 }) };
  });
  route('PATCH', '/api/sites/:id', async ({ req, params, key }) => {
    const id = int(params.id, 0, 0, 1e12);
    if (!db.getSite(id)) throw new HttpError(404, 'Сайт олдсонгүй');
    const b = await readJson(req);
    delete b.url; // URL-ыг өөрчлөхгүй — шинэ сайт үүсгэнэ
    const site = db.updateSite(id, await siteInput(b, { partial: true }));
    db.log(key.id, 'site.update', String(id), b);
    return { site: publicSite(site) };
  });
  route('DELETE', '/api/sites/:id', ({ params, key }) => {
    const id = int(params.id, 0, 0, 1e12);
    for (const s of db.listScans({ siteId: id, limit: 500 })) if (['queued', 'running'].includes(s.status)) queue.cancel(s.id);
    if (!db.deleteSite(id)) throw new HttpError(404, 'Сайт олдсонгүй');
    db.log(key.id, 'site.delete', String(id));
    return [204, null];
  });
  route('POST', '/api/sites/:id/scans', async ({ req, params, key }) => {
    const site = db.getSite(int(params.id, 0, 0, 1e12));
    if (!site) throw new HttpError(404, 'Сайт олдсонгүй');
    const b = req.headers['content-length'] && req.headers['content-length'] !== '0' ? await readJson(req) : {};
    return [202, { scan: startScan(site, b, key.id) }];
  });

  // ---------- скан ----------
  /** URL-аар шууд скан: сайт байхгүй бол үүсгэнэ (CI, бусад системээс нэг дуудлагаар) */
  route('POST', '/api/scans', async ({ req, key }) => {
    const b = await readJson(req);
    let site;
    if (b.siteId) site = db.getSite(int(b.siteId, 0, 0, 1e12));
    else {
      const input = await siteInput({ url: b.url, level: b.level, maxPages: b.maxPages, viewports: b.viewports, ignore: b.ignore, webhookUrl: b.webhookUrl, name: b.name });
      site = db.findSiteByUrl(input.url) || db.createSite(input);
    }
    if (!site) throw new HttpError(404, 'Сайт олдсонгүй');
    return [202, { scan: startScan(site, b, key.id), site: publicSite(site) }];
  });
  route('GET', '/api/scans', ({ query }) => ({
    scans: db.listScans({ siteId: int(query.get('siteId'), 0, 0, 1e12) || undefined, status: query.get('status') || undefined, limit: int(query.get('limit'), 50, 1, 500) }),
  }));
  const getScanOr404 = (id) => {
    const s = db.getScan(id);
    if (!s) throw new HttpError(404, 'Скан олдсонгүй');
    return s;
  };
  route('GET', '/api/scans/:id', ({ params }) => {
    const scan = getScanOr404(params.id);
    return { scan, site: publicSite(db.getSite(scan.siteId)), pages: db.listPages(scan.id) };
  });
  route('DELETE', '/api/scans/:id', ({ params, key }) => {
    const scan = getScanOr404(params.id);
    if (['queued', 'running'].includes(scan.status)) { queue.cancel(scan.id); db.log(key.id, 'scan.cancel', scan.id); return { scan: db.getScan(scan.id) }; }
    db.deleteScan(scan.id);
    db.log(key.id, 'scan.delete', scan.id);
    return [204, null];
  });
  route('GET', '/api/scans/:id/pages/:pageId', ({ params }) => {
    const page = db.getPage(params.id, int(params.pageId, 0, 0, 1e12));
    if (!page) throw new HttpError(404, 'Хуудас олдсонгүй');
    return { page };
  });
  route('GET', '/api/scans/:id/report.:fmt', ({ params, query, res }) => {
    const scan = getScanOr404(params.id);
    if (scan.status !== 'done') throw new HttpError(409, 'Скан дуусаагүй байна');
    const lang = query.get('lang') === 'en' ? 'en' : 'mn';
    const pages = db.pagesWithReports(scan.id);
    const site = db.getSite(scan.siteId);
    const file = `hurteemj-${new URL(scan.url).hostname}-${scan.finishedAt.slice(0, 10)}`;
    const dl = query.get('download') ? { 'content-disposition': `attachment; filename="${file}.${params.fmt === 'earl.json' ? 'earl.json' : params.fmt}"` } : {};
    switch (params.fmt) {
      case 'html':
        return send(res, 200, htmlReport(pages, { lang, score: scan.score, url: scan.url, title: site?.name || undefined, startedAt: scan.startedAt, summary: scan.summary }), {
          'content-type': 'text/html; charset=utf-8',
          // Тайлан нь гадны сайтаас авсан (escape хийсэн) текст агуулна — скрипт ажиллахгүй, sandbox
          'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox",
          ...dl,
        });
      case 'json':
        return send(res, 200, { scan, site: publicSite(site), pages: pages.map(({ earl, ...p }) => p) }, dl);
      case 'csv':
        return send(res, 200, csvReport(pages, lang), { 'content-type': 'text/csv; charset=utf-8', ...dl });
      case 'earl.json': {
        const graphs = pages.filter((p) => p.report).map((p) => p.earl || toEARL(p.report, { lang }));
        const doc = graphs.length === 1 ? graphs[0] : { '@context': graphs[0]?.['@context'], '@graph': graphs.flatMap((g) => g['@graph']), 'hj:score': scan.score };
        return send(res, 200, JSON.stringify(doc, null, 2), { 'content-type': 'application/ld+json; charset=utf-8', ...dl });
      }
      default:
        throw new HttpError(404, 'Формат: html | json | csv | earl.json');
    }
  });

  // ---------- API түлхүүр ----------
  route('GET', '/api/keys', () => ({ keys: db.listKeys() }));
  route('POST', '/api/keys', async ({ req, key }) => {
    const b = await readJson(req);
    const name = String(b.name || '').trim();
    if (!name) throw new HttpError(400, 'name шаардлагатай');
    const created = db.createKey(name);
    db.log(key.id, 'key.create', String(created.id), { name });
    return [201, { key: created, notice: 'Түлхүүрийг зөвхөн одоо харуулна — хадгалж аваарай.' }];
  });
  route('DELETE', '/api/keys/:id', ({ params, key }) => {
    const id = int(params.id, 0, 0, 1e12);
    if (id === key.id) throw new HttpError(400, 'Одоо ашиглаж буй түлхүүрээ цуцлах боломжгүй');
    if (!db.revokeKey(id)) throw new HttpError(404, 'Түлхүүр олдсонгүй');
    db.log(key.id, 'key.revoke', String(id));
    return [204, null];
  });

  // ---------- статик (самбар) ----------
  async function serveStatic(req, res, pathname) {
    if (pathname === '/' || pathname === '/index.html') {
      // CSP nonce: самбар өөрөө hurteemj виджетийг ашигладаг — <style> элементүүд nonce-оор зөвшөөрөгдөнө
      const nonce = randomBytes(16).toString('base64');
      const html = (await readFile(path.join(PUBLIC, 'index.html'), 'utf8')).replaceAll('__NONCE__', nonce);
      return send(res, 200, html, {
        'content-type': 'text/html; charset=utf-8',
        'content-security-policy': `default-src 'self'; script-src 'self' 'nonce-${nonce}'; style-src 'self' 'nonce-${nonce}'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'`,
      });
    }
    const file = pathname === '/static/hurteemj.min.js' ? path.join(DIST, 'hurteemj.min.js') : path.join(PUBLIC, path.normalize(pathname).replace(/^(\.\.[/\\])+/, ''));
    if (!file.startsWith(PUBLIC) && !file.startsWith(DIST)) throw new HttpError(404, 'Олдсонгүй');
    let body;
    try { body = await readFile(file); } catch { throw new HttpError(404, 'Олдсонгүй'); }
    return send(res, 200, body, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'public, max-age=300' });
  }

  // ---------- handler ----------
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    try {
      if (config.corsOrigin) {
        res.setHeader('access-control-allow-origin', config.corsOrigin);
        res.setHeader('access-control-allow-headers', 'authorization, content-type, x-api-key');
        res.setHeader('access-control-allow-methods', 'GET, POST, PATCH, DELETE, OPTIONS');
        if (req.method === 'OPTIONS') return send(res, 204, '');
      }
      const r = routes.find((x) => x.method === req.method && x.re.test(pathname));
      if (!r) {
        if (req.method === 'GET' && !pathname.startsWith('/api/')) return await serveStatic(req, res, pathname);
        const exists = routes.some((x) => x.re.test(pathname));
        throw new HttpError(exists ? 405 : 404, exists ? 'Method not allowed' : 'Олдсонгүй');
      }
      let key = null;
      if (r.auth) {
        key = db.verifyKey(authKey(req));
        if (!key) return send(res, 401, { error: 'API түлхүүр буруу эсвэл байхгүй', code: 'UNAUTHORIZED' }, { 'www-authenticate': 'Bearer' });
      }
      const m = r.re.exec(pathname);
      const params = Object.fromEntries(r.keys.map((k, i) => [k, m[i + 1]]));
      const out = await r.handler({ req, res, params, query: url.searchParams, key });
      if (res.headersSent) return;
      if (Array.isArray(out)) return out[0] === 204 ? send(res, 204, '') : send(res, out[0], out[1]);
      return send(res, 200, out);
    } catch (e) {
      if (res.headersSent) return res.end();
      const status = e instanceof HttpError ? e.status : e instanceof BlockedUrlError ? 400 : 500;
      if (status === 500) config.log?.error?.('[api]', e);
      return send(res, status, { error: status === 500 ? 'Серверийн алдаа' : e.message, code: e.code });
    }
  };
}

/** shields.io загвартай SVG тэмдэг (README, сайтын хөлд байрлуулна) */
export function badgeSvg(score) {
  const g = gradeOf(score);
  const color = { good: '#0f7a35', fair: '#8a5a00', poor: '#a44100', bad: '#b3261e' }[g?.id] || '#5b6170';
  const right = score == null ? 'n/a' : `${score}/100`;
  const lw = 104, rw = 8 + right.length * 7.4;
  const w = lw + rw;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20" role="img" aria-label="WCAG 2.2: ${right}"><title>WCAG 2.2 хүртээмж: ${right}</title><rect width="${lw}" height="20" fill="#2b2f3a"/><rect x="${lw}" width="${rw}" height="20" fill="${color}"/><g fill="#fff" font-family="Verdana,DejaVu Sans,sans-serif" font-size="11"><text x="8" y="14">WCAG 2.2 a11y</text><text x="${lw + 6}" y="14">${right}</text></g></svg>`;
}
