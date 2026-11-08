/**
 * Тайлангийн форматууд (text, markdown, HTML, CSV) — CLI ба скан үйлчилгээ хоёулаа ашиглана.
 * `pages` = [{ url, viewport, score, report (serialize()-ийн JSON), error? }]
 */
import { gradeOf } from '../core/score.js';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const t = (lang, mn, en) => (lang === 'mn' ? mn : en);
const msg = (m, lang) => (typeof m === 'string' ? m : m?.[lang] ?? m?.en ?? '');
const STATUS = { fail: ['Зөрчилтэй', 'Fails'], review: ['Хянах', 'Review'], manual: ['Гараар шалгах', 'Manual'], 'no-issues-detected': ['Зөрчил илрээгүй', 'No issues detected'] };
const IMPACT = { critical: ['Ноцтой', 'Critical'], serious: ['Хүнд', 'Serious'], moderate: ['Дунд', 'Moderate'], minor: ['Бага', 'Minor'] };
const lbl = (map, k, lang) => (map[k] ? map[k][lang === 'mn' ? 0 : 1] : k);

export function textReport(pages, lang = 'mn') {
  const out = [];
  for (const p of pages) {
    const r = p.report;
    if (!r) { out.push(`\n■ ${p.url} [${p.viewport || ''}]\n  ERROR: ${p.error}`); continue; }
    out.push(`\n■ ${r.url}${p.viewport ? ` [${p.viewport}]` : ''}\n  ${r.standard} ${r.level} · ${p.score != null ? `score ${p.score}/100 · ` : ''}${r.summary.fail} fail · ${r.summary.review} review · ${r.summary.fixed} fixable-now`);
    out.push(`  SC: ${r.summary.criteria.failing} failing, ${r.summary.criteria.needsReview} review, ${r.summary.criteria.manualOnly} manual-only of ${r.summary.criteria.total}`);
    for (const f of r.findings) {
      const tag = f.generated ? 'GEN ' : f.fixed ? 'FIX ' : f.outcome === 'fail' ? 'FAIL' : 'REV ';
      out.push(`  [${tag}] ${f.impact.padEnd(8)} ${f.sc.join(',').padEnd(14)} ${msg(f.message, lang)}\n         ${f.selector || ''}`);
    }
    out.push(`  ${msg(r.disclaimer, lang)}`);
  }
  return out.join('\n');
}

export function mdReport(pages, lang = 'mn') {
  return pages.map((p) => {
    const r = p.report;
    if (!r) return `## ${p.url}\n\n> ${p.error}\n`;
    return `## ${r.url}${p.viewport ? ` (${p.viewport})` : ''}\n\n**${r.standard} ${r.level}**${p.score != null ? ` — ${t(lang, 'оноо', 'score')} ${p.score}/100` : ''} — ${r.summary.fail} fail · ${r.summary.review} review\n\n| ${t(lang, 'Төлөв', 'Outcome')} | ${t(lang, 'Нөлөө', 'Impact')} | SC | ${t(lang, 'Тайлбар', 'Message')} | Selector |\n|---|---|---|---|---|\n${r.findings.map((f) => `| ${f.fixed ? '🔧' : f.outcome === 'fail' ? '❌' : '⚠️'} | ${f.impact} | ${f.sc.join(', ')} | ${msg(f.message, lang).replace(/\|/g, '\\|')} | \`${f.selector || ''}\` |`).join('\n')}\n\n> ${msg(r.disclaimer, lang)}\n`;
  }).join('\n');
}

const CSV_COLS = ['page', 'viewport', 'rule', 'outcome', 'impact', 'sc', 'selector', 'message'];
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // Excel formula injection-аас сэргийлэх
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
export function csvReport(pages, lang = 'mn') {
  const rows = [CSV_COLS.join(',')];
  for (const p of pages) for (const f of p.report?.findings || []) {
    rows.push([p.report.url, p.viewport, f.ruleId, f.fixed ? 'fixed' : f.outcome, f.impact, f.sc.join(' '), f.selector, msg(f.message, lang)].map(csvCell).join(','));
  }
  return '﻿' + rows.join('\r\n');
}

const CSS = `body{font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans",sans-serif;margin:0 auto;max-width:1100px;padding:16px;color:#14171f;background:#fff}
h1{font-size:1.6rem}h2{font-size:1.25rem;margin-top:2rem;border-top:1px solid #c5cad6;padding-top:1rem;word-break:break-all}h3{font-size:1.05rem}
table{border-collapse:collapse;width:100%;font-size:14px;margin:8px 0 24px}th,td{border:1px solid #8a91a3;padding:6px;text-align:left;vertical-align:top}th{background:#eef1f7}
code{word-break:break-all;font-size:13px}.html{color:#4a5162}
.stats{display:flex;gap:12px;list-style:none;padding:0;flex-wrap:wrap}.stats li{border:1px solid #8a91a3;border-radius:8px;padding:8px 14px;min-width:7rem}.stats b{font-size:1.4em;display:block;font-variant-numeric:tabular-nums}
.disc{background:#fff4d6;border-left:4px solid #6b4300;padding:8px 12px}
.score{display:inline-flex;align-items:baseline;gap:.4rem;border:2px solid currentColor;border-radius:10px;padding:.3rem .8rem;font-weight:700}
.score b{font-size:2rem;font-variant-numeric:tabular-nums}
.g-good{color:#0f5a26}.g-fair{color:#6b4300}.g-poor{color:#8a3a00}.g-bad{color:#8a1111}
.s-fail{color:#8a1111;font-weight:700}.s-review{color:#6b4300}.new{background:#0b4bd1;color:#fff;border-radius:4px;padding:0 4px;font-size:12px}
.err{color:#8a1111}
@media print{h2{break-before:page}}`;

function scoreBadge(score, lang) {
  if (score == null) return '';
  const g = gradeOf(score);
  return `<span class="score g-${g.id}"><b>${score}</b>/100 · ${esc(g[lang === 'mn' ? 'mn' : 'en'])}</span>`;
}

/**
 * @param {object[]} pages
 * @param {object} meta — { lang, title, score, url, startedAt, summary }
 */
export function htmlReport(pages, meta = {}) {
  const lang = meta.lang || 'mn';
  const pagesHtml = pages.map((p) => {
    const r = p.report;
    if (!r) return `<section><h2>${esc(p.url)} <small>(${esc(p.viewport || '')})</small></h2><p class="err">${t(lang, 'Шалгаж чадсангүй', 'Could not scan')}: ${esc(p.error)}</p></section>`;
    const fails = r.findings.filter((f) => f.outcome === 'fail');
    const reviews = r.findings.filter((f) => f.outcome !== 'fail');
    const rows = (list) => list.map((f) => `<tr><td>${esc(lbl(IMPACT, f.impact, lang))}</td><td>${esc(f.sc.join(', '))}</td><td>${esc(msg(f.message, lang))}<br><small>${esc(f.ruleId)}</small></td><td><code>${esc(f.selector)}</code><br><code class="html">${esc(f.html)}</code></td></tr>`).join('');
    const thead = `<thead><tr><th scope="col">${t(lang, 'Нөлөө', 'Impact')}</th><th scope="col">SC</th><th scope="col">${t(lang, 'Тайлбар', 'Message')}</th><th scope="col">Selector / HTML</th></tr></thead>`;
    return `<section><h2>${esc(r.url)} <small>(${esc(p.viewport || 'desktop')})</small></h2>
<p>${scoreBadge(p.score, lang)}</p>
<ul class="stats"><li><b>${fails.length}</b> ${t(lang, 'зөрчил', 'failures')}</li><li><b>${reviews.length}</b> ${t(lang, 'хянах', 'to review')}</li><li><b>${r.summary.criteria.failing}</b> ${t(lang, 'зөрчилтэй SC', 'failing SC')}</li></ul>
${fails.length ? `<h3>${t(lang, 'Зөрчлүүд', 'Failures')}</h3><table>${thead}<tbody>${rows(fails)}</tbody></table>` : `<p>${t(lang, 'Автомат шалгалтаар зөрчил илрээгүй.', 'No automated failures detected.')}</p>`}
${reviews.length ? `<h3>${t(lang, 'Хүн хянах зүйлс', 'Needs review')}</h3><table>${thead}<tbody>${rows(reviews)}</tbody></table>` : ''}
</section>`;
  }).join('');
  const crit = meta.summary?.criteria?.list || pages.find((p) => p.report)?.report.criteria || [];
  const critHtml = crit.length ? `<h2>WCAG 2.2 ${t(lang, 'шалгуурууд', 'criteria')}</h2><table><thead><tr><th scope="col">SC</th><th scope="col">${t(lang, 'Нэр', 'Title')}</th><th scope="col">${t(lang, 'Түвшин', 'Level')}</th><th scope="col">${t(lang, 'Төлөв', 'Status')}</th></tr></thead><tbody>${crit.map((c) => `<tr><td>${esc(c.id)}${c.new22 ? ' <span class="new">2.2</span>' : ''}</td><td>${esc(c.title?.[lang] || c.title?.en)}</td><td>${esc(c.level)}</td><td class="s-${esc(c.status)}">${esc(lbl(STATUS, c.status, lang))}</td></tr>`).join('')}</tbody></table>` : '';
  const disclaimer = msg(pages.find((p) => p.report)?.report.disclaimer, lang);
  const title = meta.title || t(lang, 'Хүртээмжийн тайлан', 'Accessibility report');
  return `<!doctype html><html lang="${esc(lang)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} — WCAG 2.2</title><style>${CSS}</style></head>
<body><main><h1>${esc(title)}</h1>
${meta.url ? `<p><strong>${esc(meta.url)}</strong>${meta.startedAt ? ` · ${esc(meta.startedAt)}` : ''}</p>` : ''}
${meta.score != null ? `<p>${t(lang, 'Нийт оноо', 'Overall score')}: ${scoreBadge(meta.score, lang)} · ${pages.length} ${t(lang, 'шалгалт', 'checks')}</p>` : ''}
<p class="disc">${esc(disclaimer)} ${t(lang, 'Оноо нь нөлөөллөөр жинлэсэн, зөрчилгүй автомат дүрмийн хувь бөгөөд WCAG нийцлийн баталгаа биш.', 'The score is the impact-weighted share of applicable automated rules without failures; it is not a conformance claim.')}</p>
${pagesHtml}
${critHtml}
</main></body></html>`;
}
