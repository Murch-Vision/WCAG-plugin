import media from './media.js';
import contrast from './contrast.js';
import structure from './structure.js';
import forms from './forms.js';
import interaction from './interaction.js';
import aria from './aria.js';

/** Бүх дүрэм. Дүрэм бүр WCAG 2.2-ын нэг буюу хэд хэдэн SC-д холбогдоно. */
export const RULES = [...structure, ...media, ...contrast, ...forms, ...interaction, ...aria];
export const RULES_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]));
