# Интеграцын гарын авлага

Хүртээмж нь хамааралгүй ганц JavaScript файл тул серверийн технологиос үл хамааран ажиллана. Доорх жишээнүүдэд `hurteemj.min.js`-ийг өөрийн сервер эсвэл CDN-ээс үйлчилнэ гэж үзсэн.

## 1. Ганц мөр (бүх төрлийн сайт)

```html
<script src="/assets/hurteemj.min.js" data-fix="safe" data-statement-url="/accessibility" defer></script>
```

| `data-*` атрибут | Утга | Анхдагч |
|---|---|---|
| `data-level` | `A` / `AA` / `AAA` | `AA` |
| `data-fix` | `false` / `safe` / `heuristic` | `safe` |
| `data-ui-lang` | `mn` / `en` | хуудасны `lang` |
| `data-languages` | `mn,en` | `mn,en` |
| `data-lang` | `<html lang>` байхгүй үед тохируулах хэл | — |
| `data-position` | `bottom-right` / `bottom-left` / `top-right` / `top-left` | `bottom-right` |
| `data-color` | Брэндийн өнгө (тодрол хүрэлцэхгүй бол автоматаар бараан болно) | `#0b4bd1` |
| `data-launcher` | `false` — өөрийн товч ашиглах | `true` |
| `data-widget` | `false` — зөвхөн аудит/засвар | `true` |
| `data-auditor` | `true` — самбарт хөгжүүлэгчийн тайлан (эсвэл URL-д `?hurteemj-audit`) | `false` |
| `data-ignore` | `.ads,#chat` | — |
| `data-report-endpoint` | Тайлан POST хийх URL | — |
| `data-statement-url`, `data-feedback-url` | Хүртээмжийн мэдэгдэл, санал хүсэлт | — |
| `data-shortcut` | `alt+shift+a` | `alt+shift+a` |
| `data-storage` | `local` / `cookie` / `false` | `local` |
| `data-deep` | 1.4.12 текстийн зайн бодит туршилт | `false` |
| `data-nonce` | CSP nonce (`<script nonce>`-оос автоматаар авна) | — |
| `data-report-sample-rate` | Тайлан илгээх магадлал 0–1 | `1` |
| `data-offset-x`, `data-offset-y` | Launcher-ийн зай (px) | `16` |

Буруу утга (жишээ нь `data-level="B"`) plugin-ийг унагахгүй: анхдагч руу буцаж `console.warn` хийгдэнэ, `api.config.warnings`-д жагсаана.
| `data-track-listeners` | `addEventListener('click')`-ийг ажиглах (2.1.1) | — |
| `data-auto` | `false` — автоматаар эхлүүлэхгүй | `true` |

Нарийн тохиргоог `window.HurteemjConfig`-оор өгнө (script-ээс өмнө):

```html
<script>
  window.HurteemjConfig = {
    rules: { 'color-contrast': { fix: false }, 'target-size': { impact: 'minor' }, 'consistent-help': false },
    ignore: ['.third-party-chat'],
    defaults: { fontScale: 1.1 },            // анхны хэрэглэгчийн тохиргоо
    altTextProvider: async (src, img, lang) => (await fetch('/api/alt?src=' + encodeURIComponent(src))).text(),
    onReport: (r) => console.log(r.summary),
    onPrefsChange: (prefs) => fetch('/api/me/a11y', { method: 'PUT', body: JSON.stringify(prefs) }),
  };
</script>
```

## 2. npm / ES module

```js
import { init } from 'hurteemj';
const hj = init({ level: 'AA', fix: 'safe', uiLang: 'mn' });

document.addEventListener('hurteemj:audit', (e) => console.log(e.detail.summary));
await hj.audit({ deep: true });   // дахин шалгах
hj.fix({ tier: 'heuristic' });     // нэмэлт засвар
hj.revert('color-contrast');       // нэг дүрмийн засварыг буцаах
hj.prefs.applyProfile('dyslexia');
hj.toJSON();                       // node-гүй JSON тайлан
```

## 3. React / Next.js

```jsx
'use client';
import { HurteemjProvider, HurteemjButton } from 'hurteemj/react';

export default function Layout({ children }) {
  return <HurteemjProvider config={{ fix: 'safe', launcher: false }}>
    <header><HurteemjButton className="nav-btn">Хүртээмж</HurteemjButton></header>
    {children}
  </HurteemjProvider>;
}
```
Route солигдоход (`pushState`) автоматаар дахин шалгана.

## 4. Vue 3 / Nuxt

```js
import Hurteemj from 'hurteemj/vue';
app.use(Hurteemj, { level: 'AA', fix: 'safe' });
```
Nuxt: `plugins/hurteemj.client.js` файлд дээрхийг бичнэ.

## 5. Angular / Svelte / бусад SPA

```ts
// main.ts
import { init } from 'hurteemj';
init({ fix: 'safe' });
```

## 6. Web Component

```html
<script type="module" src="/node_modules/hurteemj/integrations/web-component/index.js"></script>
<hurteemj-widget level="AA" fix="safe" ui-lang="mn" color="#004b8d"></hurteemj-widget>
```

## 7. CMS ба платформууд

| Платформ | Хаана | Код |
|---|---|---|
| **WordPress** | `integrations/wordpress/hurteemj` plugin | Settings → Хүртээмж (WCAG) |
| **Drupal** | `html.html.twig` эсвэл `*.libraries.yml` | `<script src="…/hurteemj.min.js" defer></script>` |
| **Joomla** | Template `index.php`, `</head>`-ээс өмнө | дээрхтэй ижил |
| **Shopify** | `layout/theme.liquid` | `<script src="{{ 'hurteemj.min.js' \| asset_url }}" defer></script>` |
| **Google Tag Manager** | Custom HTML tag, All Pages | `<script src="https://cdn.example.mn/hurteemj.min.js" data-fix="safe"></script>` |
| **Laravel / Blade** | `layouts/app.blade.php` | `<script src="{{ asset('js/hurteemj.min.js') }}" data-ui-lang="{{ app()->getLocale() }}" defer></script>` |
| **Django** | `base.html` | `<script src="{% static 'hurteemj.min.js' %}" defer></script>` |
| **ASP.NET** | `_Layout.cshtml` | `<script src="~/js/hurteemj.min.js" asp-append-version="true" defer></script>` |

> GTM зарим тохиолдолд `data-*` атрибутыг хадгалдаггүй тул `window.HurteemjConfig`-оор тохируулах нь найдвартай.

## 8. Content-Security-Policy

Plugin нь `<style>` элемент үүсгэдэг. `style-src`-д `'unsafe-inline'` байхгүй бол nonce өгнө:

```html
<script src="/hurteemj.min.js" nonce="{{ nonce }}" defer></script>
```
`<script nonce>`-ийн утгыг автоматаар бүх `<style>`-д өвлүүлнэ. Inline `style=""` атрибут ашигладаггүй (CSSOM-оор тохируулдаг) тул хатуу CSP-д алдаа гарахгүй — `examples/csp.html`-ээр тестэлсэн.

## 9. CI/CD — хүртээмжийн regression-ийг зогсоох

```yaml
# .github/workflows/a11y.yml
name: a11y
on: [pull_request]
jobs:
  wcag:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npm run build && npm run preview &   # өөрийн сайтыг асаах
      - run: npx hurteemj-audit http://localhost:4173 http://localhost:4173/login --fail-on serious --format md --out a11y.md
      - run: npx hurteemj-audit http://localhost:4173 --viewport 320x640 --fail-on serious   # 1.4.10 Reflow
```

Exit code: `0` — босгоос дээш зөрчилгүй, `1` — зөрчилтэй, `2` — ажиллуулах алдаа.

## 10. Тайлан хүлээн авах (мониторинг)

`data-report-endpoint="https://api.example.mn/a11y-report"` тохируулбал хуудас ачаалагдах бүрт болон SPA навигаци бүрт (эсвэл `reportSampleRate: 0.1` — 10%) JSON тайланг `sendBeacon`-оор илгээнэ. Жишээ хүлээн авагч: `examples/report-server.js`.

**Хувийн мэдээлэл:** тайланд DOM node болон оролтын `value` ордоггүй, гэхдээ элементийн нээлтийн tag (`html`), selector, мессеж доторх alt/холбоосын текст зэрэг **хуудасны контентын хэсэг** ордог. Нэвтэрсэн хэрэглэгчийн хуудаснаас тайлан авахдаа `onReport` hook-оор шүүх эсвэл `reportSampleRate`-ийг багасгахыг зөвлөж байна.

## 11. Үйл явдлууд (events)

| Event | `detail` |
|---|---|
| `hurteemj:ready` | API объект |
| `hurteemj:audit` | Тайлан |
| `hurteemj:fix` | `{ fixed, report }` |
| `hurteemj:prefs` | `{ prefs, patch }` |
