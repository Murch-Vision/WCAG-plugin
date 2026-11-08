/**
 * Хадгалалт: Node.js-ийн суулгасан SQLite (node:sqlite, Node ≥ 22.13) — нэмэлт хамааралгүй.
 * Хүснэгтүүд: sites, scans, pages, api_keys, audit_log (append-only).
 */
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

// node:sqlite нь "experimental" анхааруулга хэвлэдэг — зөвхөн тэрийг дарна
const origEmit = process.emitWarning;
process.emitWarning = function (w, ...rest) {
  const text = typeof w === 'string' ? w : w?.message;
  if (/SQLite is an experimental feature/.test(text || '')) return;
  return origEmit.call(this, w, ...rest);
};
const { DatabaseSync } = await import('node:sqlite');

const now = () => new Date().toISOString();
const json = (v) => (v == null ? null : JSON.stringify(v));
const parse = (s, d = null) => { if (s == null) return d; try { return JSON.parse(s); } catch { return d; } };
export const hashKey = (key) => createHash('sha256').update(String(key)).digest('hex');

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sites (
  id INTEGER PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  name TEXT,
  level TEXT NOT NULL DEFAULT 'AA',
  max_pages INTEGER NOT NULL DEFAULT 1,
  viewports TEXT NOT NULL DEFAULT '["desktop"]',
  ignore TEXT NOT NULL DEFAULT '[]',
  schedule TEXT,
  next_run_at TEXT,
  webhook_url TEXT,
  badge_token TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS scans (
  id TEXT PRIMARY KEY,
  site_id INTEGER NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'api',
  options TEXT NOT NULL,
  progress TEXT,
  score INTEGER,
  grade TEXT,
  summary TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  started_at TEXT,
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS scans_site ON scans(site_id, created_at DESC);
CREATE INDEX IF NOT EXISTS scans_status ON scans(status);
CREATE TABLE IF NOT EXISTS pages (
  id INTEGER PRIMARY KEY,
  scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  viewport TEXT NOT NULL,
  score INTEGER,
  grade TEXT,
  fail INTEGER,
  review INTEGER,
  error TEXT,
  report TEXT,
  earl TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS pages_scan ON pages(scan_id);
CREATE TABLE IF NOT EXISTS api_keys (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  prefix TEXT NOT NULL,
  hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  last_used_at TEXT,
  revoked_at TEXT
);
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY,
  at TEXT NOT NULL,
  key_id INTEGER,
  action TEXT NOT NULL,
  target TEXT,
  detail TEXT
);
`;

function siteRow(r) {
  if (!r) return null;
  return {
    id: r.id, url: r.url, name: r.name, level: r.level, maxPages: r.max_pages,
    viewports: parse(r.viewports, ['desktop']), ignore: parse(r.ignore, []), schedule: r.schedule,
    nextRunAt: r.next_run_at, webhookUrl: r.webhook_url, badgeToken: r.badge_token, createdAt: r.created_at,
  };
}

function scanRow(r) {
  if (!r) return null;
  return {
    id: r.id, siteId: r.site_id, url: r.url, status: r.status, source: r.source, options: parse(r.options, {}),
    progress: parse(r.progress), score: r.score, grade: r.grade, summary: parse(r.summary), error: r.error,
    createdAt: r.created_at, startedAt: r.started_at, finishedAt: r.finished_at,
  };
}

export function openDb(file = ':memory:') {
  if (file !== ':memory:') mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(SCHEMA);
  const q = (sql) => db.prepare(sql);

  const api = {
    raw: db,
    close: () => db.close(),

    // ---- API түлхүүр ----
    createKey(name) {
      const key = `hj_${randomBytes(24).toString('base64url')}`;
      const r = q('INSERT INTO api_keys (name, prefix, hash, created_at) VALUES (?, ?, ?, ?)').run(String(name || 'key').slice(0, 80), key.slice(0, 7), hashKey(key), now());
      return { id: Number(r.lastInsertRowid), name, key };
    },
    importKey(name, key) {
      const h = hashKey(key);
      if (q('SELECT id FROM api_keys WHERE hash = ?').get(h)) return;
      q('INSERT INTO api_keys (name, prefix, hash, created_at) VALUES (?, ?, ?, ?)').run(name, String(key).slice(0, 7), h, now());
    },
    verifyKey(key) {
      if (!key) return null;
      const r = q('SELECT id, name FROM api_keys WHERE hash = ? AND revoked_at IS NULL').get(hashKey(key));
      if (r) q('UPDATE api_keys SET last_used_at = ? WHERE id = ?').run(now(), r.id);
      return r || null;
    },
    listKeys: () => q('SELECT id, name, prefix, created_at AS createdAt, last_used_at AS lastUsedAt, revoked_at AS revokedAt FROM api_keys ORDER BY id').all(),
    revokeKey: (id) => q('UPDATE api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(now(), id).changes > 0,
    activeKeyCount: () => q('SELECT COUNT(*) AS n FROM api_keys WHERE revoked_at IS NULL').get().n,

    // ---- Audit log (append-only) ----
    log(keyId, action, target, detail) {
      q('INSERT INTO audit_log (at, key_id, action, target, detail) VALUES (?, ?, ?, ?, ?)').run(now(), keyId ?? null, action, target ?? null, json(detail));
    },
    listLog: (limit = 100) => q('SELECT l.id, l.at, l.action, l.target, l.detail, k.name AS keyName FROM audit_log l LEFT JOIN api_keys k ON k.id = l.key_id ORDER BY l.id DESC LIMIT ?').all(limit).map((r) => ({ ...r, detail: parse(r.detail) })),

    // ---- Сайт ----
    findSiteByUrl: (url) => siteRow(q('SELECT * FROM sites WHERE url = ?').get(url)),
    getSite: (id) => siteRow(q('SELECT * FROM sites WHERE id = ?').get(id)),
    getSiteByBadge: (token) => siteRow(q('SELECT * FROM sites WHERE badge_token = ?').get(token)),
    createSite(s) {
      const r = q(`INSERT INTO sites (url, name, level, max_pages, viewports, ignore, schedule, next_run_at, webhook_url, badge_token, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(s.url, s.name || null, s.level || 'AA', s.maxPages || 1, json(s.viewports || ['desktop']),
        json(s.ignore || []), s.schedule || null, s.nextRunAt || null, s.webhookUrl || null, randomBytes(12).toString('base64url'), now());
      return api.getSite(Number(r.lastInsertRowid));
    },
    updateSite(id, s) {
      const cur = api.getSite(id);
      if (!cur) return null;
      const m = { ...cur, ...s };
      q(`UPDATE sites SET name = ?, level = ?, max_pages = ?, viewports = ?, ignore = ?, schedule = ?, next_run_at = ?, webhook_url = ? WHERE id = ?`)
        .run(m.name || null, m.level, m.maxPages, json(m.viewports), json(m.ignore), m.schedule || null, m.nextRunAt || null, m.webhookUrl || null, id);
      return api.getSite(id);
    },
    deleteSite: (id) => q('DELETE FROM sites WHERE id = ?').run(id).changes > 0,
    listSites() {
      const sites = q('SELECT * FROM sites ORDER BY COALESCE(name, url)').all().map(siteRow);
      const last = q(`SELECT id, status, score, grade, summary, finished_at, created_at FROM scans WHERE site_id = ? ORDER BY created_at DESC LIMIT 1`);
      const hist = q(`SELECT score, finished_at FROM scans WHERE site_id = ? AND status = 'done' AND score IS NOT NULL ORDER BY finished_at DESC LIMIT 20`);
      return sites.map((s) => {
        const l = last.get(s.id);
        return {
          ...s,
          lastScan: l ? { id: l.id, status: l.status, score: l.score, grade: l.grade, finishedAt: l.finished_at, createdAt: l.created_at, summary: parse(l.summary) } : null,
          history: hist.all(s.id).reverse().map((h) => ({ score: h.score, at: h.finished_at })),
        };
      });
    },
    dueSites: (at) => q('SELECT * FROM sites WHERE schedule IS NOT NULL AND next_run_at IS NOT NULL AND next_run_at <= ?').all(at).map(siteRow),

    // ---- Скан ----
    createScan({ siteId, url, options, source = 'api' }) {
      const id = randomUUID();
      q('INSERT INTO scans (id, site_id, url, status, source, options, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)').run(id, siteId, url, 'queued', source, json(options), now());
      return api.getScan(id);
    },
    getScan: (id) => scanRow(q('SELECT * FROM scans WHERE id = ?').get(String(id))),
    listScans({ siteId, status, limit = 50 } = {}) {
      const where = [];
      const args = [];
      if (siteId) { where.push('site_id = ?'); args.push(siteId); }
      if (status) { where.push('status = ?'); args.push(status); }
      return q(`SELECT * FROM scans ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC LIMIT ?`).all(...args, Math.min(limit, 500)).map(scanRow);
    },
    markRunning: (id) => q("UPDATE scans SET status = 'running', started_at = ? WHERE id = ? AND status = 'queued'").run(now(), id).changes > 0,
    setProgress: (id, p) => q('UPDATE scans SET progress = ? WHERE id = ?').run(json(p), id),
    finishScan(id, { status, score = null, grade = null, summary = null, error = null }) {
      q('UPDATE scans SET status = ?, score = ?, grade = ?, summary = ?, error = ?, finished_at = ? WHERE id = ?').run(status, score, grade, json(summary), error, now(), id);
      return api.getScan(id);
    },
    cancelScan: (id) => q("UPDATE scans SET status = 'canceled', finished_at = ? WHERE id = ? AND status IN ('queued', 'running')").run(now(), id).changes > 0,
    deleteScan: (id) => q('DELETE FROM scans WHERE id = ?').run(id).changes > 0,
    /** Сервер унтарсан үед дутуу үлдсэн скануудыг дахин дараалалд оруулна */
    recoverScans() {
      q("UPDATE scans SET status = 'queued', started_at = NULL, progress = NULL WHERE status = 'running'").run();
      q('DELETE FROM pages WHERE scan_id IN (SELECT id FROM scans WHERE status = ?)').run('queued');
      return q("SELECT id FROM scans WHERE status = 'queued' ORDER BY created_at").all().map((r) => r.id);
    },

    // ---- Хуудас ----
    addPage(scanId, p) {
      const s = p.report?.summary;
      q('INSERT INTO pages (scan_id, url, viewport, score, grade, fail, review, error, report, earl, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(scanId, p.finalUrl || p.url, p.viewport, p.score ?? null, p.grade ?? null, s ? s.fail : null, s ? s.review : null, p.error || null, json(p.report), json(p.earl), now());
    },
    listPages: (scanId) => q('SELECT id, url, viewport, score, grade, fail, review, error FROM pages WHERE scan_id = ? ORDER BY id').all(scanId),
    getPage(scanId, pageId) {
      const r = q('SELECT * FROM pages WHERE scan_id = ? AND id = ?').get(scanId, pageId);
      return r ? { id: r.id, url: r.url, viewport: r.viewport, score: r.score, grade: r.grade, error: r.error, report: parse(r.report), earl: parse(r.earl) } : null;
    },
    pagesWithReports: (scanId) => q('SELECT * FROM pages WHERE scan_id = ? ORDER BY id').all(scanId).map((r) => ({ id: r.id, url: r.url, viewport: r.viewport, score: r.score, grade: r.grade, error: r.error, report: parse(r.report), earl: parse(r.earl) })),

    /** Хуучин скануудыг устгах (сайт бүрт сүүлийн N-ийг үлдээнэ) */
    prune(keepPerSite = 50) {
      return q(`DELETE FROM scans WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY site_id ORDER BY created_at DESC) AS rn FROM scans WHERE status NOT IN ('queued','running')) WHERE rn > ?)`).run(keepPerSite).changes;
    },
  };
  return api;
}
