# Скан үйлчилгээ — сайтуудын хүртээмжийг үнэлэх

Хүртээмж plugin-ийн аудит хөдөлгүүрийг серверт ажиллуулж, **ямар ч сайтын** хүртээмжийг URL-аар нь үнэлнэ. Сайтдаа plugin суулгах шаардлагагүй. Үйлчилгээ нь самбар (веб интерфэйс) ба REST API-тай тул өөрийн системээсээ (CMS, CI/CD, дотоод портал, BI) шууд дуудаж болно.

```
┌──────────────┐  REST API / webhook   ┌──────────────────────────────┐
│ Таны систем  │ ────────────────────▶ │ hurteemj scanner (Node.js)   │
│ CI, CMS, BI  │ ◀──────────────────── │  ├ дараалал (concurrency N)  │
└──────────────┘   scan.completed      │  ├ Chromium (Playwright)     │──▶ шалгах сайт
                                       │  │   └ hurteemj аудит + crawl │
┌──────────────┐                       │  ├ SQLite (node:sqlite)      │
│ Самбар (веб) │ ◀───────────────────▶ │  └ тайлан: HTML/CSV/JSON/EARL │
└──────────────┘                       └──────────────────────────────┘
```

## Юу хийдэг вэ

| Боломж | Тайлбар |
|---|---|
| **Crawl** | Эхлэл хуудаснаас ижил домэйны холбоосыг дагаж N хуудас шалгана (PDF/зураг/гадны холбоос, `logout`-ыг алгасна) |
| **Хоёр дэлгэц** | Компьютер (1280px) ба гар утас (320px — 1.4.10 Reflow) |
| **Оноо 0–100** | Хамаарах автомат дүрэм бүрийг нөлөөллөөр жинлэж (ноцтой 10, хүнд 7, дунд 3, бага 1), зөрчилгүй дүрмийн хувийг оноо болгоно. "Хянах" олдвор оноо бууруулахгүй. **Нийцлийн баталгаа биш.** Ангилал: 90+ Сайн, 70–89 Дунд, 50–69 Сул, <50 Муу |
| **Түүх, чиг хандлага** | Сайт бүрийн онооны түүх (график + хүснэгт) |
| **Хуваарь** | Цаг/өдөр/7 хоног бүр автоматаар дахин шалгана |
| **Тайлан** | HTML (хэвлэхэд бэлэн), CSV (Excel), JSON, EARL/JSON-LD (W3C ACT Rules-тэй уялдсан) |
| **Webhook** | Шалгалт дуусахад JSON POST, HMAC-SHA256 гарын үсэгтэй |
| **Badge** | Сайт эсвэл README-д байрлуулах SVG оноо (таамаглах боломжгүй токентой) |
| **Аюулгүй байдал** | API түлхүүр (SHA-256 хэшээр хадгална), SSRF хамгаалалт, хатуу CSP, засварлах боломжгүй үйлдлийн бүртгэл |

## Эхлүүлэх

### Docker (зөвлөмж)

```bash
docker compose up -d
docker compose logs scanner | grep -A1 "админ API түлхүүр"
```

Анх асаахад консолд админ түлхүүр хэвлэгдэнэ (эсвэл `.env` файлд `HJ_ADMIN_KEY=hj_...` өгнө). Самбар: http://localhost:8080

### Node.js (≥ 22.13)

```bash
npm ci
npx playwright install --with-deps chromium
npm run build
npm run server            # http://localhost:8080
```

> `node:sqlite` нь Node 22.13-аас хойш туггүй ажилладаг. Plugin-ийн browser хэсэг (dist/) Node 18+ дээр build хийгдэнэ.

### Тохиргоо (орчны хувьсагч)

| Хувьсагч | Анхдагч | Тайлбар |
|---|---|---|
| `PORT`, `HOST` | `8080`, `0.0.0.0` | |
| `HJ_DB` | `./data/hurteemj.db` | SQLite файл |
| `HJ_CONCURRENCY` | `2` | Зэрэг ажиллах скан (Chromium-ийн санах ой ~150MB/скан) |
| `HJ_MAX_PAGES` | `50` | Нэг сканы хуудасны дээд хязгаар |
| `HJ_PAGE_TIMEOUT` | `60000` | Хуудас ачаалах хугацаа (ms) |
| `HJ_ADMIN_KEY` | — | Эхний админ түлхүүр |
| `HJ_PUBLIC_URL` | — | Webhook доторх холбоосын үндэс, ж: `https://a11y.example.mn` |
| `HJ_WEBHOOK_SECRET` | — | Webhook-ийн HMAC түлхүүр |
| `HJ_ALLOW_PRIVATE` | `0` | `1` — дотоод сүлжээний сайтыг (intranet, staging) шалгахыг зөвшөөрөх |
| `HJ_CORS_ORIGIN` | — | Өөр домэйны вебээс API дуудах |
| `HJ_KEEP_SCANS` | `50` | Сайт бүрт хадгалах сканы тоо |

### API түлхүүр

```bash
node server/index.js keys create "GitHub Actions"   # шинэ түлхүүр хэвлэнэ
node server/index.js keys list
node server/index.js keys revoke 3
```
Самбарын **Тохиргоо ба API** хэсгээс ч үүсгэж/цуцалж болно. Түлхүүрийн утга зөвхөн үүсгэх үед харагдана.

## REST API

Бүх хүсэлтэд `Authorization: Bearer <түлхүүр>` (эсвэл `X-API-Key`). Хариу нь JSON.

| Арга | Зам | Тайлбар |
|---|---|---|
| `GET` | `/api/health` | Нийтэд нээлттэй — төлөв, дараалал |
| `POST` | `/api/scans` | `{ url, maxPages?, viewports?: ["desktop","mobile"], level?: "AA", ignore?, webhookUrl? }` — URL-аар шууд шалгана, сайт байхгүй бол үүсгэнэ → `202 { scan, site }` |
| `GET` | `/api/scans/:id` | Төлөв (`queued/running/done/failed/canceled`), явц, оноо, хураангуй, хуудсууд |
| `GET` | `/api/scans/:id/report.html` · `.csv` · `.json` · `.earl.json` | Тайлан. `?lang=en`, `?download=1` |
| `GET` | `/api/scans/:id/pages/:pageId` | Нэг хуудасны бүрэн тайлан (олдвор бүр) |
| `DELETE` | `/api/scans/:id` | Явагдаж буйг цуцлах / дууссаныг устгах |
| `GET` | `/api/scans?siteId=&status=&limit=` | Жагсаалт |
| `GET` · `POST` | `/api/sites` | Сайтууд (сүүлийн оноо, түүх) / бүртгэх `{ url, name?, schedule?: "daily", maxPages?, viewports?, level?, ignore?, webhookUrl?, scanNow?: true }` |
| `GET` · `PATCH` · `DELETE` | `/api/sites/:id` | Дэлгэрэнгүй / тохиргоо өөрчлөх / устгах |
| `POST` | `/api/sites/:id/scans` | Дахин шалгах |
| `GET` · `POST` · `DELETE` | `/api/keys`, `/api/keys/:id` | API түлхүүр |
| `GET` | `/api/log` | Үйлдлийн бүртгэл |
| `GET` | `/badge/:token.svg` | Нийтэд нээлттэй оноо-тэмдэг |

### Жишээ: CI дээр шалгаж, оноо 80-аас бага бол унагах

```bash
SCAN=$(curl -s -X POST "$HJ_URL/api/scans" -H "Authorization: Bearer $HJ_KEY" \
  -H "Content-Type: application/json" -d '{"url":"https://staging.example.mn","maxPages":10}' | jq -r .scan.id)
while :; do
  R=$(curl -s "$HJ_URL/api/scans/$SCAN" -H "Authorization: Bearer $HJ_KEY")
  S=$(echo "$R" | jq -r .scan.status); [ "$S" = queued ] || [ "$S" = running ] || break; sleep 5
done
SCORE=$(echo "$R" | jq .scan.score); echo "score: $SCORE"
curl -s "$HJ_URL/api/scans/$SCAN/report.html" -H "Authorization: Bearer $HJ_KEY" -o a11y-report.html
[ "$SCORE" -ge 80 ]
```

Сервергүй CI-д `npx hurteemj-audit https://staging.example.mn --max-pages 10 --min-score 80` мөн ажиллана.

### Webhook

Сайтад `webhookUrl` тохируулбал шалгалт дуусах бүрт:

```json
{
  "event": "scan.completed",
  "scan": { "id": "…", "url": "https://example.mn/", "status": "done", "score": 74, "grade": "fair",
            "summary": { "pages": 10, "fail": 31, "review": 12, "byImpact": { "critical": 3, "serious": 9, "moderate": 2, "minor": 0 } } },
  "site": { "id": 4, "url": "https://example.mn/", "name": "Example" },
  "links": { "html": "https://a11y.example.mn/api/scans/…/report.html", "earl": "…", "dashboard": "…" }
}
```

`HJ_WEBHOOK_SECRET` өгсөн бол `X-Hurteemj-Signature: sha256=<hex>` толгой ирнэ — хүлээн авагч дараах байдлаар шалгана:

```js
const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(rawBody).digest('hex');
crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(req.headers['x-hurteemj-signature']));
```

Webhook-ийг Slack/Teams (дунд сервер), Jira/Redmine тасалбар, BI мэдээллийн сан руу дамжуулахад ашиглана.

## Аюулгүй байдал

- **SSRF:** Хэрэглэгчийн өгсөн URL-ыг серверт нээдэг тул `localhost`, `10.x`, `172.16–31.x`, `192.168.x`, `169.254.169.254` (cloud metadata), IPv6 дотоод хаягийг API түвшинд **болон** хөтөч доторх бүх хүсэлтэд (redirect, iframe, fetch) хаана. Chromium DNS-ийг өөрөө дахин задалдаг тул DNS rebinding-ийг бүрэн хаахгүй — үйлдвэрлэлд скан үйлчилгээг дотоод сүлжээнээс тусгаарласан (egress firewall) сүлжээнд ажиллуулна уу.
- **Нэвтрэлт:** API түлхүүрийг зөвхөн SHA-256 хэшээр хадгална. Самбар түлхүүрийг sessionStorage-д (сонговол localStorage-д) хадгална.
- **CSP:** Самбар `script-src 'self' 'nonce-…'`, inline style атрибутгүй. HTML тайлан `sandbox` CSP-тэй (сайтаас авсан текст escape хийгдсэн, скрипт ажиллахгүй).
- **CSV:** Excel formula injection-аас сэргийлж `=`, `+`, `-`, `@`-ээр эхэлсэн нүдийг escape хийнэ.
- **Бүртгэл:** Сайт/скан/түлхүүрийн үйлдэл бүр `audit_log`-д (засварлах, устгах API байхгүй) хадгалагдана.
- Crawl нь `logout`/`гарах` холбоосыг дагахгүй; нэвтрэлт шаардсан хуудсыг шалгахгүй (одоогийн хувилбарт cookie/нэвтрэлтийн тохиргоо байхгүй).

## Хязгаарлалт

- Оноо нь **автомат шалгалтын** үр дүн. AA түвшний 55 шалгуурын ~21 нь зөвхөн гараар шалгагдана — тайланд "Гараар шалгах" гэж жагсаана.
- Нэг процесс доторх дараалал (SQLite) — олон серверт хуваарилах бол гадны дараалал (Redis/BullMQ) хэрэгтэй.
- Нэвтрэлт шаардсан хуудас, captcha-тай сайтыг шалгахгүй.
