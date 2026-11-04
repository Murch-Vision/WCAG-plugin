/**
 * Хүртээмж (Hurteemj) — WCAG 2.2 хүртээмжийн нэгдсэн plugin.
 *
 *   <script src="hurteemj.min.js" data-lang="mn" data-fix="safe" defer></script>
 *   эсвэл
 *   import { init } from 'hurteemj'; init({ level: 'AA', fix: 'safe' });
 */
import { runAudit, applyFixes, buildReport, serialize, messageText } from './core/engine.js';
import { ChangeLog } from './fix/changes.js';
import { createRuntime } from './fix/runtime.js';
import { createPreferences, createStorage, DEFAULT_PREFS, PROFILES } from './prefs/preferences.js';
import { createWidget } from './ui/widget.js';
import { translator, STRINGS } from './i18n/index.js';
import { CRITERIA, criteriaForLevel } from './wcag/criteria.js';
import { RULES } from './rules/index.js';
import { HOST_ATTR, idle, isOwnUi } from './core/dom.js';
import { trackListeners, trackedTargets } from './core/listeners.js';

export const VERSION = '__VERSION__';

export const DEFAULTS = {
  level: 'AA', // A | AA | AAA
  fix: 'safe', // false | 'safe' | 'heuristic'
  audit: true,
  deep: false,
  observe: true,
  widget: true,
  launcher: true,
  auditor: false,
  lang: null, // засварт хэрэглэх хуудасны хэл (html lang байхгүй үед)
  uiLang: null, // самбарын хэл
  languages: ['mn', 'en'],
  position: 'bottom-right',
  color: '#0b4bd1',
  focusColor: '#0b1f3a',
  shortcut: 'alt+shift+a',
  ignore: [],
  rules: {},
  only: null,
  storage: 'local',
  respectOS: true,
  console: false,
  reportEndpoint: null,
  reportSampleRate: 1,
  statementUrl: null,
  feedbackUrl: null,
};

const ATTR_MAP = {
  lang: 'lang', uiLang: 'ui-lang', level: 'level', fix: 'fix', auditor: 'auditor', widget: 'widget', launcher: 'launcher',
  position: 'position', color: 'color', focusColor: 'focus-color', statementUrl: 'statement-url', feedbackUrl: 'feedback-url',
  reportEndpoint: 'report-endpoint', ignore: 'ignore', shortcut: 'shortcut', observe: 'observe', audit: 'audit',
  deep: 'deep', storage: 'storage', console: 'console', languages: 'languages', only: 'only', nonce: 'nonce',
};

/** <script data-*> атрибутаас тохиргоо унших */
export function configFromScript(script) {
  if (!script) return {};
  const out = {};
  for (const [k, a] of Object.entries(ATTR_MAP)) {
    const v = script.getAttribute(`data-${a}`);
    if (v === null) continue;
    if (v === 'true' || v === '') out[k] = true;
    else if (v === 'false') out[k] = false;
    else if (['ignore', 'languages', 'only'].includes(k)) out[k] = v.split(',').map((s) => s.trim()).filter(Boolean);
    else out[k] = v;
  }
  return out;
}

function emit(doc, name, detail) {
  try { doc.dispatchEvent(new CustomEvent(`hurteemj:${name}`, { detail })); } catch { /* ignore */ }
}

export function init(userConfig = {}) {
  const win = userConfig.window || window;
  const doc = win.document;
  if (win.__hurteemj && !userConfig.force) return win.__hurteemj;

  const config = { ...DEFAULTS, ...(win.HurteemjConfig || {}), ...userConfig };
  if (/[?&]hurteemj-audit\b/.test(win.location?.search || '')) config.auditor = true;
  if (config.level) config.level = String(config.level).toUpperCase();
  if (config.fix === 'off' || config.fix === 'none') config.fix = false;

  const changes = new ChangeLog();
  const runtime = createRuntime(doc, win, changes, config);
  const pageLang = () => (doc.documentElement.getAttribute('lang') || config.lang || 'mn').split('-')[0].toLowerCase();
  let uiLang = config.uiLang || (config.languages.includes(pageLang()) ? pageLang() : config.languages[0] || 'mn');
  const t = translator(() => uiLang, config.strings);
  const clickTracked = trackedTargets();

  const state = { report: null, busy: false, destroyed: false };
  const storage = config.storage ? createStorage(config, win) : { get: () => null, set: () => {} };
  const prefs = createPreferences({
    doc, win, config, storage,
    onChange: (p, patch) => { emit(doc, 'prefs', { prefs: p, patch }); config.onPrefsChange?.(p, patch); },
  });

  async function audit({ deep = config.deep, fix = true, scope } = {}) {
    state.busy = true;
    try {
      const rep = runAudit({ doc, win, config, deep, runtime, changes, clickTracked, pageLang: pageLang(), scope });
      if (fix && config.fix) await applyFixes(rep, { doc, win, config, runtime, changes, pageLang: pageLang() });
      if (scope && state.report) {
        const keep = state.report.findings.filter((f) => !f.node || f.node.isConnected);
        state.report = buildReport({ doc, win, config, findings: keep.concat(rep.findings), errors: state.report.errors.concat(rep.errors) });
      } else {
        state.report = rep;
      }
      emit(doc, 'audit', state.report);
      config.onAudit?.(state.report);
      if (config.console && !scope) logReport(state.report, uiLang);
      return state.report;
    } finally {
      observer?.takeRecords();
      state.busy = false;
    }
  }

  async function fix({ tier = config.fix || 'safe', ids } = {}) {
    if (!state.report) await audit({ fix: false });
    state.busy = true;
    try {
      const n = await applyFixes(state.report, { doc, win, config: { ...config, fix: tier }, runtime, changes, pageLang: pageLang(), onlyIds: ids });
      emit(doc, 'fix', { fixed: n, report: state.report });
      return n;
    } finally { observer?.takeRecords(); state.busy = false; }
  }

  function revert(ruleId) {
    state.busy = true;
    changes.revert(ruleId);
    if (state.report) for (const f of state.report.findings) if (!ruleId || f.ruleId === ruleId) { f.fixed = false; f.fix = null; }
    observer?.takeRecords();
    state.busy = false;
  }

  function sendReport(rep) {
    if (!config.reportEndpoint && !config.onReport) return;
    if (Math.random() > config.reportSampleRate) return;
    const payload = serialize(rep, uiLang);
    payload.findings = payload.findings.slice(0, 500);
    config.onReport?.(payload);
    if (!config.reportEndpoint) return;
    try {
      const body = JSON.stringify(payload);
      const ok = win.navigator.sendBeacon?.(config.reportEndpoint, new Blob([body], { type: 'application/json' }));
      if (!ok) win.fetch?.(config.reportEndpoint, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true, credentials: 'omit' }).catch(() => {});
    } catch { /* ignore */ }
  }

  // ---- SPA / динамик контент ----
  let observer = null;
  const pending = new Set();
  let timer = null;
  function flush() {
    timer = null;
    if (state.destroyed) return;
    const roots = [...pending].filter((n) => n.isConnected && ![...pending].some((o) => o !== n && o.contains(n)));
    pending.clear();
    idle(async () => {
      for (const r of roots) {
        if (config.audit) await audit({ scope: r, deep: false });
        prefs.refresh(r);
      }
      widget?.refresh();
    });
  }
  function schedule(delay = 400) { if (!timer) timer = win.setTimeout(flush, delay); }

  if (config.observe && 'MutationObserver' in win) {
    observer = new win.MutationObserver((records) => {
      if (state.busy) return;
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n.nodeType === 1 && !isOwnUi(n) && !n.hasAttribute?.(HOST_ATTR)) pending.add(n);
        }
      }
      if (pending.size) schedule();
    });
  }
  let fullTimer = null;
  const onNav = () => { win.clearTimeout(fullTimer); fullTimer = win.setTimeout(() => audit().then(() => widget?.refresh()), 800); };
  const origPush = win.history?.pushState;
  const origReplace = win.history?.replaceState;
  if (config.observe && origPush) {
    win.history.pushState = function (...a) { const r = origPush.apply(this, a); onNav(); return r; };
    win.history.replaceState = function (...a) { const r = origReplace.apply(this, a); onNav(); return r; };
    win.addEventListener('popstate', onNav);
  }

  let widget = null;
  const api = {
    version: VERSION,
    config,
    get report() { return state.report; },
    audit,
    fix,
    revert,
    prefs: {
      get: prefs.get, set: (p) => { prefs.set(p); widget?.refresh(); }, reset: () => { prefs.reset(); widget?.refresh(); },
      applyProfile: (n, on) => { prefs.applyProfile(n, on); widget?.refresh(); }, profiles: Object.keys(PROFILES), defaults: { ...DEFAULT_PREFS },
    },
    open: () => widget?.open(),
    close: () => widget?.close(),
    toggle: () => widget?.toggle(),
    setLanguage(l) { uiLang = l; widget?.refresh(); },
    announce: (text, p) => runtime.announce(text, p),
    toJSON: () => (state.report ? serialize(state.report, uiLang) : null),
    changes: () => changes.items.filter((c) => c.type !== 'mark').map((c) => ({ type: c.type, ruleId: c.ruleId, attr: c.name || c.prop, prev: c.prev })),
    destroy() {
      state.destroyed = true;
      observer?.disconnect();
      if (origPush) { win.history.pushState = origPush; win.history.replaceState = origReplace; win.removeEventListener('popstate', onNav); }
      changes.revert();
      prefs.destroy();
      widget?.destroy();
      runtime.destroy();
      if (win.__hurteemj === api) delete win.__hurteemj;
    },
  };
  win.__hurteemj = api;

  const start = async () => {
    runtime.ensureBase();
    prefs.apply();
    if (config.widget) {
      widget = createWidget({
        doc, win, config, prefs, t, runtime,
        getLang: () => uiLang,
        setLang: (l) => { uiLang = l; },
        onAudit: () => audit(),
        getReport: () => state.report,
      });
    }
    if (config.audit) {
      // Эхний аудитыг browser сул үед ажиллуулж хуудасны ачааллыг (LCP/INP) саатуулахгүй
      await new Promise((r) => idle(r));
      if (state.destroyed) return;
      await audit();
      sendReport(state.report);
      widget?.refresh();
    }
    observer?.observe(doc.body, { childList: true, subtree: true });
    emit(doc, 'ready', api);
    config.onReady?.(api);
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  return api;
}

/** Зөвхөн аудит (виджет, засваргүй) — CI, тест, браузерын extension-д */
export function auditPage(config = {}) {
  const win = config.window || window;
  const cfg = { ...DEFAULTS, ...config, fix: false };
  const changes = new ChangeLog();
  const runtime = createRuntime(win.document, win, changes, cfg);
  const rep = runAudit({ doc: win.document, win, config: cfg, deep: !!config.deep, runtime, changes, clickTracked: trackedTargets() });
  return rep;
}

function logReport(rep, lang) {
  const c = console;
  c.groupCollapsed?.(`%cHurteemj WCAG 2.2 ${rep.level}: ${rep.summary.fail} fail · ${rep.summary.review} review · ${rep.summary.fixed} fixed`, 'font-weight:bold');
  c.table?.(rep.findings.map((f) => ({ sc: f.sc.join(','), outcome: f.fixed ? 'fixed' : f.outcome, impact: f.impact, rule: f.ruleId, message: messageText(f, lang), selector: f.selector })));
  c.groupEnd?.();
}

export const criteria = CRITERIA;
export const rules = RULES.map((r) => ({ id: r.id, sc: r.sc, impact: r.impact, fix: r.fix ? r.fix.tier : null, deep: !!r.deep }));
export { criteriaForLevel, STRINGS, PROFILES, DEFAULT_PREFS, trackListeners, serialize };
export default { init, auditPage, criteria, rules, version: VERSION, trackListeners };
