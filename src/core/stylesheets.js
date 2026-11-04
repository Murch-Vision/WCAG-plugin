/**
 * Гадны (cross-origin) stylesheet-ийг CSSOM-оор унших боломжгүй үед (`sheet.cssRules` SecurityError)
 * `fetch`-ээр татаж `CSSStyleSheet.replace()`-ээр задална. Ингэснээр CDN дээрх framework CSS
 * (Bootstrap, Tailwind г.м.)-ийн :focus дүрмүүд 2.4.7 шалгалтад орно.
 *
 * Зөвхөн same-origin эсвэл CORS зөвшөөрсөн (Access-Control-Allow-Origin) файл уншигдана — ихэнх CDN зөвшөөрдөг.
 * Хуудас аль хэдийн ачаалсан тул `cache: 'force-cache'`-аар браузерын кэшээс авна; сүлжээний нэмэлт ачаалал бага.
 */
const cache = new Map(); // href -> Promise<CSSStyleSheet|null>

export function supportsConstructedSheets(win) {
  return !!win && typeof win.CSSStyleSheet === 'function' && typeof win.CSSStyleSheet.prototype.replace === 'function';
}

async function fetchSheet(win, href, { timeout, maxBytes }) {
  try {
    const ctrl = typeof win.AbortController === 'function' ? new win.AbortController() : null;
    const timer = ctrl && win.setTimeout(() => ctrl.abort(), timeout);
    const res = await win.fetch(href, { mode: 'cors', credentials: 'omit', cache: 'force-cache', signal: ctrl?.signal });
    if (timer) win.clearTimeout(timer);
    if (!res.ok) return null;
    const len = Number(res.headers.get('content-length'));
    if (len > maxBytes) return null;
    const text = await res.text();
    if (text.length > maxBytes) return null;
    const sheet = new win.CSSStyleSheet();
    // replace() нь @import-ийг үл тоомсорлодог (spec) — доорх шалгалтад л хамаарна
    await sheet.replace(text);
    try { Object.defineProperty(sheet, 'hjHref', { value: href }); } catch { /* ignore */ }
    return sheet;
  } catch {
    return null; // CORS хориглосон, timeout, сүлжээний алдаа — чимээгүй алгасна
  }
}

/** CSSOM-оор уншигдахгүй href-тэй sheet-үүдийн href */
export function blockedSheetHrefs(doc) {
  const out = [];
  for (const sheet of doc.styleSheets) {
    if (!sheet.href) continue;
    try { void sheet.cssRules; } catch { out.push(sheet.href); }
  }
  return out;
}

/**
 * @returns {Promise<CSSStyleSheet[]>} задалсан гадны sheet-үүд (CSSOM-д байгаа sheet-үүдийг давхардуулахгүй)
 */
export async function loadExternalSheets(doc, { timeout = 4000, max = 25, maxBytes = 1.5e6 } = {}) {
  const win = doc.defaultView;
  if (!supportsConstructedSheets(win) || typeof win.fetch !== 'function') return [];
  const hrefs = blockedSheetHrefs(doc).slice(0, max);
  const sheets = await Promise.all(hrefs.map((href) => {
    if (!cache.has(href)) cache.set(href, fetchSheet(win, href, { timeout, maxBytes }));
    return cache.get(href);
  }));
  return sheets.filter(Boolean);
}

/** Тестэд: кэш цэвэрлэх */
export function clearSheetCache() { cache.clear(); }
