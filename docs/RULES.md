# Дүрмүүд ба WCAG 2.2 хамрах хүрээ

> Энэ файлыг `node scripts/gen-docs.js` автоматаар үүсгэнэ.

## Дүрмүүд (65)

| Дүрэм | SC | ACT Rules | Нөлөө | Автомат засвар | Тэмдэглэл |
|---|---|---|---|---|---|
| `html-lang` | 3.1.1 | [b5c3f8](https://www.w3.org/WAI/standards-guidelines/act/rules/b5c3f8/), [bf051a](https://www.w3.org/WAI/standards-guidelines/act/rules/bf051a/), [ucwvc8](https://www.w3.org/WAI/standards-guidelines/act/rules/ucwvc8/) | serious | ✅ safe | хуудасны түвшин |
| `lang-valid` | 3.1.2 | [de46e4](https://www.w3.org/WAI/standards-guidelines/act/rules/de46e4/) | serious | — | элемент бүр |
| `lang-of-parts` | 3.1.2 | — | moderate | 🟡 heuristic (review-д ч) | элемент бүр |
| `document-title` | 2.4.2 | [2779a5](https://www.w3.org/WAI/standards-guidelines/act/rules/2779a5/), [c4a8a4](https://www.w3.org/WAI/standards-guidelines/act/rules/c4a8a4/) | serious | 🟡 heuristic | хуудасны түвшин |
| `heading-order` | 1.3.1, 2.4.6 | — | moderate | — | хуудасны түвшин |
| `empty-heading` | 1.3.1, 2.4.6 | [ffd0e9](https://www.w3.org/WAI/standards-guidelines/act/rules/ffd0e9/) | serious | ✅ safe | элемент бүр |
| `list-structure` | 1.3.1 | — | serious | — | элемент бүр |
| `table-headers` | 1.3.1 | — | serious | — | элемент бүр |
| `landmark-main` | 1.3.1, 2.4.1 | [b40fd1](https://www.w3.org/WAI/standards-guidelines/act/rules/b40fd1/) | moderate | 🟡 heuristic (review-д ч) | хуудасны түвшин |
| `bypass` | 2.4.1 | [cf77f2](https://www.w3.org/WAI/standards-guidelines/act/rules/cf77f2/), [ye5d6e](https://www.w3.org/WAI/standards-guidelines/act/rules/ye5d6e/) | serious | ✅ safe (review-д ч) | хуудасны түвшин |
| `meta-viewport` | 1.4.4, 1.4.10 | [b4f0c3](https://www.w3.org/WAI/standards-guidelines/act/rules/b4f0c3/) | critical | ✅ safe | элемент бүр |
| `meta-refresh` | 2.2.1, 3.2.5 | [bc659a](https://www.w3.org/WAI/standards-guidelines/act/rules/bc659a/), [bisz58](https://www.w3.org/WAI/standards-guidelines/act/rules/bisz58/) | critical | — | элемент бүр |
| `text-spacing-important` | 1.4.12 | [24afc2](https://www.w3.org/WAI/standards-guidelines/act/rules/24afc2/), [78fd32](https://www.w3.org/WAI/standards-guidelines/act/rules/78fd32/), [9e45ec](https://www.w3.org/WAI/standards-guidelines/act/rules/9e45ec/) | serious | ✅ safe | элемент бүр |
| `text-spacing-clip` | 1.4.12 | — | serious | — | deep (DOM-ыг түр өөрчилнө) |
| `reflow` | 1.4.10 | — | serious | — | хуудасны түвшин |
| `image-alt` | 1.1.1 | [23a2a8](https://www.w3.org/WAI/standards-guidelines/act/rules/23a2a8/) | critical | ✅ safe | элемент бүр |
| `image-alt-quality` | 1.1.1 | [9eb3f6](https://www.w3.org/WAI/standards-guidelines/act/rules/9eb3f6/), [qt1vmo](https://www.w3.org/WAI/standards-guidelines/act/rules/qt1vmo/) | serious | 🟡 heuristic | элемент бүр |
| `svg-img-name` | 1.1.1 | [7d6734](https://www.w3.org/WAI/standards-guidelines/act/rules/7d6734/) | serious | ✅ safe (review-д ч) | элемент бүр |
| `input-image-alt` | 1.1.1, 4.1.2 | [59796f](https://www.w3.org/WAI/standards-guidelines/act/rules/59796f/) | critical | — | элемент бүр |
| `area-alt` | 1.1.1, 2.4.4 | — | critical | — | элемент бүр |
| `object-alt` | 1.1.1 | [8fc3b6](https://www.w3.org/WAI/standards-guidelines/act/rules/8fc3b6/) | serious | — | элемент бүр |
| `video-captions` | 1.2.2, 1.2.4 | [f51b46](https://www.w3.org/WAI/standards-guidelines/act/rules/f51b46/), [eac66b](https://www.w3.org/WAI/standards-guidelines/act/rules/eac66b/) | critical | — | элемент бүр |
| `media-alternative` | 1.2.1, 1.2.3, 1.2.5 | [1a02b0](https://www.w3.org/WAI/standards-guidelines/act/rules/1a02b0/), [c5a4ea](https://www.w3.org/WAI/standards-guidelines/act/rules/c5a4ea/), [2eb176](https://www.w3.org/WAI/standards-guidelines/act/rules/2eb176/), [e7aa44](https://www.w3.org/WAI/standards-guidelines/act/rules/e7aa44/) | serious | — | элемент бүр |
| `media-autoplay` | 1.4.2, 2.2.2 | [80f0bf](https://www.w3.org/WAI/standards-guidelines/act/rules/80f0bf/), [4c31df](https://www.w3.org/WAI/standards-guidelines/act/rules/4c31df/) | serious | ✅ safe | элемент бүр |
| `marquee-blink` | 2.2.2 | [efbfc7](https://www.w3.org/WAI/standards-guidelines/act/rules/efbfc7/) | serious | ✅ safe | элемент бүр |
| `image-of-text-hint` | 1.4.5 | — | moderate | — | элемент бүр |
| `color-contrast` | 1.4.3, 1.4.6 | [afw4f7](https://www.w3.org/WAI/standards-guidelines/act/rules/afw4f7/), [09o5cg](https://www.w3.org/WAI/standards-guidelines/act/rules/09o5cg/) | serious | 🟡 heuristic | элемент бүр |
| `link-in-text-block` | 1.4.1 | — | serious | ✅ safe | элемент бүр |
| `non-text-contrast` | 1.4.11 | — | serious | 🟡 heuristic | элемент бүр |
| `label` | 1.3.1, 3.3.2, 4.1.2 | [e086e5](https://www.w3.org/WAI/standards-guidelines/act/rules/e086e5/) | critical | ✅ safe | элемент бүр |
| `autocomplete-valid` | 1.3.5 | [73f2c2](https://www.w3.org/WAI/standards-guidelines/act/rules/73f2c2/) | serious | — | элемент бүр |
| `autocomplete-purpose` | 1.3.5 | — | moderate | 🟡 heuristic (review-д ч) | элемент бүр |
| `required-indicator` | 3.3.2, 1.3.1 | — | moderate | ✅ safe | элемент бүр |
| `error-identification` | 3.3.1, 3.3.3 | [36b590](https://www.w3.org/WAI/standards-guidelines/act/rules/36b590/) | serious | 🟡 heuristic | элемент бүр |
| `accessible-auth-paste` | 3.3.8 | — | critical | 🟡 heuristic | элемент бүр |
| `accessible-auth-autocomplete` | 3.3.8, 1.3.5 | — | serious | ✅ safe (review-д ч) | элемент бүр |
| `captcha-alternative` | 3.3.8, 1.1.1 | — | serious | — | хуудасны түвшин |
| `select-auto-navigation` | 3.2.2 | — | serious | — | элемент бүр |
| `fieldset-group` | 1.3.1, 3.3.2 | — | moderate | — | хуудасны түвшин |
| `focus-visible` | 2.4.7, 2.4.13 | [oj04fd](https://www.w3.org/WAI/standards-guidelines/act/rules/oj04fd/) | serious | ✅ safe | хуудасны түвшин |
| `focus-not-obscured` | 2.4.11, 2.4.12 | — | serious | ✅ safe | хуудасны түвшин |
| `target-size` | 2.5.8, 2.5.5 | — | serious | 🟡 heuristic | хуудасны түвшин |
| `tabindex-positive` | 2.4.3 | — | serious | 🟡 heuristic | элемент бүр |
| `scrollable-region-focusable` | 2.1.1 | [0ssw9k](https://www.w3.org/WAI/standards-guidelines/act/rules/0ssw9k/) | serious | ✅ safe | элемент бүр |
| `click-without-keyboard` | 2.1.1, 4.1.2 | — | critical | 🟡 heuristic | элемент бүр |
| `motion-animation` | 2.2.2, 2.3.3 | — | moderate | — | хуудасны түвшин |
| `dragging-alternative` | 2.5.7 | — | serious | — | элемент бүр |
| `consistent-help` | 3.2.6 | — | moderate | — | хуудасны түвшин |
| `accesskey-unique` | 2.1.4, 4.1.2 | — | moderate | — | хуудасны түвшин |
| `button-name` | 4.1.2 | [97a4e1](https://www.w3.org/WAI/standards-guidelines/act/rules/97a4e1/) | critical | 🟡 heuristic | элемент бүр |
| `link-name` | 2.4.4, 4.1.2 | [c487ae](https://www.w3.org/WAI/standards-guidelines/act/rules/c487ae/) | critical | 🟡 heuristic | элемент бүр |
| `link-purpose` | 2.4.4, 2.4.9 | [aizyf1](https://www.w3.org/WAI/standards-guidelines/act/rules/aizyf1/), [5effbb](https://www.w3.org/WAI/standards-guidelines/act/rules/5effbb/) | moderate | 🟡 heuristic (review-д ч) | элемент бүр |
| `label-in-name` | 2.5.3 | [2ee8b8](https://www.w3.org/WAI/standards-guidelines/act/rules/2ee8b8/) | serious | 🟡 heuristic | элемент бүр |
| `aria-valid-role` | 4.1.2, 1.3.1 | [674b10](https://www.w3.org/WAI/standards-guidelines/act/rules/674b10/) | critical | — | элемент бүр |
| `aria-valid-attr` | 4.1.2 | [5f99a7](https://www.w3.org/WAI/standards-guidelines/act/rules/5f99a7/), [6a7281](https://www.w3.org/WAI/standards-guidelines/act/rules/6a7281/) | critical | ✅ safe | хуудасны түвшин |
| `aria-required-attr` | 4.1.2 | [4e8ab6](https://www.w3.org/WAI/standards-guidelines/act/rules/4e8ab6/) | critical | 🟡 heuristic | элемент бүр |
| `aria-idrefs` | 1.3.1, 4.1.2 | [in6db8](https://www.w3.org/WAI/standards-guidelines/act/rules/in6db8/) | serious | — | элемент бүр |
| `duplicate-id-aria` | 4.1.2, 1.3.1 | [3ea0c8](https://www.w3.org/WAI/standards-guidelines/act/rules/3ea0c8/) | serious | — | хуудасны түвшин |
| `aria-hidden-focus` | 4.1.2, 1.3.1 | [6cfa84](https://www.w3.org/WAI/standards-guidelines/act/rules/6cfa84/) | serious | 🟡 heuristic | элемент бүр |
| `aria-name-required` | 4.1.2 | [m6b1q3](https://www.w3.org/WAI/standards-guidelines/act/rules/m6b1q3/) | serious | — | элемент бүр |
| `iframe-title` | 4.1.2, 2.4.1 | [cae760](https://www.w3.org/WAI/standards-guidelines/act/rules/cae760/) | serious | 🟡 heuristic | элемент бүр |
| `nested-interactive` | 4.1.2 | [307n5z](https://www.w3.org/WAI/standards-guidelines/act/rules/307n5z/) | serious | — | элемент бүр |
| `dialog-name` | 4.1.2 | — | serious | ✅ safe | элемент бүр |
| `status-messages` | 4.1.3 | — | serious | ✅ safe | элемент бүр |
| `presentation-role-conflict` | 4.1.2 | [46ca7f](https://www.w3.org/WAI/standards-guidelines/act/rules/46ca7f/) | moderate | — | элемент бүр |

38/65 дүрэм W3C ACT Rules-тэй уялдсан (EARL тайланд `test` болгон ашиглана; ACT дүрмийг бүрэн хэрэгжүүлсэн гэсэн баталгаа биш).

## WCAG 2.2-ын 86 шалгуур

| SC | Нэр | Түвшин | Автоматжилт | Дүрмүүд |
|---|---|---|---|---|
| 1.1.1 | Текст бус контент (Non-text Content) | A | Хэсэгчлэн | `image-alt`, `image-alt-quality`, `svg-img-name`, `input-image-alt`, `area-alt`, `object-alt`, `captcha-alternative` |
| 1.2.1 | Зөвхөн аудио ба зөвхөн видео (бичлэг) (Audio-only and Video-only (Prerecorded)) | A | Хэсэгчлэн | `media-alternative` |
| 1.2.2 | Хадмал (бичлэг) (Captions (Prerecorded)) | A | Хэсэгчлэн | `video-captions` |
| 1.2.3 | Аудио тайлбар эсвэл медиа хувилбар (бичлэг) (Audio Description or Media Alternative (Prerecorded)) | A | Гараар | `media-alternative` |
| 1.2.4 | Хадмал (шууд) (Captions (Live)) | AA | Гараар | `video-captions` |
| 1.2.5 | Аудио тайлбар (бичлэг) (Audio Description (Prerecorded)) | AA | Гараар | `media-alternative` |
| 1.2.6 | Дохионы хэл (бичлэг) (Sign Language (Prerecorded)) | AAA | Гараар | — |
| 1.2.7 | Өргөтгөсөн аудио тайлбар (бичлэг) (Extended Audio Description (Prerecorded)) | AAA | Гараар | — |
| 1.2.8 | Медиа хувилбар (бичлэг) (Media Alternative (Prerecorded)) | AAA | Гараар | — |
| 1.2.9 | Зөвхөн аудио (шууд) (Audio-only (Live)) | AAA | Гараар | — |
| 1.3.1 | Мэдээлэл ба хамаарал (Info and Relationships) | A | Хэсэгчлэн | `heading-order`, `empty-heading`, `list-structure`, `table-headers`, `landmark-main`, `label`, `required-indicator`, `fieldset-group`, `aria-valid-role`, `aria-idrefs`, `duplicate-id-aria`, `aria-hidden-focus` |
| 1.3.2 | Утга бүхий дараалал (Meaningful Sequence) | A | Гараар | — |
| 1.3.3 | Мэдрэхүйн шинж (Sensory Characteristics) | A | Гараар | — |
| 1.3.4 | Чиглэл (босоо/хэвтээ) (Orientation) | AA | Хэсэгчлэн | — |
| 1.3.5 | Оролтын зорилгыг тодорхойлох (Identify Input Purpose) | AA | Хэсэгчлэн | `autocomplete-valid`, `autocomplete-purpose`, `accessible-auth-autocomplete` |
| 1.3.6 | Зорилгыг тодорхойлох (Identify Purpose) | AAA | Гараар | — |
| 1.4.1 | Өнгөний хэрэглээ (Use of Color) | A | Хэсэгчлэн | `link-in-text-block` |
| 1.4.2 | Аудио удирдлага (Audio Control) | A | Хэсэгчлэн | `media-autoplay` |
| 1.4.3 | Тодрол (доод) (Contrast (Minimum)) | AA | Автомат | `color-contrast` |
| 1.4.4 | Текстийн хэмжээ өөрчлөх (Resize Text) | AA | Хэсэгчлэн | `meta-viewport` |
| 1.4.5 | Текстэн зураг (Images of Text) | AA | Гараар | `image-of-text-hint` |
| 1.4.6 | Тодрол (сайжруулсан) (Contrast (Enhanced)) | AAA | Автомат | `color-contrast` |
| 1.4.7 | Арын дуу бага эсвэл байхгүй (Low or No Background Audio) | AAA | Гараар | — |
| 1.4.8 | Харагдах байдал (Visual Presentation) | AAA | Хэсэгчлэн | — |
| 1.4.9 | Текстэн зураг (үл хамаарах заалтгүй) (Images of Text (No Exception)) | AAA | Гараар | — |
| 1.4.10 | Дахин байрлалт (320px) (Reflow) | AA | Хэсэгчлэн | `meta-viewport`, `reflow` |
| 1.4.11 | Текст бус тодрол (Non-text Contrast) | AA | Хэсэгчлэн | `non-text-contrast` |
| 1.4.12 | Текстийн зай (Text Spacing) | AA | Хэсэгчлэн | `text-spacing-important`, `text-spacing-clip` |
| 1.4.13 | Hover/фокус дээр гарах контент (Content on Hover or Focus) | AA | Гараар | — |
| 2.1.1 | Гар (Keyboard) | A | Хэсэгчлэн | `scrollable-region-focusable`, `click-without-keyboard` |
| 2.1.2 | Гарын хавх байхгүй (No Keyboard Trap) | A | Гараар | — |
| 2.1.3 | Гар (үл хамаарах заалтгүй) (Keyboard (No Exception)) | AAA | Гараар | — |
| 2.1.4 | Нэг тэмдэгтийн товчлол (Character Key Shortcuts) | A | Гараар | `accesskey-unique` |
| 2.2.1 | Хугацааг тохируулах (Timing Adjustable) | A | Хэсэгчлэн | `meta-refresh` |
| 2.2.2 | Түр зогсоох, зогсоох, нуух (Pause, Stop, Hide) | A | Хэсэгчлэн | `media-autoplay`, `marquee-blink`, `motion-animation` |
| 2.2.3 | Хугацааны хязгааргүй (No Timing) | AAA | Гараар | — |
| 2.2.4 | Тасалдал (Interruptions) | AAA | Гараар | — |
| 2.2.5 | Дахин нэвтрэх (Re-authenticating) | AAA | Гараар | — |
| 2.2.6 | Хугацаа дуусах анхааруулга (Timeouts) | AAA | Гараар | — |
| 2.3.1 | Гурван анивчилт эсвэл босгоос доош (Three Flashes or Below Threshold) | A | Гараар | — |
| 2.3.2 | Гурван анивчилт (Three Flashes) | AAA | Гараар | — |
| 2.3.3 | Харилцан үйлдлийн хөдөлгөөн (Animation from Interactions) | AAA | Хэсэгчлэн | `motion-animation` |
| 2.4.1 | Блок алгасах (Bypass Blocks) | A | Автомат | `landmark-main`, `bypass`, `iframe-title` |
| 2.4.2 | Хуудасны гарчиг (Page Titled) | A | Автомат | `document-title` |
| 2.4.3 | Фокусын дараалал (Focus Order) | A | Хэсэгчлэн | `tabindex-positive` |
| 2.4.4 | Холбоосын зорилго (контекстэд) (Link Purpose (In Context)) | A | Хэсэгчлэн | `area-alt`, `link-name`, `link-purpose` |
| 2.4.5 | Олон арга зам (Multiple Ways) | AA | Гараар | — |
| 2.4.6 | Гарчиг ба шошго (Headings and Labels) | AA | Хэсэгчлэн | `heading-order`, `empty-heading` |
| 2.4.7 | Фокус харагдах (Focus Visible) | AA | Хэсэгчлэн | `focus-visible` |
| 2.4.8 | Байршил (Location) | AAA | Гараар | — |
| 2.4.9 | Холбоосын зорилго (зөвхөн холбоос) (Link Purpose (Link Only)) | AAA | Хэсэгчлэн | `link-purpose` |
| 2.4.10 | Хэсгийн гарчиг (Section Headings) | AAA | Хэсэгчлэн | — |
| 2.4.11 🆕 | Фокус далдлагдахгүй (доод) (Focus Not Obscured (Minimum)) | AA | Хэсэгчлэн | `focus-not-obscured` |
| 2.4.12 🆕 | Фокус далдлагдахгүй (сайжруулсан) (Focus Not Obscured (Enhanced)) | AAA | Хэсэгчлэн | `focus-not-obscured` |
| 2.4.13 🆕 | Фокусын дүр төрх (Focus Appearance) | AAA | Хэсэгчлэн | `focus-visible` |
| 2.5.1 | Заагчийн дохио зангаа (Pointer Gestures) | A | Гараар | — |
| 2.5.2 | Заагчийн үйлдэл цуцлах (Pointer Cancellation) | A | Гараар | — |
| 2.5.3 | Нэрэнд шошго агуулагдах (Label in Name) | A | Автомат | `label-in-name` |
| 2.5.4 | Хөдөлгөөнөөр идэвхжүүлэх (Motion Actuation) | A | Гараар | — |
| 2.5.5 | Товшилтын хэмжээ (сайжруулсан, 44px) (Target Size (Enhanced)) | AAA | Автомат | `target-size` |
| 2.5.6 | Зэрэгцээ оролтын механизм (Concurrent Input Mechanisms) | AAA | Гараар | — |
| 2.5.7 🆕 | Чирэх хөдөлгөөн (Dragging Movements) | AA | Хэсэгчлэн | `dragging-alternative` |
| 2.5.8 🆕 | Товшилтын хэмжээ (доод, 24px) (Target Size (Minimum)) | AA | Автомат | `target-size` |
| 3.1.1 | Хуудасны хэл (Language of Page) | A | Автомат | `html-lang` |
| 3.1.2 | Хэсгийн хэл (Language of Parts) | AA | Хэсэгчлэн | `lang-valid`, `lang-of-parts` |
| 3.1.3 | Ер бусын үг (Unusual Words) | AAA | Гараар | — |
| 3.1.4 | Товчлол (Abbreviations) | AAA | Хэсэгчлэн | — |
| 3.1.5 | Уншлагын түвшин (Reading Level) | AAA | Гараар | — |
| 3.1.6 | Дуудлага (Pronunciation) | AAA | Гараар | — |
| 3.2.1 | Фокус авахад (On Focus) | A | Гараар | — |
| 3.2.2 | Оролт хийхэд (On Input) | A | Хэсэгчлэн | `select-auto-navigation` |
| 3.2.3 | Тогтвортой навигаци (Consistent Navigation) | AA | Гараар | — |
| 3.2.4 | Тогтвортой тодорхойлолт (Consistent Identification) | AA | Гараар | — |
| 3.2.5 | Хүсэлтээр өөрчлөх (Change on Request) | AAA | Хэсэгчлэн | `meta-refresh` |
| 3.2.6 🆕 | Тогтвортой тусламж (Consistent Help) | A | Хэсэгчлэн | `consistent-help` |
| 3.3.1 | Алдааг тодорхойлох (Error Identification) | A | Хэсэгчлэн | `error-identification` |
| 3.3.2 | Шошго эсвэл заавар (Labels or Instructions) | A | Хэсэгчлэн | `label`, `required-indicator`, `fieldset-group` |
| 3.3.3 | Алдааны зөвлөмж (Error Suggestion) | AA | Гараар | `error-identification` |
| 3.3.4 | Алдаанаас сэргийлэх (хууль, санхүү, өгөгдөл) (Error Prevention (Legal, Financial, Data)) | AA | Гараар | — |
| 3.3.5 | Тусламж (Help) | AAA | Гараар | — |
| 3.3.6 | Алдаанаас сэргийлэх (бүгд) (Error Prevention (All)) | AAA | Гараар | — |
| 3.3.7 🆕 | Давхардсан оруулга (Redundant Entry) | A | Гараар | — |
| 3.3.8 🆕 | Хүртээмжтэй нэвтрэлт (доод) (Accessible Authentication (Minimum)) | AA | Хэсэгчлэн | `accessible-auth-paste`, `accessible-auth-autocomplete`, `captcha-alternative` |
| 3.3.9 🆕 | Хүртээмжтэй нэвтрэлт (сайжруулсан) (Accessible Authentication (Enhanced)) | AAA | Хэсэгчлэн | — |
| 4.1.2 | Нэр, үүрэг, утга (Name, Role, Value) | A | Автомат | `input-image-alt`, `label`, `click-without-keyboard`, `accesskey-unique`, `button-name`, `link-name`, `aria-valid-role`, `aria-valid-attr`, `aria-required-attr`, `aria-idrefs`, `duplicate-id-aria`, `aria-hidden-focus`, `aria-name-required`, `iframe-title`, `nested-interactive`, `dialog-name`, `presentation-role-conflict` |
| 4.1.3 | Төлөвийн мессеж (Status Messages) | AA | Хэсэгчлэн | `status-messages` |

**Хамрах хүрээ:** 47/86 SC-д ядаж нэг автомат дүрэм бий. Үлдсэн 39 SC зөвхөн хүний шалгалтаар баталгаажна.
