# Хүртээмж (hurteemj) — WCAG 2.2 plugin

Энэ plugin нь вэб сайтыг WCAG 2.2 (ISO/IEC 40500) шаардлагаар шалгаж, эрсдэлгүй алдааг засаж, хэрэглэгчид сайтыг өөрт тааруулах самбар өгнө. Ямар ч системд нэг мөр кодоор холбогдоно.

```html
<script src="hurteemj.min.js" data-fix="safe" defer></script>
```

> **Санамж.** Энэ хэрэгсэл WCAG-д бүрэн нийцүүлнэ гэсэн баталгаа **биш**. Ямар ч автомат хэрэгсэл бүх асуудлыг илрүүлж чаддаггүй. Plugin нь зөрчлийг олж, аюулгүй засвар хийж, гараар шалгах зүйлсийг жагсаана. Эцсийн засвар эх кодонд хийгдэх ёстой. Үндэслэлийг [docs/RESEARCH.md](docs/RESEARCH.md)-ээс уншина уу.

## Юу хийдэг вэ

| Давхарга | Тайлбар |
|---|---|
| **1. Аудит** | 65 дүрэм, WCAG 2.2-ын 86 шалгуурын 47-д нь автомат шалгалттай. 9 шинэ шалгуурын 7-г хамардаг: Focus Not Obscured, Target Size 24px (spacing exception-тэй), Accessible Authentication (бодит paste туршилт), Consistent Help, Dragging Movements, Focus Appearance. Үр дүнг `fail` ба `review` гэж ялгана |
| **2. Засвар** | `safe` горим: lang, viewport zoom, skip link, 2.4.13 фокусын тойм, sticky header-ийн ард фокус далдлагдахаас хамгаалах, `role=status`, `aria-required` г.м. `heuristic` горим: icon-оос нэр таах, брэндийн өнгийг хадгалсан тодролын засвар, `div[onclick]`-т гарын дэмжлэг. Бүх засвар бүртгэгдэж, `revert()`-оор буцаагдана |
| **3. Хэрэглэгчийн самбар** | Текстийн хэмжээ, 1.4.12 текстийн зай, уншихад хялбар фонт, 4 тодролын горим, ханалт, хөдөлгөөн/GIF зогсоох, фокус тодруулах, том курсор, товч томруулах, уншлагын шугам/маск, TTS. 6 бэлэн профайлтай. Самбар өөрөө WCAG 2.2 AA-г хангаж, axe-core-оор шалгагддаг |
| **4. Тайлан** | Самбар доторх хөгжүүлэгчийн тайлан, JSON экспорт, `reportEndpoint` мониторинг, CLI (text/json/html/md), CI-д exit code |

## Хурдан эхлэх

```bash
npm install
npm run build        # dist/hurteemj.min.js (~49KB gzip), dist/hurteemj.esm.js
npm test             # 18 тест: unit + Playwright/Chromium + axe-core хөндлөн шалгалт
```

```js
import { init } from 'hurteemj';
const hj = init({ level: 'AA', fix: 'safe', uiLang: 'mn', statementUrl: '/accessibility' });
```

```bash
npx hurteemj-audit https://example.mn --fail-on serious --format html --out report.html
```

## Интеграц

`<script>` · npm/ESM · React/Next.js · Vue/Nuxt · Angular/Svelte · Web Component · WordPress · Drupal · Joomla · Shopify · GTM · Laravel · Django · ASP.NET · GitHub Actions/GitLab CI · CSP nonce. Дэлгэрэнгүйг [docs/INTEGRATION.md](docs/INTEGRATION.md)-ээс уншина уу.

## API

| | |
|---|---|
| `init(config)` | Эхлүүлнэ, API буцаана (давхар дуудахад ижил instance буцаана) |
| `api.audit({ deep })` | Дахин шалгаж тайлан буцаана |
| `api.fix({ tier, ids })` | Засвар хэрэглэнэ |
| `api.revert(ruleId?)` | Засварыг буцаана |
| `api.report` / `api.toJSON()` | Сүүлийн тайлан |
| `api.prefs.get/set/reset/applyProfile` | Хэрэглэгчийн тохиргоо |
| `api.open/close/toggle()` | Самбар |
| `api.announce(text, 'polite'\|'assertive')` | Дэлгэц уншигчид зарлах |
| `api.destroy()` | Бүгдийг цэвэрлэнэ |
| `auditPage(config)` | Зөвхөн аудит хийнэ (виджет, засваргүй) |
| `criteria`, `rules` | WCAG 2.2 каталог, дүрмийн жагсаалт |

Дүрэм бүрийн SC, нөлөөлөл, засварын түвшинг [docs/RULES.md](docs/RULES.md)-ээс харна уу (`node scripts/gen-docs.js` кодоос автоматаар үүсгэнэ).

## Нарийн тохиргоо

```js
init({
  level: 'AA',                         // A | AA | AAA (AAA: 7:1 тодрол, 44px target)
  fix: 'safe',                         // false | 'safe' | 'heuristic'
  only: ['2.4.11', 'target-size'],     // зөвхөн эдгээр SC/дүрэм
  rules: {
    'color-contrast': { fix: 'heuristic' },   // дүрэм тус бүрийн засварын түвшин
    'link-purpose': false,                    // унтраах
    'target-size': { impact: 'minor' },       // нөлөөллийг өөрчлөх
  },
  ignore: ['.ads', '#third-party-chat'],
  altTextProvider: async (src, img, lang) => myCaptionApi(src, lang), // AI alt (хүн хянах)
  reportEndpoint: '/api/a11y', reportSampleRate: 0.2,
  storage: 'cookie', cookieDomain: '.gov.mn',  // дэд домэйн хооронд тохиргоо хуваалцах
  profiles: ['lowVision', 'dyslexia', 'seizure'],
  strings: { mn: { title: 'Хялбар хандалт' } },
  nonce: '…', respectOS: true, observe: true, deep: false,
});
```

## Бүтэц

```
src/
  wcag/criteria.js     WCAG 2.2-ын 86 SC (mn/en, түвшин, автоматжилт)
  wcag/aria.js         WAI-ARIA 1.2 өгөгдөл
  rules/*.js           65 дүрэм (structure, media, contrast, forms, interaction, aria)
  core/engine.js       аудит, засвар, тайлан
  core/color.js        WCAG luminance, alpha blend, OKLab тодролын засвар
  core/dom.js          accessible name, role, visibility, shadow DOM
  fix/changes.js       буцаах боломжтой өөрчлөлтийн бүртгэл
  fix/runtime.js       фокусын тойм, focus guard, live region
  prefs/preferences.js хэрэглэгчийн тохиргоо, профайл
  ui/widget.js         самбар (Shadow DOM)
cli/audit.js           CI/CD аудит (Playwright)
integrations/          react, vue, web-component, wordpress
examples/              demo, csp, web-component, report-server
docs/                  RESEARCH, INTEGRATION, RULES
```

## Лиценз
MIT
