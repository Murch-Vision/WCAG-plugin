# Хяналт, дахин өөрчлөлт (refactor), сайжруулалтын санал

*Огноо: 2026-11-04. Эхний хувилбарын (commit `eeae739`) кодыг бүхэлд нь хянаж, илэрсэн алдааг засаж, бүтцийг сайжруулсан. Доорх хүснэгтэд засагдсан зүйл бүр regression тесттэй.*

## 1. Засагдсан алдаанууд

| # | Хүнд байдал | Асуудал | Засвар | Тест |
|---|---|---|---|---|
| 1 | **Өндөр** | 3.3.8-ын paste туршилт (`accessible-auth-paste`) сайтын handler-ыг дуудахдаа талбарын утгыг устгаж болзошгүй байсан (жишээ нь handler `value = ''` хийдэг бол). SPA-д дахин аудит хийх үед хэрэглэгчийн бичсэн нууц үг арилах эрсдэлтэй. | Зөвхөн **хоосон, фокусгүй** талбарт туршилт хийнэ; засагдсан элементийг `data-hj-fixed`-ээр тэмдэглэж дахин туршихгүй. | `regression: Paste probe` |
| 2 | **Өндөр** | Давхар засвар: paste-ийн хамгаалалт идэвхтэй үед дараагийн аудит дахин "хориглогдсон" гэж үзэж **шинэ listener нэмж** байсан (санах ойн алдагдал + олдвор давхардал). | `ChangeLog.mark()` / `isFixedBy()` нэмж, засвар idempotent болгов. | `regression: Paste probe` |
| 3 | **Өндөр** | `revert(ruleId)` (нэг дүрмийн засварыг буцаах) `data-hj-fixed` тэмдэглэгээг цэвэрлэдэггүй байсан тул дараагийн аудит тухайн элементийг "засагдсан" гэж буруу үзнэ. | `mark` бичлэг `ruleId`-тай болж, хэсэгчилсэн revert зөвхөн тэр дүрмийг тэмдэглэгээнээс хасна. | `regression: Paste probe` (revert хэсэг) |
| 4 | **Дунд** | SPA хэсэгчилсэн аудит (`MutationObserver`) ижил элементийн олдворыг **давхардуулж** тайланд нэмдэг байсан. | `mergeFindings()`: (дүрэм, selector) түлхүүрээр нэгтгэж, устсан элементийн олдворыг хаяна, шинэ төлөв (засагдсан) хуучныг орлоно. | `regression: mergeFindings`, `unit: mergeFindings` |
| 5 | **Дунд** | `status-messages` (4.1.3) хуудас ачаалахад **аль хэдийн байсан** `.alert`/`.toast` элементийг зөрчил гэж үзэж `role="status"` нэмээд дэлгэц уншигчид зарлуулдаг байсан — статик мэдээллийн хайрцагт худал эерэг, дуу чимээ. | Статик = `review`; зөвхөн MutationObserver-ээр **шинээр нэмэгдсэн** элемент = `fail` + засвар. | `regression: Статик мэдэгдэл` |
| 6 | **Дунд** | Тайлангийн `data` талбарт DOM node (`container`) үлдэж, `reportEndpoint` руу илгээхэд `{}` болж, `onReport`-д DOM leak үүсгэж байсан. | `serialize()` node/функцийг цэвэрлэнэ; байхгүй хэлний мессеж англи руу буцна. | `unit: serialize`, `regression: toJSON` |
| 7 | **Дунд** | `localStorage`-д гэмтсэн/хортой утга байвал (`fontScale: "abc"`, танигдахгүй түлхүүр) хэмжээ `NaNpx` болж, тохиргоо эвдэрнэ. | `sanitizePrefs()`: зөвхөн мэдэгдэж буй түлхүүр, enum утга, 1–2 хязгаар. | `unit: sanitizePrefs`, `regression: localStorage` |
| 8 | **Дунд** | Тохиргооны буруу утга (`level: 'B'`, `fix: 'magic'`, `position: 'center'`) шалгагддаггүй, тайланд буруу утга орж, зарим тохиолдолд UI эвдэрч байсан. | `normalizeConfig()`: бүх утгыг шалгаж анхдагч руу буцаана, `config.warnings`-д бүртгэж `console.warn` хийнэ. | `unit: normalizeConfig`, `regression: Буруу тохиргоо` |
| 9 | **Дунд** | Самбар хаахад фокус **үргэлж launcher** руу очдог байсан. Хуудасны өөрийн товч (`data-hurteemj-open`) эсвэл товчлолоор нээсэн бол ARIA dialog зарчмаар нээхээс өмнөх элемент рүү буцах ёстой (2.4.3). | Нээхээс өмнөх элементийг хадгалж буцаана; байхгүй бол launcher. | `regression: Самбар хаахад фокус` |
| 10 | **Дунд** | `<html lang>` байхгүй, `config.lang` өгөөгүй үед хуудасны хэл **"mn"** гэж таамаглаж, англи сайтад монгол skip link, icon нэр өгч байсан. | Дараалал: `<html lang>` → `config.lang` → текстээс таах → UI хэл. | — (структурын өөрчлөлт) |
| 11 | **Бага** | `target-size` (2.5.8) spacing exception нь O(n²) — 3000+ target-тай хуудсанд удаан. | 48px торон индекс → O(n) орчим. | Гүйцэтгэлийн хэмжилт |
| 11b | **Дунд** | `cssPath()` олдвор бүрт `:nth-of-type` тооцохдоо эцгийн бүх хүүхдийг дахин тоолдог (O(ах дүүсийн тоо)). 1500 article × 2 товчтой хуудсанд `target-size` 727ms, `link-purpose` 401ms. | Аудит бүрт нэг удаагийн sibling/ID кэш (`createPathCache`). Нийт аудит **1552ms → 571ms**; `target-size` 727 → 83ms. Тайланд `timings` (дүрэм бүрийн ms) нэмэгдэв. | Гүйцэтгэлийн хэмжилт (9000 элемент) |
| 12 | **Бага** | SPA навигацийн дараа `reportEndpoint` руу тайлан явдаггүй; `prefs.refresh` root бүрт давтан дуудагдаж font-size-ийг олон удаа дахин хэмждэг байсан. | Навигаци бүрт тайлан илгээнэ; `refresh` нэг удаа. | — |
| 13 | **Бага** | CLI `--fix` сонголт дараагийн URL-ыг утга болгон залгидаг; танигдахгүй `--flag`, буруу `--level` чимээгүй өнгөрдөг; `--fix` өгсөн ч засагдсан олдвор CI босгонд тоологддог байсан. | Аргументын шалгалт, exit 2; засагдсан олдворыг тооцохгүй. | CI smoke |
| 14 | **Бага** | WordPress: `wp_enqueue_script` `strategy` параметр нь WP 6.3+ шаарддаг ч `Requires at least: 6.0` гэсэн; `sanitize_hex_color()` зарим контекстэд тодорхойлогдоогүй байж болно. | 6.3; regex-ээр шалгана. | — |
| 15 | **Бага** | `destroy()` SPA ажиглагчийн таймеруудыг цэвэрлэдэггүй. | `observer.destroy()` бүх таймер, hook-ийг буцаана. | `regression: destroy()` |

## 1b. Бие даасан хяналтын (2-р шат) олдворууд

Кодыг бичсэн хүнээс хамааралгүй, зөвхөн эх кодыг уншсан хоёр дахь хянагч 16 олдвор гаргасан. 3 нь 1-р шатанд аль хэдийн засагдсан байв (#2, #8/paste давхардал, #14/WP 6.3, #15/destroy таймер). Үлдсэн 13-ыг шалгаж бүгдийг зассан:

| # | Хүнд байдал | Асуудал | Засвар | Тест |
|---|---|---|---|---|
| R1 | **Өндөр** | `focus-visible` дүрэм CSS дүрэм бүрийг тусад нь үнэлдэг тул зөвлөмжийн загвар болох `button:focus{outline:none}` + `button:focus-visible{outline:…}` эсвэл `:focus:not(:focus-visible){outline:none}`-ийг **зөрчил** гэж үзээд safe засвар нь сайтын өөрийн фокусын загвар дээр глобал `!important` тойм давхарлаж байсан. | `:not(:focus-visible)` сонгогчийг алгасна; `:focus-visible` дээр тэмдэглэгээ өгсөн суурь сонгогчдыг цуглуулж, ижил суурьтай `:focus{outline:none}`-ийг зөв загвар гэж үзнэ. Сайт хаа нэгтээ `:focus-visible` ашигладаг бол fail биш review. | `review: focus-visible` |
| R2 | **Өндөр** | `click-without-keyboard`: event delegation container (React 17+ `#root`, jQuery `.on('click', sel)`) бүртгэгдсэн listener-тэй тул **critical** зөрчил болж, heuristic засвар `#root`-д `role="button"` өгч апп бүхэлдээ нэг товч болж байсан. | Дотроо идэвхтэй элемент, 5-аас олон хүүхэд эсвэл 120+ тэмдэгт тексттэй элементийг control гэж үзэхгүй. Listener tracker зөвхөн `click`-ийг бүртгэнэ (pointerdown/touchstart нь чирэх, swipe container-т түгээмэл). | `review: click-without-keyboard` |
| R3 | **Өндөр** | `widget.refresh()` SPA шинэчлэлт бүрт самбарыг дахин зурж, фокус хуудсанд байсан ч самбарын гарчиг руу **фокус булааж** байсан (хэрэглэгч хайлтын талбарт бичиж байхад). | Фокус самбар дотор байсан үед л сэргээнэ. | `review: Самбар нээлттэй байхад` |
| R4 | **Өндөр** | `backgroundOf()`: `pointer-events:none` эсвэл мөр хоорондын цэгт `elementsFromPoint` элементийг өөрийг нь буцаахгүй үед түүний болон завсрын эцгүүдийн дэвсгэрийг алгасаж, хар дэвсгэр дээрх цагаан текстийг **1:1** гэж үзээд heuristic засвар саарал болгож байсан. | Hit-test-д ороогүй `el → hit[idx]` хүртэлх эцгийн гинжийг стекийн өмнө нэмнэ. `ownerDocument`/`defaultView` ашиглаж iframe-д зөв. | `review: color-contrast pointer-events` |
| R5 | **Дунд** | `applyFixes` олдворын төлвийг (fail/review) үл харгалзан засвар хийдэг тул safe горимд `<video autoplay muted loop>` (review) дээр `controls` нэмэх, 3.8:1 хувилбартай холбоост доогуур зураас албадах зэрэг **нийцтэй хуудсыг** өөрчилж байсан. | Хөдөлгүүрт: review олдворт зөвхөн `fix.onReview: true` засвар хэрэглэгдэнэ (7 дүрэм: landmark-main, bypass, link-purpose, autocomplete-purpose, lang-of-parts, svg-img-name, accessible-auth-autocomplete). | `review: Safe засвар` |
| R6 | **Дунд** | `aria-hidden-focus` heuristic засвар modal нээлттэй үед (MUI, react-modal, a11y-dialog загвар) апп-ын `#root`-оос `aria-hidden`-ыг хууулж, off-canvas drawer-ыг дэлгэц уншигчид ил болгож байсан. | Modal нээлттэй бол review; дэлгэцийн гадна байгаа container-т `aria-hidden` хэвээр, доторх элементийг `tabindex="-1"`. | `review: aria-hidden-focus` |
| R7 | **Дунд** | `link-purpose` засвар container доторх **эхний** гарчгийг авдаг тул хуваалцсан хэсэгт B картын "Дэлгэрэнгүй" холбоос A картын гарчигтай болж байсан — өмнөхөөс дор. | Холбоосын өмнө байрлах хамгийн ойрын гарчиг (`compareDocumentPosition`). | `review: link-purpose` |
| R9 | **Дунд** | `data-lang=""`, `data-only=""`, `data-shortcut=""` зэрэг хоосон атрибут `true` болж `true.split`, `new Set(true)`, `sc.toLowerCase` TypeError — plugin эхлэхгүй, CLI мөнхөд хүлээнэ. | Хоосон утга зөвхөн boolean түлхүүрт `true`, бусдад "тохируулаагүй". `normalizeConfig` мөр бус утгыг анхдагч руу. | `review: Хоосон data-*` |
| R10 | **Дунд** | `destroy()`-н дараа хүлээгдэж буй навигацийн аудит ажиллаж, засваруудыг буцаах боломжгүйгээр дахин хэрэглэж байсан. | `observer.destroy()` таймеруудыг цэвэрлэнэ; `audit()`/`fix()` destroyed төлөвт юу ч хийхгүй. | `regression: destroy()` |
| R11 | **Бага** | `non-text-contrast` `<input type="file">` (UA хүрээгүй) болон box-shadow "ring"-тэй талбарыг зөрчил гэж үзээд саарал хүрээ зурж байсан. | `type=file`-ыг хасав; box-shadow/outline байвал хил хязгаартай гэж үзнэ. | `review: non-text-contrast` |
| R12 | **Бага** | `motion()` тохиргоо өөрчлөх бүрт (`fontScale +`) дахин ажиллаж, хэрэглэгчийн өөрөө тоглуулсан видео, дараа нь эхэлсэн анимацийг дахин зогсоож байсан. | Зөвхөн off→on шилжилтэд бүх хуудсыг, шинэ контентод зөвхөн тэр хэсгийг зогсооно. | `review: stopMotion` |
| R13 | **Бага** | Царцаасан GIF-ийн `<canvas>` `role="img" aria-label=""` тул plugin өөрийн элементийг `svg-img-name` зөрчил гэж олдог; чимэглэлийн GIF-д aria-hidden өгөөгүй; анхны inline `display` алдагддаг. | `data-hurteemj-ui="gif"`, alt-гүй бол `aria-hidden`, display-г хадгалж сэргээнэ; `data:image/gif` URI-г таних. | `review: stopMotion` |
| R14 | **Бага** | `NAME_REQUIRED`-д `menu`, `menubar`, `toolbar` орсон — ARIA 1.2-т нэр заавал биш тул `<ul role="menu">` худал зөрчил. | Хасав. | `review: role=menu` |
| R15 | **Бага** | `link-in-text-block` box-shadow / gradient доогуур зураасны техникийг танихгүй давхар зураас нэмж байсан. | box-shadow эсвэл background-image байвал хангасан гэж үзнэ. | `review: Safe засвар` |

Хянагч зөв гэж баталгаажуулсан хэсгүүд: `ChangeLog.revert` дараалал, Shadow DOM самбарын escape (бүх хуудаснаас ирсэн мөр `esc()`-ээр), AccName labelledby/visited, target-size геометр, viewport/meta-refresh засвар, cookie/localStorage хамгаалалт, WordPress-ийн escaping/capability/nonce.

Тестийн тоо: 30 → **40**.

## 2. Бүтцийн өөрчлөлт (refactor)

| Өмнө | Одоо | Шалтгаан |
|---|---|---|
| `src/index.js` (275 мөр): тохиргоо, ажиглагч, API, эхлүүлэлт бүгд нэг файлд | `src/core/config.js` — DEFAULTS, `configFromScript`, `normalizeConfig`<br>`src/core/observer.js` — MutationObserver + history hook<br>`src/index.js` — зөвхөн API угсралт | Тус бүрийг тусад нь тестлэх боломжтой; `index.js` 200 мөр болж уншихад хялбар |
| Тохиргоо шалгалтгүй | `normalizeConfig()` + `warnings` | Буруу тохиргоо чимээгүй алдаа үүсгэхгүй |
| `summary.fail` нь засагдсаныг ч тоолдог; самбар тусад нь тооцдог | `summary.remaining` нэмэгдэв | Нэг эх сурвалж; CLI, самбар, тайлан ижил тоо харуулна |
| TypeScript тодорхойлолт байхгүй | `types/index.d.ts` (strict горимд шалгагдана) | TS/IDE хэрэглэгчдэд autocompletion, `package.json` `exports.types` |
| `playwright` CI-д ad-hoc суудаг | `devDependencies` + lockfile | CI ба локал ижил хувилбар (1.63.0) |
| GitHub Actions `@v4` (Node 20 deprecated анхааруулга) | `checkout@v5`, `setup-node@v5`, `permissions: contents: read`, timeout, тайлангийн artifact, CLI exit code-ийн smoke тест | Анхааруулгагүй, хамгийн бага эрхтэй |
| `api.changes()` DOM node буцаадаг | `ChangeLog.summary()` — tag нэртэй, node-гүй | Тайланд JSON-оор хэвлэх боломжтой |

Тестийн тоо (1-р шат): 18 → 30 (6 unit + 7 regression нэмэгдсэн).

## 1c. Хэрэгжүүлсэн эн тэргүүний саналууд (3-р шат)

§3-ын "Эн тэргүүнд" 5 саналыг бүгдийг хэрэгжүүлсэн (тест 40 → 48):

| # | Санал | Хэрэгжилт | Тест |
|---|---|---|---|
| 1 | **ACT Rules уялдаа + EARL гаралт** | `src/wcag/act.js`: 38/65 дүрэм 53 ACT дүрэмтэй холбогдсон (ID-уудыг ACT-Rules Community Group-ийн репозиторийн файлын нэрээс баталгаажуулсан). `src/core/earl.js` → `api.toEARL()`, CLI `--format earl`: W3C EARL JSON-LD, `earl:Assertion` бүр ACT дүрэм (байхгүй бол WCAG 2.2 SC-ийн anchor) руу заана. Төлөв: fail → `failed`, review/AI → `cantTell`, олдворгүй дүрэм → `passed`, хамаарах элементгүй → `inapplicable` (`report.rulesRun`), гараар шалгах SC → `untested`. Plugin-ийн ажиллах үеийн засвар эх хуудасны үр дүнг өөрчлөхгүй (`hj:fixed`). Цэвэр fixture: 62 passed / 30 inapplicable / 21 untested. | `features: ACT`, `toEARL`, CLI smoke |
| 2 | **Гадны CSS-ийн 2.4.7 шинжилгээ** | `src/core/stylesheets.js`: CSSOM-д хаалттай (`cssRules` SecurityError) sheet-ийг `fetch(mode:'cors', cache:'force-cache')`-ээр татаж `CSSStyleSheet.replace()`-ээр задална; href-ээр кэшлэнэ; 25 файл / 1.5MB / 4с хязгаар. `focus-visible` дүрэм `ctx.sheets` ашиглана, `@import` дэмжинэ. Тохиргоо `fetchStyles` (анхдагч `true`), CLI `--no-fetch-styles`. CORS зөвшөөрөөгүй файл чимээгүй алгасагдана. | `features: Гадны CSS` (Playwright route-оор cross-origin CSS) |
| 3 | **Тодролын кэш** | `backgroundOf(el, cache)`: өөрийн дэвсгэргүй элемент эцгийнхээ "solid" (тунгалаг бус нэг өнгө) үр дүнг өвлөнө — эцгийг рекурсивээр нэг л удаа hit-test хийнэ; gradient/зураг/хагас тунгалаг эцэгтэй бол өмнөх шигээ тус тусад нь тооцно. Хэмжилт (1500 карт, 3 удаагийн хамгийн бага): дэвсгэртэй картууд **165 → 110ms**, дэвсгэргүй **100 → 71ms** — 1.4–1.5×. Саналд дурдсан 3–5× хүрээгүй: үлдсэн хугацааны дийлэнх нь hit-test биш `getComputedStyle`/`isVisible` тул дараагийн алхам нь эдгээрийг кэшлэх (§3). | `features: Тодролын кэш` ×2 |
| 4 | **AI alt-ыг "баталгаажуулах" төлөвтэй** | `altTextProvider`-ийн засвар `finding.generated = true`, `summary.generated`; самбарт "AI — баталгаажуулах" badge, CLI-д `GEN`, EARL-д `cantTell`. `revert()` төлөвийг цэвэрлэнэ. | `features: altTextProvider` |
| 5 | **`loadPrefs` hook** | `config.loadPrefs: async () => Partial<Preferences>` — эхний зурагнаас өмнө ачаалж `sanitizePrefs`-ээр шалгаад хэрэглэнэ, локал нөөцөд ч хадгална; `loadPrefsTimeout` (3с) эсвэл алдаа гарвал локал/анхдагч руу. `onPrefsChange`-тэй хослуулбал олон төхөөрөмж хооронд тохиргоо дагана. | `features: loadPrefs` |

## 3. Хэрэгжүүлээгүй сайжруулалтын санал (эрэмбэлсэн)

### Эн тэргүүнд — бүгд хэрэгжсэн (§1c)

### Дунд хугацаанд
5b. **Тодролын шалгалтыг цааш хурдасгах.** Дэвсгэрийн кэш 1.4–1.5× л өгсөн; одоо `color-contrast`-ийн хугацааны дийлэнх нь элемент бүрийн `getComputedStyle` + `isVisible` (`checkVisibility`, `getBoundingClientRect`). Нэг аудитын хүрээнд computed style-ийн кэш, харагдах байдлыг эцгээс өвлүүлэх (`display:none` эцэгтэй бол хүүхдийг шалгахгүй) замаар дахин 2× орчим боломжтой.
6. **Монгол бичгийн (ᠮᠣᠩᠭᠣᠯ) босоо текстийн дэмжлэг.** `writing-mode: vertical-lr` контентод 1.4.10 reflow, 2.5.8 target size, уншлагын шугам (хэвтээ биш босоо) тусгай логик хэрэгтэй.
7. **Орос, казах хэлний UI орчуулга.** `STRINGS`-д `ru`, `kk` нэмэх — Монголын сайтуудын хоёрдогч хэл.
8. **Браузерын extension (Chrome/Firefox).** Ижил `auditPage()` хөдөлгүүрээр ямар ч сайтыг (суулгалтгүй) шалгах. Хууль хяналтын байгууллага, аудиторт хэрэгтэй.
9. **Lighthouse/axe-core-той тогтмол харьцуулах benchmark.** Бодит 50 монгол сайт дээр худал эерэг/сөрөг харьцааг хэмжиж, дүрмийн босгыг тохируулах. Одоо зөвхөн 2 fixture дээр хөндлөн шалгадаг.
10. **`deep` горимыг шинэ dialog/popover-т автоматаар.** 1.4.12 clip шалгалт одоо зөвхөн бүтэн аудитад. Хэсэгчилсэн аудитад (modal нээгдэхэд) мөн ажиллуулах.

### Урт хугацаанд
11. **WCAG 3.0-ийн outcome-д суурилсан дүрмийн модуль.** WCAG 3.0 стандарт болоход (2027–2028) `criteria.js`-тэй зэрэгцүүлэн `outcomes.js` каталог нэмж, ижил дүрмийг хоёр стандартад зэрэг холбоно. Одоогийн `sc: []` бүтэц үүнд бэлэн.
12. **APCA тодролын сонголт.** WCAG 3.0-д орох магадлалтай APCA (Advanced Perceptual Contrast Algorithm)-г `contrastModel: 'wcag2' | 'apca'` тохиргоогоор зөвлөмжийн түвшинд нэмэх. WCAG 2.2 нийцэлд WCAG 2 томьёо хэвээр үлдэнэ.
13. **Хүний шалгалтын урсгал.** Самбарын хөгжүүлэгчийн тайланд "гараар шалгасан — хангасан/хангаагүй" гэж тэмдэглэж, `reportEndpoint`-оор илгээх. Ингэснээр тайлан нь бүрэн conformance claim-ийн эх материал болно (VPAT/ACR загвар).

## 4. Санаатайгаар хийгээгүй зүйлс
- **Дэлгэц уншигч илрүүлэх, ARIA-г бөөнөөр нэмэх** — overlay-уудын гол шүүмжлэл (docs/RESEARCH.md §2) тул хэзээ ч нэмэхгүй.
- **Хуудасны бүх өнгийг автоматаар солих** — `heuristic` горимд ч текстийн өнгийг зөвхөн зөрчилтэй элементэд, аясыг хадгалан өөрчилнө. Брэндийн дизайныг бүхэлд нь дарахгүй.
- **"WCAG нийцтэй" гэсэн баталгаа** — тайлангийн `disclaimer` болон `manual` төлөвийг хасахгүй.
