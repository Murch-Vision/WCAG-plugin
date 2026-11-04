#!/usr/bin/env node
/**
 * hurteemj-audit — CI/CD ба серверт зориулсан WCAG 2.2 аудит.
 *
 *   npx hurteemj-audit https://example.mn --level AA --fail-on serious --format html --out report.html
 *   npx hurteemj-audit ./dist/index.html --viewport 320x640   (1.4.10 Reflow шалгалт)
 *
 * Exit code: 0 — босгоос дээш зөрчилгүй, 1 — зөрчил олдсон, 2 — ажиллуулах алдаа
 */
import { createRequire } from 'node:module';
import { writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const BUNDLE = path.join(here, '..', 'dist', 'hurteemj.js');

function parseArgs(argv) {
  const o = { urls: [], level: 'AA', format: 'text', failOn: 'serious', viewport: '1280x800', deep: true, lang: 'mn', fix: false, wait: 500, fetchStyles: true };
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
    else if (a === '-h' || a === '--help') o.help = true;
    else if (a.startsWith('--')) { console.error(`Танигдахгүй сонголт: ${a}`); o.help = true; o.badArg = true; }
    else o.urls.push(a);
  }
  if (!['A', 'AA', 'AAA'].includes(o.level)) { console.error(`--level нь A|AA|AAA байх ёстой (${o.level})`); o.badArg = true; }
  if (!['text', 'json', 'html', 'md', 'earl'].includes(o.format)) { console.error(`--format утга буруу (${o.format})`); o.badArg = true; }
  if (!['critical', 'serious', 'moderate', 'minor', 'none'].includes(o.failOn)) { console.error(`--fail-on утга буруу (${o.failOn})`); o.badArg = true; }
  if (!/^\d+x\d+$/.test(o.viewport)) { console.error(`--viewport нь 1280x800 хэлбэртэй байна (${o.viewport})`); o.badArg = true; }
  return o;
}

const HELP = `hurteemj-audit <url|file>... [options]
  --level A|AA|AAA        Зорилтот түвшин (анхдагч: AA)
  --format text|json|html|md|earl  Тайлангийн формат (earl = W3C EARL JSON-LD, ACT Rules-тэй уялдсан)
  --out <file>            Тайланг файлд бичих
  --fail-on critical|serious|moderate|minor|none  CI-г унагах босго (анхдагч: serious)
  --viewport 1280x800     Дэлгэцийн хэмжээ (320x640 = Reflow шалгалт)
  --fix safe|heuristic    Plugin юуг автоматаар засахыг харуулах
  --ignore ".ads,#chat"   Шалгахгүй selector-ууд
  --lang mn|en            Тайлангийн хэл
  --no-deep               1.4.12 текстийн зайн гүн шалгалтыг алгасах
  --no-fetch-styles       Гадны (CDN) CSS-ийг татаж 2.4.7 шалгахгүй`;

const RANK = { critical: 0, serious: 1, moderate: 2, minor: 3 };
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toUrl(u) {
  if (/^https?:\/\//.test(u) || u.startsWith('file:')) return u;
  if (existsSync(u)) return pathToFileURL(path.resolve(u)).href;
  return `https://${u}`;
}

async function auditOne(browser, url, o) {
  const [w, h] = o.viewport.split('x').map(Number);
  const ctx = await browser.newContext({ viewport: { width: w, height: h || 800 }, locale: o.lang === 'mn' ? 'mn-MN' : 'en-US' });
  const page = await ctx.newPage();
  // Сайтын скриптээс өмнө listener tracking суулгана (2.1.1 div[onclick]-ийг илүү сайн илрүүлнэ)
  await page.addInitScript(() => {
    const set = new WeakSet(); window.__hurteemjClickTargets = set;
    const orig = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (t, f, op) { if (t === 'click' && this.nodeType === 1) set.add(this); return orig.call(this, t, f, op); };
    window.HurteemjConfig = { auto: false };
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(o.wait);
  await page.addScriptTag({ path: BUNDLE });
  const report = await page.evaluate(async (o) => {
    const p = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    const h = window.Hurteemj.init({ level: o.level, fix: o.fix, deep: o.deep, widget: false, observe: false, ignore: o.ignore || [], uiLang: o.lang, fetchStyles: o.fetchStyles, force: true });
    await p;
    const json = h.toJSON();
    json.earl = o.format === 'earl' ? h.toEARL() : undefined;
    return json;
  }, o);
  await ctx.close();
  return report;
}

function textReport(reports, lang) {
  const out = [];
  for (const r of reports) {
    out.push(`\n■ ${r.url}\n  ${r.standard} ${r.level} · ${r.summary.fail} fail · ${r.summary.review} review · ${r.summary.fixed} fixable-now`);
    out.push(`  SC: ${r.summary.criteria.failing} failing, ${r.summary.criteria.needsReview} review, ${r.summary.criteria.manualOnly} manual-only of ${r.summary.criteria.total}`);
    for (const f of r.findings) {
      const tag = f.generated ? 'GEN ' : f.fixed ? 'FIX ' : f.outcome === 'fail' ? 'FAIL' : 'REV ';
      out.push(`  [${tag}] ${f.impact.padEnd(8)} ${f.sc.join(',').padEnd(14)} ${f.message}\n         ${f.selector || ''}`);
    }
    out.push(`  ${r.disclaimer[lang] || r.disclaimer.en}`);
  }
  return out.join('\n');
}

function mdReport(reports, lang) {
  return reports.map((r) => `## ${r.url}\n\n**${r.standard} ${r.level}** — ${r.summary.fail} fail · ${r.summary.review} review\n\n| Төлөв | Нөлөө | SC | Тайлбар | Selector |\n|---|---|---|---|---|\n${r.findings.map((f) => `| ${f.fixed ? '🔧' : f.outcome === 'fail' ? '❌' : '⚠️'} | ${f.impact} | ${f.sc.join(', ')} | ${String(f.message).replace(/\|/g, '\\|')} | \`${f.selector || ''}\` |`).join('\n')}\n\n> ${r.disclaimer[lang] || r.disclaimer.en}\n`).join('\n');
}

function htmlReport(reports, lang) {
  const sc = (r) => r.criteria.map((c) => `<tr class="s-${c.status}"><td>${c.id}${c.new22 ? ' <span class="new">2.2</span>' : ''}</td><td>${esc(c.title[lang] || c.title.en)}</td><td>${c.level}</td><td>${c.status}</td><td>${c.counts.fail}/${c.counts.review}</td></tr>`).join('');
  const body = reports.map((r) => `<section><h2>${esc(r.url)}</h2>
<p><strong>${esc(r.standard)} ${r.level}</strong> · ${esc(r.timestamp)}</p>
<ul class="stats"><li><b>${r.summary.fail}</b> ${lang === 'mn' ? 'зөрчил' : 'failures'}</li><li><b>${r.summary.review}</b> ${lang === 'mn' ? 'хянах' : 'to review'}</li><li><b>${r.summary.criteria.manualOnly}</b> ${lang === 'mn' ? 'гараар шалгах SC' : 'manual-only SC'}</li></ul>
<p class="disc">${esc(r.disclaimer[lang] || r.disclaimer.en)}</p>
<h3>${lang === 'mn' ? 'Олдворууд' : 'Findings'}</h3>
<table><thead><tr><th scope="col">${lang === 'mn' ? 'Төлөв' : 'Outcome'}</th><th scope="col">${lang === 'mn' ? 'Нөлөө' : 'Impact'}</th><th scope="col">SC</th><th scope="col">${lang === 'mn' ? 'Тайлбар' : 'Message'}</th><th scope="col">Selector / HTML</th></tr></thead><tbody>
${r.findings.map((f) => `<tr><td>${f.fixed ? 'fixable' : f.outcome}</td><td>${f.impact}</td><td>${f.sc.join(', ')}</td><td>${esc(f.message)}</td><td><code>${esc(f.selector)}</code><br><code class="html">${esc(f.html)}</code></td></tr>`).join('')}
</tbody></table>
<h3>WCAG 2.2 ${lang === 'mn' ? 'шалгуурууд' : 'criteria'}</h3>
<table><thead><tr><th scope="col">SC</th><th scope="col">${lang === 'mn' ? 'Нэр' : 'Title'}</th><th scope="col">${lang === 'mn' ? 'Түвшин' : 'Level'}</th><th scope="col">${lang === 'mn' ? 'Төлөв' : 'Status'}</th><th scope="col">fail/review</th></tr></thead><tbody>${sc(r)}</tbody></table></section>`).join('');
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Hurteemj WCAG 2.2 ${lang === 'mn' ? 'тайлан' : 'report'}</title>
<style>body{font:16px/1.5 system-ui,sans-serif;margin:0 auto;max-width:1100px;padding:16px;color:#14171f}table{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0 24px}th,td{border:1px solid #8a91a3;padding:6px;text-align:left;vertical-align:top}th{background:#eef1f7}code{word-break:break-all}.html{color:#4a5162}.stats{display:flex;gap:12px;list-style:none;padding:0;flex-wrap:wrap}.stats li{border:1px solid #8a91a3;border-radius:8px;padding:8px 14px}.stats b{font-size:1.4em;display:block}.disc{background:#fff4d6;border-left:4px solid #6b4300;padding:8px 12px}.s-fail td:nth-child(4){color:#8a1111;font-weight:700}.s-review td:nth-child(4){color:#6b4300}.new{background:#0b4bd1;color:#fff;border-radius:4px;padding:0 4px;font-size:12px}</style></head>
<body><h1>Hurteemj — WCAG 2.2 ${lang === 'mn' ? 'хүртээмжийн тайлан' : 'accessibility report'}</h1>${body}</body></html>`;
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o.help || o.badArg || !o.urls.length) { console.log(HELP); process.exit(o.help && !o.badArg ? 0 : 2); }
  if (!existsSync(BUNDLE)) { console.error('dist/hurteemj.js алга — эхлээд `npm run build`'); process.exit(2); }
  let chromium;
  try { ({ chromium } = require('playwright')); } catch { console.error('playwright суулгана уу: npm i -D playwright'); process.exit(2); }
  const browser = await chromium.launch();
  const reports = [];
  try {
    for (const u of o.urls) reports.push(await auditOne(browser, toUrl(u), o));
  } catch (e) {
    console.error(e.message); await browser.close(); process.exit(2);
  }
  await browser.close();
  const earls = reports.map((r) => { const e = r.earl; delete r.earl; return e; });
  const fmt = {
    json: () => JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2),
    earl: () => JSON.stringify(earls.length === 1 ? earls[0] : earls, null, 2),
    html: () => htmlReport(reports, o.lang),
    md: () => mdReport(reports, o.lang),
    text: () => textReport(reports, o.lang),
  }[o.format] || (() => textReport(reports, o.lang));
  const text = fmt();
  if (o.out) { writeFileSync(o.out, text); console.log(`→ ${o.out}`); } else console.log(text);
  const threshold = RANK[o.failOn];
  // --fix өгсөн бол plugin-ийн засаж чадах олдворыг босгонд тооцохгүй (үлдсэн зөрчил л CI-г унагана)
  const bad = o.failOn === 'none' ? 0 : reports.flatMap((r) => r.findings).filter((f) => f.outcome === 'fail' && !f.fixed && RANK[f.impact] <= threshold).length;
  if (o.out || o.format !== 'text') console.error(`hurteemj: ${bad} finding(s) at or above "${o.failOn}"`);
  process.exit(bad ? 1 : 0);
}

main();
