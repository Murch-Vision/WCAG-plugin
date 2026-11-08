/**
 * Node талын скан цөм (Playwright): CLI болон скан үйлчилгээ (server/) хоёулаа ашиглана.
 *
 *   const browser = await launchBrowser();
 *   const result = await scanSite(browser, 'https://example.mn', { maxPages: 5, viewports: ['desktop', 'mobile'] });
 */
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeScore, aggregateScore, gradeOf } from '../core/score.js';
import { guardContext, assertPublicUrl } from './netguard.js';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
export const BUNDLE = path.join(here, '..', '..', 'dist', 'hurteemj.js');

export const VIEWPORTS = {
  desktop: { width: 1280, height: 800 },
  // 1.4.10 Reflow: 320 CSS px өргөнд хэвтээ гүйлгэлт шалгагдана (reflow дүрэм ≤420px дээр л ажилладаг)
  mobile: { width: 320, height: 640, isMobile: true, hasTouch: true },
};

const SKIP_EXT = /\.(pdf|zip|rar|7z|gz|docx?|xlsx?|pptx?|jpe?g|png|gif|webp|svg|mp4|mp3|webm|avi|mov|exe|dmg|apk|iso|csv|json|xml|rss)$/i;

export async function launchBrowser(options = {}) {
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { throw new Error('playwright суулгана уу: npm i playwright && npx playwright install chromium'); }
  if (!existsSync(BUNDLE)) throw new Error('dist/hurteemj.js алга — эхлээд `npm run build`');
  return chromium.launch({ args: ['--disable-dev-shm-usage'], ...options });
}

/**
 * Нэг хуудсыг нэг viewport-оор шалгана.
 * @returns {Promise<{url, finalUrl, viewport, report, earl, score, links, error?}>}
 */
export async function scanPage(browser, url, o = {}) {
  const vp = typeof o.viewport === 'string' ? (VIEWPORTS[o.viewport] || parseViewport(o.viewport)) : (o.viewport || VIEWPORTS.desktop);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    isMobile: !!vp.isMobile, hasTouch: !!vp.hasTouch,
    locale: o.lang === 'en' ? 'en-US' : 'mn-MN',
    userAgent: o.userAgent,
    ignoreHTTPSErrors: false,
    serviceWorkers: 'block',
  });
  const blocked = [];
  await guardContext(ctx, { allowPrivate: o.allowPrivate, onBlocked: (u) => blocked.push(u) });
  const page = await ctx.newPage();
  const viewportName = typeof o.viewport === 'string' ? o.viewport : 'desktop';
  try {
    // Сайтын скриптээс өмнө listener tracking (2.1.1 div[onclick]-ийг илүү сайн илрүүлнэ)
    await page.addInitScript(() => {
      const set = new WeakSet(); window.__hurteemjClickTargets = set;
      const orig = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (t, f, op) { if (t === 'click' && this.nodeType === 1) set.add(this); return orig.call(this, t, f, op); };
      window.HurteemjConfig = { auto: false };
    });
    const res = await page.goto(url, { waitUntil: 'load', timeout: o.timeout ?? 60000 });
    if (res && !res.ok() && res.status() >= 400) throw new Error(`HTTP ${res.status()}`);
    const ct = res?.headers()['content-type'] || '';
    if (ct && !/html|xml/i.test(ct)) throw new Error(`HTML биш контент (${ct.split(';')[0]})`);
    await page.waitForTimeout(o.wait ?? 500);
    await page.addScriptTag({ path: BUNDLE });
    const out = await page.evaluate(async (o) => {
      const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
      const h = window.Hurteemj.init({ level: o.level, fix: o.fix || false, deep: o.deep !== false, widget: false, observe: false, ignore: o.ignore || [], uiLang: o.lang || 'mn', fetchStyles: o.fetchStyles !== false, force: true });
      await ready;
      const links = [...document.querySelectorAll('a[href]')].map((a) => a.href);
      return { report: h.toJSON(), earl: o.earl ? h.toEARL() : null, links };
    }, { level: o.level || 'AA', fix: o.fix, deep: o.deep, ignore: o.ignore, lang: o.lang, fetchStyles: o.fetchStyles, earl: o.earl !== false });
    const { score, grade, rules } = computeScore(out.report);
    return { url, finalUrl: page.url(), viewport: viewportName, report: out.report, earl: out.earl, score, grade: grade?.id || null, rules, links: out.links, blocked };
  } catch (e) {
    return { url, finalUrl: page.url(), viewport: viewportName, error: String(e?.message || e).split('\n')[0], blocked };
  } finally {
    await ctx.close().catch(() => {});
  }
}

function parseViewport(s) {
  const m = /^(\d+)x(\d+)$/.exec(String(s));
  return m ? { width: +m[1], height: +m[2] } : VIEWPORTS.desktop;
}

/** Нэг сайтын ижил origin-тэй, HTML байж болох холбоосууд */
export function sameOriginLinks(links, base) {
  const origin = new URL(base).origin;
  const out = new Set();
  for (const l of links || []) {
    let u;
    try { u = new URL(l, base); } catch { continue; }
    if (u.origin !== origin || !/^https?:$/.test(u.protocol)) continue;
    if (SKIP_EXT.test(u.pathname)) continue;
    if (/\/(logout|signout|sign-out|гарах)\b/i.test(u.pathname)) continue; // сешн устгах холбоосыг дагахгүй
    u.hash = '';
    out.add(u.href);
  }
  return [...out];
}

/**
 * Сайтыг BFS-ээр (эхлэл хуудаснаас) maxPages хүртэл шалгана.
 * @param {object} o — { maxPages=1, viewports=['desktop'], level, allowPrivate, onPage(result), signal }
 */
export async function scanSite(browser, startUrl, o = {}) {
  const start = await assertPublicUrl(startUrl, { allowPrivate: o.allowPrivate });
  const maxPages = Math.max(1, Math.min(o.maxPages || 1, 100));
  const viewports = (o.viewports && o.viewports.length ? o.viewports : ['desktop']).filter((v) => VIEWPORTS[v] || /^\d+x\d+$/.test(v));
  const queue = [start];
  const seen = new Set([start]);
  const pages = [];
  let crawled = 0;
  while (queue.length && crawled < maxPages) {
    if (o.signal?.aborted) break;
    const url = queue.shift();
    crawled++;
    let links = [];
    for (const vp of viewports) {
      if (o.signal?.aborted) break;
      const r = await scanPage(browser, url, { ...o, viewport: vp });
      if (vp === viewports[0]) links = r.links || [];
      delete r.links;
      pages.push(r);
      await o.onPage?.(r, { done: crawled, total: Math.min(maxPages, crawled + queue.length) });
    }
    for (const l of sameOriginLinks(links, url)) {
      if (!seen.has(l) && seen.size < maxPages * 20) { seen.add(l); queue.push(l); }
    }
  }
  const score = aggregateScore(pages.map((p) => p.score));
  return { url: start, pages, score, grade: gradeOf(score)?.id || null, summary: summarize(pages) };
}

/** Олон хуудасны тайлангийн нэгдсэн тоо */
export function summarize(pages) {
  const ok = pages.filter((p) => p.report);
  const sum = (fn) => ok.reduce((a, p) => a + fn(p.report.summary), 0);
  const byImpact = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const p of ok) for (const k of Object.keys(byImpact)) byImpact[k] += p.report.summary.byImpact?.[k] || 0;
  // SC тус бүрийн төлөв: аль нэг хуудсанд fail бол fail
  const sc = {};
  const rank = { fail: 3, review: 2, 'no-issues-detected': 1, manual: 0 };
  for (const p of ok) for (const c of p.report.criteria || []) {
    if (!sc[c.id] || rank[c.status] > rank[sc[c.id].status]) sc[c.id] = { id: c.id, level: c.level, title: c.title, status: c.status, new22: c.new22 };
  }
  const criteria = Object.values(sc);
  return {
    pages: pages.length,
    errors: pages.length - ok.length,
    fail: sum((s) => s.fail),
    review: sum((s) => s.review),
    byImpact,
    criteria: {
      total: criteria.length,
      failing: criteria.filter((c) => c.status === 'fail').length,
      needsReview: criteria.filter((c) => c.status === 'review').length,
      manualOnly: criteria.filter((c) => c.status === 'manual').length,
      noIssuesDetected: criteria.filter((c) => c.status === 'no-issues-detected').length,
      list: criteria,
    },
  };
}
