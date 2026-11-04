import { accessibleName, getRole, isHiddenFromAT, isVisible, normalize, qsa } from '../core/dom.js';
import { m, fail, review, scriptOf } from './util.js';

// BCP 47-ийн үндсэн бүтэц: хэл[-скрипт][-бүс]...
const BCP47 = /^[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?(-[a-z\d]{5,8}|-\d[a-z\d]{3})*(-[a-wy-z\d](-[a-z\d]{2,8})+)*(-x(-[a-z\d]{1,8})+)?$/i;
const KNOWN_PRIMARY = new Set(('aa ab af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu ' +
  'ast ber chr ckb fil haw hmn kab kok mni mnc sah tyv xal bua yue cmn nan hak gsw sgn und zxx mul').split(' '));

export function validLang(v) {
  if (!v || !BCP47.test(v)) return false;
  return KNOWN_PRIMARY.has(v.split('-')[0].toLowerCase());
}

/** Хуудасны текстээс хэлийг таах (монгол кирилл ↔ орос ↔ англи) */
export function detectLang(doc) {
  const sample = normalize((doc.body?.innerText || '').slice(0, 4000));
  const { script, mnHint } = scriptOf(sample);
  if (script === 'Cyrl') return mnHint ? 'mn' : /[ыъэ]/.test(sample) && !mnHint ? 'ru' : null;
  if (script === 'Latn') return null; // латин бичигтэй олон хэл байгаа тул таахгүй
  return null;
}

const MAIN_CANDIDATES = ['#main', '#content', '#main-content', '#maincontent', '.main-content', '#primary', '.site-main', '[role="main"]', 'main'];

function findMainTarget(doc) {
  const main = doc.querySelector('main, [role="main"]');
  if (main) return main;
  for (const sel of MAIN_CANDIDATES) {
    const hits = doc.querySelectorAll(sel);
    if (hits.length === 1 && isVisible(hits[0])) return hits[0];
  }
  return null;
}

export default [
  {
    id: 'html-lang',
    sc: ['3.1.1'],
    impact: 'serious',
    run(ctx) {
      const html = ctx.doc.documentElement;
      const lang = html.getAttribute('lang') || html.getAttribute('xml:lang');
      if (!lang || !lang.trim()) {
        return [fail(html, m('<html> элементэд lang атрибут алга. Жишээ нь: <html lang="mn">.', '<html> element has no lang attribute, e.g. <html lang="mn">.'))];
      }
      if (!validLang(lang.trim())) {
        return [fail(html, m(`lang="${lang}" нь хүчинтэй BCP 47 хэлний код биш.`, `lang="${lang}" is not a valid BCP 47 language tag.`), { invalid: true })];
      }
      const detected = detectLang(ctx.doc);
      if (detected && !lang.toLowerCase().startsWith(detected)) {
        return [review(html, m(`lang="${lang}" боловч хуудасны текст "${detected}" хэл шиг харагдаж байна.`, `lang="${lang}" but the page text looks like "${detected}".`), { detected })];
      }
      return [];
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        if (f.outcome !== 'fail') return false;
        const want = ctx.config.lang || (ctx.tier === 'heuristic' ? detectLang(ctx.doc) : null);
        if (!want) return false;
        ctx.changes.setAttr(f.node, 'lang', want, 'html-lang');
        return m(`<html lang="${want}"> тохируулав.`, `Set <html lang="${want}">.`);
      },
    },
  },
  {
    id: 'lang-valid',
    sc: ['3.1.2'],
    impact: 'serious',
    selector: 'body [lang]',
    evaluate(el) {
      const v = el.getAttribute('lang').trim();
      if (v === '' || validLang(v)) return null;
      return fail(el, m(`lang="${v}" нь хүчинтэй хэлний код биш.`, `lang="${v}" is not a valid language tag.`));
    },
  },
  {
    id: 'lang-of-parts',
    sc: ['3.1.2'],
    impact: 'moderate',
    selector: 'p, li, blockquote, td, h1, h2, h3, h4, figcaption',
    evaluate(el, ctx) {
      const pageLang = (ctx.doc.documentElement.lang || '').toLowerCase().split('-')[0];
      if (!pageLang) return null;
      const own = el.closest('[lang]');
      if (own && own !== ctx.doc.documentElement) return null;
      const text = normalize(el.textContent);
      if (text.length < 40) return null;
      const { script } = scriptOf(text);
      const cyrPage = ['mn', 'ru', 'kk', 'ky', 'uk', 'bg', 'sr', 'be', 'tg', 'bua', 'sah', 'tyv', 'xal'].includes(pageLang);
      if ((cyrPage && script === 'Latn') || (!cyrPage && script === 'Cyrl')) {
        return review(el, m(`Энэ хэсгийн бичиг (${script}) хуудасны хэлээс (${pageLang}) өөр. Өөр хэл бол lang атрибут нэмнэ үү.`, `Text script (${script}) differs from the page language (${pageLang}). Add a lang attribute if it is another language.`), { script });
      }
      return null;
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        // Латин бичгийг "en" гэж таах нь эрсдэлтэй тул зөвхөн кирилл+монгол үсэг байвал mn гэж өгнө
        const { script, mnHint } = scriptOf(f.node.textContent);
        if (script === 'Cyrl' && mnHint) {
          ctx.changes.setAttr(f.node, 'lang', 'mn', 'lang-of-parts');
          return m('Монгол текстэд lang="mn" өгөв.', 'Set lang="mn" on Mongolian text.');
        }
        return false;
      },
    },
  },
  {
    id: 'document-title',
    sc: ['2.4.2'],
    impact: 'serious',
    run(ctx) {
      const t = normalize(ctx.doc.title);
      if (!t) return [fail(ctx.doc.documentElement, m('Хуудсанд <title> алга эсвэл хоосон.', 'Page has no or an empty <title>.'))];
      if (/^(untitled|document|home|index|new page|нүүр|гарчиггүй|page)$/i.test(t) || /^https?:\/\//.test(t)) {
        return [review(ctx.doc.documentElement, m(`Хуудасны гарчиг "${t}" агуулгыг тодорхойлохгүй байж магадгүй.`, `Page title "${t}" may not describe its purpose.`))];
      }
      return [];
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (f.outcome !== 'fail') return false;
        const h1 = ctx.doc.querySelector('h1');
        const txt = h1 && normalize(h1.textContent);
        if (!txt) return false;
        const prev = ctx.doc.title;
        ctx.doc.title = txt;
        ctx.changes.custom(() => { ctx.doc.title = prev; }, 'document-title');
        return m(`Хуудасны гарчгийг h1-ээс "${txt}" болгов.`, `Set page title from h1: "${txt}".`);
      },
    },
  },
  {
    id: 'heading-order',
    sc: ['1.3.1', '2.4.6'],
    impact: 'moderate',
    run(ctx) {
      const hs = qsa(ctx.doc.body, 'h1, h2, h3, h4, h5, h6, [role="heading"]')
        .filter((h) => !ctx.ignored(h) && !isHiddenFromAT(h));
      const out = [];
      let prev = 0;
      for (const h of hs) {
        const lvl = h.getAttribute('role') === 'heading' ? parseInt(h.getAttribute('aria-level') || '2', 10) : +h.localName[1];
        if (prev && lvl > prev + 1) {
          out.push(review(h, m(`Гарчгийн түвшин h${prev}-ээс h${lvl} руу үсэрсэн. Бүтцийг шалгана уу.`, `Heading level jumps from h${prev} to h${lvl}. Check the outline.`), { from: prev, to: lvl }));
        }
        prev = lvl;
      }
      if (hs.length && !hs.some((h) => h.localName === 'h1' || h.getAttribute('aria-level') === '1')) {
        out.push(review(ctx.doc.body, m('Хуудсанд h1 түвшний гарчиг алга.', 'Page has no level-one heading.')));
      }
      if (!hs.length && normalize(ctx.doc.body.innerText).length > 800) {
        out.push(review(ctx.doc.body, m('Урт контенттой ч нэг ч гарчиггүй байна (1.3.1, 2.4.10).', 'Long content has no headings (1.3.1, 2.4.10).')));
      }
      return out;
    },
  },
  {
    id: 'empty-heading',
    sc: ['1.3.1', '2.4.6'],
    impact: 'serious',
    selector: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
    evaluate(el) {
      if (isHiddenFromAT(el) || /^(presentation|none)$/.test(el.getAttribute('role') || '')) return null;
      return accessibleName(el) ? null : fail(el, m('Гарчиг хоосон байна.', 'Heading is empty.'));
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        // Хоосон гарчиг навигацийг эвддэг — үүргийг нь арилгана (агуулга харагдах байдал өөрчлөгдөхгүй)
        if (normalize(f.node.textContent) || f.node.querySelector('img, svg')) return false;
        ctx.changes.setAttr(f.node, 'role', 'presentation', 'empty-heading');
        return m('Хоосон гарчгийг гарчгийн жагсаалтаас хасав (role="presentation").', 'Removed empty heading from the outline (role="presentation").');
      },
    },
  },
  {
    id: 'list-structure',
    sc: ['1.3.1'],
    impact: 'serious',
    selector: 'li, ul > *, ol > *, dt, dd',
    evaluate(el) {
      if (el.localName === 'li') {
        const p = el.parentElement;
        if (!p || ['ul', 'ol', 'menu'].includes(p.localName) || p.getAttribute('role') === 'list') return null;
        return fail(el, m('<li> нь <ul>/<ol> дотор байх ёстой.', '<li> must be contained in a <ul> or <ol>.'));
      }
      if (el.localName === 'dt' || el.localName === 'dd') {
        const p = el.closest('dl');
        return p ? null : fail(el, m(`<${el.localName}> нь <dl> дотор байх ёстой.`, `<${el.localName}> must be inside a <dl>.`));
      }
      const p = el.parentElement;
      if (p.getAttribute('role')) return null;
      if (['li', 'script', 'template'].includes(el.localName)) return null;
      return fail(el, m(`<${p.localName}> жагсаалтын шууд хүүхэд нь зөвхөн <li> байх ёстой (<${el.localName}> олдов).`, `<${p.localName}> may only directly contain <li> (found <${el.localName}>).`));
    },
  },
  {
    id: 'table-headers',
    sc: ['1.3.1'],
    impact: 'serious',
    selector: 'table',
    evaluate(el) {
      const role = el.getAttribute('role');
      if (role === 'presentation' || role === 'none' || isHiddenFromAT(el)) return null;
      const rows = el.rows ? el.rows.length : 0;
      const cols = el.rows?.[0]?.cells.length || 0;
      if (rows < 2 || cols < 2) return null;
      if (el.querySelector('th, [role="columnheader"], [role="rowheader"]')) {
        const ths = el.querySelectorAll('th');
        const empty = [...ths].filter((th) => !normalize(th.textContent) && !th.getAttribute('aria-label'));
        if (empty.length) return fail(empty[0], m('Хүснэгтийн толгой нүд (<th>) хоосон.', 'Table header cell is empty.'));
        return null;
      }
      return review(el, m('Өгөгдлийн хүснэгт толгой нүдгүй (<th>) байна. Байршлын хүснэгт бол role="presentation" өгнө үү.', 'Data table has no header cells (<th>). If it is a layout table add role="presentation".'));
    },
  },
  {
    id: 'landmark-main',
    sc: ['1.3.1', '2.4.1'],
    impact: 'moderate',
    run(ctx) {
      const mains = qsa(ctx.doc, 'main, [role="main"]').filter((n) => !isHiddenFromAT(n));
      if (mains.length > 1) return [fail(mains[1], m('Хуудсанд нэгээс олон main landmark байна.', 'Page has more than one main landmark.'))];
      if (!mains.length) return [review(ctx.doc.body, m('Хуудсанд <main> landmark алга. Гол контентыг <main> элементэд байрлуулна уу.', 'Page has no <main> landmark. Wrap the primary content in <main>.'))];
      return [];
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (f.outcome !== 'review') return false;
        for (const sel of MAIN_CANDIDATES.slice(0, -2)) {
          const hits = ctx.doc.querySelectorAll(sel);
          if (hits.length === 1 && isVisible(hits[0]) && !hits[0].getAttribute('role')) {
            ctx.changes.setAttr(hits[0], 'role', 'main', 'landmark-main');
            return m(`${sel} элементэд role="main" өгөв.`, `Added role="main" to ${sel}.`);
          }
        }
        return false;
      },
    },
  },
  {
    id: 'bypass',
    sc: ['2.4.1'],
    impact: 'serious',
    run(ctx) {
      const doc = ctx.doc;
      const firstLinks = qsa(doc.body, 'a[href^="#"]').slice(0, 5);
      const skip = firstLinks.find((a) => {
        const id = decodeURIComponent(a.getAttribute('href').slice(1));
        return id && doc.getElementById(id);
      });
      if (skip) return [];
      const hasMain = !!doc.querySelector('main, [role="main"]');
      const hasHeadings = !!doc.querySelector('h1, h2, h3');
      const navLinks = qsa(doc.body, 'nav a[href], header a[href], [role="navigation"] a[href]').length;
      if (navLinks < 4) return []; // давтагдах блок бага бол шаардлагагүй
      const out = hasMain || hasHeadings ? review : fail;
      return [out(doc.body, m('"Үндсэн агуулга руу шилжих" (skip link) холбоос алга. Гарын хэрэглэгч навигацийг дахин дахин дамжих болно.', 'No "Skip to main content" link. Keyboard users must tab through navigation on every page.'), { hasMain })];
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        const target = findMainTarget(ctx.doc);
        if (!target) return false;
        if (!target.id) ctx.changes.setAttr(target, 'id', 'hj-main', 'bypass');
        if (!target.hasAttribute('tabindex')) ctx.changes.setAttr(target, 'tabindex', '-1', 'bypass');
        const a = ctx.doc.createElement('a');
        a.href = `#${target.id}`;
        a.className = 'hj-skip-link';
        a.setAttribute('data-hurteemj-ui', 'skip');
        a.textContent = ctx.pageLang === 'mn' ? 'Үндсэн агуулга руу шилжих' : 'Skip to main content';
        a.addEventListener('click', (e) => { e.preventDefault(); target.focus(); target.scrollIntoView(); });
        ctx.changes.insert(a, ctx.doc.body, ctx.doc.body.firstChild, 'bypass');
        return m('Хуудасны эхэнд "Үндсэн агуулга руу шилжих" холбоос нэмэв.', 'Inserted a "Skip to main content" link.');
      },
    },
  },
  {
    id: 'meta-viewport',
    sc: ['1.4.4', '1.4.10'],
    impact: 'critical',
    selector: 'meta[name="viewport"]',
    root: 'document',
    evaluate(el) {
      const c = (el.getAttribute('content') || '').toLowerCase().replace(/\s/g, '');
      const userScalable = c.match(/user-scalable=([^,]+)/)?.[1];
      const max = parseFloat(c.match(/maximum-scale=([^,]+)/)?.[1]);
      if (userScalable === 'no' || userScalable === '0' || (!Number.isNaN(max) && max < 2)) {
        return fail(el, m('Viewport тохиргоо томруулах (zoom) боломжийг хааж байна.', 'Viewport meta prevents zooming.'), { content: c });
      }
      return null;
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        const c = (f.node.getAttribute('content') || '').split(',').map((s) => s.trim())
          .filter((p) => p && !/^(user-scalable|maximum-scale)\s*=/i.test(p));
        ctx.changes.setAttr(f.node, 'content', c.join(', ') || 'width=device-width, initial-scale=1', 'meta-viewport');
        return m('Viewport-ийн zoom хоригийг арилгав.', 'Removed the viewport zoom restriction.');
      },
    },
  },
  {
    id: 'meta-refresh',
    sc: ['2.2.1', '3.2.5'],
    impact: 'critical',
    selector: 'meta[http-equiv="refresh" i]',
    root: 'document',
    evaluate(el) {
      const delay = parseFloat((el.getAttribute('content') || '').split(/[;,]/)[0]);
      if (Number.isNaN(delay) || delay === 0 || delay > 72000) return null;
      return fail(el, m(`Хуудас ${delay} секундын дараа автоматаар шинэчлэгдэх/шилжих тохиргоотой.`, `Page automatically refreshes/redirects after ${delay}s.`));
    },
  },
  {
    id: 'text-spacing-important',
    sc: ['1.4.12'],
    impact: 'serious',
    selector: '[style]',
    evaluate(el) {
      const props = ['line-height', 'letter-spacing', 'word-spacing'];
      const bad = props.filter((p) => el.style.getPropertyPriority(p) === 'important');
      if (!bad.length) return null;
      return fail(el, m(`Inline style дээрх !important (${bad.join(', ')}) нь хэрэглэгч текстийн зайг өөрчлөхийг хориглоно.`, `Inline !important on ${bad.join(', ')} prevents users from overriding text spacing.`), { props: bad });
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        for (const p of f.data.props) ctx.changes.setStyle(f.node, p, f.node.style.getPropertyValue(p), 'text-spacing-important', '');
        return m('Текстийн зайн !important-ыг арилгав (утга хэвээр).', 'Removed !important from text-spacing properties (values kept).');
      },
    },
  },
  {
    id: 'text-spacing-clip',
    sc: ['1.4.12'],
    impact: 'serious',
    deep: true,
    run(ctx) {
      // 1.4.12-ын утгыг түр хэрэглэж, текст тасарч (clip) байгаа элементийг илрүүлнэ
      const doc = ctx.doc;
      const cands = qsa(doc.body, 'p, li, a, button, label, h1, h2, h3, h4, span, td, div')
        .filter((el) => !ctx.ignored(el) && isVisible(el) && normalize(el.textContent).length > 3)
        .filter((el) => { const s = getComputedStyle(el); return /hidden|clip/.test(s.overflow + s.overflowX + s.overflowY) || (s.height !== 'auto' && /px/.test(el.style.height)); })
        .slice(0, 400);
      const before = new Map(cands.map((el) => [el, el.scrollHeight - el.clientHeight]));
      const style = doc.createElement('style');
      if (ctx.config.nonce) style.nonce = ctx.config.nonce;
      style.textContent = '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }';
      doc.head.appendChild(style);
      const out = [];
      for (const el of cands) {
        const s = getComputedStyle(el);
        if (!/hidden|clip/.test(s.overflow + s.overflowX + s.overflowY)) continue;
        const grow = el.scrollHeight - el.clientHeight;
        const growX = el.scrollWidth - el.clientWidth;
        if ((grow > 2 && grow > before.get(el)) || growX > 2) {
          out.push(fail(el, m('Текстийн зайг 1.4.12-ын дагуу өсгөхөд агуулга тасарч (overflow: hidden) байна.', 'Content is clipped when text spacing is increased per 1.4.12 (overflow: hidden).')));
        }
      }
      style.remove();
      return out;
    },
  },
  {
    id: 'reflow',
    sc: ['1.4.10'],
    impact: 'serious',
    run(ctx) {
      const w = ctx.win.innerWidth;
      if (w > 420) return []; // зөвхөн нарийн дэлгэц дээр (CLI 320px дээр ажиллуулна) шалгана
      const doc = ctx.doc.documentElement;
      if (doc.scrollWidth <= w + 1) return [];
      const offenders = qsa(ctx.doc.body, '*').filter((el) => {
        if (ctx.ignored(el) || !isVisible(el)) return false;
        const r = el.getBoundingClientRect();
        if (r.right <= w + 1) return false;
        if (el.closest('pre, code, table, [role="table"], [role="grid"], svg, canvas, video, iframe, [style*="overflow"]')) return false;
        const p = el.parentElement;
        return !p || p.getBoundingClientRect().right <= w + 1;
      }).slice(0, 10);
      return (offenders.length ? offenders : [ctx.doc.body]).map((el) => fail(el, m(`${w}px өргөнтэй дэлгэц дээр хэвтээ гүйлгэх шаардлага гарч байна.`, `Horizontal scrolling is required at ${w}px viewport width.`)));
    },
  },
];
