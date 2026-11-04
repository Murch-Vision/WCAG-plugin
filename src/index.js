/**
 * Хүртээмж (Hurteemj) — WCAG 2.2 хүртээмжийн нэгдсэн plugin.
 *
 *   <script src="hurteemj.min.js" data-lang="mn" data-fix="safe" defer></script>
 *   эсвэл
 *   import { init } from 'hurteemj'; init({ level: 'AA', fix: 'safe' });
 */
import { runAudit, applyFixes, buildReport, serialize, messageText, mergeFindings } from './core/engine.js';
import { DEFAULTS, configFromScript, normalizeConfig } from './core/config.js';
import { createObserver } from './core/observer.js';
import { ChangeLog } from './fix/changes.js';
import { createRuntime } from './fix/runtime.js';
import { createPreferences, createStorage, DEFAULT_PREFS, PROFILES } from './prefs/preferences.js';
import { createWidget } from './ui/widget.js';
import { translator, STRINGS } from './i18n/index.js';
import { CRITERIA, criteriaForLevel } from './wcag/criteria.js';
import { RULES } from './rules/index.js';
import { idle } from './core/dom.js';
import { trackListeners, trackedTargets } from './core/listeners.js';
import { detectLang } from './rules/structure.js';

export const VERSION = '__VERSION__';

function emit(doc, name, detail) {
  try { doc.dispatchEvent(new CustomEvent(`hurteemj:${name}`, { detail })); } catch { /* ignore */ }
}

export function init(userConfig = {}) {
  const win = userConfig.window || window;
  const doc = win.document;
  if (win.__hurteemj && !userConfig.force) return win.__hurteemj;

  const config = normalizeConfig(win.HurteemjConfig, userConfig);
  if (/[?&]hurteemj-audit\b/.test(win.location?.search || '')) config.auditor = true;
  if (config.warnings.length && typeof console !== 'undefined') config.warnings.forEach((w) => console.warn(`[hurteemj] ${w}`));

  const changes = new ChangeLog();
  const runtime = createRuntime(doc, win, changes, config);

  /** Хуудасны хэл: <html lang> → config.lang → текстээс таах → UI хэл */
  let detected;
  const pageLang = () => {
    const attr = doc.documentElement.getAttribute('lang');
    if (attr) return attr.split('-')[0].toLowerCase();
    if (config.lang) return config.lang;
    if (detected === undefined) detected = detectLang(doc) || null;
    return detected || uiLang || config.languages[0];
  };
  let uiLang = config.uiLang || (config.languages.includes(pageLang()) ? pageLang() : config.languages[0]);
  const t = translator(() => uiLang, config.strings);
  const clickTracked = trackedTargets(win);

  const state = { report: null, busy: false, destroyed: false, reported: false };
  const storage = config.storage ? createStorage(config, win) : { get: () => null, set: () => {} };
  const prefs = createPreferences({
    doc, win, config, storage,
    onChange: (p, patch) => { emit(doc, 'prefs', { prefs: p, patch }); config.onPrefsChange?.(p, patch); },
  });

  let widget = null;
  let observer = null;

  async function audit({ deep = config.deep, fix = true, scope } = {}) {
    if (state.destroyed) return state.report;
    state.busy = true;
    try {
      const rep = runAudit({ doc, win, config, deep, runtime, changes, clickTracked, pageLang: pageLang(), scope });
      if (fix && config.fix) await applyFixes(rep, { doc, win, config, runtime, changes, pageLang: pageLang() });
      if (scope && state.report) {
        state.report = buildReport({ doc, win, config, findings: mergeFindings(state.report.findings, rep.findings), errors: state.report.errors.concat(rep.errors) });
      } else {
        state.report = rep;
      }
      emit(doc, 'audit', state.report);
      config.onAudit?.(state.report);
      if (config.console && !scope) logReport(state.report, uiLang);
      return state.report;
    } finally {
      observer?.drop();
      state.busy = false;
    }
  }

  async function fix({ tier = config.fix || 'safe', ids } = {}) {
    if (state.destroyed) return 0;
    if (!state.report) await audit({ fix: false });
    if (!state.report) return 0;
    state.busy = true;
    try {
      const n = await applyFixes(state.report, { doc, win, config: { ...config, fix: tier }, runtime, changes, pageLang: pageLang(), onlyIds: ids });
      emit(doc, 'fix', { fixed: n, report: state.report });
      return n;
    } finally { observer?.drop(); state.busy = false; }
  }

  function revert(ruleId) {
    state.busy = true;
    changes.revert(ruleId);
    if (state.report) {
      for (const f of state.report.findings) if (!ruleId || f.ruleId === ruleId) { f.fixed = false; f.fix = null; }
      state.report = buildReport({ doc, win, config, findings: state.report.findings, errors: state.report.errors });
    }
    observer?.drop();
    state.busy = false;
  }

  function sendReport(rep) {
    if (!rep || (!config.reportEndpoint && !config.onReport)) return;
    if (Math.random() > config.reportSampleRate) return;
    const payload = serialize(rep, uiLang);
    payload.findings = payload.findings.slice(0, 500);
    try { config.onReport?.(payload); } catch { /* хэрэглэгчийн код */ }
    if (!config.reportEndpoint) return;
    try {
      const body = JSON.stringify(payload);
      const ok = win.navigator.sendBeacon?.(config.reportEndpoint, new Blob([body], { type: 'application/json' }));
      if (!ok) win.fetch?.(config.reportEndpoint, { method: 'POST', body, headers: { 'content-type': 'application/json' }, keepalive: true, credentials: 'omit' }).catch(() => {});
    } catch { /* ignore */ }
  }

  if (config.observe) {
    observer = createObserver({
      win, doc,
      isBusy: () => state.busy,
      onPartial: async (roots) => {
        if (state.destroyed) return;
        if (config.audit) for (const r of roots) await audit({ scope: r, deep: false });
        prefs.refresh(roots);
        widget?.refresh();
      },
      onNavigate: async () => {
        if (state.destroyed) return;
        detected = undefined;
        if (config.audit) { await audit(); sendReport(state.report); }
        prefs.refresh();
        widget?.refresh();
      },
    });
  }

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
    setLanguage(l) { if (config.languages.includes(l)) { uiLang = l; widget?.refresh(); } },
    get language() { return uiLang; },
    announce: (text, p) => runtime.announce(text, p),
    toJSON: () => (state.report ? serialize(state.report, uiLang) : null),
    changes: () => changes.summary(),
    destroy() {
      state.destroyed = true;
      observer?.destroy();
      changes.revert();
      prefs.destroy();
      widget?.destroy();
      runtime.destroy();
      if (win.__hurteemj === api) delete win.__hurteemj;
    },
  };
  win.__hurteemj = api;

  const start = async () => {
    if (state.destroyed) return;
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
    observer?.start();
    emit(doc, 'ready', api);
    try { config.onReady?.(api); } catch { /* хэрэглэгчийн код */ }
  };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
  return api;
}

/** Зөвхөн аудит (виджет, засваргүй) — CI, тест, браузерын extension-д */
export function auditPage(config = {}) {
  const win = config.window || window;
  const cfg = normalizeConfig(config, { fix: false });
  const changes = new ChangeLog();
  const runtime = createRuntime(win.document, win, changes, cfg);
  return runAudit({ doc: win.document, win, config: cfg, deep: !!cfg.deep, runtime, changes, clickTracked: trackedTargets(win) });
}

function logReport(rep, lang) {
  const c = console;
  c.groupCollapsed?.(`%cHurteemj WCAG 2.2 ${rep.level}: ${rep.summary.fail} fail · ${rep.summary.review} review · ${rep.summary.fixed} fixed`, 'font-weight:bold');
  c.table?.(rep.findings.map((f) => ({ sc: f.sc.join(','), outcome: f.fixed ? 'fixed' : f.outcome, impact: f.impact, rule: f.ruleId, message: messageText(f, lang), selector: f.selector })));
  c.groupEnd?.();
}

export const criteria = CRITERIA;
export const rules = RULES.map((r) => ({ id: r.id, sc: r.sc, impact: r.impact, fix: r.fix ? r.fix.tier : null, deep: !!r.deep }));
export { DEFAULTS, configFromScript, normalizeConfig, criteriaForLevel, STRINGS, PROFILES, DEFAULT_PREFS, trackListeners, serialize };
export default { init, auditPage, criteria, rules, version: VERSION, trackListeners };
