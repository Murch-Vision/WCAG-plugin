/**
 * Ажиллах үеийн (runtime) засварууд — DOM атрибут биш, хуудасны зан төлөвт нөлөөлөх:
 *  - 2.4.7 / 2.4.13: хоёр өнгийн фокусын тойм
 *  - 2.4.11: sticky header/footer-ийн ард фокус далдлагдахаас хамгаалах
 *  - 4.1.3: plugin-ийн өөрийн live region (зарлагч)
 *  - 2.4.1: skip link-ийн загвар
 */
import { HOST_ATTR } from '../core/dom.js';

export function createRuntime(doc, win, changes, config) {
  const state = { focusRing: false, focusGuard: false, regions: null, base: null };

  function ensureBase() {
    if (state.base) return;
    const st = doc.createElement('style');
    if (config.nonce) st.nonce = config.nonce;
    st.setAttribute(HOST_ATTR, 'base');
    st.textContent = `
.hj-skip-link{position:fixed;top:8px;left:8px;z-index:2147483646;padding:12px 18px;background:#0b1f3a;color:#fff;font:600 16px/1.3 system-ui,sans-serif;border-radius:6px;text-decoration:underline;transform:translateY(-200%);transition:transform .15s}
.hj-skip-link:focus{transform:none;outline:3px solid #ffbf47;outline-offset:2px}
@media (prefers-reduced-motion: reduce){.hj-skip-link{transition:none}}
.hj-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}`;
    (doc.head || doc.documentElement).appendChild(st);
    state.base = st;
  }

  function enableFocusRing() {
    if (state.focusRing) return;
    const c = config.focusColor || '#0b1f3a';
    const st = doc.createElement('style');
    if (config.nonce) st.nonce = config.nonce;
    st.setAttribute(HOST_ATTR, 'focus-ring');
    // Бараан тойм + цагаан гадна хүрээ: ямар ч дэвсгэр дээр 3:1-ээс дээш ялгарна (2.4.13: ≥2px)
    st.textContent = `:where(a[href],area[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="radio"],[role="switch"],[role="option"]):focus-visible{outline:3px solid ${c}!important;outline-offset:2px!important;box-shadow:0 0 0 2px #fff,0 0 0 7px ${c}22!important}
@media (forced-colors: active){:focus-visible{outline:3px solid Highlight!important}}`;
    (doc.head || doc.documentElement).appendChild(st);
    state.focusRing = true;
    changes.custom(() => { st.remove(); state.focusRing = false; }, 'focus-visible');
  }

  function stickyOffsets() {
    let top = 0, bottom = 0;
    const vw = win.innerWidth, vh = win.innerHeight;
    const all = doc.body ? doc.body.getElementsByTagName('*') : [];
    for (const el of all) {
      if (el.closest(`[${HOST_ATTR}]`)) continue;
      const s = win.getComputedStyle(el);
      if (s.position !== 'fixed' && s.position !== 'sticky') continue;
      if (s.display === 'none' || s.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.5 || r.height < 20 || r.height > vh * 0.6) continue;
      if (r.top <= 2 && r.bottom > 0) top = Math.max(top, r.bottom);
      else if (r.bottom >= vh - 2 && r.top < vh) bottom = Math.max(bottom, vh - r.top);
    }
    return { top, bottom };
  }

  function enableFocusGuard() {
    if (state.focusGuard) return;
    state.focusGuard = true;
    const html = doc.documentElement;
    const prev = { t: html.style.scrollPaddingTop, b: html.style.scrollPaddingBottom };
    const applyPadding = () => {
      const { top, bottom } = stickyOffsets();
      html.style.scrollPaddingTop = top ? `${Math.ceil(top + 8)}px` : prev.t;
      html.style.scrollPaddingBottom = bottom ? `${Math.ceil(bottom + 8)}px` : prev.b;
      return { top, bottom };
    };
    let offs = applyPadding();
    const onFocus = (e) => {
      const el = e.target;
      if (!(el instanceof win.Element) || el.closest(`[${HOST_ATTR}]`)) return;
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) return;
      // Фокустай элементийн төв ба булангуудыг шалгаж, бүрэн далдлагдсан эсэхийг тогтооно
      const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.bottom - 2]];
      const covered = pts.every(([x, y]) => {
        if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) return true;
        const top = doc.elementFromPoint(x, y);
        return top && top !== el && !el.contains(top) && !top.contains(el);
      });
      if (!covered) return;
      offs = applyPadding();
      if (r.top < offs.top + 4) win.scrollBy({ top: r.top - offs.top - 12, behavior: 'instant' });
      else if (r.bottom > win.innerHeight - offs.bottom - 4) win.scrollBy({ top: r.bottom - (win.innerHeight - offs.bottom) + 12, behavior: 'instant' });
    };
    const onResize = () => { offs = applyPadding(); };
    doc.addEventListener('focusin', onFocus, true);
    win.addEventListener('resize', onResize);
    changes.custom(() => {
      doc.removeEventListener('focusin', onFocus, true);
      win.removeEventListener('resize', onResize);
      html.style.scrollPaddingTop = prev.t; html.style.scrollPaddingBottom = prev.b;
      state.focusGuard = false;
    }, 'focus-not-obscured');
  }

  function regions() {
    if (state.regions && state.regions.polite.isConnected) return state.regions;
    const box = doc.createElement('div');
    box.setAttribute(HOST_ATTR, 'live');
    box.className = 'hj-sr-only';
    const mk = (p) => { const d = doc.createElement('div'); d.setAttribute('aria-live', p); d.setAttribute('aria-atomic', 'true'); box.appendChild(d); return d; };
    const polite = mk('polite'), assertive = mk('assertive');
    ensureBase();
    doc.body.appendChild(box);
    state.regions = { box, polite, assertive };
    return state.regions;
  }

  function announce(text, politeness = 'polite') {
    if (!text || !doc.body) return;
    const r = regions()[politeness === 'assertive' ? 'assertive' : 'polite'];
    r.textContent = '';
    // Нэг текстийг дахин зарлуулахын тулд дараагийн frame-д оруулна
    win.setTimeout(() => { r.textContent = text; }, 60);
  }

  function destroy() {
    state.base?.remove(); state.base = null;
    state.regions?.box.remove(); state.regions = null;
  }

  return { ensureBase, enableFocusRing, enableFocusGuard, announce, destroy, stickyOffsets };
}
