import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, parseColor, adjustForContrast, blend } from '../src/core/color.js';
import { CRITERIA, criteriaForLevel } from '../src/wcag/criteria.js';
import { RULES } from '../src/rules/index.js';
import { validLang } from '../src/rules/structure.js';

test('WCAG 2.2 каталог: 86 SC, 9 шинэ, 4.1.1 хасагдсан', () => {
  assert.equal(CRITERIA.length, 86);
  assert.equal(CRITERIA.filter((c) => c.new22).length, 9);
  assert.ok(!CRITERIA.find((c) => c.id === '4.1.1'));
  // WCAG 2.2: A=31, AA=24, AAA=31
  assert.equal(criteriaForLevel('A').length, 31);
  assert.equal(criteriaForLevel('AA').length, 31 + 24);
  assert.equal(CRITERIA.filter((c) => c.level === 'AAA').length, 31);
  assert.equal(new Set(CRITERIA.map((c) => c.id)).size, 86);
});

test('Дүрэм бүр хүчинтэй SC-д холбогдсон', () => {
  const ids = new Set(CRITERIA.map((c) => c.id));
  for (const r of RULES) {
    assert.ok(r.sc.length, r.id);
    for (const sc of r.sc) assert.ok(ids.has(sc), `${r.id} -> ${sc}`);
    assert.ok(['critical', 'serious', 'moderate', 'minor'].includes(r.impact), r.id);
    if (r.fix) assert.ok(['safe', 'heuristic'].includes(r.fix.tier), r.id);
  }
  assert.equal(new Set(RULES.map((r) => r.id)).size, RULES.length, 'давхардсан rule id');
});

test('Тодролын харьцаа (WCAG томьёо)', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]).toFixed(2), '21.00');
  assert.equal(contrastRatio([118, 118, 118], [255, 255, 255]).toFixed(2), '4.54');
  assert.equal(contrastRatio([255, 255, 255], [255, 255, 255]), 1);
});

test('Өнгө задлах', () => {
  assert.deepEqual(parseColor('#fff'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  assert.deepEqual(parseColor('rgb(10 20 30 / 50%)'), [10, 20, 30, 0.5]);
  assert.equal(parseColor('oklch(0.5 0.1 200)'), null);
  assert.deepEqual(blend([0, 0, 0, 0.5], [255, 255, 255, 1]).map(Math.round), [128, 128, 128, 1]);
});

test('adjustForContrast аясыг хадгалж шаардлагад хүргэнэ', () => {
  for (const [fg, bg, target] of [[[170, 170, 170], [255, 255, 255], 4.5], [[0, 120, 255], [255, 255, 255], 4.5], [[60, 60, 60], [0, 0, 0], 7], [[255, 140, 0], [255, 255, 255], 3]]) {
    const out = adjustForContrast(fg, bg, target);
    assert.ok(contrastRatio(out, bg) >= target, `${fg} -> ${out}`);
  }
  // Цэнхэр өнгө цэнхэр хэвээр үлдэнэ
  const blue = adjustForContrast([80, 150, 255], [255, 255, 255], 4.5);
  assert.ok(blue[2] > blue[0] && blue[2] > blue[1]);
});

test('BCP 47 хэлний код', () => {
  for (const v of ['mn', 'mn-MN', 'mn-Cyrl', 'mn-Mong-CN', 'en-US', 'zh-Hant-TW']) assert.ok(validLang(v), v);
  for (const v of ['english', 'mongolian', 'xx', 'en_US', '']) assert.ok(!validLang(v), v);
});
