/**
 * Аудит ба засварын хөдөлгүүр.
 *
 * Зарчим (судалгааны дүгнэлтээс):
 *  1. Автомат шалгалт WCAG-ийн асуудлын зөвхөн нэг хэсгийг илрүүлдэг тул
 *     "fail" (тодорхой зөрчил) ба "review" (хүн шалгах) гэж ялгана.
 *  2. Засвар бүр эрсдэлийн түвшинтэй: 'safe' (утга өөрчлөхгүй) / 'heuristic' (таамаглал).
 *  3. Засвар бүр бүртгэгдэж, буцаагдах боломжтой; тайланд ил харагдана.
 *  4. Plugin "100% нийцтэй" гэж хэзээ ч мэдэгдэхгүй — гараар шалгах SC-үүдийг тайланд жагсаана.
 */
import { RULES } from '../rules/index.js';
import { CRITERIA_BY_ID, criteriaForLevel, levelIncludes } from '../wcag/criteria.js';
import { cssPath, createPathCache, isIgnored, qsa, snippet } from './dom.js';
import { fmt } from '../rules/util.js';

const TIER = { safe: 1, heuristic: 2 };
const IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };

let seq = 0;

function ruleSetting(config, id) {
  const r = config.rules?.[id];
  if (r === false) return { enabled: false };
  if (r === true || r === undefined) return { enabled: true };
  return { enabled: r.enabled !== false, ...r };
}

export function activeRules(config) {
  const only = config.only && new Set(config.only);
  return RULES.filter((r) => {
    if (only && !only.has(r.id) && !r.sc.some((sc) => only.has(sc))) return false;
    return ruleSetting(config, r.id).enabled;
  });
}

function normalizeResult(rule, res, config, pathCache) {
  const sc = res.data?.sc || rule.sc;
  const inLevel = sc.filter((id) => CRITERIA_BY_ID[id] && levelIncludes(config.level, CRITERIA_BY_ID[id].level));
  if (!inLevel.length) return null;
  const override = ruleSetting(config, rule.id);
  return {
    id: `hj-${++seq}`,
    ruleId: rule.id,
    sc: inLevel,
    level: inLevel.map((id) => CRITERIA_BY_ID[id].level).sort()[0],
    impact: override.impact || rule.impact,
    outcome: res.outcome,
    message: res.message,
    data: res.data,
    node: res.node,
    selector: res.node ? cssPath(res.node, pathCache) : null,
    html: res.node?.outerHTML ? snippet(res.node) : null,
    fixed: false,
    fix: null,
  };
}

/**
 * @param {object} p
 * @param {Document} p.doc
 * @param {object} p.config
 * @param {Element|Document} [p.scope] — хэсэгчилсэн (MutationObserver) аудитын хүрээ
 * @param {boolean} [p.deep] — DOM-ыг түр өөрчилдөг гүн шалгалтыг (1.4.12 clip) оруулах
 */
export function runAudit({ doc, win, config, scope, deep = false, runtime, changes, clickTracked, pageLang }) {
  const t0 = (win.performance || Date).now();
  const partial = scope && scope !== doc;
  const ctx = {
    doc, win, config, level: config.level, scope: scope || doc, runtime, changes, clickTracked,
    pageLang: pageLang || (doc.documentElement.lang || config.lang || 'en').split('-')[0].toLowerCase(),
    ignored: (el) => isIgnored(el, config.ignore),
    partial,
  };
  const findings = [];
  const errors = [];
  const timings = {};
  const pathCache = createPathCache();
  const now = () => (win.performance || Date).now();
  for (const rule of activeRules(config)) {
    if (rule.deep && !deep) continue;
    if (partial && rule.run && !rule.scoped) continue;
    const tr = now();
    try {
      let results = [];
      if (rule.run) {
        results = rule.run(ctx) || [];
      } else {
        const root = rule.root === 'document' ? doc : ctx.scope;
        let els = qsa(root, rule.selector);
        if (partial && scope.matches?.(rule.selector)) els.unshift(scope);
        for (const el of els) {
          if (ctx.ignored(el)) continue;
          const r = rule.evaluate(el, ctx);
          if (r) Array.isArray(r) ? results.push(...r) : results.push(r);
        }
      }
      for (const res of results) {
        if (res.node && ctx.ignored(res.node)) continue;
        const f = normalizeResult(rule, res, config, pathCache);
        if (f) findings.push(f);
      }
    } catch (e) {
      errors.push({ ruleId: rule.id, error: String(e && e.message || e) });
    }
    timings[rule.id] = Math.round((now() - tr) * 10) / 10;
  }
  findings.sort((a, b) => (a.outcome === b.outcome ? 0 : a.outcome === 'fail' ? -1 : 1) || IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]);
  return buildReport({ doc, win, config, findings, errors, partial, duration: now() - t0, timings });
}

export function buildReport({ doc, win, config, findings, errors = [], partial = false, duration = 0, timings }) {
  const bySC = {};
  for (const f of findings) for (const sc of f.sc) (bySC[sc] ||= { fail: 0, review: 0, fixed: 0 })[f.outcome]++;
  for (const f of findings) if (f.fixed) for (const sc of f.sc) bySC[sc].fixed++;
  const coveredSC = new Set(activeRules(config).flatMap((r) => r.sc));
  const criteria = criteriaForLevel(config.level).map((c) => {
    const s = bySC[c.id];
    let status;
    if (s?.fail) status = 'fail';
    else if (s?.review) status = 'review';
    else if (c.automation === 'manual' || !coveredSC.has(c.id)) status = 'manual';
    else status = 'no-issues-detected';
    return { id: c.id, level: c.level, title: c.title, automation: c.automation, new22: !!c.new22, status, counts: s || { fail: 0, review: 0, fixed: 0 } };
  });
  const count = (o) => findings.filter((f) => f.outcome === o).length;
  const report = {
    /** Хэвлэх үед хэрэглэгчийн баталгаажуулалт: Node агуулаагүй */
    tool: { name: 'hurteemj', version: '__VERSION__' },
    standard: 'WCAG 2.2 (ISO/IEC 40500)',
    level: config.level,
    url: win.location?.href,
    title: doc.title,
    timestamp: new Date().toISOString(),
    partial,
    durationMs: Math.round(duration),
    /** Дүрэм бүрийн хугацаа (ms) — гүйцэтгэлийн оношилгоонд */
    timings: timings || null,
    summary: {
      fail: count('fail'),
      review: count('review'),
      fixed: findings.filter((f) => f.fixed).length,
      /** Засагдаагүй үлдсэн зөрчил */
      remaining: findings.filter((f) => f.outcome === 'fail' && !f.fixed).length,
      byImpact: Object.fromEntries(['critical', 'serious', 'moderate', 'minor'].map((i) => [i, findings.filter((f) => f.impact === i && f.outcome === 'fail' && !f.fixed).length])),
      criteria: {
        total: criteria.length,
        failing: criteria.filter((c) => c.status === 'fail').length,
        needsReview: criteria.filter((c) => c.status === 'review').length,
        manualOnly: criteria.filter((c) => c.status === 'manual').length,
        noIssuesDetected: criteria.filter((c) => c.status === 'no-issues-detected').length,
      },
    },
    disclaimer: {
      mn: 'Автомат шалгалт WCAG-ийн бүх шаардлагыг баталгаажуулж чадахгүй. "Гараар шалгах" болон "Хянах" ангиллыг мэргэжилтэн, хөгжлийн бэрхшээлтэй хэрэглэгчидтэй хамт шалгана уу.',
      en: 'Automated testing cannot verify all WCAG requirements. Items marked manual or review must be evaluated by experts and users with disabilities.',
    },
    criteria,
    findings,
    errors,
  };
  Object.defineProperty(report, 'toJSON', { enumerable: false, value: () => serialize(report) });
  return report;
}

const isNode = (v) => !!v && typeof v === 'object' && typeof v.nodeType === 'number';

/** data доторх DOM node-уудыг (жишээ нь container) хаяж, JSON-д тохирох хэлбэр */
function cleanData(data) {
  if (!data || typeof data !== 'object') return data;
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    if (isNode(v) || typeof v === 'function') continue;
    out[k] = Array.isArray(v) ? v.filter((x) => !isNode(x)) : v;
  }
  return out;
}

export function serialize(report, lang) {
  const pick = (msg) => (lang ? (msg?.[lang] ?? msg?.en) : msg);
  return {
    ...report,
    findings: report.findings.map(({ node, message, fix, data, ...f }) => ({ ...f, data: cleanData(data), message: pick(message), fix: fix ? pick(fix) : null })),
  };
}

/**
 * Хэсэгчилсэн аудитын үр дүнг өмнөх тайлантай нэгтгэнэ:
 * устсан node-ын олдворыг хаяж, ижил (дүрэм, node) олдворыг давхардуулахгүй.
 */
export function mergeFindings(previous, next) {
  const alive = previous.filter((f) => !f.node || f.node.isConnected);
  const key = (f) => `${f.ruleId}|${f.selector || ''}`;
  const seen = new Set(alive.map(key));
  const byKey = new Map(alive.map((f) => [key(f), f]));
  for (const f of next) {
    const k = key(f);
    if (!seen.has(k)) { alive.push(f); seen.add(k); continue; }
    // Шинэ үр дүн илүү шинэ төлөвтэй (жишээ нь засагдсан) тул хуучныг орлуулна
    const old = byKey.get(k);
    if (old && (f.fixed || old.outcome !== f.outcome)) alive[alive.indexOf(old)] = f;
  }
  return alive;
}

/** Тайланд бичигдсэн олдворуудад засвар хэрэглэнэ */
export async function applyFixes(report, { doc, win, config, runtime, changes, pageLang, onlyIds }) {
  const globalTier = config.fix === true ? 'safe' : config.fix;
  const ctxBase = { doc, win, config, level: config.level, runtime, changes, pageLang: pageLang || (doc.documentElement.lang || config.lang || 'en').split('-')[0].toLowerCase() };
  const onceDone = new Map();
  let fixed = 0;
  for (const f of report.findings) {
    if (f.fixed || (onlyIds && !onlyIds.includes(f.id))) continue;
    const rule = RULES.find((r) => r.id === f.ruleId);
    if (!rule?.fix) continue;
    // "Хянах" (review) олдвор нь зөрчил биш байж болно — зөвхөн onReview гэж тэмдэглэсэн засвар л хэрэглэгдэнэ
    if (f.outcome !== 'fail' && !rule.fix.onReview) continue;
    const setting = ruleSetting(config, rule.id);
    const tier = setting.fix === undefined ? globalTier : setting.fix === true ? 'safe' : setting.fix;
    if (!tier || !TIER[tier] || TIER[rule.fix.tier] > TIER[tier]) continue;
    if (rule.fix.once && onceDone.has(rule.id)) { f.fixed = true; f.fix = onceDone.get(rule.id); continue; }
    if (f.node && !f.node.isConnected && f.node !== doc.documentElement) continue;
    try {
      const res = await rule.fix.apply(f, { ...ctxBase, tier });
      if (res) {
        f.fixed = true;
        f.fix = res;
        f.fixTier = rule.fix.tier;
        fixed++;
        if (rule.fix.once) onceDone.set(rule.id, res);
      }
    } catch (e) {
      report.errors.push({ ruleId: rule.id, phase: 'fix', error: String(e && e.message || e) });
    }
  }
  report.summary.fixed = report.findings.filter((x) => x.fixed).length;
  report.summary.remaining = report.findings.filter((x) => x.outcome === 'fail' && !x.fixed).length;
  for (const k of Object.keys(report.summary.byImpact)) {
    report.summary.byImpact[k] = report.findings.filter((x) => x.impact === k && x.outcome === 'fail' && !x.fixed).length;
  }
  for (const c of report.criteria) c.counts.fixed = report.findings.filter((x) => x.fixed && x.sc.includes(c.id)).length;
  return fixed;
}

/** Хүнд уншигдах мессеж */
export function messageText(f, lang = 'mn') {
  return fmt(f.message?.[lang] || f.message?.en || '', f.data || {});
}
