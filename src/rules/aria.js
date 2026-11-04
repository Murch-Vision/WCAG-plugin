import { accessibleName, getRole, isFocusable, isHiddenFromAT, isVisible, normalize, qsa, visibleText } from '../core/dom.js';
import { ROLES, ABSTRACT_ROLES, ARIA_ATTRS, ATTR_VALUES, IDREF_ATTRS, REQUIRED_ATTRS, NAME_REQUIRED, INTERACTIVE_ROLES } from '../wcag/aria.js';
import { m, fail, review, guessIconName, AMBIGUOUS_LINK_TEXT } from './util.js';

const nameFold = (s) => normalize(s).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

/** Холбоосын ӨМНӨ байрлах хамгийн ойрын гарчиг (хуваалцсан container-т буруу картын гарчиг авахгүй) */
function nearestHeadingText(el) {
  const card = el.closest('article, li, section, .card, [class*="card"], [class*="item"], [class*="post"]');
  if (!card) return null;
  const preceding = [...card.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')]
    .filter((h) => h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING);
  const h = preceding[preceding.length - 1];
  return h ? normalize(h.textContent) || null : null;
}

export default [
  {
    id: 'button-name',
    sc: ['4.1.2'],
    impact: 'critical',
    selector: 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]',
    evaluate(el) {
      if (isHiddenFromAT(el) || !isVisible(el)) return null;
      return accessibleName(el) ? null : fail(el, m('Товч нэргүй (дэлгэц уншигч "товч" гэж л уншина). Текст эсвэл aria-label нэмнэ үү.', 'Button has no accessible name. Add text or aria-label.'));
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const name = guessIconName(f.node, ctx.pageLang);
        if (!name) return false;
        ctx.changes.setAttr(f.node, 'aria-label', name, 'button-name');
        return m(`Icon-оос таамаглаж aria-label="${name}" өгөв (шалгана уу).`, `Guessed aria-label="${name}" from the icon (please verify).`);
      },
    },
  },
  {
    id: 'link-name',
    sc: ['2.4.4', '4.1.2'],
    impact: 'critical',
    selector: 'a[href], [role="link"]',
    evaluate(el) {
      if (isHiddenFromAT(el) || !isVisible(el)) return null;
      return accessibleName(el) ? null : fail(el, m('Холбоос нэргүй. Холбоосын текст, зургийн alt эсвэл aria-label нэмнэ үү.', 'Link has no accessible name. Add link text, image alt, or aria-label.'));
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const name = guessIconName(f.node, ctx.pageLang);
        if (!name) return false;
        ctx.changes.setAttr(f.node, 'aria-label', name, 'link-name');
        return m(`Icon/хаягаас таамаглаж aria-label="${name}" өгөв (шалгана уу).`, `Guessed aria-label="${name}" from icon/URL (please verify).`);
      },
    },
  },
  {
    id: 'link-purpose',
    sc: ['2.4.4', '2.4.9'],
    impact: 'moderate',
    selector: 'a[href]',
    evaluate(el) {
      if (isHiddenFromAT(el)) return null;
      const name = nameFold(accessibleName(el));
      if (!name || !AMBIGUOUS_LINK_TEXT.has(name)) return null;
      if (el.hasAttribute('aria-describedby')) return null;
      return review(el, m(`Холбоосын текст "${accessibleName(el)}" нь зорилгоо дангаараа илэрхийлэхгүй. Контекстоо (жишээ нь гарчгийг) нэмнэ үү.`, `Link text "${accessibleName(el)}" does not describe its purpose on its own. Add context such as the heading.`));
    },
    fix: {
      tier: 'heuristic', onReview: true,
      apply(f, ctx) {
        const h = nearestHeadingText(f.node);
        if (!h) return false;
        const vis = visibleText(f.node);
        // 2.5.3 Label in Name: харагдах текст нэрийн эхэнд байна
        const label = `${vis}: ${h}`;
        ctx.changes.setAttr(f.node, 'aria-label', label, 'link-purpose');
        return m(`aria-label="${label}" болгон контекст нэмэв.`, `Added context: aria-label="${label}".`);
      },
    },
  },
  {
    id: 'label-in-name',
    sc: ['2.5.3'],
    impact: 'serious',
    selector: '[aria-label], [aria-labelledby]',
    evaluate(el) {
      const role = getRole(el);
      if (!INTERACTIVE_ROLES.has(role)) return null;
      if (['textbox', 'searchbox', 'combobox', 'slider', 'spinbutton'].includes(role)) return null;
      const vis = nameFold(visibleText(el));
      if (!vis || vis.length < 2) return null;
      const name = nameFold(accessibleName(el));
      if (name.includes(vis)) return null;
      return fail(el, m(`Харагдах текст "${visibleText(el)}" нь програмын нэр "${accessibleName(el)}"-д агуулагдаагүй. Дуу хоолойгоор удирдах хэрэглэгч товчийг дуудаж чадахгүй.`, `Visible label "${visibleText(el)}" is not part of the accessible name "${accessibleName(el)}". Voice control users cannot activate it.`), { visible: visibleText(el), name: accessibleName(el) });
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (!f.node.hasAttribute('aria-label')) return false;
        const label = `${f.data.visible} (${f.data.name})`;
        ctx.changes.setAttr(f.node, 'aria-label', label, 'label-in-name');
        return m(`aria-label-ийг харагдах текстээр эхлүүлэв: "${label}".`, `Prefixed aria-label with visible text: "${label}".`);
      },
    },
  },
  {
    id: 'aria-valid-role',
    sc: ['4.1.2', '1.3.1'],
    impact: 'critical',
    selector: '[role]',
    evaluate(el) {
      const roles = el.getAttribute('role').trim().split(/\s+/).filter(Boolean);
      if (!roles.length) return null;
      const bad = roles.filter((r) => !ROLES.has(r));
      if (!bad.length) return null;
      if (roles.some((r) => ROLES.has(r))) return review(el, m(`role жагсаалтад хүчингүй утга бий: ${bad.join(', ')} (fallback-д хүчинтэй нь хэрэглэгдэнэ).`, `Role list contains invalid values: ${bad.join(', ')} (a valid fallback exists).`));
      const abstract = bad.filter((r) => ABSTRACT_ROLES.has(r));
      return fail(el, abstract.length
        ? m(`Хийсвэр (abstract) ARIA үүрэг "${abstract[0]}"-ийг хуудсанд ашиглах хориотой.`, `Abstract ARIA role "${abstract[0]}" must not be used.`)
        : m(`role="${bad.join(' ')}" нь хүчинтэй ARIA үүрэг биш.`, `role="${bad.join(' ')}" is not a valid ARIA role.`));
    },
  },
  {
    id: 'aria-valid-attr',
    sc: ['4.1.2'],
    impact: 'critical',
    run(ctx) {
      const out = [];
      for (const el of qsa(ctx.scope, '*')) {
        if (ctx.ignored(el)) continue;
        for (const a of el.attributes) {
          if (!a.name.startsWith('aria-')) continue;
          if (!ARIA_ATTRS.has(a.name)) {
            out.push(fail(el, m(`"${a.name}" нь хүчинтэй ARIA атрибут биш (үсгийн алдаа?).`, `"${a.name}" is not a valid ARIA attribute (typo?).`), { attr: a.name }));
            continue;
          }
          const allowed = ATTR_VALUES[a.name];
          const v = a.value.trim().toLowerCase();
          if (allowed && v && !allowed.includes(v)) {
            out.push(fail(el, m(`${a.name}="${a.value}" — зөвшөөрөгдөх утга: ${allowed.join(', ')}.`, `${a.name}="${a.value}" — allowed values: ${allowed.join(', ')}.`), { attr: a.name, value: a.value }));
          }
          if (/^aria-(valuenow|valuemin|valuemax|level|posinset|setsize|colcount|rowcount|colindex|rowindex|colspan|rowspan)$/.test(a.name) && v && Number.isNaN(Number(v))) {
            out.push(fail(el, m(`${a.name}="${a.value}" нь тоон утга байх ёстой.`, `${a.name}="${a.value}" must be a number.`)));
          }
        }
        if (out.length > 200) break;
      }
      return out;
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        // Түгээмэл үсгийн алдааг засна: aria-labeledby -> aria-labelledby
        const typos = { 'aria-labeledby': 'aria-labelledby', 'aria-role': null, 'aria-descibedby': 'aria-describedby', 'aria-describeby': 'aria-describedby', 'aria-hiden': 'aria-hidden' };
        const attr = f.data?.attr;
        if (!attr || !(attr in typos) || f.data.value !== undefined) return false;
        const val = f.node.getAttribute(attr);
        if (typos[attr]) ctx.changes.setAttr(f.node, typos[attr], val, 'aria-valid-attr');
        ctx.changes.removeAttr(f.node, attr, 'aria-valid-attr');
        return typos[attr] ? m(`${attr} -> ${typos[attr]} болгон засав.`, `Corrected ${attr} to ${typos[attr]}.`) : m(`Хүчингүй ${attr}-ийг устгав.`, `Removed invalid ${attr}.`);
      },
    },
  },
  {
    id: 'aria-required-attr',
    sc: ['4.1.2'],
    impact: 'critical',
    selector: '[role]',
    evaluate(el) {
      const role = el.getAttribute('role').trim().split(/\s+/)[0];
      const req = REQUIRED_ATTRS[role];
      if (!req) return null;
      // Native элемент нь утгыг өөрөө өгдөг
      if (el.localName === 'input' && ['checkbox', 'radio'].includes(el.type) && ['checkbox', 'radio', 'switch', 'menuitemcheckbox', 'menuitemradio'].includes(role)) return null;
      if (role === 'heading' && /^h[1-6]$/.test(el.localName)) return null;
      if (role === 'slider' && el.localName === 'input' && el.type === 'range') return null;
      if (role === 'combobox' && el.localName === 'select') return null;
      const missing = req.filter((a) => !el.hasAttribute(a));
      if (role === 'scrollbar' && missing.length === 1 && missing[0] === 'aria-controls') return null;
      if (!missing.length) return null;
      return fail(el, m(`role="${role}" нь ${missing.join(', ')} атрибутыг шаарддаг.`, `role="${role}" requires ${missing.join(', ')}.`), { role, missing });
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const { role, missing } = f.data;
        const defaults = { 'aria-checked': 'false', 'aria-expanded': 'false', 'aria-level': '2' };
        const applied = missing.filter((a) => defaults[a]);
        if (!applied.length) return false;
        applied.forEach((a) => ctx.changes.setAttr(f.node, a, defaults[a], 'aria-required-attr'));
        return m(`${role}-д анхны утга нэмэв: ${applied.join(', ')}. Төлөвийг JavaScript-ээр шинэчилж байгаа эсэхийг шалгана уу.`, `Added default ${applied.join(', ')} to ${role}. Ensure scripts update the state.`);
      },
    },
  },
  {
    id: 'aria-idrefs',
    sc: ['1.3.1', '4.1.2'],
    impact: 'serious',
    selector: IDREF_ATTRS.map((a) => `[${a}]`).join(','),
    evaluate(el) {
      const root = el.getRootNode();
      const missing = [];
      for (const a of IDREF_ATTRS) {
        const v = el.getAttribute(a);
        if (!v) continue;
        for (const id of v.trim().split(/\s+/)) if (id && !(root.getElementById ? root.getElementById(id) : document.getElementById(id))) missing.push(`${a}→#${id}`);
      }
      if (!missing.length) return null;
      // aria-controls нь хаалттай popup-д ихэвчлэн хоосон байдаг тул review
      const onlyControls = missing.every((x) => x.startsWith('aria-controls') || x.startsWith('aria-activedescendant'));
      return (onlyControls ? review : fail)(el, m(`ARIA лавлагаа байхгүй ID рүү заасан: ${missing.join(', ')}.`, `ARIA reference points to missing IDs: ${missing.join(', ')}.`));
    },
  },
  {
    id: 'duplicate-id-aria',
    sc: ['4.1.2', '1.3.1'],
    impact: 'serious',
    run(ctx) {
      const refd = new Set();
      qsa(ctx.doc, IDREF_ATTRS.map((a) => `[${a}]`).join(',') + ', label[for]').forEach((el) => {
        [...IDREF_ATTRS, 'for'].forEach((a) => (el.getAttribute(a) || '').split(/\s+/).filter(Boolean).forEach((id) => refd.add(id)));
      });
      const out = [];
      for (const id of refd) {
        let els;
        try { els = ctx.doc.querySelectorAll(`[id="${CSS.escape(id)}"]`); } catch { continue; }
        if (els.length > 1) out.push(fail(els[1], m(`Шошго/ARIA-д ашиглагдсан id="${id}" давхардсан тул буруу элемент холбогдоно.`, `id="${id}" is referenced by a label/ARIA but is duplicated.`)));
      }
      return out;
    },
  },
  {
    id: 'aria-hidden-focus',
    sc: ['4.1.2', '1.3.1'],
    impact: 'serious',
    selector: '[aria-hidden="true"]',
    evaluate(el, ctx) {
      if (el === ctx.doc.body || el === ctx.doc.documentElement) {
        return fail(el, m(`<${el.localName}> дээр aria-hidden="true" — хуудас бүхэлдээ дэлгэц уншигчаас нуугдсан.`, `aria-hidden="true" on <${el.localName}> hides the whole page.`), { whole: true });
      }
      const focusables = [el, ...el.querySelectorAll('a[href], button, input, select, textarea, [tabindex], iframe, summary, [contenteditable="true"]')]
        .filter((n) => isFocusable(n) && isVisible(n) && !n.disabled);
      if (!focusables.length) return null;
      // Modal нээлттэй үед арын контентыг aria-hidden болгох нь түгээмэл загвар (focus trap хамгаална) — хянах л зүйл
      const modalOpen = !!ctx.doc.querySelector('dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]');
      if (modalOpen && !el.closest('dialog[open], [aria-modal="true"]')) {
        return review(focusables[0], m('Modal нээлттэй байхад арын контент aria-hidden болсон; дотор нь фокуслах элемент байна. Modal хаагдахад aria-hidden арилж буйг, эсвэл inert ашиглахыг шалгана уу.', 'Background content is aria-hidden while a modal is open and contains focusable elements. Verify aria-hidden is removed on close, or use inert.'), { container: el, count: focusables.length, modal: true });
      }
      return fail(focusables[0], m('aria-hidden="true" дотор фокуслах боломжтой элемент байна — дэлгэц уншигч "хоосон" фокус дээр зогсоно.', 'Focusable element inside aria-hidden="true" — screen readers land on a "ghost" control.'), { container: el, count: focusables.length });
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (f.data?.whole || f.data?.modal) return false;
        const box = f.data.container;
        // Дэлгэцэнд бодитоор харагдаж байвал aria-hidden-ыг буруу хэрэглэсэн байх магадлалтай -> нуухыг болиулна.
        // Дэлгэцийн гадна (off-canvas drawer, carousel slide) бол нуусан хэвээр үлдээж фокусаас хасна.
        const r = box.getBoundingClientRect();
        const w = ctx.win;
        const onScreen = r.right > 0 && r.bottom > 0 && r.left < w.innerWidth && r.top < w.innerHeight;
        if (onScreen && r.width > 1 && r.height > 1 && getComputedStyle(box).visibility === 'visible' && getComputedStyle(box).opacity !== '0') {
          ctx.changes.removeAttr(box, 'aria-hidden', 'aria-hidden-focus');
          return m('Харагдаж буй хэсгээс aria-hidden-ыг авав.', 'Removed aria-hidden from visible content.');
        }
        box.querySelectorAll('a[href], button, input, select, textarea, [tabindex], iframe').forEach((n) => ctx.changes.setAttr(n, 'tabindex', '-1', 'aria-hidden-focus'));
        return m('Нуугдсан хэсгийн элементүүдийг фокусаас хасав (tabindex="-1").', 'Removed hidden elements from the tab order (tabindex="-1").');
      },
    },
  },
  {
    id: 'aria-name-required',
    sc: ['4.1.2'],
    impact: 'serious',
    selector: '[role]:not(button):not(a):not(input):not(img):not([role="button"]):not([role="link"]):not([role="img"])',
    evaluate(el) {
      const role = el.getAttribute('role').trim().split(/\s+/)[0];
      if (!NAME_REQUIRED.has(role) || ['region', 'form', 'table', 'grid', 'treegrid', 'dialog', 'alertdialog'].includes(role)) return null;
      if (isHiddenFromAT(el) || !isVisible(el)) return null;
      return accessibleName(el) ? null : fail(el, m(`role="${role}" элемент нэргүй байна.`, `Element with role="${role}" has no accessible name.`));
    },
  },
  {
    id: 'iframe-title',
    sc: ['4.1.2', '2.4.1'],
    impact: 'serious',
    selector: 'iframe, frame',
    evaluate(el) {
      if (isHiddenFromAT(el) || el.getAttribute('tabindex') === '-1' && !isVisible(el)) return null;
      return accessibleName(el) || normalize(el.title) ? null : fail(el, m('iframe-д title (агуулгыг тайлбарласан нэр) алга.', 'iframe has no title describing its content.'));
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const src = f.node.getAttribute('src') || '';
        const known = [[/youtube|youtu\.be/, 'YouTube video'], [/vimeo/, 'Vimeo video'], [/google\.[a-z.]+\/maps|maps\.google/, ctx.pageLang === 'mn' ? 'Google газрын зураг' : 'Google Map'], [/facebook/, 'Facebook'], [/recaptcha/, 'reCAPTCHA'], [/twitter|x\.com/, 'X (Twitter)']];
        const hit = known.find(([re]) => re.test(src));
        if (!hit) return false;
        ctx.changes.setAttr(f.node, 'title', hit[1], 'iframe-title');
        return m(`iframe-д title="${hit[1]}" өгөв.`, `Set iframe title="${hit[1]}".`);
      },
    },
  },
  {
    id: 'nested-interactive',
    sc: ['4.1.2'],
    impact: 'serious',
    selector: 'a[href], button, [role="button"], [role="link"]',
    evaluate(el) {
      const inner = el.querySelector('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])');
      return inner ? fail(el, m(`Идэвхтэй элемент (<${el.localName}>) дотор өөр идэвхтэй элемент (<${inner.localName}>) байна.`, `Interactive <${el.localName}> contains another interactive <${inner.localName}>.`)) : null;
    },
  },
  {
    id: 'dialog-name',
    sc: ['4.1.2'],
    impact: 'serious',
    selector: 'dialog, [role="dialog"], [role="alertdialog"]',
    evaluate(el) {
      if (!isVisible(el)) return null;
      return accessibleName(el) ? null : fail(el, m('Харилцах цонх (dialog) нэргүй. aria-labelledby-оор гарчигтай нь холбоно уу.', 'Dialog has no accessible name. Reference its heading via aria-labelledby.'));
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        const h = f.node.querySelector('h1, h2, h3, h4, [role="heading"]');
        if (!h || !normalize(h.textContent)) return false;
        if (!h.id) ctx.changes.setAttr(h, 'id', `hj-dlg-${Math.random().toString(36).slice(2, 8)}`, 'dialog-name');
        ctx.changes.setAttr(f.node, 'aria-labelledby', h.id, 'dialog-name');
        return m('Dialog-ийг гарчигтай нь aria-labelledby-оор холбов.', 'Linked the dialog to its heading via aria-labelledby.');
      },
    },
  },
  {
    id: 'status-messages',
    sc: ['4.1.3'],
    impact: 'serious',
    selector: '.toast, .snackbar, .notification, .alert, .flash, .notice, [class*="toast"], [class*="snackbar"], [class*="alert-"], .message.success, .message.error, .invalid-feedback, .form-error, [class*="flash-"]',
    evaluate(el, ctx) {
      if (!isVisible(el) || !normalize(el.textContent)) return null;
      if (el.closest('[role="status"], [role="alert"], [role="log"], [aria-live], output, [role="alertdialog"]')) return null;
      const dynamic = !!ctx.partial; // MutationObserver-ээр шинээр нэмэгдсэн — жинхэнэ "status message"
      if (el.matches('a, button') || el.querySelector('a[href], button, input')) {
        // Харилцан үйлдэлтэй баннер нь status message биш байж болно
        return review(el, m('Мэдэгдлийн элемент бололтой. Динамикаар гарч ирдэг бол role="status"/"alert" эсвэл aria-live хэрэгтэй.', 'Looks like a notification. If it appears dynamically it needs role="status"/"alert" or aria-live.'));
      }
      const isError = /(error|danger|fail|invalid|алдаа)/i.test(el.className + el.textContent.slice(0, 40));
      if (!dynamic) {
        // Хуудас ачаалахад аль хэдийн байсан контент нь 4.1.3-ын "status message" биш байж болно (статик мэдээлэл)
        return review(el, m('Мэдэгдлийн загвартай элемент. Хэрэв JavaScript-ээр динамикаар гарч ирдэг бол role="status"/"alert" шаардлагатай.', 'Notification-styled element. If it is injected dynamically by script it needs role="status"/"alert".'), { isError, static: true });
      }
      return fail(el, m('Төлөвийн мессеж дэлгэц уншигчид зарлагдахгүй (role="status" / role="alert" / aria-live алга).', 'Status message is not announced to screen readers (no role="status"/"alert"/aria-live).'), { isError });
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        if (f.outcome !== 'fail') return false;
        const role = f.data?.isError ? 'alert' : 'status';
        ctx.changes.setAttr(f.node, 'role', role, 'status-messages');
        // Шинээр гарч ирсэн контентыг зарлуулах (role нэмэхэд дэлгэц уншигч өнгөрсөн өөрчлөлтийг мэдэхгүй)
        ctx.runtime.announce(normalize(f.node.textContent), role === 'alert' ? 'assertive' : 'polite');
        return m(`role="${role}" нэмэв.`, `Added role="${role}".`);
      },
    },
  },
  {
    id: 'presentation-role-conflict',
    sc: ['4.1.2'],
    impact: 'moderate',
    selector: '[role="presentation"], [role="none"]',
    evaluate(el) {
      if (isFocusable(el) || [...el.attributes].some((a) => ['aria-label', 'aria-labelledby', 'aria-describedby', 'aria-live'].includes(a.name))) {
        return fail(el, m('role="presentation/none" боловч фокуслах боломжтой эсвэл глобал ARIA атрибуттай — үүрэг үл тоогдоно.', 'role="presentation/none" is ignored because the element is focusable or has global ARIA attributes.'));
      }
      return null;
    },
  },
];
