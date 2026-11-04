/**
 * W3C ACT Rules (Accessibility Conformance Testing) ↔ hurteemj дүрмийн уялдаа.
 *
 * ID-ууд ACT-Rules Community Group-ийн нийтлэгдсэн дүрмүүдийн 6 тэмдэгтийн код
 * (https://www.w3.org/WAI/standards-guidelines/act/rules/<id>/). Нэг hurteemj дүрэм хэд хэдэн ACT дүрмийг
 * хэсэгчлэн хамарч болно; ACT дүрэм бүрийг бүрэн хэрэгжүүлсэн гэсэн баталгаа биш — EARL тайланд
 * "хамаарах тест" гэж л ашиглана. Уялдаагүй дүрэм (жишээ нь 2.5.8 target-size) WCAG SC-гээ л зааж өгнө.
 */
export const ACT_RULES = {
  '23a2a8': 'Image has non-empty accessible name',
  '9eb3f6': 'Image filename is not accessible name',
  qt1vmo: 'Image accessible name is descriptive',
  '7d6734': 'SVG element with explicit role has non-empty accessible name',
  '59796f': 'Image button has non-empty accessible name',
  '8fc3b6': 'Object element rendering non-text content has non-empty accessible name',
  f51b46: 'Video element auditory content has captions',
  eac66b: 'Video element auditory content has accessible alternative',
  '1a02b0': 'Video element visual-only content has transcript',
  c5a4ea: 'Video element visual content has accessible alternative',
  '2eb176': 'Audio element content has transcript',
  e7aa44: 'Audio element content has text alternative',
  '80f0bf': 'Audio or video avoids automatically playing audio',
  '4c31df': 'Audio or video that plays automatically has a control mechanism',
  efbfc7: 'Text content that updates automatically can be paused, stopped or hidden',
  afw4f7: 'Text has minimum contrast',
  '09o5cg': 'Text has enhanced contrast',
  b5c3f8: 'HTML page has lang attribute',
  bf051a: 'HTML page language is valid',
  ucwvc8: 'HTML page language matches default language',
  de46e4: 'Element with lang attribute has valid language tag',
  '2779a5': 'HTML page has non-empty title',
  c4a8a4: 'HTML page title is descriptive',
  ffd0e9: 'Heading has non-empty accessible name',
  b40fd1: 'Document has a landmark with non-repeated content',
  cf77f2: 'Bypass blocks of repeated content',
  ye5d6e: 'Document has an instrument to move focus to non-repeated content',
  b4f0c3: 'Meta viewport allows for zoom',
  bc659a: 'Meta element has no refresh delay',
  bisz58: 'Meta element has no refresh delay (no exception)',
  '24afc2': 'Letter spacing in style attributes is not !important',
  '78fd32': 'Line height in style attributes is not !important',
  '9e45ec': 'Word spacing in style attributes is not !important',
  e086e5: 'Form field has non-empty accessible name',
  '73f2c2': 'Autocomplete attribute has valid value',
  '36b590': 'Error message describes invalid form field value',
  oj04fd: 'Element in sequential focus order has visible focus',
  '0ssw9k': 'Scrollable element is keyboard accessible',
  '97a4e1': 'Button has non-empty accessible name',
  c487ae: 'Link has non-empty accessible name',
  aizyf1: 'Link is descriptive',
  '5effbb': 'Link in context is descriptive',
  '2ee8b8': 'Visible label is part of accessible name',
  '674b10': 'Role attribute has valid value',
  '5f99a7': 'ARIA attribute is defined in WAI-ARIA',
  '6a7281': 'ARIA state or property has valid value',
  '4e8ab6': 'Element with role attribute has required states and properties',
  in6db8: 'ARIA required ID references exist',
  '3ea0c8': 'Id attribute value is unique',
  '6cfa84': 'Element with aria-hidden has no content in sequential focus navigation',
  m6b1q3: 'Menuitem has non-empty accessible name',
  cae760: 'Iframe element has non-empty accessible name',
  '307n5z': 'Element with presentational children has no focusable content',
  '46ca7f': 'Element marked as decorative is not exposed',
};

/** hurteemj rule id → ACT rule id-ууд */
const MAP = {
  'image-alt': ['23a2a8'],
  'image-alt-quality': ['9eb3f6', 'qt1vmo'],
  'svg-img-name': ['7d6734'],
  'input-image-alt': ['59796f'],
  'object-alt': ['8fc3b6'],
  'video-captions': ['f51b46', 'eac66b'],
  'media-alternative': ['1a02b0', 'c5a4ea', '2eb176', 'e7aa44'],
  'media-autoplay': ['80f0bf', '4c31df'],
  'marquee-blink': ['efbfc7'],
  'color-contrast': ['afw4f7', '09o5cg'],
  'html-lang': ['b5c3f8', 'bf051a', 'ucwvc8'],
  'lang-valid': ['de46e4'],
  'document-title': ['2779a5', 'c4a8a4'],
  'empty-heading': ['ffd0e9'],
  'landmark-main': ['b40fd1'],
  bypass: ['cf77f2', 'ye5d6e'],
  'meta-viewport': ['b4f0c3'],
  'meta-refresh': ['bc659a', 'bisz58'],
  'text-spacing-important': ['24afc2', '78fd32', '9e45ec'],
  label: ['e086e5'],
  'autocomplete-valid': ['73f2c2'],
  'error-identification': ['36b590'],
  'focus-visible': ['oj04fd'],
  'scrollable-region-focusable': ['0ssw9k'],
  'button-name': ['97a4e1'],
  'link-name': ['c487ae'],
  'link-purpose': ['aizyf1', '5effbb'],
  'label-in-name': ['2ee8b8'],
  'aria-valid-role': ['674b10'],
  'aria-valid-attr': ['5f99a7', '6a7281'],
  'aria-required-attr': ['4e8ab6'],
  'aria-idrefs': ['in6db8'],
  'duplicate-id-aria': ['3ea0c8'],
  'aria-hidden-focus': ['6cfa84'],
  'aria-name-required': ['m6b1q3'],
  'iframe-title': ['cae760'],
  'nested-interactive': ['307n5z'],
  'presentation-role-conflict': ['46ca7f'],
};

export const ACT_URL = 'https://www.w3.org/WAI/standards-guidelines/act/rules/';

/** @returns {{id:string,name:string,url:string}[]} */
export function actRulesFor(ruleId) {
  return (MAP[ruleId] || []).map((id) => ({ id, name: ACT_RULES[id], url: `${ACT_URL}${id}/` }));
}

export const ACT_MAP = MAP;
