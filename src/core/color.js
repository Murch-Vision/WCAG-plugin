/**
 * Өнгө задлах, WCAG 2.x relative luminance ба тодролын харьцаа,
 * alpha холих, тодролын шаардлагад хүрэх хамгийн бага өөрчлөлттэй өнгө олох.
 */

const NAMED = { transparent: [0, 0, 0, 0], black: [0, 0, 0, 1], white: [255, 255, 255, 1] };

/** 'rgb(…)', 'rgba(…)', '#rgb', '#rrggbb', '#rrggbbaa' болон орчин үеийн 'rgb(r g b / a)' хэлбэрийг задлана. */
export function parseColor(str) {
  if (!str) return null;
  str = String(str).trim().toLowerCase();
  if (NAMED[str]) return NAMED[str].slice();
  if (str[0] === '#') {
    let h = str.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const n = (i) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const m = str.match(/^rgba?\(([^)]+)\)$/);
  if (m) {
    const parts = m[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    const ch = (p) => (p.endsWith('%') ? (parseFloat(p) * 255) / 100 : parseFloat(p));
    let a = parts[3] === undefined ? 1 : parts[3].endsWith('%') ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
    if (Number.isNaN(a)) a = 1;
    return [ch(parts[0]), ch(parts[1]), ch(parts[2]), a];
  }
  // color(srgb r g b / a) — Chrome-ийн computed style заримдаа ингэж буцаадаг
  const cm = str.match(/^color\(srgb\s+([^)]+)\)$/);
  if (cm) {
    const parts = cm[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
    return [parts[0] * 255, parts[1] * 255, parts[2] * 255, parts[3] ?? 1];
  }
  return null; // oklch(), lab() г.м. — шалгах боломжгүй гэж үзнэ (review)
}

const lin = (c) => {
  c /= 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

/** WCAG 2.2 relative luminance. (W3C 2.2 тодорхойлолтод 0.04045 босгыг ашиглана.) */
export function luminance([r, g, b]) {
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(fg, bg) {
  const l1 = luminance(fg);
  const l2 = luminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** fg-г (alpha-тай) bg дээр давхарлана (source-over). */
export function blend(fg, bg) {
  const a = fg[3] ?? 1;
  if (a >= 1) return [fg[0], fg[1], fg[2], 1];
  const ba = bg[3] ?? 1;
  const outA = a + ba * (1 - a);
  if (outA === 0) return [0, 0, 0, 0];
  const mix = (i) => (fg[i] * a + bg[i] * ba * (1 - a)) / outA;
  return [mix(0), mix(1), mix(2), outA];
}

export const toCss = ([r, g, b, a = 1]) =>
  a >= 1 ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${+a.toFixed(3)})`;

export const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** sRGB -> OKLab -> OKLCH (өнгөний аясыг хадгалж гэрэлтэлтийг өөрчлөхөд ашиглана) */
function rgbToOklab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function oklabToRgb([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const gam = (c) => {
    c = Math.max(0, Math.min(1, c));
    return 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
  };
  return [
    gam(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    gam(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    gam(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

/**
 * fg өнгийг bg-тэй харьцуулахад `target` тодролд хүрэх хүртэл OKLab орон зайд
 * гэрэлтэлтийг (L) хамгийн бага хэмжээгээр өөрчилнө — брэндийн өнгөний аяс хадгалагдана.
 * Хэрэв аль ч чиглэлд хүрэхгүй бол хар эсвэл цагааныг буцаана.
 */
export function adjustForContrast(fg, bg, target = 4.5) {
  if (contrastRatio(fg, bg) >= target) return fg.slice(0, 3);
  const [L, A, B] = rgbToOklab(fg);
  const bgLum = luminance(bg);
  const tryDir = (dir) => {
    let lo = L, hi = dir < 0 ? 0 : 1, best = null;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      const c = oklabToRgb([mid, A, B]);
      if (contrastRatio(c, bg) >= target) { best = c; hi = mid; } else { lo = mid; }
    }
    return best;
  };
  // Арын өнгө цайвар бол эхлээд бараан тал руу
  const order = bgLum > 0.18 ? [-1, 1] : [1, -1];
  for (const d of order) {
    const r = tryDir(d);
    if (!r) continue;
    // Бүхэл тоо руу дугуйлахад шаардлагаас доош унахаас сэргийлж нэг алхам үргэлжлүүлнэ
    let c = r.map((v) => Math.round(v));
    const step = luminance(c) > bgLum ? 1 : -1;
    for (let i = 0; i < 8 && contrastRatio(c, bg) < target; i++) c = c.map((v) => Math.max(0, Math.min(255, v + step)));
    if (contrastRatio(c, bg) >= target) return c;
  }
  return contrastRatio([0, 0, 0], bg) >= contrastRatio([255, 255, 255], bg) ? [0, 0, 0] : [255, 255, 255];
}
