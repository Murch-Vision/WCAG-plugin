/**
 * EARL (W3C Evaluation and Report Language) JSON-LD гаралт.
 * Бүтэц нь ACT implementation report-уудад (axe, Alfa, QualWeb) хэрэглэдэг хэлбэртэй нийцнэ:
 * earl:Assertion { assertedBy, subject, test, mode, result { outcome, pointer, description } }.
 *
 * Гаралтын зарчим:
 *  - fail → earl:failed; review / AI-аар үүсгэсэн засвар → earl:cantTell
 *  - дүрэм ажиллаж, хамаарах элемент байсан ч олдворгүй → earl:passed (ACT дүрэм эсвэл SC-ийн түвшинд)
 *  - хамаарах элементгүй → earl:inapplicable; зөвхөн гараар шалгах SC → earl:untested
 *  - Plugin-ийн ажиллах үеийн засвар (fixed) нь эх хуудасны үр дүнг өөрчлөхгүй — hj:fixed гэж тэмдэглэнэ
 */
import { CRITERIA_BY_ID } from '../wcag/criteria.js';
import { actRulesFor, ACT_URL } from '../wcag/act.js';

const WCAG22 = 'https://www.w3.org/TR/WCAG22/#';

/** "Non-text Content" → "non-text-content" (WCAG 2.2 Recommendation-ий anchor) */
export function scAnchor(id) {
  const c = CRITERIA_BY_ID[id];
  if (!c) return null;
  return c.title.en.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
export const scUrl = (id) => `${WCAG22}${scAnchor(id)}`;

const text = (msg, lang) => (typeof msg === 'string' ? msg : msg?.[lang] ?? msg?.en ?? '');

export function toEARL(report, { lang = 'en' } = {}) {
  const assertor = '_:hurteemj';
  const subject = report.url || '_:page';
  const graph = [
    { '@id': assertor, '@type': ['earl:Assertor', 'earl:Software'], 'dct:title': report.tool?.name || 'hurteemj', 'dct:hasVersion': report.tool?.version, 'dct:description': `WCAG 2.2 ${report.level} automated audit` },
    { '@id': subject, '@type': ['earl:TestSubject', 'sch:WebPage'], 'dct:title': report.title || '', 'dct:date': report.timestamp },
  ];
  const assertion = (test, outcome, extra = {}, result = {}) => ({
    '@type': 'earl:Assertion',
    assertedBy: assertor,
    subject,
    test,
    mode: 'earl:automatic',
    ...extra,
    result: { '@type': 'earl:TestResult', outcome: `earl:${outcome}`, ...result },
  });
  const testsFor = (ruleId, sc) => {
    const act = actRulesFor(ruleId);
    return act.length ? act.map((a) => a.url) : sc.map(scUrl);
  };

  // 1) Олдвор бүр
  for (const f of report.findings) {
    const outcome = f.outcome === 'fail' && !f.generated ? 'failed' : 'cantTell';
    const tests = testsFor(f.ruleId, f.sc);
    const result = {
      'dct:description': text(f.message, lang),
      ...(f.selector ? { pointer: { '@type': 'ptr:CSSSelectorPointer', 'ptr:expression': f.selector } } : {}),
      ...(f.html ? { 'hj:snippet': f.html } : {}),
      ...(f.fixed ? { 'hj:fixed': true, 'hj:fixDescription': text(f.fix, lang), 'hj:fixTier': f.fixTier } : {}),
      ...(f.generated ? { 'hj:generated': true } : {}),
    };
    for (const t of tests) {
      graph.push(assertion(t, outcome, { 'hj:rule': f.ruleId, 'hj:wcag': f.sc.map(scUrl), 'hj:impact': f.impact }, result));
    }
  }

  // 2) Ажилласан дүрмүүд: олдворгүй бол passed / inapplicable
  const withFindings = new Set(report.findings.map((f) => f.ruleId));
  for (const r of report.rulesRun || []) {
    if (withFindings.has(r.id)) continue;
    const outcome = r.applicable ? 'passed' : 'inapplicable';
    for (const t of testsFor(r.id, r.sc)) graph.push(assertion(t, outcome, { 'hj:rule': r.id, 'hj:wcag': r.sc.map(scUrl) }));
  }

  // 3) Зөвхөн гараар шалгах SC
  for (const c of report.criteria || []) {
    if (c.status === 'manual') graph.push(assertion(scUrl(c.id), 'untested', { mode: 'earl:manual', 'hj:wcag': [scUrl(c.id)] }, { 'dct:description': `${c.id} ${c.title?.[lang] ?? c.title?.en ?? ''}: requires human evaluation` }));
  }

  return {
    '@context': {
      '@vocab': 'http://www.w3.org/ns/earl#',
      earl: 'http://www.w3.org/ns/earl#',
      dct: 'http://purl.org/dc/terms/',
      sch: 'https://schema.org/',
      ptr: 'http://www.w3.org/2009/pointers#',
      WCAG22,
      ACT: ACT_URL,
      hj: 'https://github.com/Murch-Vision/WCAG-plugin#',
      assertedBy: { '@type': '@id' },
      subject: { '@type': '@id' },
      test: { '@type': '@id' },
      mode: { '@type': '@id' },
      outcome: { '@type': '@id' },
      'hj:wcag': { '@type': '@id' },
    },
    '@graph': graph,
    'hj:summary': report.summary,
    'hj:disclaimer': text(report.disclaimer, lang),
  };
}
