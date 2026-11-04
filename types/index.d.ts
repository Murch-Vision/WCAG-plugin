// Type definitions for hurteemj — WCAG 2.2 audit, remediation and user-preference plugin

export type Level = 'A' | 'AA' | 'AAA';
export type FixTier = 'safe' | 'heuristic';
export type Outcome = 'fail' | 'review';
export type Impact = 'critical' | 'serious' | 'moderate' | 'minor';
export type Position = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
export type Lang = 'mn' | 'en' | (string & {});

export interface Localized { mn: string; en: string }

export interface RuleOverride {
  enabled?: boolean;
  /** Per-rule fix tier; `false` disables fixing for this rule */
  fix?: false | FixTier;
  impact?: Impact;
}

export interface Preferences {
  fontScale: number; // 1 … 2
  textSpacing: boolean;
  readableFont: boolean;
  alignLeft: boolean;
  highlightLinks: boolean;
  highlightHeadings: boolean;
  contrast: 'default' | 'light' | 'dark' | 'invert';
  saturation: 'default' | 'low' | 'high' | 'mono';
  stopMotion: boolean;
  focusRing: boolean;
  bigCursor: boolean;
  largeTargets: boolean;
  hideImages: boolean;
  readingGuide: 'off' | 'line' | 'mask';
  tts: boolean;
}

export type ProfileName = 'lowVision' | 'dyslexia' | 'seizure' | 'adhd' | 'motor' | 'elderly';

export interface Config {
  level?: Level;
  /** `false` = audit only; `'safe'` = non-guessing fixes; `'heuristic'` = best-effort guesses */
  fix?: false | FixTier;
  audit?: boolean;
  /** Run checks that temporarily mutate the DOM (1.4.12 text-spacing clipping) */
  deep?: boolean;
  /** Watch the DOM (MutationObserver) and history API for SPA changes */
  observe?: boolean;
  widget?: boolean;
  launcher?: boolean;
  /** Show the developer report inside the panel (also enabled by `?hurteemj-audit`) */
  auditor?: boolean;
  /** Page language used for fixes when `<html lang>` is missing */
  lang?: string | null;
  uiLang?: Lang | null;
  languages?: Lang[];
  position?: Position;
  color?: string;
  focusColor?: string;
  /** e.g. `'alt+shift+a'`; `null` disables */
  shortcut?: string | null;
  shortcutLabel?: string;
  offsetX?: number;
  offsetY?: number;
  ignore?: string[];
  rules?: Record<string, boolean | RuleOverride>;
  /** Restrict to these rule ids and/or success-criterion ids */
  only?: string[] | null;
  storage?: 'local' | 'cookie' | false;
  storageKey?: string;
  cookieDomain?: string;
  respectOS?: boolean;
  console?: boolean;
  reportEndpoint?: string | null;
  reportSampleRate?: number;
  statementUrl?: string | null;
  feedbackUrl?: string | null;
  nonce?: string | null;
  profiles?: ProfileName[];
  defaults?: Partial<Preferences>;
  strings?: Partial<Record<Lang, Record<string, string>>>;
  altTextProvider?: (src: string, img: HTMLImageElement, lang: string) => Promise<string | null | undefined> | string | null | undefined;
  onReady?: (api: HurteemjApi) => void;
  onAudit?: (report: Report) => void;
  onReport?: (payload: SerializedReport) => void;
  onPrefsChange?: (prefs: Preferences, patch: Partial<Preferences>) => void;
  /** Re-initialise even if an instance already exists on `window` */
  force?: boolean;
  window?: Window;
}

export interface Finding {
  id: string;
  ruleId: string;
  sc: string[];
  level: Level;
  impact: Impact;
  outcome: Outcome;
  message: Localized;
  data?: Record<string, unknown>;
  node: Element | null;
  selector: string | null;
  html: string | null;
  fixed: boolean;
  fix: Localized | null;
  fixTier?: FixTier;
}

export type CriterionStatus = 'fail' | 'review' | 'manual' | 'no-issues-detected';

export interface CriterionResult {
  id: string;
  level: Level;
  title: Localized;
  automation: 'auto' | 'partial' | 'manual';
  new22: boolean;
  status: CriterionStatus;
  counts: { fail: number; review: number; fixed: number };
}

export interface Summary {
  fail: number;
  review: number;
  fixed: number;
  /** Failures not fixed by the plugin */
  remaining: number;
  byImpact: Record<Impact, number>;
  criteria: { total: number; failing: number; needsReview: number; manualOnly: number; noIssuesDetected: number };
}

export interface Report {
  tool: { name: 'hurteemj'; version: string };
  standard: string;
  level: Level;
  url?: string;
  title: string;
  timestamp: string;
  partial: boolean;
  durationMs: number;
  /** Per-rule duration in ms (null for merged reports) */
  timings: Record<string, number> | null;
  summary: Summary;
  disclaimer: Localized;
  criteria: CriterionResult[];
  findings: Finding[];
  errors: { ruleId: string; phase?: 'fix'; error: string }[];
}

export type SerializedFinding = Omit<Finding, 'node' | 'message' | 'fix'> & { message: string | Localized; fix: string | Localized | null };
export type SerializedReport = Omit<Report, 'findings'> & { findings: SerializedFinding[] };

export interface ChangeSummary { type: 'attr' | 'style' | 'node' | 'listener' | 'custom'; ruleId?: string; attr?: string; prev?: string; tag: string | null }

export interface HurteemjApi {
  readonly version: string;
  readonly config: Required<Config> & { warnings: string[] };
  readonly report: Report | null;
  readonly language: string;
  audit(options?: { deep?: boolean; fix?: boolean; scope?: Element }): Promise<Report>;
  fix(options?: { tier?: FixTier; ids?: string[] }): Promise<number>;
  revert(ruleId?: string): void;
  prefs: {
    get(): Preferences;
    set(patch: Partial<Preferences>): void;
    reset(): void;
    applyProfile(name: ProfileName, on?: boolean): void;
    profiles: ProfileName[];
    defaults: Preferences;
  };
  open(): void;
  close(): void;
  toggle(): void;
  setLanguage(lang: Lang): void;
  announce(text: string, politeness?: 'polite' | 'assertive'): void;
  toJSON(): SerializedReport | null;
  changes(): ChangeSummary[];
  destroy(): void;
}

export interface Criterion { id: string; level: Level; automation: 'auto' | 'partial' | 'manual'; title: Localized; new22?: boolean }
export interface RuleInfo { id: string; sc: string[]; impact: Impact; fix: FixTier | null; deep: boolean }

export const VERSION: string;
export const DEFAULTS: Required<Config>;
export const criteria: Criterion[];
export const rules: RuleInfo[];
export const PROFILES: Record<ProfileName, Partial<Preferences>>;
export const DEFAULT_PREFS: Preferences;
export const STRINGS: Record<'mn' | 'en', Record<string, string>>;

export function init(config?: Config): HurteemjApi;
/** Audit only — no widget, no fixes. */
export function auditPage(config?: Config): Report;
export function configFromScript(script: { getAttribute(name: string): string | null } | null): Partial<Config>;
export function normalizeConfig(...layers: (Partial<Config> | undefined | null)[]): Required<Config> & { warnings: string[] };
export function criteriaForLevel(level?: Level): Criterion[];
/** Patch `EventTarget.prototype.addEventListener` to record click targets (improves 2.1.1 detection). Call before site scripts. */
export function trackListeners(win?: Window): WeakSet<EventTarget> | undefined;
export function serialize(report: Report, lang?: Lang): SerializedReport;

declare const _default: { init: typeof init; auditPage: typeof auditPage; criteria: Criterion[]; rules: RuleInfo[]; version: string; trackListeners: typeof trackListeners };
export default _default;

declare global {
  interface Window {
    Hurteemj?: typeof _default & { configFromScript: typeof configFromScript };
    HurteemjConfig?: Config & { auto?: boolean; trackListeners?: boolean };
    __hurteemj?: HurteemjApi;
  }
  interface DocumentEventMap {
    'hurteemj:ready': CustomEvent<HurteemjApi>;
    'hurteemj:audit': CustomEvent<Report>;
    'hurteemj:fix': CustomEvent<{ fixed: number; report: Report }>;
    'hurteemj:prefs': CustomEvent<{ prefs: Preferences; patch: Partial<Preferences> }>;
  }
}
