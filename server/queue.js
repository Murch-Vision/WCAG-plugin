/**
 * Скан ажлын дараалал: нэг Chromium-ийг хуваалцаж, `concurrency` скан зэрэг ажиллуулна.
 * Скан дуусахад webhook илгээнэ; хуваарьт (daily/weekly) сайтуудыг минут тутам шалгана.
 */
import { createHmac } from 'node:crypto';
import { launchBrowser, scanSite, summarize } from '../src/node/scan.js';
import { aggregateScore, gradeOf } from '../src/core/score.js';

const SCHEDULES = { hourly: 3600e3, daily: 86400e3, weekly: 7 * 86400e3 };
export const nextRun = (schedule, from = Date.now()) => (SCHEDULES[schedule] ? new Date(from + SCHEDULES[schedule]).toISOString() : null);

export function createQueue({ db, config, log = console }) {
  const pending = [];
  const running = new Map(); // scanId -> AbortController
  let browser = null;
  let browserPromise = null;
  let stopped = false;
  let tickTimer = null;

  async function getBrowser() {
    if (browser?.isConnected()) return browser;
    if (!browserPromise) {
      browserPromise = (config.launchBrowser || launchBrowser)().then((b) => {
        browser = b;
        b.on('disconnected', () => { browser = null; });
        return b;
      }).finally(() => { browserPromise = null; });
    }
    return browserPromise;
  }

  function enqueue(scanId) {
    if (!pending.includes(scanId) && !running.has(scanId)) pending.push(scanId);
    pump();
  }

  function cancel(scanId) {
    const i = pending.indexOf(scanId);
    if (i >= 0) pending.splice(i, 1);
    running.get(scanId)?.abort();
    return db.cancelScan(scanId);
  }

  function pump() {
    while (!stopped && running.size < config.concurrency && pending.length) {
      const id = pending.shift();
      const ac = new AbortController();
      running.set(id, ac);
      run(id, ac.signal).catch((e) => log.error?.('[scan]', id, e)).finally(() => { running.delete(id); pump(); });
    }
  }

  async function run(id, signal) {
    if (!db.markRunning(id)) return; // цуцлагдсан эсвэл устгагдсан
    const scan = db.getScan(id);
    const site = db.getSite(scan.siteId);
    const o = scan.options || {};
    const t0 = Date.now();
    let done = 0;
    try {
      const b = await getBrowser();
      const result = await scanSite(b, scan.url, {
        level: o.level || 'AA',
        maxPages: Math.min(o.maxPages || 1, config.maxPages),
        viewports: o.viewports || ['desktop'],
        ignore: o.ignore || [],
        lang: o.lang || 'mn',
        allowPrivate: config.allowPrivate,
        timeout: config.pageTimeout,
        signal,
        onPage: (p, prog) => {
          if (signal.aborted) return;
          done++;
          db.addPage(id, p);
          db.setProgress(id, { pages: done, crawled: prog.done, total: prog.total, current: p.url });
        },
      });
      if (signal.aborted) return;
      const ok = result.pages.filter((p) => p.report);
      if (!ok.length) {
        const err = result.pages[0]?.error || 'Хуудас нээгдсэнгүй';
        notify(db.finishScan(id, { status: 'failed', error: err }), site);
        return;
      }
      const score = aggregateScore(ok.map((p) => p.score));
      const summary = { ...summarize(result.pages), durationMs: Date.now() - t0 };
      notify(db.finishScan(id, { status: 'done', score, grade: gradeOf(score)?.id || null, summary }), site);
    } catch (e) {
      if (signal.aborted) return;
      notify(db.finishScan(id, { status: 'failed', error: String(e?.message || e).split('\n')[0] }), site);
    }
  }

  /** Webhook: { event, scan, site, links } — HJ_WEBHOOK_SECRET байвал HMAC-SHA256 гарын үсэгтэй */
  async function notify(scan, site) {
    if (!site?.webhookUrl) return;
    const base = config.publicUrl || '';
    const body = JSON.stringify({
      event: scan.status === 'done' ? 'scan.completed' : 'scan.failed',
      scan: { id: scan.id, url: scan.url, status: scan.status, score: scan.score, grade: scan.grade, error: scan.error, finishedAt: scan.finishedAt,
        summary: scan.summary && { pages: scan.summary.pages, fail: scan.summary.fail, review: scan.summary.review, byImpact: scan.summary.byImpact, criteria: { failing: scan.summary.criteria?.failing, needsReview: scan.summary.criteria?.needsReview } } },
      site: { id: site.id, url: site.url, name: site.name },
      links: { scan: `${base}/api/scans/${scan.id}`, html: `${base}/api/scans/${scan.id}/report.html`, earl: `${base}/api/scans/${scan.id}/report.earl.json`, dashboard: `${base}/#/scans/${scan.id}` },
    });
    const headers = { 'content-type': 'application/json', 'user-agent': 'hurteemj-scanner' };
    if (config.webhookSecret) headers['x-hurteemj-signature'] = `sha256=${createHmac('sha256', config.webhookSecret).update(body).digest('hex')}`;
    try {
      const res = await fetch(site.webhookUrl, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000), redirect: 'error' });
      db.log(null, 'webhook', scan.id, { status: res.status, url: site.webhookUrl });
    } catch (e) {
      db.log(null, 'webhook.failed', scan.id, { error: String(e?.message || e), url: site.webhookUrl });
    }
  }

  /** Хуваарьтай сайтуудыг дараалалд оруулна */
  function tick() {
    const at = new Date().toISOString();
    for (const site of db.dueSites(at)) {
      db.updateSite(site.id, { nextRunAt: nextRun(site.schedule) });
      const scan = db.createScan({ siteId: site.id, url: site.url, source: 'schedule', options: { level: site.level, maxPages: site.maxPages, viewports: site.viewports, ignore: site.ignore } });
      db.log(null, 'scan.scheduled', scan.id, { site: site.id });
      enqueue(scan.id);
    }
    if (config.keepScans) db.prune(config.keepScans);
  }

  return {
    enqueue,
    cancel,
    start() {
      for (const id of db.recoverScans()) enqueue(id);
      tick();
      tickTimer = setInterval(tick, config.tickMs || 60_000);
      tickTimer.unref?.();
    },
    stats: () => ({ running: running.size, pending: pending.length, concurrency: config.concurrency }),
    async stop() {
      stopped = true;
      clearInterval(tickTimer);
      for (const ac of running.values()) ac.abort();
      await browser?.close().catch(() => {});
    },
    tick,
  };
}
