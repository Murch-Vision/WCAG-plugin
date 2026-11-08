/**
 * Хүртээмжийн скан үйлчилгээний самбар (хамааралгүй, vanilla JS).
 * Бүх динамик утгыг esc()-ээр escape хийнэ — сайтаас ирсэн текст (selector, мессеж) HTML болж орохгүй.
 */
const $main = document.getElementById('main');
const $live = document.getElementById('live');
const $nav = document.getElementById('nav');

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const say = (m) => { $live.textContent = ''; setTimeout(() => { $live.textContent = m; }, 50); };

// ---------- API ----------
const KEY_NAME = 'hj-scanner-key';
const getKey = () => sessionStorage.getItem(KEY_NAME) || localStorage.getItem(KEY_NAME);
function setKey(k, remember) {
  sessionStorage.setItem(KEY_NAME, k);
  if (remember) localStorage.setItem(KEY_NAME, k); else localStorage.removeItem(KEY_NAME);
}
function clearKey() { sessionStorage.removeItem(KEY_NAME); localStorage.removeItem(KEY_NAME); }

class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
async function api(path, { method = 'GET', body, raw } = {}) {
  const headers = { authorization: `Bearer ${getKey() || ''}` };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(path, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  if (res.status === 401) { clearKey(); location.hash = '#/login'; throw new ApiError(401, 'Нэвтрэх шаардлагатай'); }
  if (raw) { if (!res.ok) throw new ApiError(res.status, `HTTP ${res.status}`); return res; }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error || `HTTP ${res.status}`);
  return data;
}

// ---------- форматлах ----------
const GRADE = {
  good: { mn: 'Сайн', icon: '<path d="M8 1a7 7 0 100 14A7 7 0 008 1zm3.3 5.2l-4 4.3a.8.8 0 01-1.1 0L4.6 8.9l1.1-1.1 1 1 3.5-3.7z" fill="currentColor"/>' },
  fair: { mn: 'Дунд', icon: '<path d="M8 1a7 7 0 100 14A7 7 0 008 1zm-.8 3h1.6v5H7.2zm0 6.2h1.6v1.6H7.2z" fill="currentColor"/>' },
  poor: { mn: 'Сул', icon: '<path d="M8 1.5l7 12.5H1zM7.2 6v4h1.6V6zm0 5v1.6h1.6V11z" fill="currentColor"/>' },
  bad: { mn: 'Муу', icon: '<path d="M8 1a7 7 0 100 14A7 7 0 008 1zm2.6 3.3l1.1 1.1L9.1 8l2.6 2.6-1.1 1.1L8 9.1l-2.6 2.6-1.1-1.1L6.9 8 4.3 5.4l1.1-1.1L8 6.9z" fill="currentColor"/>' },
};
const gradeOf = (s) => (s == null ? null : s >= 90 ? 'good' : s >= 70 ? 'fair' : s >= 50 ? 'poor' : 'bad');
function scoreChip(score) {
  const g = gradeOf(score);
  if (!g) return '<span class="score g-none">— <span class="sr-only">оноо байхгүй</span></span>';
  return `<span class="score g-${g}"><svg class="ic" viewBox="0 0 16 16" aria-hidden="true">${GRADE[g].icon}</svg><b>${score}</b><span class="sr-only"> / 100,</span> ${GRADE[g].mn}</span>`;
}
const STATUS = { queued: 'Дараалалд', running: 'Шалгаж байна', done: 'Дууссан', failed: 'Амжилтгүй', canceled: 'Цуцалсан' };
const statusPill = (s) => `<span class="pill ${esc(s)}">${esc(STATUS[s] || s)}</span>`;
const IMPACT = { critical: 'Ноцтой', serious: 'Хүнд', moderate: 'Дунд', minor: 'Бага' };
const SCHEDULE = { '': 'Гараар', hourly: 'Цаг бүр', daily: 'Өдөр бүр', weekly: '7 хоног бүр' };
const VIEWPORT = { desktop: 'Компьютер', mobile: 'Гар утас (320px)' };
const pad = (n) => String(n).padStart(2, '0');
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function relTime(iso) {
  if (!iso) return '—';
  const s = Math.round((Date.now() - new Date(iso)) / 1000);
  const txt = s < 60 ? 'саяхан' : s < 3600 ? `${Math.round(s / 60)} мин өмнө` : s < 86400 ? `${Math.round(s / 3600)} цагийн өмнө` : `${Math.round(s / 86400)} өдрийн өмнө`;
  return `<time datetime="${esc(iso)}" title="${esc(fmtDate(iso))}">${txt}</time>`;
}
const hostOf = (u) => { try { return new URL(u).host; } catch { return u; } };

// ---------- графикууд ----------
function sparkline(history) {
  if (!history || history.length < 2) return '<span class="muted">—</span>';
  const w = 96, h = 28, p = 3;
  const xs = (i) => p + (i * (w - 2 * p)) / (history.length - 1);
  const ys = (v) => h - p - (v / 100) * (h - 2 * p);
  const d = history.map((pt, i) => `${i ? 'L' : 'M'}${xs(i).toFixed(1)} ${ys(pt.score).toFixed(1)}`).join(' ');
  const last = history[history.length - 1];
  const first = history[0];
  const trend = last.score - first.score;
  const label = `Сүүлийн ${history.length} шалгалтын оноо ${first.score}-аас ${last.score} (${trend >= 0 ? '+' : ''}${trend})`;
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(label)}"><path d="${d}"/><circle cx="${xs(history.length - 1).toFixed(1)}" cy="${ys(last.score).toFixed(1)}" r="3"/></svg>`;
}

/** Онооны түүх: нэг цуврал → legend-гүй, гарчиг нэрлэнэ; hover/focus tooltip; хүснэгт хувилбартай */
function historyChart(points) {
  if (points.length < 2) return '<p class="muted">Түүх харуулахад дор хаяж 2 дууссан шалгалт хэрэгтэй.</p>';
  const W = 720, H = 220, L = 36, R = 12, T = 12, B = 28;
  const x = (i) => L + (i * (W - L - R)) / (points.length - 1);
  const y = (v) => T + (1 - v / 100) * (H - T - B);
  const grid = [0, 25, 50, 75, 100].map((v) => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`).join('');
  const yLabels = [0, 50, 100].map((v) => `<text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`).join('');
  const step = Math.max(1, Math.ceil(points.length / 6));
  // Бүх шалгалт нэг өдөр бол цагийг, үгүй бол сар.өдрийг харуулна
  const sameDay = new Set(points.map((p) => fmtDate(p.at).slice(0, 10))).size === 1;
  const lab = (p) => (sameDay ? fmtDate(p.at).slice(11) : fmtDate(p.at).slice(5, 10));
  const anchor = (i) => (i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle');
  const xLabels = points.map((p, i) => (i % step === 0 || i === points.length - 1) ? `<text x="${x(i)}" y="${H - 8}" text-anchor="${anchor(i)}">${esc(lab(p))}</text>` : '').join('');
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.score).toFixed(1)}`).join(' ');
  const pts = points.map((p, i) => `<rect class="hit" x="${x(i) - 12}" y="${T}" width="24" height="${H - T - B}" data-i="${i}" tabindex="0" role="img" aria-label="${esc(`${fmtDate(p.at)}: ${p.score} оноо`)}"></rect><circle class="pt" cx="${x(i).toFixed(1)}" cy="${y(p.score).toFixed(1)}" r="4"/>`).join('');
  return `<div class="chart-wrap"><svg class="chart" viewBox="0 0 ${W} ${H}" role="group" aria-label="Онооны түүх, ${points.length} шалгалт"><g class="grid">${grid}</g><g class="axis">${yLabels}${xLabels}</g><path class="line" d="${d}"/>${pts}</svg><div class="tip" hidden></div></div>
  <details><summary>Хүснэгтээр харах</summary><div class="table-wrap"><table><caption class="sr-only">Онооны түүх</caption><thead><tr><th scope="col">Огноо</th><th scope="col" class="n">Оноо</th></tr></thead><tbody>${points.map((p) => `<tr><td>${esc(fmtDate(p.at))}</td><td class="n">${p.score}</td></tr>`).join('')}</tbody></table></div></details>`;
}
function wireChart(root, points) {
  const wrap = root.querySelector('.chart-wrap');
  if (!wrap) return;
  const tip = wrap.querySelector('.tip');
  const svg = wrap.querySelector('svg');
  const show = (el) => {
    const p = points[+el.dataset.i];
    const r = el.getBoundingClientRect(), wr = wrap.getBoundingClientRect();
    const c = el.nextElementSibling.getBoundingClientRect();
    tip.textContent = `${fmtDate(p.at)} · ${p.score}/100`;
    tip.style.left = `${r.left - wr.left + r.width / 2}px`;
    tip.style.top = `${c.top - wr.top}px`;
    tip.hidden = false;
  };
  svg.querySelectorAll('.hit').forEach((el) => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('focus', () => show(el));
    el.addEventListener('mouseleave', () => { tip.hidden = true; });
    el.addEventListener('blur', () => { tip.hidden = true; });
  });
}

// ---------- татах ----------
async function download(scanId, fmt, { open = false } = {}) {
  const res = await api(`/api/scans/${scanId}/report.${fmt}`, { raw: true });
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  if (open) window.open(url, '_blank', 'noopener');
  else {
    const a = document.createElement('a');
    a.href = url;
    a.download = `hurteemj-${scanId.slice(0, 8)}.${fmt}`;
    document.body.appendChild(a); a.click(); a.remove();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ---------- router ----------
let viewToken = 0;
const timers = new Set();
function poll(fn, ms) { const t = setInterval(fn, ms); timers.add(t); return t; }

function render(html, title, navKey) {
  for (const t of timers) clearInterval(t);
  timers.clear();
  $main.innerHTML = html;
  document.title = `${title} — Хүртээмж`;
  $nav.querySelectorAll('[data-nav]').forEach((a) => (a.dataset.nav === navKey ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  // Хуудас солигдоход фокусыг гарчиг руу шилжүүлж зарлана (SPA-д 2.4.3)
  const h1 = $main.querySelector('h1');
  if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: false }); }
  say(title);
}

async function route() {
  const token = ++viewToken;
  const hash = location.hash.replace(/^#/, '') || '/';
  if (!getKey() && hash !== '/login') { location.hash = '#/login'; return; }
  $nav.hidden = hash === '/login';
  let m;
  try {
    if (hash === '/login') return viewLogin();
    if (hash === '/') return await viewSites(token);
    if (hash === '/scans') return await viewScans(token);
    if (hash === '/settings') return await viewSettings(token);
    if ((m = hash.match(/^\/sites\/(\d+)$/))) return await viewSite(token, +m[1]);
    if ((m = hash.match(/^\/scans\/([\w-]+)$/))) return await viewScan(token, m[1]);
    render('<h1>Хуудас олдсонгүй</h1><p><a href="#/">Сайтууд руу буцах</a></p>', 'Олдсонгүй');
  } catch (e) {
    if (e.status === 401) return;
    if (token === viewToken) render(`<h1>Алдаа гарлаа</h1><p class="err">${esc(e.message)}</p><p><a href="#/">Нүүр рүү</a></p>`, 'Алдаа');
  }
}
window.addEventListener('hashchange', route);
document.getElementById('logout').addEventListener('click', () => { clearKey(); location.hash = '#/login'; });

// ---------- нэвтрэх ----------
function viewLogin() {
  render(`<h1>Нэвтрэх</h1>
  <div class="card narrow">
    <p>Скан үйлчилгээний API түлхүүрээ оруулна уу. Анх асаахад сервер консолд админ түлхүүр хэвлэдэг, эсвэл <code>node server/index.js keys create "нэр"</code> командаар үүсгэнэ.</p>
    <form id="login" novalidate>
      <div class="field"><label for="key">API түлхүүр</label><input id="key" type="password" autocomplete="current-password" spellcheck="false" required aria-describedby="key-err"></div>
      <p id="key-err" class="err" role="alert"></p>
      <div class="field"><label class="check"><input type="checkbox" id="remember"> Энэ төхөөрөмж дээр сануулах</label></div>
      <button class="btn primary" type="submit">Нэвтрэх</button>
    </form>
  </div>`, 'Нэвтрэх');
  const form = document.getElementById('login');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const k = form.key.value.trim();
    const err = document.getElementById('key-err');
    if (!k) { err.textContent = 'Түлхүүрээ оруулна уу.'; form.key.setAttribute('aria-invalid', 'true'); form.key.focus(); return; }
    setKey(k, form.remember.checked);
    try {
      await api('/api/me');
      location.hash = '#/';
    } catch (ex) {
      setKey('', false); clearKey();
      err.textContent = 'Түлхүүр буруу байна.';
      form.key.setAttribute('aria-invalid', 'true');
      form.key.focus();
    }
  });
}

// ---------- шинэ скан маягт ----------
function newScanForm(limits) {
  return `<form id="new-site" class="card" novalidate aria-labelledby="new-title">
    <h2 id="new-title" class="flush">Сайт шалгах</h2>
    <div class="form-grid">
      <div class="field"><label for="url">Сайтын хаяг</label><input id="url" name="url" type="url" inputmode="url" placeholder="https://www.example.mn" required aria-describedby="url-err url-hint"><span id="url-hint" class="hint">Эхлэл хуудаснаас ижил домэйны холбоосыг дагаж шалгана.</span></div>
      <div class="field"><label for="maxPages">Хуудасны тоо <span class="hint">(1–${limits.maxPages})</span></label><input id="maxPages" name="maxPages" type="number" min="1" max="${limits.maxPages}" value="5"></div>
      <div class="field"><label for="schedule">Давтамж</label><select id="schedule" name="schedule">${Object.entries(SCHEDULE).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
    </div>
    <div class="row">
      <label class="check"><input type="checkbox" name="mobile" checked> Гар утасны дэлгэц (320px, 1.4.10 Reflow) мөн шалгах</label>
      <label for="level" class="sr-only">Түвшин</label>
      <select id="level" name="level" class="auto"><option value="AA" selected>WCAG 2.2 AA</option><option value="A">WCAG 2.2 A</option><option value="AAA">WCAG 2.2 AAA</option></select>
    </div>
    <p id="url-err" class="err" role="alert"></p>
    <button class="btn primary" type="submit">Шалгаж эхлэх</button>
  </form>`;
}
function wireNewScan() {
  const form = document.getElementById('new-site');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = document.getElementById('url-err');
    err.textContent = '';
    form.url.removeAttribute('aria-invalid');
    const url = form.url.value.trim();
    if (!url) { err.textContent = 'Сайтын хаягаа оруулна уу.'; form.url.setAttribute('aria-invalid', 'true'); form.url.focus(); return; }
    const btn = form.querySelector('button[type=submit]');
    btn.disabled = true;
    try {
      const body = { url, maxPages: +form.maxPages.value || 1, schedule: form.schedule.value || null, level: form.level.value, viewports: form.mobile.checked ? ['desktop', 'mobile'] : ['desktop'] };
      let out;
      try { out = await api('/api/sites', { method: 'POST', body }); } catch (ex) {
        if (ex.status !== 409) throw ex;
        out = await api('/api/scans', { method: 'POST', body: { url, maxPages: body.maxPages, viewports: body.viewports, level: body.level } });
      }
      say('Шалгалт эхэллээ');
      location.hash = `#/scans/${out.scan.id}`;
    } catch (ex) {
      err.textContent = ex.message;
      form.url.setAttribute('aria-invalid', 'true');
      form.url.focus();
    } finally { btn.disabled = false; }
  });
}

// ---------- сайтууд ----------
async function viewSites(token) {
  const [{ sites }, me] = await Promise.all([api('/api/sites'), api('/api/me')]);
  if (token !== viewToken) return;
  const avg = sites.filter((s) => s.lastScan?.score != null);
  const mean = avg.length ? Math.round(avg.reduce((a, s) => a + s.lastScan.score, 0) / avg.length) : null;
  const rows = sites.map((s) => `<tr>
      <th scope="row"><a href="#/sites/${s.id}">${esc(s.name || hostOf(s.url))}</a><div class="url">${esc(s.url)}</div></th>
      <td>${scoreChip(s.lastScan?.status === 'done' ? s.lastScan.score : (s.history.at(-1)?.score ?? null))}</td>
      <td>${sparkline(s.history)}</td>
      <td class="n">${s.lastScan?.summary ? s.lastScan.summary.criteria?.failing ?? '—' : '—'}</td>
      <td>${s.lastScan ? statusPill(s.lastScan.status) : '—'}<div class="muted">${relTime(s.lastScan?.finishedAt || s.lastScan?.createdAt)}</div></td>
      <td>${esc(SCHEDULE[s.schedule || ''])}</td>
      <td><button type="button" class="btn small" data-rescan="${s.id}">Дахин шалгах<span class="sr-only"> ${esc(s.name || hostOf(s.url))}</span></button></td>
    </tr>`).join('');
  render(`<h1>Сайтууд</h1>
    ${newScanForm(me.limits)}
    <div class="grid" role="list">
      <div class="stat" role="listitem"><b>${sites.length}</b><span>бүртгэлтэй сайт</span></div>
      <div class="stat" role="listitem"><b>${mean ?? '—'}</b><span>дундаж оноо</span></div>
      <div class="stat" role="listitem"><b>${avg.filter((s) => s.lastScan.score < 70).length}</b><span>70-аас доош оноотой</span></div>
    </div>
    <h2>Бүртгэлтэй сайтууд</h2>
    ${sites.length ? `<div class="table-wrap"><table><caption class="sr-only">Сайтуудын сүүлийн шалгалтын үр дүн</caption><thead><tr><th scope="col">Сайт</th><th scope="col">Оноо</th><th scope="col">Чиг хандлага</th><th scope="col" class="n">Зөрчилтэй SC</th><th scope="col">Сүүлийн шалгалт</th><th scope="col">Давтамж</th><th scope="col"><span class="sr-only">Үйлдэл</span></th></tr></thead><tbody>${rows}</tbody></table></div>`
      : '<p class="empty">Одоогоор сайт бүртгэгдээгүй байна. Дээрх маягтаар эхний сайтаа шалгана уу.</p>'}`, 'Сайтууд', 'sites');
  wireNewScan();
  $main.querySelectorAll('[data-rescan]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    const { scan } = await api(`/api/sites/${b.dataset.rescan}/scans`, { method: 'POST' });
    location.hash = `#/scans/${scan.id}`;
  }));
  if (sites.some((s) => ['queued', 'running'].includes(s.lastScan?.status))) {
    poll(async () => {
      const { sites: s2 } = await api('/api/sites');
      if (token === viewToken && !s2.some((s) => ['queued', 'running'].includes(s.lastScan?.status))) route();
    }, 4000);
  }
}

// ---------- шалгалтууд ----------
async function viewScans(token) {
  const { scans } = await api('/api/scans?limit=100');
  if (token !== viewToken) return;
  render(`<h1>Шалгалтууд</h1>
    ${scans.length ? `<div class="table-wrap"><table><caption class="sr-only">Сүүлийн 100 шалгалт</caption><thead><tr><th scope="col">Сайт</th><th scope="col">Төлөв</th><th scope="col">Оноо</th><th scope="col" class="n">Хуудас</th><th scope="col">Эх үүсвэр</th><th scope="col">Огноо</th></tr></thead><tbody>
      ${scans.map((s) => `<tr><th scope="row"><a href="#/scans/${esc(s.id)}">${esc(hostOf(s.url))}</a><div class="url">${esc(s.url)}</div></th><td>${statusPill(s.status)}</td><td>${scoreChip(s.score)}</td><td class="n">${s.summary?.pages ?? s.progress?.pages ?? '—'}</td><td>${esc({ api: 'API', schedule: 'Хуваарь' }[s.source] || s.source)}</td><td>${esc(fmtDate(s.createdAt))}</td></tr>`).join('')}
    </tbody></table></div>` : '<p class="empty">Шалгалт алга.</p>'}`, 'Шалгалтууд', 'scans');
}

// ---------- нэг сайт ----------
async function viewSite(token, id) {
  const { site, scans } = await api(`/api/sites/${id}`);
  if (token !== viewToken) return;
  const done = scans.filter((s) => s.status === 'done' && s.score != null).reverse();
  const points = done.map((s) => ({ score: s.score, at: s.finishedAt }));
  const badgeAbs = `${location.origin}${site.badgeUrl}`;
  render(`<p class="crumbs"><a href="#/">Сайтууд</a> / ${esc(site.name || hostOf(site.url))}</p>
    <h1>${esc(site.name || hostOf(site.url))}</h1>
    <p class="url"><a href="${esc(site.url)}" rel="noopener noreferrer" target="_blank">${esc(site.url)}<span class="sr-only"> (шинэ цонхонд)</span></a></p>
    <div class="row"><button type="button" class="btn primary" id="rescan">Одоо шалгах</button>${done.length ? `<a class="btn" href="#/scans/${esc(scans.find((s) => s.status === 'done').id)}">Сүүлийн тайлан</a>` : ''}</div>
    <h2>Онооны түүх</h2>
    <div class="card">${historyChart(points)}</div>
    <h2>Тохиргоо</h2>
    <form id="site-form" class="card" novalidate>
      <div class="grid">
        <div class="field"><label for="s-name">Нэр</label><input id="s-name" name="name" type="text" value="${esc(site.name || '')}"></div>
        <div class="field"><label for="s-pages">Хуудасны тоо</label><input id="s-pages" name="maxPages" type="number" min="1" value="${site.maxPages}"></div>
        <div class="field"><label for="s-schedule">Давтамж</label><select id="s-schedule" name="schedule">${Object.entries(SCHEDULE).map(([v, l]) => `<option value="${v}"${(site.schedule || '') === v ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="s-level">Түвшин</label><select id="s-level" name="level">${['A', 'AA', 'AAA'].map((l) => `<option${site.level === l ? ' selected' : ''}>${l}</option>`).join('')}</select></div>
      </div>
      <fieldset class="field"><legend>Дэлгэц</legend><div class="row">${Object.entries(VIEWPORT).map(([v, l]) => `<label class="check"><input type="checkbox" name="vp" value="${v}"${site.viewports.includes(v) ? ' checked' : ''}> ${l}</label>`).join('')}</div></fieldset>
      <div class="field"><label for="s-ignore">Шалгахгүй хэсгүүд <span class="hint">(CSS selector, таслалаар)</span></label><input id="s-ignore" name="ignore" type="text" value="${esc(site.ignore.join(', '))}" placeholder=".ads, #chat-widget"></div>
      <div class="field"><label for="s-hook">Webhook URL <span class="hint">(шалгалт дуусахад JSON POST хийнэ)</span></label><input id="s-hook" name="webhookUrl" type="url" value="${esc(site.webhookUrl || '')}" placeholder="https://example.mn/hooks/a11y"></div>
      <p id="site-msg" role="status"></p>
      <div class="row spread"><button class="btn primary" type="submit">Хадгалах</button><button class="btn danger" type="button" id="del-site">Сайтыг устгах</button></div>
      ${site.schedule ? `<p class="muted">Дараагийн шалгалт: ${esc(fmtDate(site.nextRunAt))}</p>` : ''}
    </form>
    <h2>Оноо харуулах тэмдэг (badge)</h2>
    <div class="card"><p><img src="${esc(site.badgeUrl)}" alt="WCAG 2.2 хүртээмжийн оноо"></p>
      <label for="badge-code">Сайт эсвэл README-д байрлуулах код</label>
      <input id="badge-code" type="text" readonly value="${esc(`<img src="${badgeAbs}" alt="WCAG 2.2 хүртээмжийн оноо">`)}">
      <p class="hint">Тэмдгийн хаяг нь таамаглах боломжгүй токентой бөгөөд зөвхөн сүүлийн онооноос өөр мэдээлэл задруулахгүй.</p></div>
    <h2>Шалгалтууд</h2>
    <div class="table-wrap"><table><caption class="sr-only">Энэ сайтын шалгалтууд</caption><thead><tr><th scope="col">Огноо</th><th scope="col">Төлөв</th><th scope="col">Оноо</th><th scope="col" class="n">Хуудас</th></tr></thead><tbody>
      ${scans.map((s) => `<tr><th scope="row"><a href="#/scans/${esc(s.id)}">${esc(fmtDate(s.createdAt))}</a></th><td>${statusPill(s.status)}</td><td>${scoreChip(s.score)}</td><td class="n">${s.summary?.pages ?? '—'}</td></tr>`).join('') || '<tr><td colspan="4">Шалгалт алга</td></tr>'}
    </tbody></table></div>`, site.name || hostOf(site.url), 'sites');
  wireChart($main, points);
  document.getElementById('rescan').addEventListener('click', async () => {
    const { scan } = await api(`/api/sites/${id}/scans`, { method: 'POST' });
    location.hash = `#/scans/${scan.id}`;
  });
  const form = document.getElementById('site-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('site-msg');
    const vps = [...form.querySelectorAll('[name=vp]:checked')].map((c) => c.value);
    try {
      await api(`/api/sites/${id}`, { method: 'PATCH', body: { name: form.name.value, maxPages: +form.maxPages.value, schedule: form.schedule.value || null, level: form.level.value, viewports: vps.length ? vps : ['desktop'], ignore: form.ignore.value, webhookUrl: form.webhookUrl.value.trim() || null } });
      msg.className = '';
      msg.textContent = 'Хадгаллаа.';
    } catch (ex) { msg.className = 'err'; msg.textContent = ex.message; }
  });
  document.getElementById('del-site').addEventListener('click', async () => {
    if (!confirm('Сайт болон түүний бүх шалгалтыг устгах уу? Буцаах боломжгүй.')) return;
    await api(`/api/sites/${id}`, { method: 'DELETE' });
    say('Сайтыг устгалаа');
    location.hash = '#/';
  });
}

// ---------- нэг шалгалт ----------
const PRINCIPLE = { 1: 'Мэдрэгдэхүйц', 2: 'Удирдах боломжтой', 3: 'Ойлгомжтой', 4: 'Бат бөх' };
async function viewScan(token, id) {
  const data = await api(`/api/scans/${id}`);
  if (token !== viewToken) return;
  const { scan, site, pages } = data;
  const running = ['queued', 'running'].includes(scan.status);
  const title = `${hostOf(scan.url)} — шалгалт`;
  let body = `<p class="crumbs"><a href="#/">Сайтууд</a> / <a href="#/sites/${site.id}">${esc(site.name || hostOf(site.url))}</a> / ${esc(fmtDate(scan.createdAt))}</p>
    <h1>${esc(site.name || hostOf(scan.url))} — шалгалт</h1>
    <p>${statusPill(scan.status)} · WCAG 2.2 ${esc(scan.options.level)} · ${esc(scan.options.viewports.map((v) => VIEWPORT[v] || v).join(', '))} · хамгийн ихдээ ${scan.options.maxPages} хуудас</p>`;
  if (running) {
    const p = scan.progress;
    const total = p ? Math.max(p.total, 1) * scan.options.viewports.length : 1;
    const pct = p ? Math.min(100, Math.round((p.pages / total) * 100)) : 0;
    body += `<div class="card"><p id="prog-text">${p ? `${p.pages} шалгалт хийгдлээ. Одоо: <span class="url">${esc(p.current)}</span>` : 'Дараалалд хүлээж байна…'}</p>
      <div class="progress" role="progressbar" aria-label="Шалгалтын явц" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span></span></div>
      <p><button type="button" class="btn danger small" id="cancel">Цуцлах</button></p></div>`;
  } else if (scan.status === 'failed') {
    body += `<div class="card"><p class="err">Шалгалт амжилтгүй: ${esc(scan.error)}</p><button type="button" class="btn" id="retry">Дахин оролдох</button></div>`;
  }
  if (scan.status === 'done') {
    const s = scan.summary;
    const byP = {};
    for (const c of s.criteria.list || []) {
      const k = c.id[0];
      byP[k] ||= { fail: 0, review: 0, manual: 0, ok: 0 };
      byP[k][{ fail: 'fail', review: 'review', manual: 'manual' }[c.status] || 'ok']++;
    }
    body += `<div class="card hero">
        <div><div class="big">${scan.score}<small>/100</small></div>${scoreChip(scan.score)}</div>
        <div><p class="measure">Оноо нь хамаарах автомат дүрмүүдийн нөлөөллөөр жинлэсэн хувь. <strong>WCAG нийцлийн баталгаа биш</strong> — ${s.criteria.manualOnly} шалгуурыг зөвхөн хүн шалгана.</p>
        <div class="row"><button type="button" class="btn" data-dl="html" data-open="1">HTML тайлан нээх</button><button type="button" class="btn small" data-dl="csv">CSV</button><button type="button" class="btn small" data-dl="earl.json">EARL (JSON-LD)</button><button type="button" class="btn small" data-dl="json">JSON</button><button type="button" class="btn small" id="again">Дахин шалгах</button></div></div>
      </div>
      <div class="grid" role="list">
        ${['critical', 'serious', 'moderate', 'minor'].map((k) => `<div class="stat" role="listitem"><b>${s.byImpact[k]}</b><span><span class="impact ${k}">${IMPACT[k]}</span> зөрчил</span></div>`).join('')}
        <div class="stat" role="listitem"><b>${s.review}</b><span>хүн хянах зүйл</span></div>
        <div class="stat" role="listitem"><b>${s.pages}</b><span>шалгалт (хуудас × дэлгэц)</span></div>
      </div>
      <h2>WCAG зарчмаар</h2>
      <div class="table-wrap"><table><caption class="sr-only">Зарчим тус бүрийн амжилтын шалгуурын төлөв</caption><thead><tr><th scope="col">Зарчим</th><th scope="col" class="n">Зөрчилтэй</th><th scope="col" class="n">Хянах</th><th scope="col" class="n">Зөрчил илрээгүй</th><th scope="col" class="n">Гараар шалгах</th></tr></thead><tbody>
        ${Object.keys(PRINCIPLE).map((k) => { const v = byP[k] || { fail: 0, review: 0, manual: 0, ok: 0 }; return `<tr><th scope="row">${k}. ${PRINCIPLE[k]}</th><td class="n">${v.fail}</td><td class="n">${v.review}</td><td class="n">${v.ok}</td><td class="n">${v.manual}</td></tr>`; }).join('')}
      </tbody></table></div>`;
  }
  if (pages.length) {
    body += `<h2>Хуудсууд</h2><p class="muted">Хуудас бүрийн олдворыг нээж харна уу.</p>
      ${pages.map((p) => `<details class="rule" data-page="${p.id}"><summary>${p.error ? '<span class="pill failed">Алдаа</span>' : scoreChip(p.score)} <span>${esc(p.url)}</span> <span class="muted">· ${esc(VIEWPORT[p.viewport] || p.viewport)}${p.error ? '' : ` · ${p.fail} зөрчил, ${p.review} хянах`}</span></summary><div class="page-body">${p.error ? `<p class="err pad">${esc(p.error)}</p>` : '<p class="muted pad">Ачаалж байна…</p>'}</div></details>`).join('')}`;
  }
  render(body, title, 'scans');

  const bar0 = $main.querySelector('.progress');
  if (bar0) bar0.firstElementChild.style.width = `${bar0.getAttribute('aria-valuenow')}%`;
  $main.querySelectorAll('[data-dl]').forEach((b) => b.addEventListener('click', () => download(id, b.dataset.dl, { open: !!b.dataset.open }).catch((e) => say(e.message))));
  document.getElementById('cancel')?.addEventListener('click', async () => { await api(`/api/scans/${id}`, { method: 'DELETE' }); say('Цуцаллаа'); route(); });
  const again = async () => { const { scan: s2 } = await api(`/api/sites/${site.id}/scans`, { method: 'POST' }); location.hash = `#/scans/${s2.id}`; };
  document.getElementById('retry')?.addEventListener('click', again);
  document.getElementById('again')?.addEventListener('click', again);
  $main.querySelectorAll('details[data-page]').forEach((d) => d.addEventListener('toggle', () => { if (d.open && !d.dataset.loaded) loadPage(id, d); }));

  if (running) {
    let last = JSON.stringify(scan.progress);
    poll(async () => {
      if (token !== viewToken) return;
      const { scan: s2 } = await api(`/api/scans/${id}`);
      if (!['queued', 'running'].includes(s2.status)) { route(); say(s2.status === 'done' ? `Шалгалт дууслаа. Оноо ${s2.score}.` : 'Шалгалт зогслоо.'); return; }
      const now = JSON.stringify(s2.progress);
      if (now !== last) {
        last = now;
        const p = s2.progress;
        const total = Math.max(p.total, 1) * s2.options.viewports.length;
        const pct = Math.min(100, Math.round((p.pages / total) * 100));
        const bar = $main.querySelector('.progress');
        bar?.setAttribute('aria-valuenow', pct);
        if (bar) bar.firstElementChild.style.width = `${pct}%`;
        const t = document.getElementById('prog-text');
        if (t) t.innerHTML = `${p.pages} шалгалт хийгдлээ. Одоо: <span class="url">${esc(p.current)}</span>`;
      }
    }, 2000);
  }
}

async function loadPage(scanId, d) {
  d.dataset.loaded = '1';
  const box = d.querySelector('.page-body');
  try {
    const { page } = await api(`/api/scans/${scanId}/pages/${d.dataset.page}`);
    const groups = new Map();
    for (const f of page.report.findings) {
      const k = `${f.outcome}|${f.ruleId}`;
      if (!groups.has(k)) groups.set(k, { ...f, items: [] });
      groups.get(k).items.push(f);
    }
    const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
    const list = [...groups.values()].sort((a, b) => (a.outcome === b.outcome ? order[a.impact] - order[b.impact] : a.outcome === 'fail' ? -1 : 1));
    box.innerHTML = list.length ? list.map((g) => `<details class="rule"><summary><span class="impact ${esc(g.impact)}">${esc(IMPACT[g.impact])}</span> ${g.outcome === 'fail' ? '<strong>Зөрчил</strong>' : '<span>Хянах</span>'} · ${esc(g.sc.join(', '))} · <span>${esc(typeof g.message === 'string' ? g.message : g.message?.mn)}</span> <span class="muted">(${g.items.length})</span></summary>
      <ul>${g.items.slice(0, 50).map((f) => `<li><code>${esc(f.selector || '—')}</code>${f.html ? `<br><code>${esc(f.html)}</code>` : ''}</li>`).join('')}${g.items.length > 50 ? `<li class="muted">… бас ${g.items.length - 50}</li>` : ''}</ul></details>`).join('')
      : '<p class="pad">Автомат шалгалтаар олдвор илрээгүй.</p>';
  } catch (e) { box.innerHTML = `<p class="err pad">${esc(e.message)}</p>`; }
}

// ---------- тохиргоо ба API ----------
async function viewSettings(token) {
  const [{ keys }, { log }, me] = await Promise.all([api('/api/keys'), api('/api/log?limit=50'), api('/api/me')]);
  if (token !== viewToken) return;
  const origin = location.origin;
  render(`<h1>Тохиргоо ба API</h1>
    <h2>Өөр системээс холбох</h2>
    <div class="card">
      <p>Скан үйлчилгээ нь REST API-тэй тул ямар ч системээс (CMS, CI/CD, дотоод портал, BI) дуудаж болно. Бүх хүсэлтэд <code>Authorization: Bearer &lt;түлхүүр&gt;</code> толгой шаардлагатай.</p>
      <h3>Сайт шалгуулах</h3>
      <pre><code>curl -X POST ${esc(origin)}/api/scans \\
  -H "Authorization: Bearer $HJ_KEY" -H "Content-Type: application/json" \\
  -d '{"url":"https://www.example.mn","maxPages":10,"viewports":["desktop","mobile"]}'</code></pre>
      <h3>Үр дүн авах</h3>
      <pre><code>curl -H "Authorization: Bearer $HJ_KEY" ${esc(origin)}/api/scans/&lt;id&gt;
curl -H "Authorization: Bearer $HJ_KEY" ${esc(origin)}/api/scans/&lt;id&gt;/report.html   # .csv | .json | .earl.json</code></pre>
      <p>Шалгалт дуусахад сайтад тохируулсан webhook руу <code>scan.completed</code> JSON илгээгдэнэ. Дэлгэрэнгүй: <code>docs/SCANNER.md</code>.</p>
      <p class="muted">Хувилбар ${esc(me.version)} · хуудасны дээд хязгаар ${me.limits.maxPages}</p>
    </div>
    <h2>API түлхүүрүүд</h2>
    <form id="key-form" class="card row" novalidate>
      <div class="grow"><label for="k-name">Шинэ түлхүүрийн нэр</label><input id="k-name" name="name" type="text" placeholder="жишээ нь: GitHub Actions" required></div>
      <button class="btn primary end" type="submit">Үүсгэх</button>
    </form>
    <div id="new-key" role="status"></div>
    <div class="table-wrap"><table><caption class="sr-only">API түлхүүрүүд</caption><thead><tr><th scope="col">Нэр</th><th scope="col">Эхлэл</th><th scope="col">Үүсгэсэн</th><th scope="col">Сүүлд ашигласан</th><th scope="col">Төлөв</th><th scope="col"><span class="sr-only">Үйлдэл</span></th></tr></thead><tbody>
      ${keys.map((k) => `<tr><th scope="row">${esc(k.name)}${k.id === me.key.id ? ' <span class="pill">одоогийн</span>' : ''}</th><td><code>${esc(k.prefix)}…</code></td><td>${esc(fmtDate(k.createdAt))}</td><td>${esc(fmtDate(k.lastUsedAt))}</td><td>${k.revokedAt ? '<span class="pill failed">Цуцлагдсан</span>' : '<span class="pill done">Идэвхтэй</span>'}</td><td>${!k.revokedAt && k.id !== me.key.id ? `<button type="button" class="btn danger small" data-revoke="${k.id}">Цуцлах<span class="sr-only"> ${esc(k.name)}</span></button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <h2>Үйлдлийн бүртгэл</h2>
    <p class="muted">Бүх үйлдэл засварлах, устгах боломжгүй бүртгэлд хадгалагдана.</p>
    <div class="table-wrap"><table><caption class="sr-only">Сүүлийн 50 үйлдэл</caption><thead><tr><th scope="col">Хэзээ</th><th scope="col">Хэн</th><th scope="col">Үйлдэл</th><th scope="col">Объект</th></tr></thead><tbody>
      ${log.map((l) => `<tr><td>${esc(fmtDate(l.at))}</td><td>${esc(l.keyName || 'систем')}</td><td><code>${esc(l.action)}</code></td><td class="url">${esc(l.target || '')}</td></tr>`).join('') || '<tr><td colspan="4">Бүртгэл хоосон</td></tr>'}
    </tbody></table></div>`, 'Тохиргоо ба API', 'settings');
  document.getElementById('key-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) { e.target.name.setAttribute('aria-invalid', 'true'); e.target.name.focus(); return; }
    const { key } = await api('/api/keys', { method: 'POST', body: { name } });
    document.getElementById('new-key').innerHTML = `<div class="card notice"><p><strong>Шинэ түлхүүр — зөвхөн одоо харагдана, хадгалж аваарай:</strong></p><p class="key-box">${esc(key.key)}</p><p><a href="#/settings" id="key-done">Хадгалсан, жагсаалтыг шинэчлэх</a></p></div>`;
    document.getElementById('key-done').addEventListener('click', (ev) => { ev.preventDefault(); route(); });
    document.getElementById('key-done').focus();
  });
  $main.querySelectorAll('[data-revoke]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('Энэ түлхүүрийг цуцлах уу? Түүгээр холбогдсон систем ажиллахаа болино.')) return;
    await api(`/api/keys/${b.dataset.revoke}`, { method: 'DELETE' });
    say('Түлхүүрийг цуцаллаа');
    route();
  }));
}

route();
