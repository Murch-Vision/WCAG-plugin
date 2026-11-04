/**
 * WCAG 2.2 (W3C Recommendation, 2024-12-12 шинэчлэл; ISO/IEC 40500:2025) —
 * бүх 86 амжилтын шалгуурын (Success Criterion) каталог.
 *
 * automation:
 *   'auto'    — дүрэм нь ихэнх тохиолдлыг автоматаар илрүүлнэ (гэхдээ 100% биш)
 *   'partial' — зарим хэсгийг илрүүлнэ, үлдсэнийг хүн шалгана
 *   'manual'  — автомат илрүүлэх боломжгүй, хүн заавал шалгана
 *
 * new22: WCAG 2.2-т шинээр нэмэгдсэн. 4.1.1 Parsing нь 2.2-т хасагдсан тул энд байхгүй.
 */
const C = (id, level, automation, en, mn, extra = {}) => ({ id, level, automation, title: { en, mn }, ...extra });

export const CRITERIA = [
  // 1. Мэдрэгдэхүйц (Perceivable)
  C('1.1.1', 'A', 'partial', 'Non-text Content', 'Текст бус контент'),
  C('1.2.1', 'A', 'partial', 'Audio-only and Video-only (Prerecorded)', 'Зөвхөн аудио ба зөвхөн видео (бичлэг)'),
  C('1.2.2', 'A', 'partial', 'Captions (Prerecorded)', 'Хадмал (бичлэг)'),
  C('1.2.3', 'A', 'manual', 'Audio Description or Media Alternative (Prerecorded)', 'Аудио тайлбар эсвэл медиа хувилбар (бичлэг)'),
  C('1.2.4', 'AA', 'manual', 'Captions (Live)', 'Хадмал (шууд)'),
  C('1.2.5', 'AA', 'manual', 'Audio Description (Prerecorded)', 'Аудио тайлбар (бичлэг)'),
  C('1.2.6', 'AAA', 'manual', 'Sign Language (Prerecorded)', 'Дохионы хэл (бичлэг)'),
  C('1.2.7', 'AAA', 'manual', 'Extended Audio Description (Prerecorded)', 'Өргөтгөсөн аудио тайлбар (бичлэг)'),
  C('1.2.8', 'AAA', 'manual', 'Media Alternative (Prerecorded)', 'Медиа хувилбар (бичлэг)'),
  C('1.2.9', 'AAA', 'manual', 'Audio-only (Live)', 'Зөвхөн аудио (шууд)'),
  C('1.3.1', 'A', 'partial', 'Info and Relationships', 'Мэдээлэл ба хамаарал'),
  C('1.3.2', 'A', 'manual', 'Meaningful Sequence', 'Утга бүхий дараалал'),
  C('1.3.3', 'A', 'manual', 'Sensory Characteristics', 'Мэдрэхүйн шинж'),
  C('1.3.4', 'AA', 'partial', 'Orientation', 'Чиглэл (босоо/хэвтээ)'),
  C('1.3.5', 'AA', 'partial', 'Identify Input Purpose', 'Оролтын зорилгыг тодорхойлох'),
  C('1.3.6', 'AAA', 'manual', 'Identify Purpose', 'Зорилгыг тодорхойлох'),
  C('1.4.1', 'A', 'partial', 'Use of Color', 'Өнгөний хэрэглээ'),
  C('1.4.2', 'A', 'partial', 'Audio Control', 'Аудио удирдлага'),
  C('1.4.3', 'AA', 'auto', 'Contrast (Minimum)', 'Тодрол (доод)'),
  C('1.4.4', 'AA', 'partial', 'Resize Text', 'Текстийн хэмжээ өөрчлөх'),
  C('1.4.5', 'AA', 'manual', 'Images of Text', 'Текстэн зураг'),
  C('1.4.6', 'AAA', 'auto', 'Contrast (Enhanced)', 'Тодрол (сайжруулсан)'),
  C('1.4.7', 'AAA', 'manual', 'Low or No Background Audio', 'Арын дуу бага эсвэл байхгүй'),
  C('1.4.8', 'AAA', 'partial', 'Visual Presentation', 'Харагдах байдал'),
  C('1.4.9', 'AAA', 'manual', 'Images of Text (No Exception)', 'Текстэн зураг (үл хамаарах заалтгүй)'),
  C('1.4.10', 'AA', 'partial', 'Reflow', 'Дахин байрлалт (320px)'),
  C('1.4.11', 'AA', 'partial', 'Non-text Contrast', 'Текст бус тодрол'),
  C('1.4.12', 'AA', 'partial', 'Text Spacing', 'Текстийн зай'),
  C('1.4.13', 'AA', 'manual', 'Content on Hover or Focus', 'Hover/фокус дээр гарах контент'),
  // 2. Удирдах боломжтой (Operable)
  C('2.1.1', 'A', 'partial', 'Keyboard', 'Гар'),
  C('2.1.2', 'A', 'manual', 'No Keyboard Trap', 'Гарын хавх байхгүй'),
  C('2.1.3', 'AAA', 'manual', 'Keyboard (No Exception)', 'Гар (үл хамаарах заалтгүй)'),
  C('2.1.4', 'A', 'manual', 'Character Key Shortcuts', 'Нэг тэмдэгтийн товчлол'),
  C('2.2.1', 'A', 'partial', 'Timing Adjustable', 'Хугацааг тохируулах'),
  C('2.2.2', 'A', 'partial', 'Pause, Stop, Hide', 'Түр зогсоох, зогсоох, нуух'),
  C('2.2.3', 'AAA', 'manual', 'No Timing', 'Хугацааны хязгааргүй'),
  C('2.2.4', 'AAA', 'manual', 'Interruptions', 'Тасалдал'),
  C('2.2.5', 'AAA', 'manual', 'Re-authenticating', 'Дахин нэвтрэх'),
  C('2.2.6', 'AAA', 'manual', 'Timeouts', 'Хугацаа дуусах анхааруулга'),
  C('2.3.1', 'A', 'manual', 'Three Flashes or Below Threshold', 'Гурван анивчилт эсвэл босгоос доош'),
  C('2.3.2', 'AAA', 'manual', 'Three Flashes', 'Гурван анивчилт'),
  C('2.3.3', 'AAA', 'partial', 'Animation from Interactions', 'Харилцан үйлдлийн хөдөлгөөн'),
  C('2.4.1', 'A', 'auto', 'Bypass Blocks', 'Блок алгасах'),
  C('2.4.2', 'A', 'auto', 'Page Titled', 'Хуудасны гарчиг'),
  C('2.4.3', 'A', 'partial', 'Focus Order', 'Фокусын дараалал'),
  C('2.4.4', 'A', 'partial', 'Link Purpose (In Context)', 'Холбоосын зорилго (контекстэд)'),
  C('2.4.5', 'AA', 'manual', 'Multiple Ways', 'Олон арга зам'),
  C('2.4.6', 'AA', 'partial', 'Headings and Labels', 'Гарчиг ба шошго'),
  C('2.4.7', 'AA', 'partial', 'Focus Visible', 'Фокус харагдах'),
  C('2.4.8', 'AAA', 'manual', 'Location', 'Байршил'),
  C('2.4.9', 'AAA', 'partial', 'Link Purpose (Link Only)', 'Холбоосын зорилго (зөвхөн холбоос)'),
  C('2.4.10', 'AAA', 'partial', 'Section Headings', 'Хэсгийн гарчиг'),
  C('2.4.11', 'AA', 'partial', 'Focus Not Obscured (Minimum)', 'Фокус далдлагдахгүй (доод)', { new22: true }),
  C('2.4.12', 'AAA', 'partial', 'Focus Not Obscured (Enhanced)', 'Фокус далдлагдахгүй (сайжруулсан)', { new22: true }),
  C('2.4.13', 'AAA', 'partial', 'Focus Appearance', 'Фокусын дүр төрх', { new22: true }),
  C('2.5.1', 'A', 'manual', 'Pointer Gestures', 'Заагчийн дохио зангаа'),
  C('2.5.2', 'A', 'manual', 'Pointer Cancellation', 'Заагчийн үйлдэл цуцлах'),
  C('2.5.3', 'A', 'auto', 'Label in Name', 'Нэрэнд шошго агуулагдах'),
  C('2.5.4', 'A', 'manual', 'Motion Actuation', 'Хөдөлгөөнөөр идэвхжүүлэх'),
  C('2.5.5', 'AAA', 'auto', 'Target Size (Enhanced)', 'Товшилтын хэмжээ (сайжруулсан, 44px)'),
  C('2.5.6', 'AAA', 'manual', 'Concurrent Input Mechanisms', 'Зэрэгцээ оролтын механизм'),
  C('2.5.7', 'AA', 'partial', 'Dragging Movements', 'Чирэх хөдөлгөөн', { new22: true }),
  C('2.5.8', 'AA', 'auto', 'Target Size (Minimum)', 'Товшилтын хэмжээ (доод, 24px)', { new22: true }),
  // 3. Ойлгомжтой (Understandable)
  C('3.1.1', 'A', 'auto', 'Language of Page', 'Хуудасны хэл'),
  C('3.1.2', 'AA', 'partial', 'Language of Parts', 'Хэсгийн хэл'),
  C('3.1.3', 'AAA', 'manual', 'Unusual Words', 'Ер бусын үг'),
  C('3.1.4', 'AAA', 'partial', 'Abbreviations', 'Товчлол'),
  C('3.1.5', 'AAA', 'manual', 'Reading Level', 'Уншлагын түвшин'),
  C('3.1.6', 'AAA', 'manual', 'Pronunciation', 'Дуудлага'),
  C('3.2.1', 'A', 'manual', 'On Focus', 'Фокус авахад'),
  C('3.2.2', 'A', 'partial', 'On Input', 'Оролт хийхэд'),
  C('3.2.3', 'AA', 'manual', 'Consistent Navigation', 'Тогтвортой навигаци'),
  C('3.2.4', 'AA', 'manual', 'Consistent Identification', 'Тогтвортой тодорхойлолт'),
  C('3.2.5', 'AAA', 'partial', 'Change on Request', 'Хүсэлтээр өөрчлөх'),
  C('3.2.6', 'A', 'partial', 'Consistent Help', 'Тогтвортой тусламж', { new22: true }),
  C('3.3.1', 'A', 'partial', 'Error Identification', 'Алдааг тодорхойлох'),
  C('3.3.2', 'A', 'partial', 'Labels or Instructions', 'Шошго эсвэл заавар'),
  C('3.3.3', 'AA', 'manual', 'Error Suggestion', 'Алдааны зөвлөмж'),
  C('3.3.4', 'AA', 'manual', 'Error Prevention (Legal, Financial, Data)', 'Алдаанаас сэргийлэх (хууль, санхүү, өгөгдөл)'),
  C('3.3.5', 'AAA', 'manual', 'Help', 'Тусламж'),
  C('3.3.6', 'AAA', 'manual', 'Error Prevention (All)', 'Алдаанаас сэргийлэх (бүгд)'),
  C('3.3.7', 'A', 'manual', 'Redundant Entry', 'Давхардсан оруулга', { new22: true }),
  C('3.3.8', 'AA', 'partial', 'Accessible Authentication (Minimum)', 'Хүртээмжтэй нэвтрэлт (доод)', { new22: true }),
  C('3.3.9', 'AAA', 'partial', 'Accessible Authentication (Enhanced)', 'Хүртээмжтэй нэвтрэлт (сайжруулсан)', { new22: true }),
  // 4. Бат бөх (Robust)
  C('4.1.2', 'A', 'auto', 'Name, Role, Value', 'Нэр, үүрэг, утга'),
  C('4.1.3', 'AA', 'partial', 'Status Messages', 'Төлөвийн мессеж'),
];

export const CRITERIA_BY_ID = Object.fromEntries(CRITERIA.map((c) => [c.id, c]));

const LEVEL_RANK = { A: 1, AA: 2, AAA: 3 };

/** Тухайн зорилтот түвшинд (A | AA | AAA) хамаарах шалгууруудыг буцаана. */
export function criteriaForLevel(level = 'AA') {
  const max = LEVEL_RANK[level] || 2;
  return CRITERIA.filter((c) => LEVEL_RANK[c.level] <= max);
}

export function levelIncludes(target, scLevel) {
  return LEVEL_RANK[scLevel] <= (LEVEL_RANK[target] || 2);
}

export const PRINCIPLES = {
  1: { en: 'Perceivable', mn: 'Мэдрэгдэхүйц' },
  2: { en: 'Operable', mn: 'Удирдах боломжтой' },
  3: { en: 'Understandable', mn: 'Ойлгомжтой' },
  4: { en: 'Robust', mn: 'Бат бөх' },
};
