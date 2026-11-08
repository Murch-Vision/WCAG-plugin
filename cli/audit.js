#!/usr/bin/env node
/**
 * hurteemj-audit — CI/CD ба серверт зориулсан WCAG 2.2 аудит.
 *
 *   npx hurteemj-audit https://example.mn --level AA --fail-on serious --format html --out report.html
 *   npx hurteemj-audit ./dist/index.html --viewport 320x640   (1.4.10 Reflow шалгалт)
 *
 * Exit code: 0 — босгоос дээш зөрчилгүй, 1 — зөрчил олдсон, 2 — ажиллуулах алдаа
 */
import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { launchBrowser, scanPage, scanSite } from '../src/node/scan.js';
import { textReport, mdReport, htmlReport, csvReport } from '../src/node/report.js';
import { aggregateScore } from '../src/core/score.js';

function parseArgs(argv) {
  const o = { urls: [], level: 'AA', format: 'text', failOn: 'serious', viewport: '1280x800', deep: true, lang: 'mn', fix: false, wait: 500, fetchStyles: true, maxPages: 1, minScore: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i];
    if (a === '--level') o.level = next().toUpperCase();
    else if (a === '--format') o.format = next();
    else if (a === '--out') o.out = next();
    else if (a === '--fail-on') o.failOn = next();
    else if (a === '--viewport') o.viewport = next();
    else if (a === '--no-deep') o.deep = false;
    else if (a === '--no-fetch-styles') o.fetchStyles = false;
    else if (a === '--lang') o.lang = next();
    else if (a === '--fix') o.fix = /^(safe|heuristic)$/.test(argv[i + 1] || '') ? argv[++i] : 'safe';
    else if (a === '--wait') o.wait = +next();
    else if (a === '--ignore') o.ignore = next().split(',');
    else if (a === '--max-pages') o.maxPages = Math.max(1, parseInt(next(), 10) || 1);
    else if (a === '--min-score') o.minScore = Number(next());
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('--')) { console.error(`Танигдахгүй сонголт: ${a}`); o.help = true; o.badArg = true; }
    else o.urls.push(a);
  }
  if (!['A', 'AA', 'AAA'].includes(o.level)) { console.error(`--level нь A|AA|AAA байх ёстой (${o.level})`); o.badArg = true; }
  if (!['text', 'json', 'html', 'md', 'earl', 'csv'].includes(o.format)) { console.error(`--format утга буруу (${o.format})`); o.badArg = true; }
  if (!['critical', 'serious', 'moderate', 'minor', 'none'].includes(o.failOn)) { console.error(`--fail-on утга буруу (${o.failOn})`); o.badArg = true; }
  if (!/^\d+x\d+$/.test(o.viewport)) { console.error(`--viewport нь 1280x800 хэлбэртэй байна (${o.viewport})`); o.badArg = true; }
  if (o.minScore != null && !(o.minScore >= 0 && o.minScore <= 100)) { console.error('--min-score нь 0–100'); o.badArg = true; }
  return o;
}

const HELP = `hurteemj-audit <url|file>... [options]
  --level A|AA|AAA        Зорилтот түвшин (анхдагч: AA)
  --format text|json|html|md|csv|earl  Тайлангийн формат (earl = W3C EARL JSON-LD, ACT Rules-тэй уялдсан)
  --out <file>            Тайланг файлд бичих
  --fail-on critical|serious|moderate|minor|none  CI-г унагах босго (анхдагч: serious)
  --viewport 1280x800     Дэлгэцийн хэмжээ (320x640 = Reflow шалгалт)
  --fix safe|heuristic    Plugin юуг автоматаар засахыг харуулах
  --ignore ".ads,#chat"   Шалгахгүй selector-ууд
  --max-pages 10          Эхлэл хуудаснаас ижил домэйны холбоосыг дагаж N хуудас шалгах
  --min-score 80          Нийт оноо үүнээс бага бол CI-г унагах (0–100)
  --lang mn|en            Тайлангийн хэл
  --no-deep               1.4.12 текстийн зайн гүн шалгалтыг алгасах
  --no-fetch-styles       Гадны (CDN) CSS-ийг татаж 2.4.7 шалгахгүй`;

const RANK = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function toUrl(u) {
  if (/^https?:\/\//.test(u) || u.startsWith('file:')) return u;
  if (existsSync(u)) return pathToFileURL(path.resolve(u)).href;
  return `https://${u}`;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || o.badArg || !o.urls.length) { console.log(HELP); process.exit(o.help && !o.badArg ? 0 : 2); }
  let browser;
  try { browser = await launchBrowser(); } catch (e) { console.error(e.message); process.exit(2); }
  // CLI нь хөгжүүлэгчийн өөрийн машин/CI дээр ажилладаг тул localhost, file:// зөвшөөрнө
  const opts = { level: o.level, fix: o.fix, deep: o.deep, lang: o.lang, wait: o.wait, ignore: o.ignore, fetchStyles: o.fetchStyles, viewport: o.viewport, earl: o.format === 'earl', allowPrivate: true };
  const pages = [];
  try {
    for (const u of o.urls) {
      const url = toUrl(u);
      if (o.maxPages > 1 && /^https?:/.test(url)) {
        const site = await scanSite(browser, url, { ...opts, maxPages: o.maxPages, viewports: [o.viewport] });
        pages.push(...site.pages);
      } else {
        pages.push(await scanPage(browser, url, opts));
      }
    }
  } catch (e) {
    console.error(e.message); await browser.close(); process.exit(2);
  }
  await browser.close();
  const failed = pages.filter((p) => p.error);
  for (const p of failed) console.error(`hurteemj: ${p.url}: ${p.error}`);
  if (failed.length === pages.length) process.exit(2);
  const ok = pages.filter((p) => p.report);
  const score = aggregateScore(ok.map((p) => p.score));
  const fmt = {
    json: () => JSON.stringify(ok.length === 1 ? { ...ok[0].report, score: ok[0].score } : ok.map((p) => ({ ...p.report, score: p.score, viewport: p.viewport })), null, 2),
    earl: () => JSON.stringify(ok.length === 1 ? ok[0].earl : ok.map((p) => p.earl), null, 2),
    html: () => htmlReport(pages, { lang: o.lang, score, url: o.urls.join(', ') }),
    md: () => mdReport(pages, o.lang),
    csv: () => csvReport(pages, o.lang),
    text: () => textReport(pages, o.lang) + (ok.length > 1 ? `\n\nscore ${score}/100 (${ok.length} pages)` : ''),
  }[o.format];
  const text = fmt();
  if (o.out) { writeFileSync(o.out, text); console.log(`→ ${o.out}`); } else console.log(text);
  const threshold = RANK[o.failOn];
  // --fix өгсөн бол plugin-ийн засаж чадах олдворыг босгонд тооцохгүй (үлдсэн зөрчил л CI-г унагана)
  const bad = o.failOn === 'none' ? 0 : ok.flatMap((p) => p.report.findings).filter((f) => f.outcome === 'fail' && !f.fixed && RANK[f.impact] <= threshold).length;
  const lowScore = o.minScore != null && score != null && score < o.minScore;
  if (o.out || o.format !== 'text') console.error(`hurteemj: score ${score}/100 · ${bad} finding(s) at or above "${o.failOn}"`);
  if (lowScore) console.error(`hurteemj: score ${score} < --min-score ${o.minScore}`);
  process.exit(bad || lowScore || failed.length ? 1 : 0);
}

main();
