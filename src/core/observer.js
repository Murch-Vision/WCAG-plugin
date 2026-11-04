/**
 * SPA / динамик контентын ажиглагч.
 *  - MutationObserver: шинээр нэмэгдсэн DOM хэсгийг цуглуулж, browser сул үед хэсэгчлэн шалгана
 *  - history.pushState / replaceState / popstate: route солигдоход бүтэн аудит
 * Plugin-ийн өөрийн өөрчлөлт (busy үед) ажиглагдахгүй.
 */
import { HOST_ATTR, idle, isOwnUi } from './dom.js';

export function createObserver({ win, doc, isBusy, onPartial, onNavigate, debounce = 400, navDelay = 800 }) {
  const pending = new Set();
  let timer = null;
  let navTimer = null;
  let destroyed = false;
  let mo = null;

  function flush() {
    timer = null;
    if (destroyed) return;
    const all = [...pending];
    pending.clear();
    // Үүрлэсэн node-уудаас зөвхөн хамгийн гаднахыг авна
    const roots = all.filter((n) => n.isConnected && !all.some((o) => o !== n && o.contains(n)));
    if (!roots.length) return;
    idle(() => { if (!destroyed) onPartial(roots); });
  }

  function schedule() {
    if (!timer) timer = win.setTimeout(flush, debounce);
  }

  if ('MutationObserver' in win) {
    mo = new win.MutationObserver((records) => {
      if (isBusy()) return;
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n.nodeType === 1 && !isOwnUi(n) && !n.hasAttribute?.(HOST_ATTR)) pending.add(n);
        }
      }
      if (pending.size) schedule();
    });
  }

  const onNav = () => {
    win.clearTimeout(navTimer);
    navTimer = win.setTimeout(() => { if (!destroyed) onNavigate(); }, navDelay);
  };
  const hist = win.history;
  const origPush = hist?.pushState;
  const origReplace = hist?.replaceState;
  if (origPush) {
    hist.pushState = function (...a) { const r = origPush.apply(this, a); onNav(); return r; };
    hist.replaceState = function (...a) { const r = origReplace.apply(this, a); onNav(); return r; };
    win.addEventListener('popstate', onNav);
  }

  return {
    start() { mo?.observe(doc.body, { childList: true, subtree: true }); },
    /** Plugin-ийн өөрийн өөрчлөлтийн бүртгэлийг хаяна */
    drop() { mo?.takeRecords(); },
    destroy() {
      destroyed = true;
      win.clearTimeout(timer); win.clearTimeout(navTimer);
      mo?.disconnect();
      pending.clear();
      if (origPush && hist.pushState !== origPush) { hist.pushState = origPush; hist.replaceState = origReplace; }
      win.removeEventListener('popstate', onNav);
    },
  };
}
