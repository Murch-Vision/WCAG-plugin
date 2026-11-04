/**
 * Хэрэглэгчийн хувийн тохиргоо (end-user adaptations).
 * Эдгээр нь сайтын кодыг засахгүй, харин хэрэглэгч өөрийн хэрэгцээнд тааруулна —
 * WCAG 1.4.4, 1.4.8, 1.4.12, 2.2.2, 2.3.3, 2.4.7/2.4.13, 2.5.5-ын зорилготой нийцнэ.
 */
import { HOST_ATTR } from '../core/dom.js';

export const DEFAULT_PREFS = {
  fontScale: 1,
  textSpacing: false,
  readableFont: false,
  alignLeft: false,
  highlightLinks: false,
  highlightHeadings: false,
  contrast: 'default', // default | light | dark | invert
  saturation: 'default', // default | low | high | mono
  stopMotion: false,
  focusRing: false,
  bigCursor: false,
  largeTargets: false,
  hideImages: false,
  readingGuide: 'off', // off | line | mask
  tts: false,
};

export const PROFILES = {
  lowVision: { fontScale: 1.3, contrast: 'light', focusRing: true, bigCursor: true, highlightLinks: true },
  dyslexia: { readableFont: true, textSpacing: true, alignLeft: true, readingGuide: 'line' },
  seizure: { stopMotion: true, saturation: 'low' },
  adhd: { stopMotion: true, readingGuide: 'mask', saturation: 'low', hideImages: false },
  motor: { focusRing: true, largeTargets: true, stopMotion: true },
  elderly: { fontScale: 1.2, highlightLinks: true, largeTargets: true, bigCursor: true, focusRing: true },
};

const NOT_UI = `:not([${HOST_ATTR}]):not([${HOST_ATTR}] *)`;
const CURSOR = (fill) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M6 3l30 28H21l9 15-6 2-9-15-9 9z' fill='${fill}' stroke='white' stroke-width='2.5' stroke-linejoin='round'/></svg>`)}") 4 2`;

function buildCss(p, config) {
  const css = [];
  const fc = config.focusColor || '#0b1f3a';
  if (p.textSpacing) {
    css.push(`body *${NOT_UI}{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}
body p${NOT_UI}{margin-bottom:2em!important}`);
  }
  if (p.readableFont) {
    css.push(`body, body *${NOT_UI}:not(i):not(code):not(pre):not(kbd):not(samp):not([class*="icon"]):not([class*="fa-"]):not([class^="fa"]):not([class*="material-symbols"]):not([class*="glyph"]):not([aria-hidden="true"]){font-family:"Atkinson Hyperlegible","Verdana","Segoe UI","Tahoma","Arial",sans-serif!important}`);
  }
  if (p.alignLeft) css.push(`body :is(p,li,td,dd,blockquote,div,article,section)${NOT_UI}{text-align:start!important}`);
  if (p.highlightLinks) css.push(`body a[href]${NOT_UI}{text-decoration:underline!important;text-decoration-thickness:2px!important;text-underline-offset:.18em!important;outline:2px dashed currentColor!important;outline-offset:2px!important}`);
  if (p.highlightHeadings) css.push(`body :is(h1,h2,h3,h4,h5,h6,[role="heading"])${NOT_UI}{outline:3px solid #b45309!important;outline-offset:3px!important;background-color:rgba(255,237,180,.35)!important}`);
  if (p.contrast === 'light' || p.contrast === 'dark') {
    const [bg, fg, link, border] = p.contrast === 'light' ? ['#ffffff', '#000000', '#0000c8', '#000000'] : ['#000000', '#ffffff', '#ffff00', '#ffffff'];
    css.push(`html, body, body *${NOT_UI}:not(img):not(video):not(picture):not(canvas):not(svg):not(svg *){background-color:${bg}!important;color:${fg}!important;border-color:${border}!important;text-shadow:none!important;box-shadow:none!important}
body *${NOT_UI}:not(img):not(video):not(picture){background-image:none!important}
body a[href]${NOT_UI}, body a[href] *${NOT_UI}{color:${link}!important;text-decoration:underline!important}
body :is(input,select,textarea,button)${NOT_UI}{border:2px solid ${border}!important}
body svg${NOT_UI}:not([fill]){fill:currentColor}`);
  }
  const filters = [];
  if (p.contrast === 'invert') filters.push('invert(1) hue-rotate(180deg)');
  if (p.saturation === 'low') filters.push('saturate(.5)');
  if (p.saturation === 'high') filters.push('saturate(1.8)');
  if (p.saturation === 'mono') filters.push('grayscale(1)');
  if (filters.length) {
    // Root element-д filter өгөхөд fixed байрлал эвдрэхгүй (Filter Effects spec)
    css.push(`html{filter:${filters.join(' ')}!important}`);
    if (p.contrast === 'invert') css.push(`:is(img,video,picture,canvas,iframe,[style*="background-image"])${NOT_UI}{filter:invert(1) hue-rotate(180deg)!important}`);
  }
  if (p.stopMotion) {
    css.push(`*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;animation-delay:0s!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}`);
  }
  if (p.focusRing) {
    css.push(`body :focus-visible${NOT_UI}{outline:4px solid ${fc}!important;outline-offset:3px!important;box-shadow:0 0 0 3px #fff,0 0 0 9px #ffbf47!important}`);
  }
  if (p.bigCursor) {
    css.push(`html, body, body *${NOT_UI}{cursor:${CURSOR('black')}, auto!important}
body :is(a[href],button,[role="button"],label,select,summary,[onclick])${NOT_UI}, body :is(a[href],button,[role="button"]) *${NOT_UI}{cursor:${CURSOR('#0b5fff')}, pointer!important}`);
  }
  if (p.largeTargets) {
    css.push(`body :is(button,[role="button"],select,input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),summary)${NOT_UI}{min-height:44px!important;min-width:44px!important}
body :is(nav,header,footer,[role="navigation"],[role="menu"],[role="toolbar"]) a[href]${NOT_UI}{display:inline-block!important;min-height:44px!important;min-width:44px!important;padding-block:10px!important;box-sizing:border-box!important}
body input:is([type="checkbox"],[type="radio"])${NOT_UI}{width:24px!important;height:24px!important}`);
  }
  if (p.hideImages) css.push(`body :is(img,picture,video,svg[role="img"],[role="img"])${NOT_UI}{opacity:0!important}
body *${NOT_UI}{background-image:none!important}`);
  return css.join('\n');
}

const ENUMS = { contrast: ['default', 'light', 'dark', 'invert'], saturation: ['default', 'low', 'high', 'mono'], readingGuide: ['off', 'line', 'mask'] };

/** Хадгалагдсан/гаднаас ирсэн утгыг шалгаж, зөвхөн мэдэгдэж буй түлхүүр, хүчинтэй утгыг үлдээнэ */
export function sanitizePrefs(input, base = DEFAULT_PREFS) {
  const out = { ...base };
  if (!input || typeof input !== 'object') return out;
  for (const k of Object.keys(DEFAULT_PREFS)) {
    if (!(k in input)) continue;
    const v = input[k];
    if (k === 'fontScale') {
      const n = Number(v);
      out[k] = Number.isFinite(n) ? Math.min(2, Math.max(1, Math.round(n * 10) / 10)) : base[k];
    } else if (ENUMS[k]) {
      out[k] = ENUMS[k].includes(v) ? v : base[k];
    } else {
      out[k] = v === true || v === 'true';
    }
  }
  return out;
}

export function createPreferences({ doc, win, config, storage, onChange }) {
  let prefs = sanitizePrefs(config.defaults, DEFAULT_PREFS);
  const saved = storage.get();
  if (saved && typeof saved === 'object') prefs = sanitizePrefs(saved, prefs);
  else if (config.respectOS !== false && win.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    // Үйлдлийн системийн тохиргоог хүндэтгэх (2.3.3)
    prefs.stopMotion = true;
  }

  const style = doc.createElement('style');
  if (config.nonce) style.nonce = config.nonce;
  style.setAttribute(HOST_ATTR, 'prefs');
  const scaled = new Map(); // el -> { prev, prevPriority }
  let original = new WeakMap(); // el -> px (масштаблахаас өмнөх хэмжээ)
  const paused = new Set();
  const frozen = new Map(); // img -> canvas

  function unscale() {
    for (const [el, o] of scaled) {
      o.prev ? el.style.setProperty('font-size', o.prev, o.prevPriority) : el.style.removeProperty('font-size');
    }
    scaled.clear();
    original = new WeakMap();
  }

  function scaleText(root = doc.body) {
    if (!root) return;
    const s = prefs.fontScale;
    if (s === 1) { unscale(); return; }
    const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
    const els = [];
    for (let n = walker.currentNode; n; n = walker.nextNode()) {
      if (n.nodeType !== 1 || n.closest(`[${HOST_ATTR}]`) || /^(script|style|svg|noscript|template|br|img|video)$/i.test(n.localName)) continue;
      if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) {
        if (!/^(input|select|textarea|button)$/i.test(n.localName)) continue;
      }
      els.push(n);
      if (els.length > 8000) break;
    }
    // Эхлээд бүх анхны хэмжээг унших (layout thrash-аас сэргийлэх), дараа нь бичих
    for (const el of els) {
      if (!original.has(el)) original.set(el, parseFloat(win.getComputedStyle(el).fontSize));
    }
    for (const el of els) {
      const px = original.get(el);
      if (!px) continue;
      if (!scaled.has(el)) scaled.set(el, { prev: el.style.getPropertyValue('font-size'), prevPriority: el.style.getPropertyPriority('font-size') });
      el.style.setProperty('font-size', `${(px * s).toFixed(2)}px`, 'important');
    }
  }

  function motion(root = doc) {
    if (prefs.stopMotion) {
      root.querySelectorAll('video[autoplay], video').forEach((v) => { if (!v.paused && !v.closest(`[${HOST_ATTR}]`)) { v.pause(); paused.add(v); } });
      doc.getAnimations?.().forEach((a) => { try { if (a.playState === 'running') { a.pause(); paused.add(a); } } catch { /* ignore */ } });
      // GIF-ийг эхний фрэймээр царцаана
      root.querySelectorAll('img[src*=".gif" i]').forEach((img) => {
        if (frozen.has(img) || !img.complete || !img.naturalWidth) return;
        try {
          const c = doc.createElement('canvas');
          c.width = img.naturalWidth; c.height = img.naturalHeight;
          c.getContext('2d').drawImage(img, 0, 0);
          c.className = img.className;
          c.style.cssText = img.style.cssText;
          c.style.width = `${img.width}px`;
          c.style.height = `${img.height}px`;
          c.setAttribute('role', 'img');
          c.setAttribute('aria-label', img.alt || '');
          img.insertAdjacentElement('beforebegin', c);
          img.style.setProperty('display', 'none', 'important');
          frozen.set(img, c);
        } catch { /* ignore */ }
      });
    } else {
      for (const p of paused) { try { p.play(); } catch { /* ignore */ } }
      paused.clear();
      for (const [img, c] of frozen) { c.remove(); img.style.removeProperty('display'); }
      frozen.clear();
    }
  }

  function apply() {
    style.textContent = buildCss(prefs, config);
    if (!style.isConnected) (doc.head || doc.documentElement).appendChild(style);
    doc.documentElement.toggleAttribute('data-hj-active', Object.keys(DEFAULT_PREFS).some((k) => prefs[k] !== DEFAULT_PREFS[k]));
    scaleText();
    motion();
  }

  function set(patch, { silent = false } = {}) {
    prefs = sanitizePrefs(patch, prefs);
    storage.set(prefs);
    apply();
    if (!silent) onChange?.(prefs, patch);
  }

  function applyProfile(name, on = true) {
    const p = PROFILES[name];
    if (!p) return;
    if (on) set(p);
    else set(Object.fromEntries(Object.keys(p).map((k) => [k, DEFAULT_PREFS[k]])));
  }

  function profileActive(name) {
    const p = PROFILES[name];
    return !!p && Object.entries(p).every(([k, v]) => prefs[k] === v);
  }

  function reset() { set({ ...DEFAULT_PREFS }); }

  /** Шинээр нэмэгдсэн DOM-д тохиргоог давтан хэрэглэх (SPA) */
  function refresh(root) {
    // Шинэ элемент масштаблагдсан эцгээс хэмжээ өвлөсөн байж болох тул бүгдийг дахин хэмжинэ
    if (prefs.fontScale !== 1) { unscale(); scaleText(); }
    if (prefs.stopMotion) motion(root.querySelectorAll ? root : doc);
  }

  function destroy() {
    prefs = { ...DEFAULT_PREFS };
    scaleText();
    motion();
    style.remove();
    doc.documentElement.removeAttribute('data-hj-active');
  }

  return { get: () => ({ ...prefs }), set, reset, apply, applyProfile, profileActive, refresh, destroy };
}

export function createStorage(config, win) {
  const key = config.storageKey || 'hurteemj:prefs';
  const mode = config.storage ?? 'local';
  return {
    get() {
      try {
        if (mode === 'local') return JSON.parse(win.localStorage.getItem(key) || 'null');
        if (mode === 'cookie') {
          const m = win.document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
          return m ? JSON.parse(decodeURIComponent(m[1])) : null;
        }
      } catch { /* ignore */ }
      return null;
    },
    set(v) {
      try {
        if (mode === 'local') win.localStorage.setItem(key, JSON.stringify(v));
        else if (mode === 'cookie') {
          const domain = config.cookieDomain ? `; domain=${config.cookieDomain}` : '';
          win.document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(v))}; path=/; max-age=31536000; SameSite=Lax${domain}`;
        }
      } catch { /* ignore */ }
    },
  };
}
