import { accessibleName, getRole, isFocusable, isHiddenFromAT, isVisible, normalize, qsa } from '../core/dom.js';
import { INTERACTIVE_ROLES } from '../wcag/aria.js';
import { m, fail, review } from './util.js';

const TARGET_SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="switch"], [role="option"], [onclick]';

/** Хэвтээ мөрөн дотор (өгүүлбэр дунд) байгаа эсэх — 2.5.8 Inline exception */
function isInlineInText(el) {
  const s = getComputedStyle(el);
  if (s.display !== 'inline') return false;
  const block = el.parentElement?.closest('p, li, td, dd, span, label, blockquote, figcaption, div');
  if (!block) return false;
  const total = normalize(block.textContent).length;
  return total - normalize(el.textContent).length > 5;
}

/** CSSOM-оос фокусын тоймыг арилгасан дүрмүүдийг хайна */
function* walkRules(rules) {
  for (const r of rules) {
    if (r.cssRules && !(r instanceof CSSStyleRule)) yield* walkRules(r.cssRules);
    else if (r instanceof CSSStyleRule) { yield r; if (r.cssRules?.length) yield* walkRules(r.cssRules); }
  }
}

function stickyEdges(ctx) {
  const vw = ctx.win.innerWidth, vh = ctx.win.innerHeight;
  let top = 0, bottom = 0;
  const els = [];
  for (const el of qsa(ctx.doc.body, '*')) {
    if (ctx.ignored(el)) continue;
    const s = getComputedStyle(el);
    if (s.position !== 'fixed' && s.position !== 'sticky') continue;
    if (!isVisible(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < vw * 0.5 || r.height < 20 || r.height > vh * 0.6) continue;
    if (r.top <= 2 && r.bottom > 0) { top = Math.max(top, r.bottom); els.push({ el, edge: 'top', h: r.bottom }); }
    else if (r.bottom >= vh - 2 && r.top < vh) { bottom = Math.max(bottom, vh - r.top); els.push({ el, edge: 'bottom', h: vh - r.top }); }
  }
  return { top, bottom, els };
}

export default [
  {
    id: 'focus-visible',
    sc: ['2.4.7', '2.4.13'],
    impact: 'serious',
    run(ctx) {
      const out = [];
      // Plugin-ийн фокусын тойм идэвхтэй бол !important-гүй outline:none дүрмийг дарна
      const ringOn = !!ctx.doc.querySelector('style[data-hurteemj-ui="focus-ring"]');
      for (const sheet of ctx.doc.styleSheets) {
        if (sheet.ownerNode?.hasAttribute?.('data-hurteemj-ui')) continue;
        let rules;
        try { rules = sheet.cssRules; } catch { continue; } // CORS — уншиж чадахгүй
        for (const r of walkRules(rules)) {
          const sel = r.selectorText || '';
          if (!/:focus(?!-within)/.test(sel)) continue;
          const st = r.style;
          const killed = st.outlineStyle === 'none' || st.outline === 'none' || st.outline === '0' || st.outlineWidth === '0px' || st.outlineWidth === '0' || st.outline === '0px';
          if (!killed) continue;
          if (ringOn && !st.getPropertyPriority('outline') && !st.getPropertyPriority('outline-style') && !st.getPropertyPriority('outline-width')) continue;
          const replaced = (st.boxShadow && st.boxShadow !== 'none') || st.borderColor || st.borderBottomColor || st.backgroundColor || st.textDecoration || st.textDecorationLine;
          if (replaced) {
            out.push(review(ctx.doc.documentElement, m(`"${sel}" дүрэм outline-ыг арилгаад өөр тэмдэглэгээ (сүүдэр/хүрээ) өгсөн. 3:1 тодрол ба 2px зузаантай эсэхийг шалгана уу.`, `"${sel}" removes the outline but adds another indicator. Verify it has 3:1 contrast and 2px thickness.`), { selector: sel }));
          } else {
            out.push(fail(ctx.doc.documentElement, m(`CSS дүрэм "${sel}" фокусын тоймыг (outline) орлуулгагүйгээр арилгаж байна.`, `CSS rule "${sel}" removes the focus outline without a replacement.`), { selector: sel }));
          }
          if (out.length > 20) return out;
        }
      }
      return out;
    },
    fix: {
      tier: 'safe',
      once: true,
      apply(f, ctx) {
        if (f.outcome !== 'fail') return false;
        ctx.runtime.enableFocusRing();
        return m('Бүх элементэд 2.4.13-ыг хангах хоёр өнгийн (бараан+цагаан) фокусын тойм нэмэв.', 'Added a dual-tone focus ring meeting 2.4.13 to all focusable elements.');
      },
    },
  },
  {
    id: 'focus-not-obscured',
    sc: ['2.4.11', '2.4.12'],
    impact: 'serious',
    run(ctx) {
      const { top, bottom, els } = stickyEdges(ctx);
      if (!els.length) return [];
      const hs = getComputedStyle(ctx.doc.documentElement);
      const spTop = parseFloat(hs.scrollPaddingTop) || 0;
      const spBottom = parseFloat(hs.scrollPaddingBottom) || 0;
      const out = [];
      for (const { el, edge, h } of els) {
        const pad = edge === 'top' ? spTop : spBottom;
        if (pad + 1 >= h) continue;
        out.push(fail(el, m(`Байнгын (${edge === 'top' ? 'дээд' : 'доод'}) элемент ${Math.round(h)}px өндөртэй ч scroll-padding-${edge} ${Math.round(pad)}px. Гараар шилжихэд фокус энэ элементийн ард далдлагдана.`, `Sticky/fixed ${edge} element is ${Math.round(h)}px tall but scroll-padding-${edge} is ${Math.round(pad)}px. Keyboard focus can be hidden behind it.`), { edge, h, top, bottom }));
      }
      return out;
    },
    fix: {
      tier: 'safe',
      once: true,
      apply(f, ctx) {
        ctx.runtime.enableFocusGuard();
        return m('scroll-padding тохируулж, фокус далдлагдвал автоматаар гүйлгэдэг хамгаалалт идэвхжүүлэв.', 'Set scroll-padding and enabled a guard that scrolls focused elements out from under sticky content.');
      },
    },
  },
  {
    id: 'target-size',
    sc: ['2.5.8', '2.5.5'],
    impact: 'serious',
    run(ctx) {
      const aaa = ctx.level === 'AAA';
      const min = aaa ? 44 : 24;
      const targets = qsa(ctx.scope, TARGET_SEL)
        .filter((el) => !ctx.ignored(el) && isVisible(el) && !isHiddenFromAT(el) && !el.disabled)
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.height > 0);
      // Үүрлэсэн target-ыг (жишээ нь link доторх span[onclick]) нэгтгэнэ
      const uniq = targets.filter((t) => !targets.some((o) => o !== t && o.el.contains(t.el) && o.el.matches('a[href], button')));
      const small = uniq.filter(({ el, r }) => (r.width < min - 0.5 || r.height < min - 0.5) && !isInlineInText(el));
      const out = [];
      for (const t of small) {
        const { el, r } = t;
        if (el.localName === 'input' && ['checkbox', 'radio'].includes(el.type)) {
          const s = getComputedStyle(el);
          if (s.appearance !== 'none' && el.labels?.length) continue; // UA control + label товшилт
        }
        if (aaa) {
          out.push(fail(el, m(`Товшилтын талбай ${Math.round(r.width)}×${Math.round(r.height)}px (AAA шаардлага 44×44px).`, `Target is ${Math.round(r.width)}×${Math.round(r.height)}px (AAA requires 44×44px).`), { w: r.width, h: r.height, sc: ['2.5.5'] }));
          continue;
        }
        // Spacing exception: 24px диаметртэй тойрог бусад target-тай огтлолцохгүй бол OK
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const conflict = uniq.find((o) => {
          if (o === t || o.el.contains(el) || el.contains(o.el)) return false;
          const ox = o.r.left + o.r.width / 2, oy = o.r.top + o.r.height / 2;
          const oSmall = o.r.width < 24 || o.r.height < 24;
          if (oSmall) return Math.hypot(cx - ox, cy - oy) < 24;
          const dx = Math.max(o.r.left - cx, 0, cx - o.r.right);
          const dy = Math.max(o.r.top - cy, 0, cy - o.r.bottom);
          return Math.hypot(dx, dy) < 12;
        });
        if (conflict) {
          out.push(fail(el, m(`Товшилтын талбай ${Math.round(r.width)}×${Math.round(r.height)}px (<24px) бөгөөд хөрш элементтэй хэт ойр.`, `Target is ${Math.round(r.width)}×${Math.round(r.height)}px (<24px) and too close to a neighbouring target.`), { w: r.width, h: r.height, sc: ['2.5.8'] }));
        }
      }
      return out;
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const el = f.node;
        const s = getComputedStyle(el);
        const min = ctx.level === 'AAA' ? 44 : 24;
        if (s.display === 'inline') ctx.changes.setStyle(el, 'display', 'inline-block', 'target-size');
        ctx.changes.setStyle(el, 'min-width', `${min}px`, 'target-size');
        ctx.changes.setStyle(el, 'min-height', `${min}px`, 'target-size');
        return m(`Товшилтын талбайг ${min}×${min}px болгов.`, `Enlarged target to ${min}×${min}px.`);
      },
    },
  },
  {
    id: 'tabindex-positive',
    sc: ['2.4.3'],
    impact: 'serious',
    selector: '[tabindex]',
    evaluate(el) {
      const v = parseInt(el.getAttribute('tabindex'), 10);
      return v > 0 ? fail(el, m(`tabindex="${v}" (эерэг) нь фокусын байгалийн дарааллыг эвддэг.`, `tabindex="${v}" (positive) breaks the natural focus order.`)) : null;
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        ctx.changes.setAttr(f.node, 'tabindex', '0', 'tabindex-positive');
        return m('tabindex-ыг 0 болгов.', 'Changed tabindex to 0.');
      },
    },
  },
  {
    id: 'scrollable-region-focusable',
    sc: ['2.1.1'],
    impact: 'serious',
    selector: 'div, section, pre, ul, ol, article, aside, table, main, nav, code',
    evaluate(el) {
      const s = getComputedStyle(el);
      const sx = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2;
      const sy = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2;
      if (!sx && !sy) return null;
      if (el === document.scrollingElement || !isVisible(el)) return null;
      if (isFocusable(el) || el.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')) return null;
      return fail(el, m('Гүйлгэх (scroll) боломжтой хэсэгт гараар хүрэх боломжгүй.', 'Scrollable region is not keyboard accessible.'));
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        ctx.changes.setAttr(f.node, 'tabindex', '0', 'scrollable-region-focusable');
        if (!f.node.getAttribute('role') && !accessibleName(f.node)) {
          ctx.changes.setAttr(f.node, 'role', 'region', 'scrollable-region-focusable');
          const h = f.node.querySelector('h1,h2,h3,h4,h5,h6,caption');
          ctx.changes.setAttr(f.node, 'aria-label', h ? normalize(h.textContent) : (ctx.pageLang === 'mn' ? 'Гүйлгэх хэсэг' : 'Scrollable region'), 'scrollable-region-focusable');
        }
        return m('Гүйлгэх хэсгийг гараар фокуслах боломжтой болгов (tabindex="0").', 'Made the scroll region keyboard-focusable (tabindex="0").');
      },
    },
  },
  {
    id: 'click-without-keyboard',
    sc: ['2.1.1', '4.1.2'],
    impact: 'critical',
    selector: 'div, span, li, img, p, td, i, svg, label:not([for])',
    evaluate(el, ctx) {
      if (el.closest('a[href], button, [role="button"], [role="link"], label, summary') && el.localName !== 'label') return null;
      const role = getRole(el);
      if (role && INTERACTIVE_ROLES.has(role) && el.hasAttribute('tabindex')) return null;
      const hasHandler = el.hasAttribute('onclick') || (ctx.clickTracked && ctx.clickTracked.has(el));
      if (!hasHandler) {
        // cursor:pointer + ролгүй + фокусгүй + текст/icon — дан шинж тул review
        const s = getComputedStyle(el);
        if (s.cursor !== 'pointer' || !isVisible(el)) return null;
        const pS = el.parentElement && getComputedStyle(el.parentElement);
        if (pS && pS.cursor === 'pointer') return null; // зөвхөн хамгийн гаднах элементийг
        if (el.querySelector('a[href], button, input, select, textarea')) return null;
        return review(el, m('Заагч (cursor: pointer) нь товшдог мэт харагдах ч гар болон дэлгэц уншигчид хүрэх боломжгүй.', 'Element looks clickable (cursor: pointer) but is not reachable by keyboard or announced as a control.'), { evidence: 'cursor' });
      }
      if (isFocusable(el) && role) return null;
      return fail(el, m(`<${el.localName}> дээр click үйлдэл байгаа ч гараар ашиглах боломжгүй (role, tabindex, Enter/Space алга).`, `<${el.localName}> has a click handler but is not keyboard operable (missing role, tabindex, Enter/Space).`), { evidence: 'handler' });
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (f.data?.evidence !== 'handler') return false;
        const el = f.node;
        if (!el.getAttribute('role')) ctx.changes.setAttr(el, 'role', 'button', 'click-without-keyboard');
        if (!el.hasAttribute('tabindex')) ctx.changes.setAttr(el, 'tabindex', '0', 'click-without-keyboard');
        const onKey = (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && e.target === el) { e.preventDefault(); el.click(); }
        };
        ctx.changes.listen(el, 'keydown', onKey, false, 'click-without-keyboard');
        return m('role="button", tabindex="0", Enter/Space товчлуурын дэмжлэг нэмэв.', 'Added role="button", tabindex="0" and Enter/Space activation.');
      },
    },
  },
  {
    id: 'motion-animation',
    sc: ['2.2.2', '2.3.3'],
    impact: 'moderate',
    run(ctx) {
      if (typeof ctx.doc.getAnimations !== 'function') return [];
      const seen = new Set();
      const out = [];
      for (const a of ctx.doc.getAnimations()) {
        const t = a.effect?.target;
        if (!t || seen.has(t) || ctx.ignored(t) || a.playState !== 'running') continue;
        const timing = a.effect.getComputedTiming?.();
        if (!timing) continue;
        const total = timing.iterations === Infinity ? Infinity : timing.activeDuration;
        if (total > 5000 && isVisible(t)) {
          seen.add(t);
          out.push(review(t, m('5 секундээс урт/тасралтгүй хөдөлгөөн байна. Түр зогсоох, нуух удирдлага байгаа эсэх, prefers-reduced-motion дэмжиж буйг шалгана уу.', 'Animation runs longer than 5 seconds. Verify a pause control exists and prefers-reduced-motion is honoured.')));
        }
      }
      return out.slice(0, 15);
    },
  },
  {
    id: 'dragging-alternative',
    sc: ['2.5.7'],
    impact: 'serious',
    selector: '[draggable="true"], .sortable, [data-sortable], .ui-sortable, .ui-draggable, .draggable, [data-rbd-draggable-id], [data-swapy-item]',
    evaluate(el) {
      if (!isVisible(el)) return null;
      const box = el.closest('ul, ol, [role="list"], [role="listbox"], [role="grid"], div') || el;
      if (box.querySelector('button, [role="button"], select')) return null;
      return review(el, m('Чирж зөөх (drag) үйлдэлд нэг цэгийн товшилтоор хийх хувилбар (дээш/доош товч гэх мэт) байгаа эсэхийг шалгана уу.', 'Verify dragging has a single-pointer alternative (e.g. move up/down buttons).'));
    },
  },
  {
    id: 'consistent-help',
    sc: ['3.2.6'],
    impact: 'moderate',
    run(ctx) {
      // Хуудас хооронд тусламжийн механизмын харьцангуй дарааллыг sessionStorage-д хадгалж харьцуулна
      const HELP = /(тусламж|холбоо\s*барих|бидэнтэй\s*холбогдох|асуулт|help|support|contact|faq|chat)/i;
      const items = qsa(ctx.doc.body, 'a[href], button')
        .filter((el) => !ctx.ignored(el) && isVisible(el))
        .filter((el) => /^(tel:|mailto:)/.test(el.getAttribute('href') || '') || HELP.test(accessibleName(el)))
        .map((el) => (/^tel:/.test(el.getAttribute('href') || '') ? 'tel' : /^mailto:/.test(el.getAttribute('href') || '') ? 'mail' : normalize(accessibleName(el)).toLowerCase().slice(0, 30)));
      if (!items.length) return [];
      const key = 'hj-help-order';
      let prev = null;
      try { prev = JSON.parse(ctx.win.sessionStorage.getItem(key) || 'null'); } catch { /* ignore */ }
      try { ctx.win.sessionStorage.setItem(key, JSON.stringify({ path: ctx.win.location.pathname, items })); } catch { /* ignore */ }
      if (!prev || prev.path === ctx.win.location.pathname) return [];
      const common = prev.items.filter((i) => items.includes(i));
      const a = common.join('|');
      const b = items.filter((i) => common.includes(i)).join('|');
      if (common.length >= 2 && a !== b) {
        return [review(ctx.doc.body, m(`Тусламжийн холбоосуудын дараалал өмнөх хуудаснаас (${prev.path}) өөр байна.`, `Help mechanisms appear in a different order than on the previous page (${prev.path}).`))];
      }
      return [];
    },
  },
  {
    id: 'accesskey-unique',
    sc: ['2.1.4', '4.1.2'],
    impact: 'moderate',
    run(ctx) {
      const map = new Map();
      qsa(ctx.doc, '[accesskey]').forEach((el) => {
        const k = el.getAttribute('accesskey').toLowerCase();
        (map.get(k) || map.set(k, []).get(k)).push(el);
      });
      const out = [];
      for (const [k, els] of map) if (els.length > 1) out.push(fail(els[1], m(`accesskey="${k}" давхардсан байна.`, `accesskey="${k}" is duplicated.`)));
      return out;
    },
  },
];
