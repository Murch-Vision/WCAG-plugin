/** Бие даасан хяналтын (review round 2) олдворуудын regression тестүүд */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { chromium, createPageFactory } from './helpers.js';

let browser;
const { page, cleanup } = createPageFactory(() => browser);
before(async () => { browser = await chromium.launch(); });
after(async () => { await browser?.close(); cleanup(); });

const findings = (p, ruleId) => p.evaluate((id) => H.report.findings.filter((f) => f.ruleId === id).map((f) => ({ outcome: f.outcome, fixed: f.fixed, selector: f.selector })), ruleId);

test('focus-visible: ":focus{outline:none}" + ":focus-visible{outline}" зөв загварыг зөрчил гэж үзэхгүй', async () => {
  const { p, ctx } = await page(`<style>
      button:focus { outline: none } button:focus-visible { outline: 2px solid #005fcc }
      a:focus:not(:focus-visible) { outline: none }
      .x:focus { outline: 0 } .x:focus-visible { box-shadow: 0 0 0 3px #000 }
    </style><main><h1>T</h1><button>B</button> <a href="#">L</a> <input class="x" aria-label="x"></main>`, { fix: 'safe' });
  assert.deepEqual(await findings(p, 'focus-visible'), []);
  assert.equal(await p.evaluate(() => !!document.querySelector('style[data-hurteemj-ui="focus-ring"]')), false, 'глобал тойм нэмэх ёсгүй');
  await ctx.close();
  // Харьцуулалт: зөвхөн outline:none, :focus-visible-гүй → fail
  const b = await page('<style>a:focus{outline:none}</style><main><h1>T</h1><a href="#">L</a></main>', { fix: false });
  assert.deepEqual((await findings(b.p, 'focus-visible')).map((f) => f.outcome), ['fail']);
  await b.ctx.close();
});

test('click-without-keyboard: event delegation container (React root) control биш; leaf div нь зөрчил', async () => {
  const { p, ctx } = await page(`<div id="root"><main><h1>App</h1><button>OK</button><p>Контент</p></main></div><div id="leaf">Дарах</div>`,
    { fix: 'heuristic' }, { beforeScript: () => { window.HurteemjConfig.trackListeners = true; } });
  // init-ээс өмнө listener-уудыг холбоно (trackListeners нь addEventListener-ийг ажигладаг)
  await p.evaluate(async () => {
    H.destroy();
    document.getElementById('root').addEventListener('click', () => {});
    document.getElementById('leaf').addEventListener('click', () => {});
    document.getElementById('root').addEventListener('pointerdown', () => {});
    const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ observe: false, widget: false, fix: 'heuristic', force: true });
    await ready;
  });
  const f = await findings(p, 'click-without-keyboard');
  assert.deepEqual(f.map((x) => [x.selector, x.outcome, x.fixed]), [['#leaf', 'fail', true]]);
  assert.equal(await p.evaluate(() => document.getElementById('root').getAttribute('role')), null, 'root-д role="button" өгөх ёсгүй');
  await ctx.close();
});

test('Самбар нээлттэй байхад SPA шинэчлэлт хуудасны фокусыг булаахгүй', async () => {
  const { p, ctx } = await page('<main><h1>T</h1><input id="q" aria-label="Хайх"></main>', { fix: false, widget: true, observe: true });
  await p.evaluate(() => H.open());
  await p.focus('#q');
  await p.keyboard.type('аб');
  await p.evaluate(() => { history.pushState({}, '', '#r'); const d = document.createElement('p'); d.textContent = 'Хайлтын үр дүн'; document.querySelector('main').appendChild(d); });
  await p.waitForTimeout(1500);
  assert.equal(await p.evaluate(() => document.activeElement.id), 'q');
  // Фокус самбар дотор байсан бол хэвээр үлдэнэ
  await p.evaluate(() => document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot.querySelector('[data-pref="textSpacing"]').focus());
  await p.evaluate(() => { history.pushState({}, '', '#s'); });
  await p.waitForTimeout(1200);
  assert.equal(await p.evaluate(() => document.querySelector('[data-hurteemj-ui="widget"]').shadowRoot.activeElement?.dataset.pref), 'textSpacing');
  await ctx.close();
});

test('color-contrast: pointer-events:none дэвсгэр дээрх цагаан текстийг зөв тооцно', async () => {
  const { p, ctx } = await page(`<main><h1>T</h1>
    <div style="background:#000;pointer-events:none;padding:8px"><p id="cap" style="color:#fff">Caption on black</p></div>
    <p id="bad" style="color:#aaa">Low contrast on white</p></main>`, { fix: false });
  const f = await findings(p, 'color-contrast');
  assert.deepEqual(f.map((x) => x.selector), ['#bad']);
  await ctx.close();
});

test('Safe засвар "хянах" олдворт хэрэглэгдэхгүй (muted loop видеонд controls нэмэхгүй)', async () => {
  const { p, ctx } = await page(`<main><h1>T</h1><video id="hero" autoplay muted loop playsinline src="x.mp4"></video>
    <p style="color:#1a1a1a">Текст <a id="lnk" href="#" style="color:#c00;text-decoration:none;box-shadow:inset 0 -2px #c00">холбоос</a> үргэлжлэл энд байна.</p></main>`, { fix: 'safe' });
  assert.equal(await p.evaluate(() => document.getElementById('hero').hasAttribute('controls')), false);
  assert.deepEqual(await findings(p, 'link-in-text-block'), [], 'box-shadow доогуур зураасыг хүлээн зөвшөөрнө');
  // Харин "хянах" олдворт зориулсан (onReview) засвар ажиллана: landmark-main
  const b = await page('<div id="content"><h1>T</h1><p>Урт агуулга</p></div>', { fix: 'heuristic' });
  assert.equal(await b.p.evaluate(() => document.getElementById('content').getAttribute('role')), 'main');
  await b.ctx.close();
  await ctx.close();
});

test('link-purpose: хуваалцсан container-т холбоосын ӨМНӨХ гарчгийг авна', async () => {
  const { p, ctx } = await page(`<main><h1>T</h1><section>
    <div class="col"><h3>Post A</h3><p>a</p><a id="a" href="/a">Дэлгэрэнгүй</a></div>
    <div class="col"><h3>Post B</h3><p>b</p><a id="b" href="/b">Дэлгэрэнгүй</a></div>
    <div class="col"><a id="c" href="/c">Дэлгэрэнгүй</a><h3>Post C</h3></div>
  </section></main>`, { fix: 'heuristic' });
  const labels = await p.evaluate(() => ['a', 'b', 'c'].map((id) => document.getElementById(id).getAttribute('aria-label')));
  assert.deepEqual(labels, ['Дэлгэрэнгүй: Post A', 'Дэлгэрэнгүй: Post B', 'Дэлгэрэнгүй: Post B']);
  await ctx.close();
});

test('Хоосон data-* атрибут (data-lang="", data-only="", data-shortcut="") plugin-ийг унагахгүй', async () => {
  const { p, ctx, errors } = await page('<main><h1>T</h1><p>x</p></main>', {}, { init: false });
  await p.evaluate(async () => {
    const attrs = { 'data-lang': '', 'data-only': '', 'data-shortcut': '', 'data-languages': '', 'data-auditor': '', 'data-fix': 'false' };
    const cfg = Hurteemj.configFromScript({ getAttribute: (n) => attrs[n] ?? null });
    const ready = new Promise((r) => document.addEventListener('hurteemj:ready', r, { once: true }));
    window.H = Hurteemj.init({ ...cfg, observe: false, widget: true, force: true });
    await ready;
  });
  await p.keyboard.press('Alt+Shift+A');
  await p.keyboard.press('a');
  const r = await p.evaluate(() => ({ auditor: H.config.auditor, fix: H.config.fix, only: H.config.only, lang: H.config.lang, shortcut: H.config.shortcut, report: !!H.report }));
  assert.deepEqual(r, { auditor: true, fix: false, only: null, lang: null, shortcut: 'alt+shift+a', report: true });
  assert.deepEqual(errors, []);
  await ctx.close();
});

test('aria-hidden-focus: modal нээлттэй үед арын aria-hidden-ыг авахгүй; off-screen drawer-ыг нуусан хэвээр', async () => {
  const { p, ctx } = await page(`<div id="app" aria-hidden="true"><main><h1>T</h1><button id="bg">Ар</button></main></div>
    <div role="dialog" aria-modal="true" aria-label="Диалог"><button>OK</button></div>`, { fix: 'heuristic' });
  const r = await p.evaluate(() => ({
    app: document.getElementById('app').getAttribute('aria-hidden'),
    outcomes: H.report.findings.filter((f) => f.ruleId === 'aria-hidden-focus').map((f) => [f.selector, f.outcome]),
  }));
  assert.equal(r.app, 'true');
  assert.deepEqual(r.outcomes, [['#bg', 'review']]);
  await ctx.close();
  // Modal-гүй: дэлгэцийн гадна байгаа drawer → aria-hidden хэвээр, дотоод холбоос фокусаас хасагдана; дэлгэц дээрх хэсэг → aria-hidden арилна
  const b = await page(`<main><h1>T</h1><div id="vis" aria-hidden="true"><button id="vb">Харагдана</button></div></main>
    <nav id="drawer" aria-hidden="true" style="position:fixed;left:-300px;top:0;width:250px"><a id="dl" href="#">Цэс</a></nav>`, { fix: 'heuristic' });
  const r2 = await b.p.evaluate(() => ({
    vis: document.getElementById('vis').getAttribute('aria-hidden'),
    drawer: document.getElementById('drawer').getAttribute('aria-hidden'),
    dl: document.getElementById('dl').getAttribute('tabindex'),
  }));
  assert.deepEqual(r2, { vis: null, drawer: 'true', dl: '-1' });
  await b.ctx.close();
});

test('non-text-contrast: input[type=file] болон box-shadow ring-тэй талбарыг зөрчил гэхгүй; role=menu нэр шаардахгүй', async () => {
  const { p, ctx } = await page(`<main><h1>T</h1><label>Файл <input type="file"></label>
    <input id="ring" aria-label="r" style="border:0;background:#fff;box-shadow:0 0 0 2px #333">
    <ul role="menu"><li role="menuitem" tabindex="0">A</li></ul><div role="toolbar"><button>B</button></div></main>`, { fix: false });
  assert.deepEqual(await findings(p, 'non-text-contrast'), []);
  assert.deepEqual(await findings(p, 'aria-name-required'), []);
  await ctx.close();
});

test('stopMotion: тохиргоо өөрчлөх бүрт дахин зогсоохгүй; GIF canvas нь plugin-ийн элемент', async () => {
  const { p, ctx } = await page(`<main><h1>T</h1><div id="a" style="width:20px;height:20px;background:red"></div><div id="b" style="width:20px;height:20px;background:blue"></div>
    <img id="gif" src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="" width="10" height="10"></main>`, { fix: false });
  await p.waitForFunction(() => document.getElementById('gif').complete && document.getElementById('gif').naturalWidth > 0);
  const r = await p.evaluate(async () => {
    const a = document.getElementById('a').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 10000, iterations: Infinity });
    H.prefs.set({ stopMotion: true });
    const aPaused = a.playState;
    // Хэрэглэгч ДАРАА нь анимаци эхлүүлнэ (жишээ нь modal нээгдэх)
    const b = document.getElementById('b').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 10000, iterations: Infinity });
    H.prefs.set({ fontScale: 1.2 });
    const c = document.querySelector('canvas[data-hurteemj-ui="gif"]');
    const rep = Hurteemj.auditPage({});
    return { aPaused, bAfter: b.playState, canvas: !!c, hidden: c?.getAttribute('aria-hidden'), canvasFindings: rep.findings.filter((f) => f.node?.localName === 'canvas').length };
  });
  assert.equal(r.aPaused, 'paused');
  assert.equal(r.bAfter, 'running', 'дараа эхэлсэн анимацийг fontScale өөрчлөхөд зогсоох ёсгүй');
  assert.equal(r.canvas, true);
  assert.equal(r.hidden, 'true');
  assert.equal(r.canvasFindings, 0);
  await p.evaluate(() => H.prefs.set({ stopMotion: false }));
  assert.equal(await p.evaluate(() => !!document.querySelector('canvas[data-hurteemj-ui="gif"]')), false);
  await ctx.close();
});
