import { css } from './styles.js';
import { HOST_ATTR } from '../core/dom.js';
import { parseColor, contrastRatio, adjustForContrast, toCss } from '../core/color.js';
import { PROFILES } from '../prefs/preferences.js';
import { messageText, serialize } from '../core/engine.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const ICONS = {
  person: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4.2" r="2.2" fill="currentColor"/><path d="M4 7.6c2.7.8 5.3 1.2 8 1.2s5.3-.4 8-1.2l.5 1.9c-2.2.7-4.3 1.1-6.3 1.3v3.3l2.3 7.4-1.9.6L12 15.6l-2.6 6.5-1.9-.6 2.3-7.4v-3.3c-2-.2-4.1-.6-6.3-1.3z" fill="currentColor"/></svg>',
  lowVision: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" fill="currentColor"/></svg>',
  dyslexia: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z" fill="currentColor"/></svg>',
  seizure: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>',
  adhd: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
  motor: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v10H3zM6 10h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2zM7 14h10v1.5H7z" fill="currentColor"/></svg>',
  elderly: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="4" r="2" fill="currentColor"/><path d="M9 7h3l2 5 3 1v2l-4-1-1-2-1 4 2 6h-2l-2-5-1 5H6l2-9z" fill="currentColor"/><path d="M17 13v9" stroke="currentColor" stroke-width="1.6"/></svg>',
};

/** Accent өнгийг цагаан дэвсгэр дээр ≥4.5:1, дээрх текстийг ≥4.5:1 болгоно */
function accentPair(color) {
  let c = parseColor(color) || [11, 75, 209, 1];
  c = adjustForContrast(c, [255, 255, 255, 1], 4.6);
  const text = contrastRatio([255, 255, 255], c) >= 4.5 ? '#ffffff' : '#000000';
  return [toCss(c), text];
}

export function createWidget({ doc, win, config, prefs, t, getLang, setLang, onAudit, getReport, runtime }) {
  const host = doc.createElement('div');
  host.setAttribute(HOST_ATTR, 'widget');
  const shadow = host.attachShadow({ mode: 'open' });
  const [accent, accentText] = accentPair(config.color);
  const pos = config.position || 'bottom-right';
  const [ox, oy] = [config.offsetX ?? 16, config.offsetY ?? 16];

  shadow.innerHTML = `<style${config.nonce ? ` nonce="${esc(config.nonce)}"` : ''}>${css(accent, accentText)}</style>
<div class="root pos-${esc(pos)}">
  <button type="button" class="launcher${config.launcher === false ? ' hidden' : ''}" aria-expanded="false" aria-controls="hj-panel" aria-keyshortcuts="${esc(config.shortcutLabel || 'Alt+Shift+A')}">${ICONS.person}<span class="sr" data-t="launcher"></span></button>
  <div class="panel" id="hj-panel" role="dialog" aria-modal="false" aria-labelledby="hj-title" hidden></div>
  <div class="sr" role="status" aria-live="polite" id="hj-status"></div>
  <div class="guide" aria-hidden="true" hidden></div>
  <div class="mask m1" aria-hidden="true" hidden></div><div class="mask m2" aria-hidden="true" hidden></div>
</div>`;
  const $ = (s) => shadow.querySelector(s);
  const root = $('.root');
  // CSSOM-оор тохируулна — inline style атрибут CSP-д хориглогдоно
  root.style.setProperty('--ox', `${+ox || 0}px`);
  root.style.setProperty('--oy', `${+oy || 0}px`);
  const launcher = $('.launcher');
  const panel = $('#hj-panel');
  const status = $('#hj-status');
  let open = false;
  let lastFocus = null;

  const say = (msg) => { status.textContent = ''; win.setTimeout(() => { status.textContent = msg; }, 50); };

  function sw(key) {
    const p = prefs.get();
    return `<button type="button" class="switch" role="switch" aria-checked="${!!p[key]}" data-pref="${key}"><span>${esc(t(key))}</span><span class="track" aria-hidden="true"></span></button>`;
  }
  function radios(key, opts) {
    const p = prefs.get();
    return `<fieldset><legend>${esc(t(key))}</legend><div class="radios">${opts.map((o) => `<label><input type="radio" name="hj-${key}" value="${o}" data-radio="${key}"${p[key] === o ? ' checked' : ''}><span>${esc(t(`${key}_${o}`))}</span></label>`).join('')}</div></fieldset>`;
  }

  function auditHtml() {
    const r = getReport();
    if (!r) return `<p class="note">…</p>`;
    const lang = getLang();
    const items = r.findings.slice(0, 60).map((f) => `<li>
      <span class="badge ${f.fixed ? 'b-fixed' : f.outcome === 'fail' ? 'b-fail' : 'b-review'}">${esc(f.fixed ? t('auditFixed') : f.outcome === 'fail' ? t('auditFail') : t('auditReview'))}</span>
      <strong>${esc(f.sc.join(', '))}</strong> · ${esc(f.impact)}
      <div>${esc(messageText(f, lang))}</div>
      ${f.fixed && f.fix ? `<div class="meta">✓ ${esc(f.fix[lang] || f.fix.en)}</div>` : ''}
      ${f.selector ? `<div class="meta"><code>${esc(f.selector)}</code></div><button type="button" class="btn small" data-show="${esc(f.id)}">${esc(t('auditShow'))}<span class="sr"> ${esc(f.sc.join(', '))}</span></button>` : ''}
    </li>`).join('');
    return `<div class="stats">
      <div class="stat"><b>${r.summary.remaining}</b>${esc(t('auditFail'))}</div>
      <div class="stat"><b>${r.summary.review}</b>${esc(t('auditReview'))}</div>
      <div class="stat"><b>${r.summary.fixed}</b>${esc(t('auditFixed'))}</div>
    </div>
    <p class="note">${esc(t('auditManual'))}: ${r.summary.criteria.manualOnly} / ${r.summary.criteria.total} · WCAG 2.2 ${esc(r.level)}</p>
    <p class="note">${esc(t('auditDisclaimer'))}</p>
    <div class="row"><button type="button" class="btn" data-act="audit">${esc(t('auditRun'))}</button><button type="button" class="btn" data-act="export">${esc(t('auditExport'))}</button></div>
    <ol>${items}</ol>`;
  }

  function render() {
    const p = prefs.get();
    const lang = getLang();
    host.setAttribute('lang', lang);
    shadow.querySelectorAll('[data-t]').forEach((n) => { n.textContent = t(n.dataset.t); });
    launcher.setAttribute('title', `${t('launcher')} (${config.shortcutLabel || 'Alt+Shift+A'})`);
    const langs = config.languages || ['mn', 'en'];
    const langNames = { mn: 'Монгол', en: 'English', ru: 'Русский', kk: 'Қазақша', zh: '中文', ko: '한국어', ja: '日本語' };
    const pct = Math.round(p.fontScale * 100);
    panel.innerHTML = `
<div class="head">
  <div class="t"><h2 id="hj-title" tabindex="-1">${esc(t('title'))}</h2><p>${esc(t('subtitle'))}</p></div>
  <div class="hbtns">
    ${langs.length > 1 ? `<label class="sr" for="hj-lang">${esc(t('language'))}</label><select class="lang" id="hj-lang">${langs.map((l) => `<option value="${l}" lang="${l}"${l === lang ? ' selected' : ''}>${esc(langNames[l] || l)}</option>`).join('')}</select>` : ''}
    <button type="button" class="close" data-act="close" aria-label="${esc(t('close'))}">×</button>
  </div>
</div>
<div class="body">
  <section aria-labelledby="hj-s1"><h3 id="hj-s1">${esc(t('profiles'))}</h3>
    <div class="grid">${Object.keys(PROFILES).filter((k) => !config.profiles || config.profiles.includes(k)).map((k) => `<button type="button" class="chip" aria-pressed="${prefs.profileActive(k)}" data-profile="${k}">${ICONS[k] || ''}<span>${esc(t(`profile_${k}`))}</span></button>`).join('')}</div>
  </section>
  <section aria-labelledby="hj-s2"><h3 id="hj-s2">${esc(t('content'))}</h3>
    <div class="row" role="group" aria-labelledby="hj-fs-l">
      <span id="hj-fs-l">${esc(t('fontScale'))}</span>
      <span class="stepper">
        <button type="button" class="step" data-act="font-dec" aria-label="${esc(t('decrease'))}: ${esc(t('fontScale'))}"${p.fontScale <= 1 ? ' disabled' : ''}>−</button>
        <output id="hj-fs" aria-live="polite">${pct}%</output>
        <button type="button" class="step" data-act="font-inc" aria-label="${esc(t('increase'))}: ${esc(t('fontScale'))}"${p.fontScale >= 2 ? ' disabled' : ''}>+</button>
      </span>
    </div>
    ${sw('textSpacing')}${sw('readableFont')}${sw('alignLeft')}${sw('highlightLinks')}${sw('highlightHeadings')}${'speechSynthesis' in win ? sw('tts') : ''}
  </section>
  <section aria-labelledby="hj-s3"><h3 id="hj-s3">${esc(t('color'))}</h3>
    ${radios('contrast', ['default', 'light', 'dark', 'invert'])}
    ${radios('saturation', ['default', 'low', 'high', 'mono'])}
  </section>
  <section aria-labelledby="hj-s4"><h3 id="hj-s4">${esc(t('navigation'))}</h3>
    ${sw('stopMotion')}${sw('focusRing')}${sw('bigCursor')}${sw('largeTargets')}${sw('hideImages')}
    ${radios('readingGuide', ['off', 'line', 'mask'])}
  </section>
  ${config.auditor ? `<section class="audit" aria-labelledby="hj-s5"><h3 id="hj-s5">${esc(t('auditor'))}</h3>${auditHtml()}</section>` : ''}
</div>
<div class="foot">
  <button type="button" class="btn primary" data-act="reset">${esc(t('reset'))}</button>
  ${config.statementUrl ? `<a href="${esc(config.statementUrl)}">${esc(t('statement'))}</a>` : ''}
  ${config.feedbackUrl ? `<a href="${esc(config.feedbackUrl)}">${esc(t('feedback'))}</a>` : ''}
  <span class="brand">${esc(t('poweredBy'))}</span>
</div>`;
  }

  function focusKey(sel) {
    const n = sel && panel.querySelector(sel);
    if (n && !n.disabled) n.focus(); else panel.querySelector('#hj-title')?.focus();
  }

  function rerender(keepSel) { render(); focusKey(keepSel); updateGuide(); }

  function keyOf(el) {
    if (!el) return null;
    for (const a of ['data-pref', 'data-profile', 'data-act', 'data-show']) if (el.hasAttribute?.(a)) return `[${a}="${el.getAttribute(a)}"]`;
    if (el.dataset?.radio) return `input[data-radio="${el.dataset.radio}"][value="${el.value}"]`;
    if (el.id) return `#${el.id}`;
    return null;
  }

  /** @param {Element} [opener] — самбарыг нээсэн хуудасны элемент (data-hurteemj-open) */
  function show(opener) {
    if (open) return;
    open = true;
    lastFocus = opener || (doc.activeElement && doc.activeElement !== doc.body && !host.contains(doc.activeElement) ? doc.activeElement : null);
    render();
    panel.hidden = false;
    launcher.setAttribute('aria-expanded', 'true');
    panel.querySelector('#hj-title').focus();
  }
  function hide() {
    if (!open) return;
    open = false;
    panel.hidden = true;
    launcher.setAttribute('aria-expanded', 'false');
    // Фокусыг нээхээс өмнө байсан элемент рүү буцаана (ARIA dialog pattern, 2.4.3); байхгүй бол launcher руу
    const back = lastFocus && lastFocus.isConnected && typeof lastFocus.focus === 'function' ? lastFocus : null;
    if (back) back.focus();
    if ((!back || doc.activeElement !== back) && config.launcher !== false) launcher.focus();
    lastFocus = null;
  }
  const toggle = () => (open ? hide() : show());

  launcher.addEventListener('click', toggle);

  panel.addEventListener('click', (e) => {
    const el = e.target.closest('button');
    if (!el) return;
    const key = keyOf(el);
    if (el.dataset.pref) {
      const k = el.dataset.pref;
      const v = !prefs.get()[k];
      prefs.set({ [k]: v });
      say(`${t(k)}: ${v ? t('on') : t('off')}`);
      return rerender(key);
    }
    if (el.dataset.profile) {
      const k = el.dataset.profile;
      const on = !prefs.profileActive(k);
      prefs.applyProfile(k, on);
      say(`${t(`profile_${k}`)}: ${on ? t('on') : t('off')}`);
      return rerender(key);
    }
    if (el.dataset.show) return highlight(el.dataset.show);
    switch (el.dataset.act) {
      case 'close': return hide();
      case 'font-inc': prefs.set({ fontScale: prefs.get().fontScale + 0.1 }); return rerender(prefs.get().fontScale >= 2 ? '[data-act="font-dec"]' : key);
      case 'font-dec': prefs.set({ fontScale: prefs.get().fontScale - 0.1 }); return rerender(prefs.get().fontScale <= 1 ? '[data-act="font-inc"]' : key);
      case 'reset': prefs.reset(); say(t('resetDone')); return rerender(key);
      case 'audit': return Promise.resolve(onAudit()).then(() => rerender(key));
      case 'export': return exportJson();
      default:
    }
  });

  panel.addEventListener('change', (e) => {
    const el = e.target;
    if (el.id === 'hj-lang') { setLang(el.value); return rerender('#hj-lang'); }
    if (el.dataset.radio) {
      prefs.set({ [el.dataset.radio]: el.value });
      say(`${t(el.dataset.radio)}: ${t(`${el.dataset.radio}_${el.value}`)}`);
      rerender(keyOf(el));
    }
  });

  // Esc — хаах; Tab-ыг хавхлахгүй (non-modal dialog)
  shadow.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); e.stopPropagation(); hide(); }
  });

  function matchShortcut(e) {
    const sc = (config.shortcut ?? 'alt+shift+a');
    if (!sc) return false;
    const parts = sc.toLowerCase().split('+');
    const key = parts.pop();
    return e.altKey === parts.includes('alt') && e.shiftKey === parts.includes('shift') && e.ctrlKey === parts.includes('ctrl') && e.metaKey === parts.includes('meta') && (e.key.toLowerCase() === key || e.code.toLowerCase() === `key${key}`);
  }
  const onKey = (e) => { if (matchShortcut(e)) { e.preventDefault(); toggle(); } };
  doc.addEventListener('keydown', onKey, true);

  // Хуудасны [data-hurteemj-open] элементүүд самбарыг нээнэ (өөрийн товчтой интеграц)
  const onOpenTrigger = (e) => { const tr = e.target.closest?.('[data-hurteemj-open]'); if (tr) { e.preventDefault(); show(tr); } };
  doc.addEventListener('click', onOpenTrigger);

  // Launcher нь фокустай элементийг далдлахаас сэргийлэх (2.4.11)
  const onFocusIn = (e) => {
    if (host.contains(e.target) || e.target === host) return;
    const r = e.target.getBoundingClientRect?.();
    const l = launcher.getBoundingClientRect();
    if (!r) return;
    const overlap = !(r.right < l.left || r.left > l.right || r.bottom < l.top || r.top > l.bottom);
    if (overlap) root.classList.toggle('dodge');
  };
  doc.addEventListener('focusin', onFocusIn);

  // ---- Уншлагын туслах ----
  const guide = $('.guide'), m1 = $('.m1'), m2 = $('.m2');
  let lastY = -100;
  const onMove = (e) => { lastY = e.clientY; placeGuide(); };
  function placeGuide() {
    const mode = prefs.get().readingGuide;
    if (mode === 'line') guide.style.top = `${lastY}px`;
    if (mode === 'mask') {
      const h = 90;
      m1.style.top = '0px'; m1.style.height = `${Math.max(0, lastY - h / 2)}px`;
      m2.style.top = `${lastY + h / 2}px`; m2.style.bottom = '0px';
    }
  }
  function updateGuide() {
    const mode = prefs.get().readingGuide;
    guide.hidden = mode !== 'line';
    m1.hidden = m2.hidden = mode !== 'mask';
    if (mode !== 'off') { if (lastY < 0) lastY = win.innerHeight / 3; placeGuide(); }
  }
  doc.addEventListener('pointermove', onMove, { passive: true });

  // ---- Текст унших (TTS) ----
  const synth = win.speechSynthesis;
  const onTtsClick = (e) => {
    if (!prefs.get().tts || !synth || host.contains(e.target)) return;
    const sel = String(win.getSelection?.() || '').trim();
    const el = e.target.closest?.('p, li, h1, h2, h3, h4, h5, h6, td, th, figcaption, blockquote, label, a, button, dd, dt, span, div');
    const text = sel || (el ? (el.innerText || el.textContent || '').trim().slice(0, 1200) : '');
    if (!text) return;
    synth.cancel();
    const u = new win.SpeechSynthesisUtterance(text);
    const pageLang = (el?.closest('[lang]')?.getAttribute('lang') || doc.documentElement.lang || getLang()).toLowerCase();
    u.lang = pageLang;
    const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(pageLang.split('-')[0]));
    if (voice) u.voice = voice; else if (pageLang.startsWith('mn')) say(t('ttsNoVoice'));
    u.rate = 0.95;
    synth.speak(u);
  };
  doc.addEventListener('click', onTtsClick, true);
  const onEscTts = (e) => { if (e.key === 'Escape') synth?.cancel(); };
  doc.addEventListener('keydown', onEscTts);

  // ---- Тайлангийн элементийг тодруулах ----
  function highlight(id) {
    const f = getReport()?.findings.find((x) => x.id === id);
    const n = f?.node;
    if (!n || !n.isConnected) return;
    n.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = n.getBoundingClientRect();
    const box = doc.createElement('div');
    box.className = 'hl';
    Object.assign(box.style, { left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
    root.appendChild(box);
    say(messageText(f, getLang()));
    win.setTimeout(() => box.remove(), 3500);
  }

  function exportJson() {
    const r = getReport();
    if (!r) return;
    const blob = new Blob([JSON.stringify(serialize(r, getLang()), null, 2)], { type: 'application/json' });
    const a = doc.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hurteemj-report-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.setAttribute(HOST_ATTR, 'download');
    doc.body.appendChild(a); a.click(); a.remove();
    win.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  render();
  (doc.body || doc.documentElement).appendChild(host);
  updateGuide();

  return {
    host,
    open: () => show(),
    close: hide,
    toggle,
    refresh: () => { if (open) rerender(keyOf(shadow.activeElement)); updateGuide(); },
    destroy() {
      doc.removeEventListener('keydown', onKey, true);
      doc.removeEventListener('click', onOpenTrigger);
      doc.removeEventListener('focusin', onFocusIn);
      doc.removeEventListener('pointermove', onMove);
      doc.removeEventListener('click', onTtsClick, true);
      doc.removeEventListener('keydown', onEscTts);
      synth?.cancel();
      host.remove();
    },
  };
}
