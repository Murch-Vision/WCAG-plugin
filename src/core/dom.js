/**
 * DOM туслах функцууд: харагдах эсэх, далд (implicit) ARIA үүрэг,
 * accessible name тооцоолол (W3C AccName 1.2-ийн хялбаршуулсан хувилбар),
 * Shadow DOM дотор хайх, тогтвортой CSS selector үүсгэх.
 */

export const HOST_ATTR = 'data-hurteemj-ui';

/** Shadow root-уудыг оролцуулан querySelectorAll */
export function qsa(root, selector, { shadow = true } = {}) {
  const out = [];
  const visit = (r) => {
    r.querySelectorAll(selector).forEach((el) => out.push(el));
    if (!shadow) return;
    r.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot && !el.hasAttribute(HOST_ATTR)) visit(el.shadowRoot);
    });
  };
  visit(root);
  return out;
}

export function isOwnUi(el) {
  return !!(el && el.closest && el.closest(`[${HOST_ATTR}]`));
}

/** Хэрэглэгчийн ignore selector-т багтсан эсэх */
export function isIgnored(el, ignore) {
  if (isOwnUi(el)) return true;
  if (!ignore || !ignore.length) return false;
  return ignore.some((sel) => {
    try { return !!el.closest(sel); } catch { return false; }
  });
}

/** Хэрэглэгчид харагдаж буй эсэх (display/visibility/opacity/хэмжээ) */
export function isVisible(el) {
  if (!el || el.nodeType !== 1) return false;
  if (el.checkVisibility) {
    if (!el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) return false;
  } else {
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
      const s = getComputedStyle(n);
      if (s.display === 'none') return false;
    }
    if (getComputedStyle(el).visibility === 'hidden') return false;
  }
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0 && getComputedStyle(el).overflow !== 'visible') return false;
  return true;
}

/** Туслах технологиос нуугдсан эсэх (aria-hidden, hidden, inert, display:none) */
export function isHiddenFromAT(el) {
  for (let n = el; n && n.nodeType === 1; n = n.parentElement || n.getRootNode?.().host) {
    if (n.getAttribute('aria-hidden') === 'true') return true;
    if (n.hidden || n.inert) return true;
    const s = getComputedStyle(n);
    if (s.display === 'none') return true;
    if (n === el && s.visibility === 'hidden') return true;
  }
  return false;
}

/** Нүдэнд нуугдсан ч дэлгэц уншигчид зориулсан (sr-only) эсэх */
export function isVisuallyHidden(el) {
  const s = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  if (r.width <= 1 && r.height <= 1) return true;
  if (s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') return true;
  return false;
}

const FOCUSABLE_SEL = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'summary', '[contenteditable=""]',
  '[contenteditable="true"]', 'audio[controls]', 'video[controls]', '[tabindex]',
].join(',');

export function isFocusable(el) {
  if (!el.matches(FOCUSABLE_SEL)) return false;
  if (el.getAttribute('tabindex') !== null && +el.getAttribute('tabindex') < 0) return false;
  if (el.closest('[inert]')) return false;
  return true;
}

export function focusableIn(root) {
  return qsa(root, FOCUSABLE_SEL).filter((el) => isFocusable(el) && isVisible(el));
}

// ---- ARIA үүрэг ----------------------------------------------------------

const INPUT_ROLES = {
  button: 'button', submit: 'button', reset: 'button', image: 'button', checkbox: 'checkbox',
  radio: 'radio', range: 'slider', number: 'spinbutton', search: 'searchbox', email: 'textbox',
  tel: 'textbox', text: 'textbox', url: 'textbox', password: 'textbox', '': 'textbox',
};

export function getRole(el) {
  const explicit = (el.getAttribute('role') || '').trim().split(/\s+/)[0];
  if (explicit) return explicit;
  const tag = el.localName;
  switch (tag) {
    case 'a': case 'area': return el.hasAttribute('href') ? 'link' : null;
    case 'button': return 'button';
    case 'input': {
      const t = (el.getAttribute('type') || '').toLowerCase();
      if (t === 'hidden') return null;
      if (['text', 'search', 'email', 'tel', 'url', ''].includes(t) && el.hasAttribute('list')) return 'combobox';
      return INPUT_ROLES[t] ?? 'textbox';
    }
    case 'select': return el.multiple || el.size > 1 ? 'listbox' : 'combobox';
    case 'textarea': return 'textbox';
    case 'img': return el.getAttribute('alt') === '' ? 'presentation' : 'img';
    case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': return 'heading';
    case 'nav': return 'navigation';
    case 'main': return 'main';
    case 'aside': return 'complementary';
    case 'header': return el.closest('article,aside,main,nav,section') ? null : 'banner';
    case 'footer': return el.closest('article,aside,main,nav,section') ? null : 'contentinfo';
    case 'form': return 'form';
    case 'section': return el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') ? 'region' : null;
    case 'ul': case 'ol': case 'menu': return 'list';
    case 'li': return 'listitem';
    case 'table': return 'table';
    case 'dialog': return 'dialog';
    case 'summary': return 'button';
    case 'svg': return 'graphics-document';
    case 'iframe': return null;
    case 'progress': return 'progressbar';
    case 'meter': return 'meter';
    case 'output': return 'status';
    default: return null;
  }
}

/** Нэрийг агуулгаас (contents) авч болох үүргүүд */
const NAME_FROM_CONTENT = new Set([
  'button', 'cell', 'checkbox', 'columnheader', 'gridcell', 'heading', 'link', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'row', 'rowheader', 'switch', 'tab',
  'tooltip', 'treeitem', 'listitem',
]);

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim();

/** AccName 1.2 хялбаршуулсан хувилбар. Ихэнх бодит тохиолдлыг хамарна. */
export function accessibleName(el, { visited = new Set(), inLabelledby = false, recursing = false } = {}) {
  if (!el || visited.has(el)) return '';
  visited.add(el);
  const getById = (id) => (el.getRootNode?.() || document).getElementById?.(id) || document.getElementById(id);

  if (!inLabelledby && el.hasAttribute('aria-labelledby')) {
    const txt = el.getAttribute('aria-labelledby').split(/\s+/)
      .map((id) => getById(id)).filter(Boolean)
      .map((n) => accessibleName(n, { visited, inLabelledby: true, recursing: true }) || norm(n.textContent))
      .join(' ');
    if (norm(txt)) return norm(txt);
  }
  if (recursing && !inLabelledby && isHiddenFromAT(el)) return '';
  const aria = norm(el.getAttribute('aria-label'));
  if (aria) return aria;

  const tag = el.localName;
  // Native label хувилбарууд
  if (['input', 'select', 'textarea', 'meter', 'progress', 'output'].includes(tag)) {
    const type = (el.getAttribute('type') || '').toLowerCase();
    if (tag === 'input' && ['button', 'submit', 'reset'].includes(type)) {
      const v = norm(el.value || el.getAttribute('value'));
      if (v) return v;
      if (type === 'submit') return 'Submit';
      if (type === 'reset') return 'Reset';
    }
    if (tag === 'input' && type === 'image') {
      const alt = norm(el.getAttribute('alt'));
      if (alt) return alt;
    }
    const labels = el.labels ? Array.from(el.labels) : [];
    if (labels.length) {
      const t = labels.map((l) => textFromContent(l, visited, el)).join(' ');
      if (norm(t)) return norm(t);
    }
  }
  if (tag === 'img' || tag === 'area') {
    const alt = el.getAttribute('alt');
    if (alt !== null && norm(alt)) return norm(alt);
  }
  if (tag === 'svg') {
    const t = el.querySelector(':scope > title');
    if (t && norm(t.textContent)) return norm(t.textContent);
  }
  if (tag === 'fieldset') {
    const lg = el.querySelector(':scope > legend');
    if (lg) return norm(textFromContent(lg, visited));
  }
  if (tag === 'table') {
    const cap = el.querySelector(':scope > caption');
    if (cap) return norm(cap.textContent);
  }
  if (tag === 'figure') {
    const fc = el.querySelector(':scope > figcaption');
    if (fc) return norm(fc.textContent);
  }
  const role = getRole(el);
  if (inLabelledby || recursing || NAME_FROM_CONTENT.has(role) || tag === 'summary') {
    const t = textFromContent(el, visited);
    if (norm(t)) return norm(t);
  }
  const title = norm(el.getAttribute('title'));
  if (title) return title;
  if (['input', 'textarea'].includes(tag)) {
    // Placeholder нь сүүлийн нөөц (HTML-AAM), WCAG-ийн хувьд хангалтгүй гэж тусад нь шалгана
    const ph = norm(el.getAttribute('placeholder'));
    if (ph) return ph;
  }
  return '';
}

function textFromContent(root, visited, skip) {
  let out = '';
  root.childNodes.forEach((n) => {
    if (n.nodeType === 3) out += n.textContent;
    else if (n.nodeType === 1 && n !== skip) {
      if (n.getAttribute('aria-hidden') === 'true' || n.hidden) return;
      const s = getComputedStyle(n);
      if (s.display === 'none' || s.visibility === 'hidden') return;
      if (['input', 'select', 'textarea'].includes(n.localName)) { out += ' ' + (n.value || '') + ' '; return; }
      const block = s.display !== 'inline' && s.display !== 'contents';
      const part = accessibleName(n, { visited, recursing: true });
      out += block ? ` ${part} ` : part;
    }
  });
  // CSS ::before/::after контент
  try {
    const b = getComputedStyle(root, '::before').content;
    const a = getComputedStyle(root, '::after').content;
    const clean = (c) => (c && c !== 'none' && c !== 'normal' && /^["']/.test(c) ? c.slice(1, -1) : '');
    out = clean(b) + out + clean(a);
  } catch { /* ignore */ }
  return out;
}

/** Нүдэнд харагдах текст (aria-label-ыг тооцохгүй) — 2.5.3 Label in Name-д */
export function visibleText(el) {
  let out = '';
  const walk = (n) => {
    if (n.nodeType === 3) { out += n.textContent; return; }
    if (n.nodeType !== 1) return;
    const s = getComputedStyle(n);
    if (s.display === 'none' || s.visibility === 'hidden') return;
    if (n !== el && isVisuallyHidden(n)) return;
    if (n.localName === 'img' && n.getAttribute('alt')) { out += ' ' + n.getAttribute('alt') + ' '; return; }
    n.childNodes.forEach(walk);
  };
  walk(el);
  return norm(out);
}

/**
 * Нэг аудитын хүрээнд cssPath-ийн nth-of-type тооцоог кэшлэнэ.
 * Эцэг бүрийн хүүхдүүдийг нэг л удаа тоолно — 1500 article-тай хуудсанд O(n²) → O(n).
 */
export function createPathCache() {
  return { siblings: new WeakMap(), ids: new Map() };
}

function nthOfType(n, cache) {
  const parent = n.parentElement;
  if (!parent) return null;
  let map = cache?.siblings.get(parent);
  if (!map) {
    map = new Map();
    const counts = {};
    for (const c of parent.children) counts[c.localName] = (counts[c.localName] || 0) + 1;
    const seen = {};
    for (const c of parent.children) {
      seen[c.localName] = (seen[c.localName] || 0) + 1;
      map.set(c, counts[c.localName] > 1 ? seen[c.localName] : 0);
    }
    cache?.siblings.set(parent, map);
  }
  return map.get(n) || 0;
}

function uniqueId(el, cache) {
  if (!el.id || !/^[A-Za-z][\w-]*$/.test(el.id)) return null;
  const root = el.getRootNode();
  const key = el.id;
  let count = cache?.ids.get(key);
  if (count === undefined) {
    count = root.querySelectorAll(`#${CSS.escape(key)}`).length;
    cache?.ids.set(key, count);
  }
  return count === 1 ? `#${key}` : null;
}

/** Элементийг давтагдашгүй тодорхойлох CSS selector. `cache` = createPathCache() (сонголттой) */
export function cssPath(el, cache) {
  if (!el || el.nodeType !== 1) return '';
  if (el === el.ownerDocument.documentElement) return 'html';
  if (el === el.ownerDocument.body) return 'body';
  const own = uniqueId(el, cache);
  if (own) return own;
  const parts = [];
  for (let n = el; n && n.nodeType === 1 && n.localName !== 'html'; n = n.parentElement) {
    const id = uniqueId(n, cache);
    if (id) { parts.unshift(id); break; }
    const nth = nthOfType(n, cache);
    parts.unshift(nth ? `${n.localName}:nth-of-type(${nth})` : n.localName);
  }
  const host = el.getRootNode()?.host;
  const sel = parts.join(' > ');
  return host ? `${cssPath(host, cache)} >>> ${sel}` : sel;
}

export function snippet(el, max = 160) {
  const html = el.outerHTML || '';
  // Хэрэглэгчийн оруулсан утга (value) тайланд гарахаас сэргийлнэ
  const open = (html.slice(0, html.indexOf('>') + 1) || html).replace(/\svalue="[^"]*"/gi, ' value="…"');
  return open.length > max ? open.slice(0, max) + '…' : open;
}

export const idle = (cb) =>
  (typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 50));

export const normalize = norm;
