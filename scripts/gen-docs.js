/** docs/RULES.md-г кодын дүрмүүдээс автоматаар үүсгэнэ (баримт бичиг код хоёр зөрөхгүй). */
import { writeFileSync } from 'node:fs';
import { RULES } from '../src/rules/index.js';
import { CRITERIA } from '../src/wcag/criteria.js';

const bySC = {};
for (const r of RULES) for (const sc of r.sc) (bySC[sc] ||= []).push(r.id);
const auto = { auto: 'Автомат', partial: 'Хэсэгчлэн', manual: 'Гараар' };
let md = `# Дүрмүүд ба WCAG 2.2 хамрах хүрээ\n\n> Энэ файлыг \`node scripts/gen-docs.js\` автоматаар үүсгэнэ.\n\n`;
md += `## Дүрмүүд (${RULES.length})\n\n| Дүрэм | SC | Нөлөө | Автомат засвар | Тэмдэглэл |\n|---|---|---|---|---|\n`;
for (const r of RULES) md += `| \`${r.id}\` | ${r.sc.join(', ')} | ${r.impact} | ${r.fix ? (r.fix.tier === 'safe' ? '✅ safe' : '🟡 heuristic') : '—'} | ${r.deep ? 'deep (DOM-ыг түр өөрчилнө)' : r.run ? 'хуудасны түвшин' : 'элемент бүр'} |\n`;
md += `\n## WCAG 2.2-ын 86 шалгуур\n\n| SC | Нэр | Түвшин | Автоматжилт | Дүрмүүд |\n|---|---|---|---|---|\n`;
for (const c of CRITERIA) md += `| ${c.id}${c.new22 ? ' 🆕' : ''} | ${c.title.mn} (${c.title.en}) | ${c.level} | ${auto[c.automation]} | ${(bySC[c.id] || []).map((x) => `\`${x}\``).join(', ') || '—'} |\n`;
const covered = CRITERIA.filter((c) => bySC[c.id]).length;
md += `\n**Хамрах хүрээ:** ${covered}/86 SC-д ядаж нэг автомат дүрэм бий. Үлдсэн ${86 - covered} SC зөвхөн хүний шалгалтаар баталгаажна.\n`;
writeFileSync(new URL('../docs/RULES.md', import.meta.url), md);
console.log(`docs/RULES.md: ${RULES.length} rules, ${covered}/86 SC covered`);
