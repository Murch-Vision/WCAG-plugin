import { parseColor, contrastRatio, blend, adjustForContrast, toCss } from '../core/color.js';
import { isVisible, isVisuallyHidden, isOwnUi } from '../core/dom.js';
import { m, fail, review } from './util.js';

const WHITE = [255, 255, 255, 1];

/** Элементийн нийт opacity (эцэг элементүүдийн үржвэр) */
function effectiveOpacity(el) {
  let o = 1;
  for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
  return o;
}

function gradientColors(bgImage) {
  const out = [];
  const re = /(rgba?\([^)]+\)|#[0-9a-f]{3,8}\b)/gi;
  let mm;
  while ((mm = re.exec(bgImage))) { const c = parseColor(mm[1]); if (c) out.push(c); }
  return out;
}

/**
 * Элементийн ард харагдах өнгийг тодорхойлно.
 * Буцаах: { color } | { colors:[...] } (gradient) | { unknown: reason }
 */
const MEDIA_TAGS = /^(img|video|canvas|picture|svg|iframe|object|embed)$/;

/**
 * @param {Element} el
 * @param {WeakMap} [cache] — аудит бүрийн кэш (ctx.bgCache). Өөрийн дэвсгэргүй элемент эцгийнхээ
 *   нэг өнгийн ("solid") дэвсгэрийг өвлөнө — элемент бүрт hit-test хийхгүй тул 3–5 дахин хурдан.
 */
export function backgroundOf(el, cache) {
  if (cache?.has(el)) return cache.get(el);
  let res;
  const parent = el.parentElement;
  if (cache && parent && !MEDIA_TAGS.test(el.localName)) {
    const own = getComputedStyle(el);
    const transparent = (!own.backgroundImage || own.backgroundImage === 'none') && (parseColor(own.backgroundColor)?.[3] ?? 1) === 0;
    if (transparent) {
      // Эцгийг (шаардлагатай бол дээшээ рекурсивээр) нэг л удаа тооцно
      const pr = backgroundOf(parent, cache);
      if (pr.solid) res = pr;
    }
  }
  if (!res) res = computeBackground(el);
  cache?.set(el, res);
  return res;
}

function computeBackground(el) {
  const doc = el.ownerDocument;
  const win = doc.defaultView || window;
  const r = el.getBoundingClientRect();
  let stack = null;
  const cx = r.left + Math.min(r.width / 2, 20), cy = r.top + r.height / 2;
  if (cx >= 0 && cy >= 0 && cx < win.innerWidth && cy < win.innerHeight) {
    const hit = doc.elementsFromPoint(cx, cy).filter((n) => !isOwnUi(n));
    const idx = hit.findIndex((n) => n === el || n.contains(el));
    if (idx >= 0) {
      // pointer-events:none эсвэл мөр хоорондын цэг: el өөрөө hit-test-д ороогүй бол el → hit[idx] хүртэлх эцгүүдийг нэмнэ
      const chain = [];
      if (hit[idx] !== el) for (let n = el; n && n !== hit[idx]; n = n.parentElement) chain.push(n);
      stack = chain.concat(hit.slice(idx));
    }
    // idx < 0: el-тэй холбоогүй давхарга (overlay) — доорх эцгийн гинжээр тооцно
  }
  if (!stack) {
    stack = [];
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) stack.push(n);
  }
  const layers = [];
  for (const n of stack) {
    const s = getComputedStyle(n);
    if (s.backgroundImage && s.backgroundImage !== 'none') {
      if (/gradient\(/.test(s.backgroundImage)) {
        const cols = gradientColors(s.backgroundImage);
        if (cols.length) return { colors: cols.map((c) => layers.reduceRight((acc, l) => blend(l, acc), blend(c, WHITE))), gradient: true };
      }
      return { unknown: 'image' };
    }
    if (n.localName === 'img' || n.localName === 'video' || n.localName === 'canvas' || n.localName === 'picture') {
      if (n !== el) return { unknown: 'image' };
    }
    const bg = parseColor(s.backgroundColor);
    if (!bg) return { unknown: 'color-format' };
    if (bg[3] > 0) {
      layers.push(bg);
      if (bg[3] >= 1) break;
    }
  }
  // Дээрээс доош (layers[0] нь хамгийн дээд давхарга) холих; эцсийн дүн үргэлж тунгалаг бус нэг өнгө (canvas = цагаан)
  let base = WHITE;
  for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
  return { color: base, solid: true };
}

function isLargeText(s) {
  const size = parseFloat(s.fontSize);
  const weight = parseInt(s.fontWeight, 10) || (s.fontWeight === 'bold' ? 700 : 400);
  // 18pt = 24px, 14pt bold = 18.66px
  return size >= 24 || (size >= 18.66 && weight >= 700);
}

function hasOwnText(el) {
  for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length) return true;
  return false;
}

function isDisabled(el) {
  return !!el.closest('[disabled], [aria-disabled="true"], fieldset[disabled]');
}

export default [
  {
    id: 'color-contrast',
    sc: ['1.4.3', '1.4.6'],
    impact: 'serious',
    selector: 'body *:not(script):not(style):not(noscript):not(template):not(svg *):not(option)',
    evaluate(el, ctx) {
      if (!hasOwnText(el)) return null;
      if (isDisabled(el) || !isVisible(el) || isVisuallyHidden(el)) return null;
      const s = getComputedStyle(el);
      if (s.visibility !== 'visible' || parseFloat(s.fontSize) === 0) return null;
      if (/^(transparent|rgba\(0, 0, 0, 0\))$/.test(s.color)) return null;
      let fg = parseColor(s.color);
      const bgInfo = backgroundOf(el, ctx.bgCache);
      const large = isLargeText(s);
      const aaa = ctx.level === 'AAA';
      const need = aaa ? (large ? 4.5 : 7) : large ? 3 : 4.5;
      const sc = aaa ? ['1.4.6'] : ['1.4.3'];
      if (!fg) return review(el, m('Текстийн өнгийн формат танигдсангүй — тодролыг гараар шалгана уу.', 'Unrecognised text color format — check contrast manually.'), { sc });
      const op = effectiveOpacity(el);
      if (op < 1) fg = [fg[0], fg[1], fg[2], (fg[3] ?? 1) * op];
      if (bgInfo.unknown) {
        return review(el, m('Текст зураг/видео дээр байрласан тул тодролыг гараар шалгана уу.', 'Text is over an image or media — verify contrast manually.'), { sc, reason: bgInfo.unknown });
      }
      const bgs = bgInfo.colors || [bgInfo.color];
      const ratios = bgs.map((bg) => contrastRatio(blend(fg, bg), bg));
      const worst = Math.min(...ratios);
      const data = { ratio: +worst.toFixed(2), required: need, fg: s.color, bg: toCss(bgs[ratios.indexOf(worst)]), large, sc };
      if (worst >= need) return null;
      if (s.textShadow && s.textShadow !== 'none' && worst >= need * 0.75) {
        return review(el, m(`Тодрол ${data.ratio}:1 (шаардлага ${need}:1). Текстийн сүүдэр тодролыг нэмэгдүүлж байж магадгүй.`, `Contrast ${data.ratio}:1 (needs ${need}:1). Text shadow may help; verify.`), data);
      }
      const out = bgInfo.gradient ? review : fail;
      return out(el, m(`Текстийн тодрол хангалтгүй: ${data.ratio}:1 (шаардлага ${need}:1${large ? ', том текст' : ''}).`, `Insufficient text contrast: ${data.ratio}:1 (needs ${need}:1${large ? ', large text' : ''}).`), data);
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (f.outcome !== 'fail' || !f.data) return false;
        const bg = parseColor(f.data.bg);
        const fg = parseColor(f.data.fg);
        const fixed = adjustForContrast(fg, bg, f.data.required + 0.05);
        ctx.changes.setStyle(f.node, 'color', toCss(fixed), 'color-contrast');
        return m(`Өнгөний аясыг хадгалж текстийн өнгийг ${toCss(fixed)} болгов.`, `Adjusted text color to ${toCss(fixed)} keeping its hue.`);
      },
    },
  },
  {
    id: 'link-in-text-block',
    sc: ['1.4.1'],
    impact: 'serious',
    selector: 'p a[href], li a[href], td a[href], dd a[href], blockquote a[href]',
    evaluate(el, ctx) {
      const s = getComputedStyle(el);
      if (s.display !== 'inline' || !isVisible(el)) return null;
      const block = el.parentElement.closest('p, li, td, dd, blockquote');
      if (!block) return null;
      // Блок нь бусад тексттэй эсэх (зөвхөн холбоос биш)
      const blockText = block.textContent.replace(/\s+/g, '');
      const linkText = el.textContent.replace(/\s+/g, '');
      if (!linkText || blockText.length - linkText.length < 10) return null;
      if (/underline|line-through|overline/.test(s.textDecorationLine || s.textDecoration)) return null;
      if (s.borderBottomStyle !== 'none' && parseFloat(s.borderBottomWidth) > 0) return null;
      // box-shadow / background-image (gradient) доогуур зураасны техник
      if ((s.boxShadow && s.boxShadow !== 'none') || (s.backgroundImage && s.backgroundImage !== 'none')) return null;
      const ps = getComputedStyle(block);
      if (parseInt(s.fontWeight, 10) - parseInt(ps.fontWeight, 10) >= 300 || s.fontStyle !== ps.fontStyle) return null;
      const bg = backgroundOf(el, ctx.bgCache);
      if (bg.unknown) return null;
      if (s.backgroundColor !== ps.backgroundColor && parseColor(s.backgroundColor)?.[3] > 0) return null;
      const lc = parseColor(s.color), tc = parseColor(ps.color);
      if (!lc || !tc) return null;
      const ratio = contrastRatio(lc, tc);
      if (ratio >= 3) {
        // 3:1 ялгаатай ч F73 (G183): hover/focus үед нэмэлт тэмдэг шаардлагатай
        return review(el, m(`Текст доторх холбоос зөвхөн өнгөөр ялгагдаж байна (${ratio.toFixed(2)}:1). Hover/фокус үед доогуур зураас гарч байгааг шалгана уу.`, `Link is distinguished by color only (${ratio.toFixed(2)}:1). Verify an underline appears on hover/focus.`), { ratio });
      }
      return fail(el, m(`Текст доторх холбоос зөвхөн өнгөөр ялгагдах бөгөөд тодролын зөрүү ${ratio.toFixed(2)}:1 (<3:1). Доогуур зураас нэмнэ үү.`, `Link in text is distinguished by color only with ${ratio.toFixed(2)}:1 difference (<3:1). Add an underline.`), { ratio });
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        ctx.changes.setStyle(f.node, 'text-decoration', 'underline', 'link-in-text-block');
        ctx.changes.setStyle(f.node, 'text-underline-offset', '0.15em', 'link-in-text-block');
        return m('Текст доторх холбоост доогуур зураас нэмэв.', 'Underlined the in-text link.');
      },
    },
  },
  {
    id: 'non-text-contrast',
    sc: ['1.4.11'],
    impact: 'serious',
    selector: 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]), select, textarea',
    evaluate(el, ctx) {
      if (!isVisible(el) || isDisabled(el)) return null;
      const s = getComputedStyle(el);
      // box-shadow "ring" (Material/Tailwind) эсвэл outline нь хил хязгаар болно — өнгийг нь найдвартай задлах боломжгүй тул хангасан гэж үзнэ
      if ((s.boxShadow && s.boxShadow !== 'none') || (s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0)) return null;
      const outer = backgroundOf(el.parentElement || el, ctx.bgCache);
      if (outer.unknown || outer.gradient) return null;
      const around = outer.color;
      const field = parseColor(s.backgroundColor);
      const fieldOnBg = field ? blend(field, around) : around;
      // Талбайн өөрийн дэвсгэр нь хүрээлэх орчноос 3:1 ялгаатай бол хангалттай
      if (contrastRatio(fieldOnBg, around) >= 3) return null;
      const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((sd) => s[`border${sd}Style`] !== 'none' && parseFloat(s[`border${sd}Width`]) > 0);
      if (!sides.length) {
        return fail(el, m('Оролтын талбарын хил хязгаар харагдахгүй (хүрээ ч, ялгаатай дэвсгэр ч алга).', 'Form field boundary is not visible (no border or contrasting background).'), { ratio: 1 });
      }
      // Доод хүрээ л байхад хангалттай (material стиль)
      let best = 0;
      for (const sd of sides) {
        const bc = parseColor(s[`border${sd}Color`]);
        if (bc) best = Math.max(best, contrastRatio(blend(bc, around), around));
      }
      if (best >= 3) return null;
      return fail(el, m(`Оролтын талбарын хүрээний тодрол ${best.toFixed(2)}:1 (шаардлага 3:1).`, `Form field border contrast is ${best.toFixed(2)}:1 (needs 3:1).`), { ratio: +best.toFixed(2), around: toCss(around) });
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        const around = parseColor(f.data?.around) || WHITE;
        const c = adjustForContrast([118, 118, 118], around, 3.2);
        ctx.changes.setStyle(f.node, 'border', `1px solid ${toCss(c)}`, 'non-text-contrast');
        return m(`Талбарт ${toCss(c)} өнгийн 3:1+ тодролтой хүрээ нэмэв.`, `Added a 3:1+ contrast border (${toCss(c)}).`);
      },
    },
  },
];
