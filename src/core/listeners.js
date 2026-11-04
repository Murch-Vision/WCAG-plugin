/**
 * Сонголттой: addEventListener-ийг ажиглаж, click/pointer handler-тэй элементийг бүртгэнэ.
 * Ингэснээр <div> дээр JavaScript-ээр холбосон click-ийг илрүүлж 2.1.1 зөрчлийг олно.
 * Сайтын бусад скриптээс ӨМНӨ ачаалагдсан үед л бүрэн ажиллана.
 */
const KEY = '__hurteemjClickTargets';
const TYPES = new Set(['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend']);

export function trackListeners(win = typeof window !== 'undefined' ? window : null) {
  if (!win || win[KEY]) return win?.[KEY];
  const set = new WeakSet();
  win[KEY] = set;
  const proto = win.EventTarget.prototype;
  const orig = proto.addEventListener;
  proto.addEventListener = function (type, fn, opts) {
    if (TYPES.has(type) && this && this.nodeType === 1) set.add(this);
    return orig.call(this, type, fn, opts);
  };
  return set;
}

export function trackedTargets(win = typeof window !== 'undefined' ? window : null) {
  return win?.[KEY] || null;
}
