/**
 * Тохиргооны анхдагч утга, <script data-*> уншилт, шалгалт (validation).
 * Буруу утга өгөгдсөн тохиолдолд plugin унахгүй, аюулгүй анхдагч руу буцна.
 */
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
  nonce: null,
};

/** data-* атрибут ↔ тохиргооны түлхүүр */
export const ATTR_MAP = {
  lang: 'lang', uiLang: 'ui-lang', level: 'level', fix: 'fix', auditor: 'auditor', widget: 'widget', launcher: 'launcher',
  position: 'position', color: 'color', focusColor: 'focus-color', statementUrl: 'statement-url', feedbackUrl: 'feedback-url',
  reportEndpoint: 'report-endpoint', ignore: 'ignore', shortcut: 'shortcut', observe: 'observe', audit: 'audit',
  deep: 'deep', storage: 'storage', console: 'console', languages: 'languages', only: 'only', nonce: 'nonce',
  reportSampleRate: 'report-sample-rate', offsetX: 'offset-x', offsetY: 'offset-y',
};

const LIST_KEYS = new Set(['ignore', 'languages', 'only']);
const LEVELS = new Set(['A', 'AA', 'AAA']);
const FIX_TIERS = new Set(['safe', 'heuristic']);
const POSITIONS = new Set(['bottom-right', 'bottom-left', 'top-right', 'top-left']);
const STORAGES = new Set(['local', 'cookie']);

/** <script data-*> атрибутаас тохиргоо унших */
export function configFromScript(script) {
  if (!script || typeof script.getAttribute !== 'function') return {};
  const out = {};
  for (const [k, a] of Object.entries(ATTR_MAP)) {
    const v = script.getAttribute(`data-${a}`);
    if (v === null) continue;
    if (v === 'true' || v === '') out[k] = true;
    else if (v === 'false') out[k] = false;
    else if (LIST_KEYS.has(k)) out[k] = v.split(',').map((s) => s.trim()).filter(Boolean);
    else out[k] = v;
  }
  return out;
}

const toList = (v) => (Array.isArray(v) ? v.map(String).map((s) => s.trim()).filter(Boolean) : typeof v === 'string' ? v.split(',').map((s) => s.trim()).filter(Boolean) : []);

/**
 * Тохиргоог нэгтгэж (DEFAULTS ← window.HurteemjConfig ← init(config)) шалгана.
 * Буруу утга бүр анхдагч руу буцаж, `warnings` жагсаалтад тэмдэглэгдэнэ.
 */
export function normalizeConfig(...layers) {
  const c = Object.assign({}, DEFAULTS, ...layers.filter(Boolean));
  const warnings = [];
  const bad = (k, v, d) => { warnings.push(`config.${k}: "${v}" хүчингүй, "${d}" ашиглав`); c[k] = d; };

  c.level = String(c.level || 'AA').toUpperCase();
  if (!LEVELS.has(c.level)) bad('level', c.level, 'AA');

  if (c.fix === true) c.fix = 'safe';
  if (c.fix === 'off' || c.fix === 'none' || c.fix === 'false' || c.fix === false || c.fix == null) c.fix = false;
  else if (!FIX_TIERS.has(c.fix)) bad('fix', c.fix, 'safe');

  if (!POSITIONS.has(c.position)) bad('position', c.position, 'bottom-right');

  if (c.storage === true) c.storage = 'local';
  if (c.storage === 'false' || c.storage === 'none') c.storage = false;
  if (c.storage && !STORAGES.has(c.storage)) bad('storage', c.storage, 'local');

  c.ignore = toList(c.ignore);
  c.languages = toList(c.languages);
  if (!c.languages.length) c.languages = ['mn', 'en'];
  c.only = c.only == null || c.only === false ? null : toList(c.only);
  if (c.only && !c.only.length) c.only = null;

  const rate = Number(c.reportSampleRate);
  c.reportSampleRate = Number.isFinite(rate) ? Math.min(1, Math.max(0, rate)) : 1;

  if (c.rules && typeof c.rules !== 'object') bad('rules', c.rules, '{}');
  if (c.rules == null) c.rules = {};

  if (c.lang) c.lang = String(c.lang).split('-')[0].toLowerCase();
  if (c.uiLang) c.uiLang = String(c.uiLang).toLowerCase();
  if (c.uiLang && !c.languages.includes(c.uiLang)) c.languages = [c.uiLang, ...c.languages];

  for (const k of ['audit', 'deep', 'observe', 'widget', 'launcher', 'auditor', 'respectOS', 'console']) c[k] = c[k] === 'false' ? false : !!c[k];
  if (c.shortcut === false || c.shortcut === 'false' || c.shortcut === 'none') c.shortcut = null;

  c.warnings = warnings;
  return c;
}
