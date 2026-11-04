/** WAI-ARIA 1.2 (+ 1.3 draft-ийн түгээмэл) үүрэг ба атрибутын өгөгдөл */

export const ROLES = new Set([
  'alert', 'alertdialog', 'application', 'article', 'banner', 'blockquote', 'button', 'caption', 'cell',
  'checkbox', 'code', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition', 'deletion',
  'dialog', 'directory', 'document', 'emphasis', 'feed', 'figure', 'form', 'generic', 'grid', 'gridcell',
  'group', 'heading', 'img', 'image', 'insertion', 'link', 'list', 'listbox', 'listitem', 'log', 'main', 'mark',
  'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'meter',
  'navigation', 'none', 'note', 'option', 'paragraph', 'presentation', 'progressbar', 'radio', 'radiogroup',
  'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search', 'searchbox', 'separator', 'slider',
  'spinbutton', 'status', 'strong', 'subscript', 'superscript', 'switch', 'tab', 'table', 'tablist',
  'tabpanel', 'term', 'textbox', 'time', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem',
  'comment', 'suggestion', 'sectionheader', 'sectionfooter',
  // DPUB-ARIA ба Graphics-ARIA
  'doc-abstract', 'doc-acknowledgments', 'doc-afterword', 'doc-appendix', 'doc-backlink', 'doc-biblioentry',
  'doc-bibliography', 'doc-biblioref', 'doc-chapter', 'doc-colophon', 'doc-conclusion', 'doc-cover',
  'doc-credit', 'doc-credits', 'doc-dedication', 'doc-endnote', 'doc-endnotes', 'doc-epigraph', 'doc-epilogue',
  'doc-errata', 'doc-example', 'doc-footnote', 'doc-foreword', 'doc-glossary', 'doc-glossref', 'doc-index',
  'doc-introduction', 'doc-noteref', 'doc-notice', 'doc-pagebreak', 'doc-pagefooter', 'doc-pageheader',
  'doc-pagelist', 'doc-part', 'doc-preface', 'doc-prologue', 'doc-pullquote', 'doc-qna', 'doc-subtitle',
  'doc-tip', 'doc-toc', 'graphics-document', 'graphics-object', 'graphics-symbol',
]);

export const ABSTRACT_ROLES = new Set(['command', 'composite', 'input', 'landmark', 'range', 'roletype',
  'section', 'sectionhead', 'select', 'structure', 'widget', 'window']);

export const ARIA_ATTRS = new Set([
  'aria-activedescendant', 'aria-atomic', 'aria-autocomplete', 'aria-braillelabel', 'aria-brailleroledescription',
  'aria-busy', 'aria-checked', 'aria-colcount', 'aria-colindex', 'aria-colindextext', 'aria-colspan',
  'aria-controls', 'aria-current', 'aria-describedby', 'aria-description', 'aria-details', 'aria-disabled',
  'aria-dropeffect', 'aria-errormessage', 'aria-expanded', 'aria-flowto', 'aria-grabbed', 'aria-haspopup',
  'aria-hidden', 'aria-invalid', 'aria-keyshortcuts', 'aria-label', 'aria-labelledby', 'aria-level',
  'aria-live', 'aria-modal', 'aria-multiline', 'aria-multiselectable', 'aria-orientation', 'aria-owns',
  'aria-placeholder', 'aria-posinset', 'aria-pressed', 'aria-readonly', 'aria-relevant', 'aria-required',
  'aria-roledescription', 'aria-rowcount', 'aria-rowindex', 'aria-rowindextext', 'aria-rowspan',
  'aria-selected', 'aria-setsize', 'aria-sort', 'aria-valuemax', 'aria-valuemin', 'aria-valuenow',
  'aria-valuetext', 'aria-actions',
]);

/** Утгын төрөл: зөвшөөрөгдөх токенууд */
export const ATTR_VALUES = {
  'aria-autocomplete': ['inline', 'list', 'both', 'none'],
  'aria-busy': ['true', 'false'],
  'aria-checked': ['true', 'false', 'mixed', 'undefined'],
  'aria-current': ['page', 'step', 'location', 'date', 'time', 'true', 'false'],
  'aria-disabled': ['true', 'false'],
  'aria-expanded': ['true', 'false', 'undefined'],
  'aria-haspopup': ['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog'],
  'aria-hidden': ['true', 'false', 'undefined'],
  'aria-invalid': ['true', 'false', 'grammar', 'spelling'],
  'aria-live': ['assertive', 'polite', 'off'],
  'aria-modal': ['true', 'false'],
  'aria-multiline': ['true', 'false'],
  'aria-multiselectable': ['true', 'false'],
  'aria-orientation': ['horizontal', 'vertical', 'undefined'],
  'aria-pressed': ['true', 'false', 'mixed', 'undefined'],
  'aria-readonly': ['true', 'false'],
  'aria-required': ['true', 'false'],
  'aria-selected': ['true', 'false', 'undefined'],
  'aria-sort': ['ascending', 'descending', 'none', 'other'],
};

export const IDREF_ATTRS = ['aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns',
  'aria-activedescendant', 'aria-errormessage', 'aria-flowto', 'aria-details'];

/** Үүрэг бүрт заавал байх ёстой атрибут (native element-ийн утга хангалттай гэж үзнэ) */
export const REQUIRED_ATTRS = {
  checkbox: ['aria-checked'],
  combobox: ['aria-expanded'],
  heading: ['aria-level'],
  menuitemcheckbox: ['aria-checked'],
  menuitemradio: ['aria-checked'],
  meter: ['aria-valuenow'],
  radio: ['aria-checked'],
  scrollbar: ['aria-controls', 'aria-valuenow'],
  slider: ['aria-valuenow'],
  switch: ['aria-checked'],
};

/** Нэр заавал шаардлагатай widget/бүтцийн үүргүүд */
export const NAME_REQUIRED = new Set(['button', 'link', 'checkbox', 'combobox', 'listbox', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'meter', 'option', 'progressbar', 'radio', 'radiogroup', 'searchbox',
  'slider', 'spinbutton', 'switch', 'tab', 'tabpanel', 'textbox', 'treeitem', 'dialog', 'alertdialog',
  'img', 'image', 'tree', 'grid', 'treegrid', 'table', 'form', 'region', 'menu', 'menubar', 'toolbar']);

export const INTERACTIVE_ROLES = new Set(['button', 'link', 'checkbox', 'combobox', 'listbox', 'menuitem',
  'menuitemcheckbox', 'menuitemradio', 'option', 'radio', 'searchbox', 'slider', 'spinbutton', 'switch',
  'tab', 'textbox', 'treeitem', 'gridcell']);

/** HTML autocomplete токенууд (HTML Living Standard, 1.3.5-д хамаарах) */
export const AUTOCOMPLETE_TOKENS = new Set([
  'name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname',
  'username', 'new-password', 'current-password', 'one-time-code', 'organization-title', 'organization',
  'street-address', 'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3',
  'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name',
  'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc',
  'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month',
  'bday-year', 'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local',
  'tel-local-prefix', 'tel-local-suffix', 'tel-extension', 'email', 'impp', 'webauthn',
]);
export const AUTOCOMPLETE_MODIFIERS = new Set(['home', 'work', 'mobile', 'fax', 'pager', 'shipping', 'billing']);
