/** Дүрэм бичихэд хэрэглэх туслахууд */
export const m = (mn, en) => ({ mn, en });

export const fail = (node, message, data) => ({ node, outcome: 'fail', message, data });
export const review = (node, message, data) => ({ node, outcome: 'review', message, data });

/** "{n}" хэлбэрийн орлуулга */
export function fmt(str, data = {}) {
  return String(str).replace(/\{(\w+)\}/g, (_, k) => (data[k] ?? `{${k}}`));
}

/** Тэмдэгтийн бичиг (script) — монгол/орос кирилл, латин ялгах */
export function scriptOf(text) {
  let cyr = 0, lat = 0, mnOnly = 0;
  for (const ch of text) {
    if (/[Ѐ-ӿ]/.test(ch)) { cyr++; if (/[өүӨҮ]/.test(ch)) mnOnly++; }
    else if (/[A-Za-z]/.test(ch)) lat++;
  }
  const total = cyr + lat;
  if (total < 20) return { script: null, mnHint: false };
  return { script: cyr / total > 0.6 ? 'Cyrl' : lat / total > 0.6 ? 'Latn' : 'mixed', mnHint: mnOnly > 0 };
}

/** Холбоос/товчны icon class-аас утга таах толь (heuristic засварт) */
export const ICON_WORDS = {
  search: m('Хайх', 'Search'), close: m('Хаах', 'Close'), times: m('Хаах', 'Close'), xmark: m('Хаах', 'Close'),
  menu: m('Цэс', 'Menu'), bars: m('Цэс', 'Menu'), hamburger: m('Цэс', 'Menu'), home: m('Нүүр', 'Home'),
  cart: m('Сагс', 'Cart'), basket: m('Сагс', 'Cart'), user: m('Хэрэглэгч', 'Account'), account: m('Хэрэглэгч', 'Account'),
  facebook: m('Facebook', 'Facebook'), twitter: m('X (Twitter)', 'X (Twitter)'), instagram: m('Instagram', 'Instagram'),
  youtube: m('YouTube', 'YouTube'), linkedin: m('LinkedIn', 'LinkedIn'), telegram: m('Telegram', 'Telegram'),
  phone: m('Утас', 'Phone'), envelope: m('И-мэйл', 'Email'), mail: m('И-мэйл', 'Email'), email: m('И-мэйл', 'Email'),
  next: m('Дараах', 'Next'), prev: m('Өмнөх', 'Previous'), previous: m('Өмнөх', 'Previous'),
  'chevron-right': m('Дараах', 'Next'), 'chevron-left': m('Өмнөх', 'Previous'), 'arrow-right': m('Дараах', 'Next'),
  'arrow-left': m('Өмнөх', 'Previous'), play: m('Тоглуулах', 'Play'), pause: m('Түр зогсоох', 'Pause'),
  download: m('Татах', 'Download'), share: m('Хуваалцах', 'Share'), edit: m('Засах', 'Edit'), pen: m('Засах', 'Edit'),
  trash: m('Устгах', 'Delete'), delete: m('Устгах', 'Delete'), settings: m('Тохиргоо', 'Settings'), cog: m('Тохиргоо', 'Settings'),
  gear: m('Тохиргоо', 'Settings'), print: m('Хэвлэх', 'Print'), heart: m('Таалагдсан', 'Favorite'), star: m('Онцлох', 'Favorite'),
  bell: m('Мэдэгдэл', 'Notifications'), plus: m('Нэмэх', 'Add'), add: m('Нэмэх', 'Add'), minus: m('Хасах', 'Remove'),
  info: m('Мэдээлэл', 'Information'), help: m('Тусламж', 'Help'), question: m('Тусламж', 'Help'), globe: m('Хэл', 'Language'),
  language: m('Хэл', 'Language'), filter: m('Шүүх', 'Filter'), login: m('Нэвтрэх', 'Log in'), logout: m('Гарах', 'Log out'),
};

export function guessIconName(el, lang) {
  const hay = [el, ...el.querySelectorAll('*')].slice(0, 6)
    .map((n) => `${n.getAttribute('class') || ''} ${n.getAttribute('data-icon') || ''} ${n.getAttribute('href') || ''} ${n.localName === 'use' ? n.getAttribute('href') || n.getAttribute('xlink:href') || '' : ''}`)
    .join(' ').toLowerCase();
  // Урт түлхүүрийг эхэлж шалгана (chevron-right > right)
  const keys = Object.keys(ICON_WORDS).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(hay)) return ICON_WORDS[k][lang] || ICON_WORDS[k].en;
  }
  // Сошиал холбоосыг домэйноор
  const href = el.getAttribute('href') || '';
  const dm = href.match(/^https?:\/\/(?:www\.)?([^/]+)/);
  if (dm) {
    const host = dm[1].split('.').slice(-2, -1)[0];
    if (ICON_WORDS[host]) return ICON_WORDS[host][lang] || ICON_WORDS[host].en;
  }
  return null;
}

export const AMBIGUOUS_LINK_TEXT = new Set([
  'энд', 'энд дарна уу', 'энд дар', 'дарна уу', 'дэлгэрэнгүй', 'дэлгэрэнгүй унших', 'цааш унших', 'цааш нь', 'үргэлжлүүлэх',
  'холбоос', 'энэ', 'энэ холбоос', 'үзэх', 'харах', 'илүүг', 'илүү ихийг', 'more', 'read more', 'click here', 'here',
  'learn more', 'more info', 'details', 'link', 'this', 'continue', 'go', 'view', 'see more', 'read', 'click',
]);
