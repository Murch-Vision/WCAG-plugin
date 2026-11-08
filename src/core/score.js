/**
 * Автомат шалгалтын оноо (0–100).
 *
 * Lighthouse-ийн аргатай төстэй: хамаарах (applicable) дүрэм бүрийг нөлөөллөөр нь жинлээд,
 * зөрчилгүй дүрмийн жингийн хувийг оноо болгоно. "Хянах" (review) олдвор оноог бууруулахгүй —
 * хүн шалгах хүртэл зөрчил гэж тооцохгүй. Зөрчлийн тоо биш, зөрчилтэй дүрмийн тоо чухал:
 * 200 зураг alt-гүй байх нь 1 дүрэм унасантай адил (нэг засвараар шийдэгддэг асуудал).
 *
 * АНХААР: энэ нь WCAG нийцлийн оноо БИШ. 100 оноо = "автомат шалгалтаар зөрчил илрээгүй".
 */
import { RULES_BY_ID } from '../rules/index.js';

export const IMPACT_WEIGHT = { critical: 10, serious: 7, moderate: 3, minor: 1 };

export const GRADES = [
  { min: 90, id: 'good', mn: 'Сайн', en: 'Good' },
  { min: 70, id: 'fair', mn: 'Дунд', en: 'Fair' },
  { min: 50, id: 'poor', mn: 'Сул', en: 'Poor' },
  { min: 0, id: 'bad', mn: 'Муу', en: 'Bad' },
];

export function gradeOf(score) {
  if (score == null || Number.isNaN(score)) return null;
  return GRADES.find((g) => score >= g.min);
}

/**
 * @param {object} report — runAudit()-ийн тайлан эсвэл serialize()-ийн JSON
 * @returns {{score:number|null, grade:object|null, rules:{passed:number, failed:number, applicable:number}, failedRules:string[]}}
 */
export function computeScore(report) {
  const failing = new Map(); // ruleId -> impact
  for (const f of report.findings || []) {
    if (f.outcome === 'fail' && !f.fixed) {
      const prev = failing.get(f.ruleId);
      // Нэг дүрмийн хамгийн хүнд нөлөөллийг авна (data.sc-ээр AAA болсон г.м.)
      if (!prev || IMPACT_WEIGHT[f.impact] > IMPACT_WEIGHT[prev]) failing.set(f.ruleId, f.impact);
    }
  }
  const run = report.rulesRun || [];
  const ids = new Set([...run.filter((r) => r.applicable).map((r) => r.id), ...failing.keys()]);
  let total = 0, passedW = 0, passed = 0;
  for (const id of ids) {
    const impact = failing.get(id) || RULES_BY_ID[id]?.impact || 'moderate';
    const w = IMPACT_WEIGHT[impact] || 1;
    total += w;
    if (!failing.has(id)) { passedW += w; passed++; }
  }
  const score = total ? Math.round((passedW / total) * 100) : null;
  return { score, grade: gradeOf(score), rules: { passed, failed: failing.size, applicable: ids.size }, failedRules: [...failing.keys()] };
}

/** Олон хуудасны дундаж оноо (хуудас бүр ижил жинтэй) */
export function aggregateScore(scores) {
  const valid = scores.filter((s) => typeof s === 'number');
  if (!valid.length) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
