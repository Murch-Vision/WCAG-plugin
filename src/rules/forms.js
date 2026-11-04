import { accessibleName, isHiddenFromAT, isVisible, normalize, qsa } from '../core/dom.js';
import { AUTOCOMPLETE_TOKENS, AUTOCOMPLETE_MODIFIERS } from '../wcag/aria.js';
import { m, fail, review } from './util.js';

const FIELD_SEL = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea, [role="textbox"], [role="combobox"], [role="searchbox"], [role="spinbutton"], [role="slider"], [role="checkbox"]:not(input), [role="radio"]:not(input), [role="switch"]';

/** Талбарын ойролцоох харагдах текстийг шошго болгон олох (heuristic) */
function nearbyLabelText(el) {
  // 1) Өмнөх ах дүү элемент нь богино текст бол
  let prev = el.previousElementSibling;
  if (prev && !prev.matches('input, select, textarea, button') && normalize(prev.textContent).length && normalize(prev.textContent).length < 60) return normalize(prev.textContent);
  // 2) Эцэг элементийн текст (талбар өөрөө текстгүй)
  const p = el.parentElement;
  if (p && p.querySelectorAll('input, select, textarea').length === 1) {
    const t = normalize(p.textContent);
    if (t && t.length < 60) return t;
  }
  return null;
}

/** Нэр/төрлөөс autocomplete токен таах (1.3.5) */
const AC_GUESS = [
  [/e-?mail|и-?мэйл|имэйл|цахим\s*шуудан/i, 'email'],
  [/(^|[^a-z])(tel|phone|mobile|утас|гар\s*утас)/i, 'tel'],
  [/first.?name|given.?name|fname|^нэр$|өөрийн\s*нэр/i, 'given-name'],
  [/last.?name|family.?name|surname|lname|овог/i, 'family-name'],
  [/full.?name|^name$|овог\s*нэр/i, 'name'],
  [/user.?name|login|нэвтрэх\s*нэр/i, 'username'],
  [/zip|postal|шуудангийн\s*код|индекс/i, 'postal-code'],
  [/(street|address)(.?line)?.?1?$|хаяг/i, 'street-address'],
  [/city|town|хот|аймаг/i, 'address-level2'],
  [/country|улс/i, 'country-name'],
  [/organi[sz]ation|company|байгууллага/i, 'organization'],
  [/birth|bday|төрсөн\s*өдөр/i, 'bday'],
  [/otp|one.?time|баталгаажуулах\s*код|нэг\s*удаагийн/i, 'one-time-code'],
];

function validAutocomplete(v) {
  const tokens = v.toLowerCase().trim().split(/\s+/);
  if (tokens.length === 1 && ['on', 'off'].includes(tokens[0])) return true;
  let i = 0;
  if (tokens[i]?.startsWith('section-')) i++;
  if (['shipping', 'billing'].includes(tokens[i])) i++;
  if (['home', 'work', 'mobile', 'fax', 'pager'].includes(tokens[i])) i++;
  if (!AUTOCOMPLETE_TOKENS.has(tokens[i])) return false;
  i++;
  if (tokens[i] === 'webauthn') i++;
  return i === tokens.length && !tokens.slice(0, -1).some((t) => !t.startsWith('section-') && !AUTOCOMPLETE_MODIFIERS.has(t) && !AUTOCOMPLETE_TOKENS.has(t));
}

export default [
  {
    id: 'label',
    sc: ['1.3.1', '3.3.2', '4.1.2'],
    impact: 'critical',
    selector: FIELD_SEL,
    evaluate(el) {
      if (isHiddenFromAT(el) || !isVisible(el)) return null;
      const name = accessibleName(el);
      const ph = normalize(el.getAttribute('placeholder'));
      const labelled = el.labels?.length || el.hasAttribute('aria-label') || el.hasAttribute('aria-labelledby') || el.hasAttribute('title');
      if (!name) {
        return fail(el, m('Оролтын талбарт шошго (label) алга. <label for> эсвэл aria-label ашиглана уу.', 'Form field has no label. Use <label for> or aria-label.'));
      }
      if (!labelled && ph && name === ph) {
        return fail(el, m('Талбарыг зөвхөн placeholder-оор тайлбарласан. Бичиж эхлэхэд алга болдог тул харагдах шошго хэрэгтэй.', 'Field is labelled only by its placeholder, which disappears on input. Add a visible label.'), { placeholderOnly: true });
      }
      return null;
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        const el = f.node;
        const ph = normalize(el.getAttribute('placeholder'));
        const title = normalize(el.getAttribute('title'));
        let txt = ph || title;
        let how = 'placeholder';
        if (!txt && ctx.tier === 'heuristic') { txt = nearbyLabelText(el); how = 'nearby'; }
        if (!txt) return false;
        ctx.changes.setAttr(el, 'aria-label', txt, 'label');
        return how === 'nearby'
          ? m(`Ойролцоох текстээс aria-label="${txt}" өгөв.`, `Set aria-label="${txt}" from nearby text.`)
          : m(`Програмын нэр aria-label="${txt}" өгөв. Харагдах <label> нэмэх нь зөв шийдэл хэвээр.`, `Set aria-label="${txt}". A visible <label> is still the correct fix.`);
      },
    },
  },
  {
    id: 'autocomplete-valid',
    sc: ['1.3.5'],
    impact: 'serious',
    selector: 'input[autocomplete], select[autocomplete], textarea[autocomplete]',
    evaluate(el) {
      const v = el.getAttribute('autocomplete');
      if (!v.trim() || validAutocomplete(v)) return null;
      return fail(el, m(`autocomplete="${v}" нь HTML стандартын хүчинтэй утга биш.`, `autocomplete="${v}" is not a valid HTML token.`));
    },
  },
  {
    id: 'autocomplete-purpose',
    sc: ['1.3.5'],
    impact: 'moderate',
    selector: 'input:not([autocomplete]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="search"]):not([type="file"])',
    evaluate(el) {
      if (!isVisible(el) || el.closest('form[autocomplete="off"]')) return null;
      const type = (el.getAttribute('type') || 'text').toLowerCase();
      if (type === 'password') return null; // auth дүрэмд шалгана
      const hay = `${el.name} ${el.id} ${accessibleName(el)}`;
      const guess = type === 'email' ? 'email' : type === 'tel' ? 'tel' : AC_GUESS.find(([re]) => re.test(hay))?.[1];
      if (!guess) return null;
      return review(el, m(`Хэрэглэгчийн мэдээллийн талбар бололтой — autocomplete="${guess}" нэмнэ үү.`, `Looks like a personal-data field — add autocomplete="${guess}".`), { guess });
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        ctx.changes.setAttr(f.node, 'autocomplete', f.data.guess, 'autocomplete-purpose');
        return m(`autocomplete="${f.data.guess}" нэмэв.`, `Added autocomplete="${f.data.guess}".`);
      },
    },
  },
  {
    id: 'required-indicator',
    sc: ['3.3.2', '1.3.1'],
    impact: 'moderate',
    selector: 'input:not([required]):not([aria-required]), select:not([required]):not([aria-required]), textarea:not([required]):not([aria-required])',
    evaluate(el) {
      const lbl = el.labels?.[0];
      const t = lbl ? normalize(lbl.textContent) : '';
      if (/\*\s*$|^\*|\(заавал\)|\(required\)|заавал бөглөх/i.test(t)) {
        return fail(el, m('Шошгонд "*" (заавал) тэмдэг байгаа ч талбарт required/aria-required алга.', 'Label shows a required marker (*) but the field lacks required/aria-required.'));
      }
      return null;
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        ctx.changes.setAttr(f.node, 'aria-required', 'true', 'required-indicator');
        return m('aria-required="true" нэмэв.', 'Added aria-required="true".');
      },
    },
  },
  {
    id: 'error-identification',
    sc: ['3.3.1', '3.3.3'],
    impact: 'serious',
    selector: '[aria-invalid="true"]',
    evaluate(el, ctx) {
      const ids = `${el.getAttribute('aria-describedby') || ''} ${el.getAttribute('aria-errormessage') || ''}`.trim().split(/\s+/).filter(Boolean);
      const msg = ids.map((id) => ctx.doc.getElementById(id)).filter(Boolean).map((n) => normalize(n.textContent)).join(' ');
      if (msg) return null;
      return fail(el, m('Алдаатай (aria-invalid) талбарт алдааны тайлбар холбогдоогүй (aria-describedby/aria-errormessage).', 'Invalid field has no associated error message (aria-describedby/aria-errormessage).'));
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        // Талбарын дараах .error/.invalid-feedback төрлийн элементийг холбоно
        const scope = f.node.closest('.form-group, .field, .form-field, div, li, p') || f.node.parentElement;
        const err = scope?.querySelector('.error, .invalid-feedback, .field-error, .help-block.error, [class*="error-message"], [class*="errorMessage"]');
        if (!err || !normalize(err.textContent)) return false;
        if (!err.id) ctx.changes.setAttr(err, 'id', `hj-err-${Math.random().toString(36).slice(2, 8)}`, 'error-identification');
        const cur = f.node.getAttribute('aria-describedby');
        ctx.changes.setAttr(f.node, 'aria-describedby', cur ? `${cur} ${err.id}` : err.id, 'error-identification');
        return m('Ойролцоох алдааны текстийг aria-describedby-оор холбов.', 'Linked the nearby error text via aria-describedby.');
      },
    },
  },
  {
    id: 'accessible-auth-paste',
    sc: ['3.3.8'],
    impact: 'critical',
    selector: 'input[type="password"], input[autocomplete="one-time-code"], input[autocomplete~="username"], input[name*="otp" i], input[name*="code" i][inputmode="numeric"]',
    evaluate(el) {
      if (!isVisible(el)) return null;
      // Бодит туршилт: цуцлах боломжтой paste эвент илгээж, сайтын код preventDefault хийж байгаа эсэхийг шалгана
      let blocked = /return\s+false|preventDefault/.test(el.getAttribute('onpaste') || '');
      if (!blocked) {
        try {
          const ev = new Event('paste', { bubbles: true, cancelable: true });
          Object.defineProperty(ev, 'clipboardData', { value: { getData: () => '', types: [] } });
          Object.defineProperty(ev, '__hjProbe', { value: true });
          el.dispatchEvent(ev);
          blocked = ev.defaultPrevented;
        } catch { /* ignore */ }
      }
      if (blocked) {
        return fail(el, m('Нэвтрэх талбарт хуулж буулгах (paste) хориглогдсон. Нууц үг менежер ашиглах боломжийг хааж, танин мэдэхүйн тест болж байна.', 'Pasting is blocked in an authentication field. This blocks password managers and creates a cognitive function test.'), { paste: true });
      }
      return null;
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const el = f.node;
        if (el.hasAttribute('onpaste')) ctx.changes.removeAttr(el, 'onpaste', 'accessible-auth-paste');
        // Capture шатанд сайтын paste handler-ыг ажиллуулахгүй болгоно (зөвхөн энэ талбарт)
        const guard = (e) => { if (e.target === el && !e.__hjProbe) e.stopImmediatePropagation(); };
        ctx.changes.listen(ctx.win, 'paste', guard, true, 'accessible-auth-paste');
        return m('Нэвтрэх талбарын paste хоригийг цуцлав.', 'Unblocked paste in the authentication field.');
      },
    },
  },
  {
    id: 'accessible-auth-autocomplete',
    sc: ['3.3.8', '1.3.5'],
    impact: 'serious',
    selector: 'input[type="password"]',
    evaluate(el) {
      const ac = (el.getAttribute('autocomplete') || '').toLowerCase();
      const formOff = el.form?.getAttribute('autocomplete') === 'off';
      if (ac === 'off' || (!ac && formOff)) {
        return fail(el, m('Нууц үгийн талбарт autocomplete="off" — нууц үг менежер ажиллахгүй. "current-password" эсвэл "new-password" ашиглана уу.', 'Password field has autocomplete="off", blocking password managers. Use "current-password" or "new-password".'));
      }
      if (!ac) return review(el, m('Нууц үгийн талбарт autocomplete="current-password"/"new-password" нэмэхийг зөвлөж байна.', 'Add autocomplete="current-password" or "new-password" to the password field.'));
      return null;
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        const form = f.node.form;
        const isNew = form && form.querySelectorAll('input[type="password"]').length > 1 || /new|register|signup|бүртгүүлэх|шинэ/i.test(`${f.node.name} ${f.node.id} ${form?.action || ''}`);
        const v = isNew ? 'new-password' : 'current-password';
        ctx.changes.setAttr(f.node, 'autocomplete', v, 'accessible-auth-autocomplete');
        return m(`autocomplete="${v}" тохируулав.`, `Set autocomplete="${v}".`);
      },
    },
  },
  {
    id: 'captcha-alternative',
    sc: ['3.3.8', '1.1.1'],
    impact: 'serious',
    run(ctx) {
      const hits = qsa(ctx.doc, 'img[src*="captcha" i], img[alt*="captcha" i], img[id*="captcha" i], [class*="captcha" i]:not(.g-recaptcha):not(.h-captcha):not(.cf-turnstile)')
        .filter((el) => !ctx.ignored(el) && isVisible(el));
      return hits.slice(0, 3).map((el) => review(el, m('Зурган CAPTCHA илэрлээ. Танин мэдэхүйн тест (тэмдэгт таних) шаардахгүй өөр арга (жишээ нь passkey, имэйл холбоос, Turnstile) санал болгоно уу.', 'Image CAPTCHA detected. Provide an alternative that does not require a cognitive function test (e.g. passkey, email link, invisible challenge).')));
    },
  },
  {
    id: 'select-auto-navigation',
    sc: ['3.2.2'],
    impact: 'serious',
    selector: 'select[onchange]',
    evaluate(el) {
      const h = el.getAttribute('onchange') || '';
      if (/location|submit\(|window\.open|href/.test(h)) {
        return fail(el, m('Сонголт өөрчлөгдөхөд урьдчилан мэдэгдэлгүйгээр хуудас шилжиж/илгээгдэж байна.', 'Changing the selection navigates or submits without warning.'));
      }
      return null;
    },
  },
  {
    id: 'fieldset-group',
    sc: ['1.3.1', '3.3.2'],
    impact: 'moderate',
    run(ctx) {
      const out = [];
      const groups = new Map();
      qsa(ctx.doc, 'input[type="radio"][name]').forEach((r) => {
        if (ctx.ignored(r)) return;
        const k = `${r.form ? 'f' : 'd'}:${r.name}`;
        (groups.get(k) || groups.set(k, []).get(k)).push(r);
      });
      for (const [, radios] of groups) {
        if (radios.length < 2) continue;
        const g = radios[0].closest('fieldset, [role="radiogroup"], [role="group"]');
        if (!g || !accessibleName(g)) {
          out.push(review(radios[0], m('Радио товчнуудын бүлэг нэргүй. <fieldset><legend> эсвэл role="radiogroup" + aria-label ашиглана уу.', 'Radio group has no group label. Use <fieldset><legend> or role="radiogroup" with a label.')));
        }
      }
      return out;
    },
  },
];
