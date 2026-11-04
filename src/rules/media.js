import { accessibleName, isHiddenFromAT, normalize, visibleText } from '../core/dom.js';
import { m, fail, review } from './util.js';

const FILENAME_RE = /^[\w\s()-]+\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?)$/i;
const MEANINGLESS_ALT = new Set(['image', 'img', 'photo', 'picture', 'icon', 'logo', 'graphic', 'banner',
  'зураг', 'фото', 'зургийн', 'дүрс', 'икон', 'лого', 'баннер', 'untitled', 'placeholder', 'spacer', '*', '-']);

/** Зураг нь өөрөө нэртэй control-ын дотор, өөр тексттэй хамт байгаа эсэх */
function controlHasOtherText(img) {
  const ctl = img.closest('a[href], button, [role="button"], [role="link"]');
  if (!ctl) return false;
  const clone = ctl.cloneNode(true);
  clone.querySelectorAll('img, svg').forEach((n) => n.remove());
  return normalize(clone.textContent).length > 0;
}

export default [
  {
    id: 'image-alt',
    sc: ['1.1.1'],
    impact: 'critical',
    selector: 'img',
    evaluate(el) {
      if (el.hasAttribute('alt')) return null;
      if (isHiddenFromAT(el)) return null;
      const role = el.getAttribute('role');
      if (role === 'presentation' || role === 'none') return null;
      if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return null;
      return fail(el,
        m('Зурагт alt атрибут байхгүй. Утга бүхий зурагт агуулгыг нь тайлбарласан alt, чимэглэлийн зурагт alt="" өгнө үү.',
          'Image has no alt attribute. Give meaningful images descriptive alt text and decorative images alt="".'));
    },
    fix: {
      tier: 'safe',
      async apply(f, ctx) {
        const img = f.node;
        // 1) Өөр тексттэй холбоос/товч доторх зураг -> чимэглэл
        if (controlHasOtherText(img)) {
          ctx.changes.setAttr(img, 'alt', '', 'image-alt');
          return m('Тексттэй холбоос доторх зургийг чимэглэл (alt="") болгов.', 'Marked image inside a labelled control as decorative (alt="").');
        }
        // 2) Хэрэглэгчийн тохируулсан alt үүсгэгч (AI caption API гэх мэт)
        if (typeof ctx.config.altTextProvider === 'function') {
          try {
            const alt = await ctx.config.altTextProvider(img.currentSrc || img.src, img, ctx.pageLang);
            if (alt && typeof alt === 'string') {
              ctx.changes.setAttr(img, 'alt', alt.trim(), 'image-alt');
              ctx.changes.setAttr(img, 'data-hj-alt-generated', 'true', 'image-alt');
              return m(`altTextProvider-оор alt үүсгэв: "${alt.trim()}" (хүн хянах шаардлагатай)`, `Generated alt via altTextProvider: "${alt.trim()}" (needs human review)`);
            }
          } catch (e) { /* provider алдаа — fallback */ }
        }
        // 3) title атрибут байвал (heuristic)
        if (ctx.tier === 'heuristic') {
          const title = normalize(img.getAttribute('title'));
          if (title) {
            ctx.changes.setAttr(img, 'alt', title, 'image-alt');
            return m('title атрибутыг alt болгон ашиглав.', 'Used the title attribute as alt text.');
          }
          const fig = img.closest('figure')?.querySelector('figcaption');
          if (fig && normalize(fig.textContent)) {
            ctx.changes.setAttr(img, 'alt', '', 'image-alt');
            return m('figcaption-тай зургийг давхар уншуулахгүйн тулд alt="" болгов.', 'Image is described by its figcaption; set alt="" to avoid duplication.');
          }
        }
        return false;
      },
    },
  },
  {
    id: 'image-alt-quality',
    sc: ['1.1.1'],
    impact: 'serious',
    selector: 'img[alt], input[type="image"][alt], area[alt]',
    evaluate(el) {
      const alt = normalize(el.getAttribute('alt'));
      if (!alt) return null;
      const src = (el.getAttribute('src') || '').split('/').pop().split('?')[0];
      if (FILENAME_RE.test(alt) || (src && alt === src)) {
        return fail(el, m(`alt текст нь файлын нэр байна ("${alt}"). Агуулгыг нь тайлбарлана уу.`, `Alt text is a file name ("${alt}"). Describe the image content instead.`));
      }
      if (MEANINGLESS_ALT.has(alt.toLowerCase())) {
        return review(el, m(`alt текст "${alt}" утга агуулахгүй байж магадгүй.`, `Alt text "${alt}" is likely not meaningful.`));
      }
      if (alt.length > 250) {
        return review(el, m('alt текст хэт урт (250+ тэмдэгт). Урт тайлбарыг aria-describedby эсвэл хуудсан дээр байрлуулна уу.', 'Alt text is very long (250+ chars). Move long descriptions to the page or aria-describedby.'));
      }
      return null;
    },
    fix: {
      tier: 'heuristic',
      apply(f, ctx) {
        if (f.outcome === 'fail' && controlHasOtherText(f.node)) {
          ctx.changes.setAttr(f.node, 'alt', '', 'image-alt-quality');
          return m('Файлын нэр бүхий alt-ыг тексттэй холбоос дотор alt="" болгов.', 'Replaced filename alt with alt="" inside a labelled control.');
        }
        return false;
      },
    },
  },
  {
    id: 'svg-img-name',
    sc: ['1.1.1'],
    impact: 'serious',
    selector: 'svg[role="img"], [role="img"]:not(img):not(svg), svg:not([role]):not([aria-hidden="true"])',
    evaluate(el) {
      if (isHiddenFromAT(el)) return null;
      if (accessibleName(el)) return null;
      if (el.localName === 'svg' && !el.hasAttribute('role')) {
        // Ролгүй svg: нэртэй control дотор бол чимэглэл гэж үзээд aria-hidden өгөх нь зөв
        if (el.closest('svg:not(:scope)')) return null;
        const ctl = el.closest('a[href], button, [role="button"], [role="link"]');
        if (ctl && accessibleName(ctl)) return review(el, m('Нэртэй control доторх svg-д aria-hidden="true" өгвөл дэлгэц уншигчид давхардал гарахгүй.', 'Decorative svg inside a named control should have aria-hidden="true".'), { decorative: true });
        return null; // бие даасан ролгүй svg — дэлгэц уншигч ихэвчлэн алгасна
      }
      return fail(el, m('role="img" элемент нэргүй байна. aria-label эсвэл <title> нэмнэ үү.', 'Element with role="img" has no accessible name. Add aria-label or <title>.'));
    },
    fix: {
      tier: 'safe', onReview: true,
      apply(f, ctx) {
        if (f.data?.decorative) {
          ctx.changes.setAttr(f.node, 'aria-hidden', 'true', 'svg-img-name');
          ctx.changes.setAttr(f.node, 'focusable', 'false', 'svg-img-name');
          return m('Чимэглэлийн svg-д aria-hidden="true" өгөв.', 'Added aria-hidden="true" to decorative svg.');
        }
        return false;
      },
    },
  },
  {
    id: 'input-image-alt',
    sc: ['1.1.1', '4.1.2'],
    impact: 'critical',
    selector: 'input[type="image"]',
    evaluate(el) {
      return accessibleName(el) ? null : fail(el, m('Зурган товч (input type=image) нэргүй. alt атрибут нэмнэ үү.', 'Image button has no accessible name. Add an alt attribute.'));
    },
  },
  {
    id: 'area-alt',
    sc: ['1.1.1', '2.4.4'],
    impact: 'critical',
    selector: 'map area[href]',
    evaluate(el) {
      return accessibleName(el) ? null : fail(el, m('Зургийн газрын зургийн (image map) area элемент нэргүй.', 'Image map <area> has no accessible name.'));
    },
  },
  {
    id: 'object-alt',
    sc: ['1.1.1'],
    impact: 'serious',
    selector: 'object, embed',
    evaluate(el) {
      if (isHiddenFromAT(el)) return null;
      const name = accessibleName(el) || normalize(el.localName === 'object' ? el.textContent : '');
      return name ? null : fail(el, m(`<${el.localName}> элементэд текст хувилбар байхгүй.`, `<${el.localName}> has no text alternative.`));
    },
  },
  {
    id: 'video-captions',
    sc: ['1.2.2', '1.2.4'],
    impact: 'critical',
    selector: 'video',
    evaluate(el) {
      if (el.querySelector('track[kind="captions"], track[kind="subtitles"]')) return null;
      if (el.muted && el.autoplay && el.loop) return null; // арын чимэглэл видео гэж үзнэ
      return review(el, m('Видеонд хадмал (<track kind="captions">) алга. Хадмал видеон дээр шатаагдсан (open captions) эсэхийг шалгана уу.', 'Video has no captions track. Verify captions are not burned in (open captions).'));
    },
  },
  {
    id: 'media-alternative',
    sc: ['1.2.1', '1.2.3', '1.2.5'],
    impact: 'serious',
    selector: 'audio, video',
    evaluate(el) {
      if (el.localName === 'video' && el.muted && el.loop) return null;
      return review(el, el.localName === 'audio'
        ? m('Аудиод текст хувилбар (transcript) байгаа эсэхийг шалгана уу.', 'Check that the audio has a text transcript.')
        : m('Видеонд аудио тайлбар эсвэл бүрэн текст хувилбар байгаа эсэхийг шалгана уу.', 'Check that the video has audio description or a full text alternative.'));
    },
  },
  {
    id: 'media-autoplay',
    sc: ['1.4.2', '2.2.2'],
    impact: 'serious',
    selector: 'audio[autoplay], video[autoplay]',
    evaluate(el) {
      if (el.muted || el.hasAttribute('muted')) {
        if (el.localName === 'video' && el.loop && !el.controls && el.duration > 5) {
          return review(el, m('Дуугүй ч тасралтгүй давтагдах видеог түр зогсоох боломж (2.2.2) хэрэгтэй.', 'Looping muted video needs a pause mechanism (2.2.2).'));
        }
        return null;
      }
      if (el.controls) return null;
      return fail(el, m('Автоматаар тоглох дуутай медиад зогсоох/дууг хаах удирдлага алга.', 'Auto-playing media with sound has no pause or mute control.'));
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        ctx.changes.setAttr(f.node, 'controls', '', 'media-autoplay');
        return m('Медиад controls (удирдлага) нэмэв.', 'Added native media controls.');
      },
    },
  },
  {
    id: 'marquee-blink',
    sc: ['2.2.2'],
    impact: 'serious',
    selector: 'marquee, blink',
    evaluate(el) {
      return fail(el, m(`<${el.localName}> элемент хөдөлгөөнийг зогсоох боломжгүй, хуучирсан.`, `Deprecated <${el.localName}> moves without a way to stop it.`));
    },
    fix: {
      tier: 'safe',
      apply(f, ctx) {
        if (typeof f.node.stop === 'function') {
          f.node.stop();
          ctx.changes.custom(() => f.node.start?.(), 'marquee-blink');
        }
        ctx.changes.setStyle(f.node, 'animation', 'none', 'marquee-blink');
        return m('Хөдөлгөөнийг зогсоов.', 'Stopped the movement.');
      },
    },
  },
  {
    id: 'image-of-text-hint',
    sc: ['1.4.5'],
    impact: 'moderate',
    selector: 'img[alt]',
    evaluate(el) {
      const alt = normalize(el.getAttribute('alt'));
      const r = el.getBoundingClientRect();
      // Өргөн нарийхан, урт alt-тай баннер => текстэн зураг байж магадгүй
      if (alt.split(' ').length >= 6 && r.width > 3 * r.height && r.height > 0 && !visibleText(el.parentElement || el).includes(alt)) {
        return review(el, m('Энэ нь текстэн зураг (баннер) байж магадгүй. Боломжтой бол жинхэнэ HTML текст ашиглана уу.', 'This may be an image of text. Use real text where possible.'));
      }
      return null;
    },
  },
];
