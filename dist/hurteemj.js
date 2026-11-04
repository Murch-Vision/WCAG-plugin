/*! hurteemj v1.0.0 | WCAG 2.2 | MIT */
(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // src/index.js
  var index_exports = {};
  __export(index_exports, {
    DEFAULTS: () => DEFAULTS,
    DEFAULT_PREFS: () => DEFAULT_PREFS,
    PROFILES: () => PROFILES,
    STRINGS: () => STRINGS,
    VERSION: () => VERSION,
    auditPage: () => auditPage,
    configFromScript: () => configFromScript,
    criteria: () => criteria,
    criteriaForLevel: () => criteriaForLevel,
    default: () => index_default,
    init: () => init,
    rules: () => rules,
    serialize: () => serialize,
    trackListeners: () => trackListeners
  });

  // src/core/dom.js
  var HOST_ATTR = "data-hurteemj-ui";
  function qsa(root, selector, { shadow = true } = {}) {
    const out = [];
    const visit = (r) => {
      r.querySelectorAll(selector).forEach((el) => out.push(el));
      if (!shadow) return;
      r.querySelectorAll("*").forEach((el) => {
        if (el.shadowRoot && !el.hasAttribute(HOST_ATTR)) visit(el.shadowRoot);
      });
    };
    visit(root);
    return out;
  }
  function isOwnUi(el) {
    return !!(el && el.closest && el.closest(`[${HOST_ATTR}]`));
  }
  function isIgnored(el, ignore) {
    if (isOwnUi(el)) return true;
    if (!ignore || !ignore.length) return false;
    return ignore.some((sel) => {
      try {
        return !!el.closest(sel);
      } catch {
        return false;
      }
    });
  }
  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    if (el.checkVisibility) {
      if (!el.checkVisibility({ checkOpacity: false, checkVisibilityCSS: true })) return false;
    } else {
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) {
        const s = getComputedStyle(n);
        if (s.display === "none") return false;
      }
      if (getComputedStyle(el).visibility === "hidden") return false;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0 && getComputedStyle(el).overflow !== "visible") return false;
    return true;
  }
  function isHiddenFromAT(el) {
    var _a3;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement || ((_a3 = n.getRootNode) == null ? void 0 : _a3.call(n).host)) {
      if (n.getAttribute("aria-hidden") === "true") return true;
      if (n.hidden || n.inert) return true;
      const s = getComputedStyle(n);
      if (s.display === "none") return true;
      if (n === el && s.visibility === "hidden") return true;
    }
    return false;
  }
  function isVisuallyHidden(el) {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    if (r.width <= 1 && r.height <= 1) return true;
    if (s.clip === "rect(0px, 0px, 0px, 0px)" || s.clipPath === "inset(50%)") return true;
    return false;
  }
  var FOCUSABLE_SEL = [
    "a[href]",
    "area[href]",
    "button:not([disabled])",
    'input:not([disabled]):not([type="hidden"])',
    "select:not([disabled])",
    "textarea:not([disabled])",
    "iframe",
    "summary",
    '[contenteditable=""]',
    '[contenteditable="true"]',
    "audio[controls]",
    "video[controls]",
    "[tabindex]"
  ].join(",");
  function isFocusable(el) {
    if (!el.matches(FOCUSABLE_SEL)) return false;
    if (el.getAttribute("tabindex") !== null && +el.getAttribute("tabindex") < 0) return false;
    if (el.closest("[inert]")) return false;
    return true;
  }
  var INPUT_ROLES = {
    button: "button",
    submit: "button",
    reset: "button",
    image: "button",
    checkbox: "checkbox",
    radio: "radio",
    range: "slider",
    number: "spinbutton",
    search: "searchbox",
    email: "textbox",
    tel: "textbox",
    text: "textbox",
    url: "textbox",
    password: "textbox",
    "": "textbox"
  };
  function getRole(el) {
    const explicit = (el.getAttribute("role") || "").trim().split(/\s+/)[0];
    if (explicit) return explicit;
    const tag = el.localName;
    switch (tag) {
      case "a":
      case "area":
        return el.hasAttribute("href") ? "link" : null;
      case "button":
        return "button";
      case "input": {
        const t = (el.getAttribute("type") || "").toLowerCase();
        if (t === "hidden") return null;
        if (["text", "search", "email", "tel", "url", ""].includes(t) && el.hasAttribute("list")) return "combobox";
        return INPUT_ROLES[t] ?? "textbox";
      }
      case "select":
        return el.multiple || el.size > 1 ? "listbox" : "combobox";
      case "textarea":
        return "textbox";
      case "img":
        return el.getAttribute("alt") === "" ? "presentation" : "img";
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        return "heading";
      case "nav":
        return "navigation";
      case "main":
        return "main";
      case "aside":
        return "complementary";
      case "header":
        return el.closest("article,aside,main,nav,section") ? null : "banner";
      case "footer":
        return el.closest("article,aside,main,nav,section") ? null : "contentinfo";
      case "form":
        return "form";
      case "section":
        return el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") ? "region" : null;
      case "ul":
      case "ol":
      case "menu":
        return "list";
      case "li":
        return "listitem";
      case "table":
        return "table";
      case "dialog":
        return "dialog";
      case "summary":
        return "button";
      case "svg":
        return "graphics-document";
      case "iframe":
        return null;
      case "progress":
        return "progressbar";
      case "meter":
        return "meter";
      case "output":
        return "status";
      default:
        return null;
    }
  }
  var NAME_FROM_CONTENT = /* @__PURE__ */ new Set([
    "button",
    "cell",
    "checkbox",
    "columnheader",
    "gridcell",
    "heading",
    "link",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "row",
    "rowheader",
    "switch",
    "tab",
    "tooltip",
    "treeitem",
    "listitem"
  ]);
  var norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  function accessibleName(el, { visited = /* @__PURE__ */ new Set(), inLabelledby = false, recursing = false } = {}) {
    if (!el || visited.has(el)) return "";
    visited.add(el);
    const getById = (id) => {
      var _a3, _b, _c;
      return ((_c = (_b = ((_a3 = el.getRootNode) == null ? void 0 : _a3.call(el)) || document).getElementById) == null ? void 0 : _c.call(_b, id)) || document.getElementById(id);
    };
    if (!inLabelledby && el.hasAttribute("aria-labelledby")) {
      const txt = el.getAttribute("aria-labelledby").split(/\s+/).map((id) => getById(id)).filter(Boolean).map((n) => accessibleName(n, { visited, inLabelledby: true, recursing: true }) || norm(n.textContent)).join(" ");
      if (norm(txt)) return norm(txt);
    }
    if (recursing && !inLabelledby && isHiddenFromAT(el)) return "";
    const aria = norm(el.getAttribute("aria-label"));
    if (aria) return aria;
    const tag = el.localName;
    if (["input", "select", "textarea", "meter", "progress", "output"].includes(tag)) {
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (tag === "input" && ["button", "submit", "reset"].includes(type)) {
        const v = norm(el.value || el.getAttribute("value"));
        if (v) return v;
        if (type === "submit") return "Submit";
        if (type === "reset") return "Reset";
      }
      if (tag === "input" && type === "image") {
        const alt = norm(el.getAttribute("alt"));
        if (alt) return alt;
      }
      const labels = el.labels ? Array.from(el.labels) : [];
      if (labels.length) {
        const t = labels.map((l) => textFromContent(l, visited, el)).join(" ");
        if (norm(t)) return norm(t);
      }
    }
    if (tag === "img" || tag === "area") {
      const alt = el.getAttribute("alt");
      if (alt !== null && norm(alt)) return norm(alt);
    }
    if (tag === "svg") {
      const t = el.querySelector(":scope > title");
      if (t && norm(t.textContent)) return norm(t.textContent);
    }
    if (tag === "fieldset") {
      const lg = el.querySelector(":scope > legend");
      if (lg) return norm(textFromContent(lg, visited));
    }
    if (tag === "table") {
      const cap = el.querySelector(":scope > caption");
      if (cap) return norm(cap.textContent);
    }
    if (tag === "figure") {
      const fc = el.querySelector(":scope > figcaption");
      if (fc) return norm(fc.textContent);
    }
    const role = getRole(el);
    if (inLabelledby || recursing || NAME_FROM_CONTENT.has(role) || tag === "summary") {
      const t = textFromContent(el, visited);
      if (norm(t)) return norm(t);
    }
    const title = norm(el.getAttribute("title"));
    if (title) return title;
    if (["input", "textarea"].includes(tag)) {
      const ph = norm(el.getAttribute("placeholder"));
      if (ph) return ph;
    }
    return "";
  }
  function textFromContent(root, visited, skip) {
    let out = "";
    root.childNodes.forEach((n) => {
      if (n.nodeType === 3) out += n.textContent;
      else if (n.nodeType === 1 && n !== skip) {
        if (n.getAttribute("aria-hidden") === "true" || n.hidden) return;
        const s = getComputedStyle(n);
        if (s.display === "none" || s.visibility === "hidden") return;
        if (["input", "select", "textarea"].includes(n.localName)) {
          out += " " + (n.value || "") + " ";
          return;
        }
        const block = s.display !== "inline" && s.display !== "contents";
        const part = accessibleName(n, { visited, recursing: true });
        out += block ? ` ${part} ` : part;
      }
    });
    try {
      const b = getComputedStyle(root, "::before").content;
      const a = getComputedStyle(root, "::after").content;
      const clean = (c) => c && c !== "none" && c !== "normal" && /^["']/.test(c) ? c.slice(1, -1) : "";
      out = clean(b) + out + clean(a);
    } catch {
    }
    return out;
  }
  function visibleText(el) {
    let out = "";
    const walk = (n) => {
      if (n.nodeType === 3) {
        out += n.textContent;
        return;
      }
      if (n.nodeType !== 1) return;
      const s = getComputedStyle(n);
      if (s.display === "none" || s.visibility === "hidden") return;
      if (n !== el && isVisuallyHidden(n)) return;
      if (n.localName === "img" && n.getAttribute("alt")) {
        out += " " + n.getAttribute("alt") + " ";
        return;
      }
      n.childNodes.forEach(walk);
    };
    walk(el);
    return norm(out);
  }
  function cssPath(el) {
    var _a3;
    if (!el || el.nodeType !== 1) return "";
    if (el === el.ownerDocument.documentElement) return "html";
    if (el === el.ownerDocument.body) return "body";
    if (el.id && /^[A-Za-z][\w-]*$/.test(el.id)) {
      const root = el.getRootNode();
      if (root.querySelectorAll(`#${el.id}`).length === 1) return `#${el.id}`;
    }
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n.localName !== "html"; n = n.parentElement) {
      let part = n.localName;
      if (n.id && /^[A-Za-z][\w-]*$/.test(n.id)) {
        parts.unshift(`#${n.id}`);
        break;
      }
      const parent = n.parentElement;
      if (parent) {
        const same = Array.from(parent.children).filter((c) => c.localName === n.localName);
        if (same.length > 1) part += `:nth-of-type(${same.indexOf(n) + 1})`;
      }
      parts.unshift(part);
    }
    const host = (_a3 = el.getRootNode()) == null ? void 0 : _a3.host;
    const sel = parts.join(" > ");
    return host ? `${cssPath(host)} >>> ${sel}` : sel;
  }
  function snippet(el, max = 160) {
    const html = el.outerHTML || "";
    const open = (html.slice(0, html.indexOf(">") + 1) || html).replace(/\svalue="[^"]*"/gi, ' value="…"');
    return open.length > max ? open.slice(0, max) + "…" : open;
  }
  var idle = (cb) => typeof requestIdleCallback === "function" ? requestIdleCallback(cb, { timeout: 800 }) : setTimeout(cb, 50);
  var normalize = norm;

  // src/rules/util.js
  var m = (mn, en) => ({ mn, en });
  var fail = (node, message, data) => ({ node, outcome: "fail", message, data });
  var review = (node, message, data) => ({ node, outcome: "review", message, data });
  function fmt(str, data = {}) {
    return String(str).replace(/\{(\w+)\}/g, (_, k) => data[k] ?? `{${k}}`);
  }
  function scriptOf(text) {
    let cyr = 0, lat = 0, mnOnly = 0;
    for (const ch of text) {
      if (/[Ѐ-ӿ]/.test(ch)) {
        cyr++;
        if (/[өүӨҮ]/.test(ch)) mnOnly++;
      } else if (/[A-Za-z]/.test(ch)) lat++;
    }
    const total = cyr + lat;
    if (total < 20) return { script: null, mnHint: false };
    return { script: cyr / total > 0.6 ? "Cyrl" : lat / total > 0.6 ? "Latn" : "mixed", mnHint: mnOnly > 0 };
  }
  var ICON_WORDS = {
    search: m("Хайх", "Search"),
    close: m("Хаах", "Close"),
    times: m("Хаах", "Close"),
    xmark: m("Хаах", "Close"),
    menu: m("Цэс", "Menu"),
    bars: m("Цэс", "Menu"),
    hamburger: m("Цэс", "Menu"),
    home: m("Нүүр", "Home"),
    cart: m("Сагс", "Cart"),
    basket: m("Сагс", "Cart"),
    user: m("Хэрэглэгч", "Account"),
    account: m("Хэрэглэгч", "Account"),
    facebook: m("Facebook", "Facebook"),
    twitter: m("X (Twitter)", "X (Twitter)"),
    instagram: m("Instagram", "Instagram"),
    youtube: m("YouTube", "YouTube"),
    linkedin: m("LinkedIn", "LinkedIn"),
    telegram: m("Telegram", "Telegram"),
    phone: m("Утас", "Phone"),
    envelope: m("И-мэйл", "Email"),
    mail: m("И-мэйл", "Email"),
    email: m("И-мэйл", "Email"),
    next: m("Дараах", "Next"),
    prev: m("Өмнөх", "Previous"),
    previous: m("Өмнөх", "Previous"),
    "chevron-right": m("Дараах", "Next"),
    "chevron-left": m("Өмнөх", "Previous"),
    "arrow-right": m("Дараах", "Next"),
    "arrow-left": m("Өмнөх", "Previous"),
    play: m("Тоглуулах", "Play"),
    pause: m("Түр зогсоох", "Pause"),
    download: m("Татах", "Download"),
    share: m("Хуваалцах", "Share"),
    edit: m("Засах", "Edit"),
    pen: m("Засах", "Edit"),
    trash: m("Устгах", "Delete"),
    delete: m("Устгах", "Delete"),
    settings: m("Тохиргоо", "Settings"),
    cog: m("Тохиргоо", "Settings"),
    gear: m("Тохиргоо", "Settings"),
    print: m("Хэвлэх", "Print"),
    heart: m("Таалагдсан", "Favorite"),
    star: m("Онцлох", "Favorite"),
    bell: m("Мэдэгдэл", "Notifications"),
    plus: m("Нэмэх", "Add"),
    add: m("Нэмэх", "Add"),
    minus: m("Хасах", "Remove"),
    info: m("Мэдээлэл", "Information"),
    help: m("Тусламж", "Help"),
    question: m("Тусламж", "Help"),
    globe: m("Хэл", "Language"),
    language: m("Хэл", "Language"),
    filter: m("Шүүх", "Filter"),
    login: m("Нэвтрэх", "Log in"),
    logout: m("Гарах", "Log out")
  };
  function guessIconName(el, lang) {
    const hay = [el, ...el.querySelectorAll("*")].slice(0, 6).map((n) => `${n.getAttribute("class") || ""} ${n.getAttribute("data-icon") || ""} ${n.getAttribute("href") || ""} ${n.localName === "use" ? n.getAttribute("href") || n.getAttribute("xlink:href") || "" : ""}`).join(" ").toLowerCase();
    const keys = Object.keys(ICON_WORDS).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      if (new RegExp(`(^|[^a-z])${k}([^a-z]|$)`).test(hay)) return ICON_WORDS[k][lang] || ICON_WORDS[k].en;
    }
    const href = el.getAttribute("href") || "";
    const dm = href.match(/^https?:\/\/(?:www\.)?([^/]+)/);
    if (dm) {
      const host = dm[1].split(".").slice(-2, -1)[0];
      if (ICON_WORDS[host]) return ICON_WORDS[host][lang] || ICON_WORDS[host].en;
    }
    return null;
  }
  var AMBIGUOUS_LINK_TEXT = /* @__PURE__ */ new Set([
    "энд",
    "энд дарна уу",
    "энд дар",
    "дарна уу",
    "дэлгэрэнгүй",
    "дэлгэрэнгүй унших",
    "цааш унших",
    "цааш нь",
    "үргэлжлүүлэх",
    "холбоос",
    "энэ",
    "энэ холбоос",
    "үзэх",
    "харах",
    "илүүг",
    "илүү ихийг",
    "more",
    "read more",
    "click here",
    "here",
    "learn more",
    "more info",
    "details",
    "link",
    "this",
    "continue",
    "go",
    "view",
    "see more",
    "read",
    "click"
  ]);

  // src/rules/media.js
  var FILENAME_RE = /^[\w\s()-]+\.(jpe?g|png|gif|webp|avif|svg|bmp|tiff?)$/i;
  var MEANINGLESS_ALT = /* @__PURE__ */ new Set([
    "image",
    "img",
    "photo",
    "picture",
    "icon",
    "logo",
    "graphic",
    "banner",
    "зураг",
    "фото",
    "зургийн",
    "дүрс",
    "икон",
    "лого",
    "баннер",
    "untitled",
    "placeholder",
    "spacer",
    "*",
    "-"
  ]);
  function controlHasOtherText(img) {
    const ctl = img.closest('a[href], button, [role="button"], [role="link"]');
    if (!ctl) return false;
    const clone = ctl.cloneNode(true);
    clone.querySelectorAll("img, svg").forEach((n) => n.remove());
    return normalize(clone.textContent).length > 0;
  }
  var media_default = [
    {
      id: "image-alt",
      sc: ["1.1.1"],
      impact: "critical",
      selector: "img",
      evaluate(el) {
        if (el.hasAttribute("alt")) return null;
        if (isHiddenFromAT(el)) return null;
        const role = el.getAttribute("role");
        if (role === "presentation" || role === "none") return null;
        if (el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")) return null;
        return fail(
          el,
          m(
            'Зурагт alt атрибут байхгүй. Утга бүхий зурагт агуулгыг нь тайлбарласан alt, чимэглэлийн зурагт alt="" өгнө үү.',
            'Image has no alt attribute. Give meaningful images descriptive alt text and decorative images alt="".'
          )
        );
      },
      fix: {
        tier: "safe",
        async apply(f, ctx) {
          var _a3;
          const img = f.node;
          if (controlHasOtherText(img)) {
            ctx.changes.setAttr(img, "alt", "", "image-alt");
            return m('Тексттэй холбоос доторх зургийг чимэглэл (alt="") болгов.', 'Marked image inside a labelled control as decorative (alt="").');
          }
          if (typeof ctx.config.altTextProvider === "function") {
            try {
              const alt = await ctx.config.altTextProvider(img.currentSrc || img.src, img, ctx.pageLang);
              if (alt && typeof alt === "string") {
                ctx.changes.setAttr(img, "alt", alt.trim(), "image-alt");
                ctx.changes.setAttr(img, "data-hj-alt-generated", "true", "image-alt");
                return m(`altTextProvider-оор alt үүсгэв: "${alt.trim()}" (хүн хянах шаардлагатай)`, `Generated alt via altTextProvider: "${alt.trim()}" (needs human review)`);
              }
            } catch (e) {
            }
          }
          if (ctx.tier === "heuristic") {
            const title = normalize(img.getAttribute("title"));
            if (title) {
              ctx.changes.setAttr(img, "alt", title, "image-alt");
              return m("title атрибутыг alt болгон ашиглав.", "Used the title attribute as alt text.");
            }
            const fig = (_a3 = img.closest("figure")) == null ? void 0 : _a3.querySelector("figcaption");
            if (fig && normalize(fig.textContent)) {
              ctx.changes.setAttr(img, "alt", "", "image-alt");
              return m('figcaption-тай зургийг давхар уншуулахгүйн тулд alt="" болгов.', 'Image is described by its figcaption; set alt="" to avoid duplication.');
            }
          }
          return false;
        }
      }
    },
    {
      id: "image-alt-quality",
      sc: ["1.1.1"],
      impact: "serious",
      selector: 'img[alt], input[type="image"][alt], area[alt]',
      evaluate(el) {
        const alt = normalize(el.getAttribute("alt"));
        if (!alt) return null;
        const src = (el.getAttribute("src") || "").split("/").pop().split("?")[0];
        if (FILENAME_RE.test(alt) || src && alt === src) {
          return fail(el, m(`alt текст нь файлын нэр байна ("${alt}"). Агуулгыг нь тайлбарлана уу.`, `Alt text is a file name ("${alt}"). Describe the image content instead.`));
        }
        if (MEANINGLESS_ALT.has(alt.toLowerCase())) {
          return review(el, m(`alt текст "${alt}" утга агуулахгүй байж магадгүй.`, `Alt text "${alt}" is likely not meaningful.`));
        }
        if (alt.length > 250) {
          return review(el, m("alt текст хэт урт (250+ тэмдэгт). Урт тайлбарыг aria-describedby эсвэл хуудсан дээр байрлуулна уу.", "Alt text is very long (250+ chars). Move long descriptions to the page or aria-describedby."));
        }
        return null;
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          if (f.outcome === "fail" && controlHasOtherText(f.node)) {
            ctx.changes.setAttr(f.node, "alt", "", "image-alt-quality");
            return m('Файлын нэр бүхий alt-ыг тексттэй холбоос дотор alt="" болгов.', 'Replaced filename alt with alt="" inside a labelled control.');
          }
          return false;
        }
      }
    },
    {
      id: "svg-img-name",
      sc: ["1.1.1"],
      impact: "serious",
      selector: 'svg[role="img"], [role="img"]:not(img):not(svg), svg:not([role]):not([aria-hidden="true"])',
      evaluate(el) {
        if (isHiddenFromAT(el)) return null;
        if (accessibleName(el)) return null;
        if (el.localName === "svg" && !el.hasAttribute("role")) {
          if (el.closest("svg:not(:scope)")) return null;
          const ctl = el.closest('a[href], button, [role="button"], [role="link"]');
          if (ctl && accessibleName(ctl)) return review(el, m('Нэртэй control доторх svg-д aria-hidden="true" өгвөл дэлгэц уншигчид давхардал гарахгүй.', 'Decorative svg inside a named control should have aria-hidden="true".'), { decorative: true });
          return null;
        }
        return fail(el, m('role="img" элемент нэргүй байна. aria-label эсвэл <title> нэмнэ үү.', 'Element with role="img" has no accessible name. Add aria-label or <title>.'));
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          var _a3;
          if ((_a3 = f.data) == null ? void 0 : _a3.decorative) {
            ctx.changes.setAttr(f.node, "aria-hidden", "true", "svg-img-name");
            ctx.changes.setAttr(f.node, "focusable", "false", "svg-img-name");
            return m('Чимэглэлийн svg-д aria-hidden="true" өгөв.', 'Added aria-hidden="true" to decorative svg.');
          }
          return false;
        }
      }
    },
    {
      id: "input-image-alt",
      sc: ["1.1.1", "4.1.2"],
      impact: "critical",
      selector: 'input[type="image"]',
      evaluate(el) {
        return accessibleName(el) ? null : fail(el, m("Зурган товч (input type=image) нэргүй. alt атрибут нэмнэ үү.", "Image button has no accessible name. Add an alt attribute."));
      }
    },
    {
      id: "area-alt",
      sc: ["1.1.1", "2.4.4"],
      impact: "critical",
      selector: "map area[href]",
      evaluate(el) {
        return accessibleName(el) ? null : fail(el, m("Зургийн газрын зургийн (image map) area элемент нэргүй.", "Image map <area> has no accessible name."));
      }
    },
    {
      id: "object-alt",
      sc: ["1.1.1"],
      impact: "serious",
      selector: "object, embed",
      evaluate(el) {
        if (isHiddenFromAT(el)) return null;
        const name = accessibleName(el) || normalize(el.localName === "object" ? el.textContent : "");
        return name ? null : fail(el, m(`<${el.localName}> элементэд текст хувилбар байхгүй.`, `<${el.localName}> has no text alternative.`));
      }
    },
    {
      id: "video-captions",
      sc: ["1.2.2", "1.2.4"],
      impact: "critical",
      selector: "video",
      evaluate(el) {
        if (el.querySelector('track[kind="captions"], track[kind="subtitles"]')) return null;
        if (el.muted && el.autoplay && el.loop) return null;
        return review(el, m('Видеонд хадмал (<track kind="captions">) алга. Хадмал видеон дээр шатаагдсан (open captions) эсэхийг шалгана уу.', "Video has no captions track. Verify captions are not burned in (open captions)."));
      }
    },
    {
      id: "media-alternative",
      sc: ["1.2.1", "1.2.3", "1.2.5"],
      impact: "serious",
      selector: "audio, video",
      evaluate(el) {
        if (el.localName === "video" && el.muted && el.loop) return null;
        return review(el, el.localName === "audio" ? m("Аудиод текст хувилбар (transcript) байгаа эсэхийг шалгана уу.", "Check that the audio has a text transcript.") : m("Видеонд аудио тайлбар эсвэл бүрэн текст хувилбар байгаа эсэхийг шалгана уу.", "Check that the video has audio description or a full text alternative."));
      }
    },
    {
      id: "media-autoplay",
      sc: ["1.4.2", "2.2.2"],
      impact: "serious",
      selector: "audio[autoplay], video[autoplay]",
      evaluate(el) {
        if (el.muted || el.hasAttribute("muted")) {
          if (el.localName === "video" && el.loop && !el.controls && el.duration > 5) {
            return review(el, m("Дуугүй ч тасралтгүй давтагдах видеог түр зогсоох боломж (2.2.2) хэрэгтэй.", "Looping muted video needs a pause mechanism (2.2.2)."));
          }
          return null;
        }
        if (el.controls) return null;
        return fail(el, m("Автоматаар тоглох дуутай медиад зогсоох/дууг хаах удирдлага алга.", "Auto-playing media with sound has no pause or mute control."));
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          ctx.changes.setAttr(f.node, "controls", "", "media-autoplay");
          return m("Медиад controls (удирдлага) нэмэв.", "Added native media controls.");
        }
      }
    },
    {
      id: "marquee-blink",
      sc: ["2.2.2"],
      impact: "serious",
      selector: "marquee, blink",
      evaluate(el) {
        return fail(el, m(`<${el.localName}> элемент хөдөлгөөнийг зогсоох боломжгүй, хуучирсан.`, `Deprecated <${el.localName}> moves without a way to stop it.`));
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          if (typeof f.node.stop === "function") {
            f.node.stop();
            ctx.changes.custom(() => {
              var _a3, _b;
              return (_b = (_a3 = f.node).start) == null ? void 0 : _b.call(_a3);
            }, "marquee-blink");
          }
          ctx.changes.setStyle(f.node, "animation", "none", "marquee-blink");
          return m("Хөдөлгөөнийг зогсоов.", "Stopped the movement.");
        }
      }
    },
    {
      id: "image-of-text-hint",
      sc: ["1.4.5"],
      impact: "moderate",
      selector: "img[alt]",
      evaluate(el) {
        const alt = normalize(el.getAttribute("alt"));
        const r = el.getBoundingClientRect();
        if (alt.split(" ").length >= 6 && r.width > 3 * r.height && r.height > 0 && !visibleText(el.parentElement || el).includes(alt)) {
          return review(el, m("Энэ нь текстэн зураг (баннер) байж магадгүй. Боломжтой бол жинхэнэ HTML текст ашиглана уу.", "This may be an image of text. Use real text where possible."));
        }
        return null;
      }
    }
  ];

  // src/core/color.js
  var NAMED = { transparent: [0, 0, 0, 0], black: [0, 0, 0, 1], white: [255, 255, 255, 1] };
  function parseColor(str) {
    if (!str) return null;
    str = String(str).trim().toLowerCase();
    if (NAMED[str]) return NAMED[str].slice();
    if (str[0] === "#") {
      let h = str.slice(1);
      if (h.length === 3 || h.length === 4) h = h.split("").map((c) => c + c).join("");
      if (h.length !== 6 && h.length !== 8) return null;
      const n = (i) => parseInt(h.slice(i, i + 2), 16);
      return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
    }
    const m2 = str.match(/^rgba?\(([^)]+)\)$/);
    if (m2) {
      const parts = m2[1].split(/[\s,/]+/).filter(Boolean);
      if (parts.length < 3) return null;
      const ch = (p) => p.endsWith("%") ? parseFloat(p) * 255 / 100 : parseFloat(p);
      let a = parts[3] === void 0 ? 1 : parts[3].endsWith("%") ? parseFloat(parts[3]) / 100 : parseFloat(parts[3]);
      if (Number.isNaN(a)) a = 1;
      return [ch(parts[0]), ch(parts[1]), ch(parts[2]), a];
    }
    const cm = str.match(/^color\(srgb\s+([^)]+)\)$/);
    if (cm) {
      const parts = cm[1].split(/[\s/]+/).filter(Boolean).map(parseFloat);
      return [parts[0] * 255, parts[1] * 255, parts[2] * 255, parts[3] ?? 1];
    }
    return null;
  }
  var lin = (c) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  function luminance([r, g, b]) {
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function contrastRatio(fg, bg) {
    const l1 = luminance(fg);
    const l2 = luminance(bg);
    const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
    return (hi + 0.05) / (lo + 0.05);
  }
  function blend(fg, bg) {
    const a = fg[3] ?? 1;
    if (a >= 1) return [fg[0], fg[1], fg[2], 1];
    const ba = bg[3] ?? 1;
    const outA = a + ba * (1 - a);
    if (outA === 0) return [0, 0, 0, 0];
    const mix = (i) => (fg[i] * a + bg[i] * ba * (1 - a)) / outA;
    return [mix(0), mix(1), mix(2), outA];
  }
  var toCss = ([r, g, b, a = 1]) => a >= 1 ? `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})` : `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${+a.toFixed(3)})`;
  function rgbToOklab([r, g, b]) {
    const R = lin(r), G = lin(g), B = lin(b);
    const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
    const m2 = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
    const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
    return [
      0.2104542553 * l + 0.793617785 * m2 - 0.0040720468 * s,
      1.9779984951 * l - 2.428592205 * m2 + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m2 - 0.808675766 * s
    ];
  }
  function oklabToRgb([L, a, b]) {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m2 = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const gam = (c) => {
      c = Math.max(0, Math.min(1, c));
      return 255 * (c <= 31308e-7 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055);
    };
    return [
      gam(4.0767416621 * l - 3.3077115913 * m2 + 0.2309699292 * s),
      gam(-1.2684380046 * l + 2.6097574011 * m2 - 0.3413193965 * s),
      gam(-0.0041960863 * l - 0.7034186147 * m2 + 1.707614701 * s)
    ];
  }
  function adjustForContrast(fg, bg, target = 4.5) {
    if (contrastRatio(fg, bg) >= target) return fg.slice(0, 3);
    const [L, A, B] = rgbToOklab(fg);
    const bgLum = luminance(bg);
    const tryDir = (dir) => {
      let lo = L, hi = dir < 0 ? 0 : 1, best = null;
      for (let i = 0; i < 24; i++) {
        const mid = (lo + hi) / 2;
        const c = oklabToRgb([mid, A, B]);
        if (contrastRatio(c, bg) >= target) {
          best = c;
          hi = mid;
        } else {
          lo = mid;
        }
      }
      return best;
    };
    const order = bgLum > 0.18 ? [-1, 1] : [1, -1];
    for (const d of order) {
      const r = tryDir(d);
      if (!r) continue;
      let c = r.map((v) => Math.round(v));
      const step = luminance(c) > bgLum ? 1 : -1;
      for (let i = 0; i < 8 && contrastRatio(c, bg) < target; i++) c = c.map((v) => Math.max(0, Math.min(255, v + step)));
      if (contrastRatio(c, bg) >= target) return c;
    }
    return contrastRatio([0, 0, 0], bg) >= contrastRatio([255, 255, 255], bg) ? [0, 0, 0] : [255, 255, 255];
  }

  // src/rules/contrast.js
  var WHITE = [255, 255, 255, 1];
  function effectiveOpacity(el) {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity);
    return o;
  }
  function gradientColors(bgImage) {
    const out = [];
    const re = /(rgba?\([^)]+\)|#[0-9a-f]{3,8}\b)/gi;
    let mm;
    while (mm = re.exec(bgImage)) {
      const c = parseColor(mm[1]);
      if (c) out.push(c);
    }
    return out;
  }
  function backgroundOf(el) {
    const r = el.getBoundingClientRect();
    let stack = null;
    const cx = r.left + Math.min(r.width / 2, 20), cy = r.top + r.height / 2;
    if (cx >= 0 && cy >= 0 && cx < innerWidth && cy < innerHeight) {
      stack = document.elementsFromPoint(cx, cy).filter((n) => !isOwnUi(n));
      const idx = stack.findIndex((n) => n === el || n.contains(el));
      stack = idx >= 0 ? stack.slice(idx) : null;
    }
    if (!stack) {
      stack = [];
      for (let n = el; n && n.nodeType === 1; n = n.parentElement) stack.push(n);
    }
    const layers = [];
    for (const n of stack) {
      const s = getComputedStyle(n);
      if (s.backgroundImage && s.backgroundImage !== "none") {
        if (/gradient\(/.test(s.backgroundImage)) {
          const cols = gradientColors(s.backgroundImage);
          if (cols.length) return { colors: cols.map((c) => layers.reduceRight((acc, l) => blend(l, acc), blend(c, WHITE))), gradient: true };
        }
        return { unknown: "image" };
      }
      if (n.localName === "img" || n.localName === "video" || n.localName === "canvas" || n.localName === "picture") {
        if (n !== el) return { unknown: "image" };
      }
      const bg = parseColor(s.backgroundColor);
      if (!bg) return { unknown: "color-format" };
      if (bg[3] > 0) {
        layers.push(bg);
        if (bg[3] >= 1) break;
      }
    }
    let base = WHITE;
    for (let i = layers.length - 1; i >= 0; i--) base = blend(layers[i], base);
    return { color: base };
  }
  function isLargeText(s) {
    const size = parseFloat(s.fontSize);
    const weight = parseInt(s.fontWeight, 10) || (s.fontWeight === "bold" ? 700 : 400);
    return size >= 24 || size >= 18.66 && weight >= 700;
  }
  function hasOwnText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim().length) return true;
    return false;
  }
  function isDisabled(el) {
    return !!el.closest('[disabled], [aria-disabled="true"], fieldset[disabled]');
  }
  var contrast_default = [
    {
      id: "color-contrast",
      sc: ["1.4.3", "1.4.6"],
      impact: "serious",
      selector: "body *:not(script):not(style):not(noscript):not(template):not(svg *):not(option)",
      evaluate(el, ctx) {
        if (!hasOwnText(el)) return null;
        if (isDisabled(el) || !isVisible(el) || isVisuallyHidden(el)) return null;
        const s = getComputedStyle(el);
        if (s.visibility !== "visible" || parseFloat(s.fontSize) === 0) return null;
        if (/^(transparent|rgba\(0, 0, 0, 0\))$/.test(s.color)) return null;
        let fg = parseColor(s.color);
        const bgInfo = backgroundOf(el);
        const large = isLargeText(s);
        const aaa = ctx.level === "AAA";
        const need = aaa ? large ? 4.5 : 7 : large ? 3 : 4.5;
        const sc = aaa ? ["1.4.6"] : ["1.4.3"];
        if (!fg) return review(el, m("Текстийн өнгийн формат танигдсангүй — тодролыг гараар шалгана уу.", "Unrecognised text color format — check contrast manually."), { sc });
        const op = effectiveOpacity(el);
        if (op < 1) fg = [fg[0], fg[1], fg[2], (fg[3] ?? 1) * op];
        if (bgInfo.unknown) {
          return review(el, m("Текст зураг/видео дээр байрласан тул тодролыг гараар шалгана уу.", "Text is over an image or media — verify contrast manually."), { sc, reason: bgInfo.unknown });
        }
        const bgs = bgInfo.colors || [bgInfo.color];
        const ratios = bgs.map((bg) => contrastRatio(blend(fg, bg), bg));
        const worst = Math.min(...ratios);
        const data = { ratio: +worst.toFixed(2), required: need, fg: s.color, bg: toCss(bgs[ratios.indexOf(worst)]), large, sc };
        if (worst >= need) return null;
        if (s.textShadow && s.textShadow !== "none" && worst >= need * 0.75) {
          return review(el, m(`Тодрол ${data.ratio}:1 (шаардлага ${need}:1). Текстийн сүүдэр тодролыг нэмэгдүүлж байж магадгүй.`, `Contrast ${data.ratio}:1 (needs ${need}:1). Text shadow may help; verify.`), data);
        }
        const out = bgInfo.gradient ? review : fail;
        return out(el, m(`Текстийн тодрол хангалтгүй: ${data.ratio}:1 (шаардлага ${need}:1${large ? ", том текст" : ""}).`, `Insufficient text contrast: ${data.ratio}:1 (needs ${need}:1${large ? ", large text" : ""}).`), data);
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          if (f.outcome !== "fail" || !f.data) return false;
          const bg = parseColor(f.data.bg);
          const fg = parseColor(f.data.fg);
          const fixed = adjustForContrast(fg, bg, f.data.required + 0.05);
          ctx.changes.setStyle(f.node, "color", toCss(fixed), "color-contrast");
          return m(`Өнгөний аясыг хадгалж текстийн өнгийг ${toCss(fixed)} болгов.`, `Adjusted text color to ${toCss(fixed)} keeping its hue.`);
        }
      }
    },
    {
      id: "link-in-text-block",
      sc: ["1.4.1"],
      impact: "serious",
      selector: "p a[href], li a[href], td a[href], dd a[href], blockquote a[href]",
      evaluate(el) {
        var _a3;
        const s = getComputedStyle(el);
        if (s.display !== "inline" || !isVisible(el)) return null;
        const block = el.parentElement.closest("p, li, td, dd, blockquote");
        if (!block) return null;
        const blockText = block.textContent.replace(/\s+/g, "");
        const linkText = el.textContent.replace(/\s+/g, "");
        if (!linkText || blockText.length - linkText.length < 10) return null;
        if (/underline|line-through|overline/.test(s.textDecorationLine || s.textDecoration)) return null;
        if (s.borderBottomStyle !== "none" && parseFloat(s.borderBottomWidth) > 0) return null;
        const ps = getComputedStyle(block);
        if (parseInt(s.fontWeight, 10) - parseInt(ps.fontWeight, 10) >= 300 || s.fontStyle !== ps.fontStyle) return null;
        const bg = backgroundOf(el);
        if (bg.unknown) return null;
        if (s.backgroundColor !== ps.backgroundColor && ((_a3 = parseColor(s.backgroundColor)) == null ? void 0 : _a3[3]) > 0) return null;
        const lc = parseColor(s.color), tc = parseColor(ps.color);
        if (!lc || !tc) return null;
        const ratio = contrastRatio(lc, tc);
        if (ratio >= 3) {
          return review(el, m(`Текст доторх холбоос зөвхөн өнгөөр ялгагдаж байна (${ratio.toFixed(2)}:1). Hover/фокус үед доогуур зураас гарч байгааг шалгана уу.`, `Link is distinguished by color only (${ratio.toFixed(2)}:1). Verify an underline appears on hover/focus.`), { ratio });
        }
        return fail(el, m(`Текст доторх холбоос зөвхөн өнгөөр ялгагдах бөгөөд тодролын зөрүү ${ratio.toFixed(2)}:1 (<3:1). Доогуур зураас нэмнэ үү.`, `Link in text is distinguished by color only with ${ratio.toFixed(2)}:1 difference (<3:1). Add an underline.`), { ratio });
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          ctx.changes.setStyle(f.node, "text-decoration", "underline", "link-in-text-block");
          ctx.changes.setStyle(f.node, "text-underline-offset", "0.15em", "link-in-text-block");
          return m("Текст доторх холбоост доогуур зураас нэмэв.", "Underlined the in-text link.");
        }
      }
    },
    {
      id: "non-text-contrast",
      sc: ["1.4.11"],
      impact: "serious",
      selector: 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]), select, textarea',
      evaluate(el) {
        if (!isVisible(el) || isDisabled(el)) return null;
        const s = getComputedStyle(el);
        const outer = backgroundOf(el.parentElement || el);
        if (outer.unknown || outer.gradient) return null;
        const around = outer.color;
        const field = parseColor(s.backgroundColor);
        const fieldOnBg = field ? blend(field, around) : around;
        if (contrastRatio(fieldOnBg, around) >= 3) return null;
        const sides = ["Top", "Right", "Bottom", "Left"].filter((sd) => s[`border${sd}Style`] !== "none" && parseFloat(s[`border${sd}Width`]) > 0);
        if (!sides.length) {
          return fail(el, m("Оролтын талбарын хил хязгаар харагдахгүй (хүрээ ч, ялгаатай дэвсгэр ч алга).", "Form field boundary is not visible (no border or contrasting background)."), { ratio: 1 });
        }
        let best = 0;
        for (const sd of sides) {
          const bc = parseColor(s[`border${sd}Color`]);
          if (bc) best = Math.max(best, contrastRatio(blend(bc, around), around));
        }
        if (best >= 3) return null;
        return fail(el, m(`Оролтын талбарын хүрээний тодрол ${best.toFixed(2)}:1 (шаардлага 3:1).`, `Form field border contrast is ${best.toFixed(2)}:1 (needs 3:1).`), { ratio: +best.toFixed(2), around: toCss(around) });
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          var _a3;
          const around = parseColor((_a3 = f.data) == null ? void 0 : _a3.around) || WHITE;
          const c = adjustForContrast([118, 118, 118], around, 3.2);
          ctx.changes.setStyle(f.node, "border", `1px solid ${toCss(c)}`, "non-text-contrast");
          return m(`Талбарт ${toCss(c)} өнгийн 3:1+ тодролтой хүрээ нэмэв.`, `Added a 3:1+ contrast border (${toCss(c)}).`);
        }
      }
    }
  ];

  // src/rules/structure.js
  var BCP47 = /^[a-z]{2,3}(-[a-z]{4})?(-([a-z]{2}|\d{3}))?(-[a-z\d]{5,8}|-\d[a-z\d]{3})*(-[a-wy-z\d](-[a-z\d]{2,8})+)*(-x(-[a-z\d]{1,8})+)?$/i;
  var KNOWN_PRIMARY = new Set("aa ab af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu ast ber chr ckb fil haw hmn kab kok mni mnc sah tyv xal bua yue cmn nan hak gsw sgn und zxx mul".split(" "));
  function validLang(v) {
    if (!v || !BCP47.test(v)) return false;
    return KNOWN_PRIMARY.has(v.split("-")[0].toLowerCase());
  }
  function detectLang(doc) {
    var _a3;
    const sample = normalize((((_a3 = doc.body) == null ? void 0 : _a3.innerText) || "").slice(0, 4e3));
    const { script: script2, mnHint } = scriptOf(sample);
    if (script2 === "Cyrl") return mnHint ? "mn" : /[ыъэ]/.test(sample) && !mnHint ? "ru" : null;
    if (script2 === "Latn") return null;
    return null;
  }
  var MAIN_CANDIDATES = ["#main", "#content", "#main-content", "#maincontent", ".main-content", "#primary", ".site-main", '[role="main"]', "main"];
  function findMainTarget(doc) {
    const main = doc.querySelector('main, [role="main"]');
    if (main) return main;
    for (const sel of MAIN_CANDIDATES) {
      const hits = doc.querySelectorAll(sel);
      if (hits.length === 1 && isVisible(hits[0])) return hits[0];
    }
    return null;
  }
  var structure_default = [
    {
      id: "html-lang",
      sc: ["3.1.1"],
      impact: "serious",
      run(ctx) {
        const html = ctx.doc.documentElement;
        const lang = html.getAttribute("lang") || html.getAttribute("xml:lang");
        if (!lang || !lang.trim()) {
          return [fail(html, m('<html> элементэд lang атрибут алга. Жишээ нь: <html lang="mn">.', '<html> element has no lang attribute, e.g. <html lang="mn">.'))];
        }
        if (!validLang(lang.trim())) {
          return [fail(html, m(`lang="${lang}" нь хүчинтэй BCP 47 хэлний код биш.`, `lang="${lang}" is not a valid BCP 47 language tag.`), { invalid: true })];
        }
        const detected = detectLang(ctx.doc);
        if (detected && !lang.toLowerCase().startsWith(detected)) {
          return [review(html, m(`lang="${lang}" боловч хуудасны текст "${detected}" хэл шиг харагдаж байна.`, `lang="${lang}" but the page text looks like "${detected}".`), { detected })];
        }
        return [];
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          if (f.outcome !== "fail") return false;
          const want = ctx.config.lang || (ctx.tier === "heuristic" ? detectLang(ctx.doc) : null);
          if (!want) return false;
          ctx.changes.setAttr(f.node, "lang", want, "html-lang");
          return m(`<html lang="${want}"> тохируулав.`, `Set <html lang="${want}">.`);
        }
      }
    },
    {
      id: "lang-valid",
      sc: ["3.1.2"],
      impact: "serious",
      selector: "body [lang]",
      evaluate(el) {
        const v = el.getAttribute("lang").trim();
        if (v === "" || validLang(v)) return null;
        return fail(el, m(`lang="${v}" нь хүчинтэй хэлний код биш.`, `lang="${v}" is not a valid language tag.`));
      }
    },
    {
      id: "lang-of-parts",
      sc: ["3.1.2"],
      impact: "moderate",
      selector: "p, li, blockquote, td, h1, h2, h3, h4, figcaption",
      evaluate(el, ctx) {
        const pageLang = (ctx.doc.documentElement.lang || "").toLowerCase().split("-")[0];
        if (!pageLang) return null;
        const own = el.closest("[lang]");
        if (own && own !== ctx.doc.documentElement) return null;
        const text = normalize(el.textContent);
        if (text.length < 40) return null;
        const { script: script2 } = scriptOf(text);
        const cyrPage = ["mn", "ru", "kk", "ky", "uk", "bg", "sr", "be", "tg", "bua", "sah", "tyv", "xal"].includes(pageLang);
        if (cyrPage && script2 === "Latn" || !cyrPage && script2 === "Cyrl") {
          return review(el, m(`Энэ хэсгийн бичиг (${script2}) хуудасны хэлээс (${pageLang}) өөр. Өөр хэл бол lang атрибут нэмнэ үү.`, `Text script (${script2}) differs from the page language (${pageLang}). Add a lang attribute if it is another language.`), { script: script2 });
        }
        return null;
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const { script: script2, mnHint } = scriptOf(f.node.textContent);
          if (script2 === "Cyrl" && mnHint) {
            ctx.changes.setAttr(f.node, "lang", "mn", "lang-of-parts");
            return m('Монгол текстэд lang="mn" өгөв.', 'Set lang="mn" on Mongolian text.');
          }
          return false;
        }
      }
    },
    {
      id: "document-title",
      sc: ["2.4.2"],
      impact: "serious",
      run(ctx) {
        const t = normalize(ctx.doc.title);
        if (!t) return [fail(ctx.doc.documentElement, m("Хуудсанд <title> алга эсвэл хоосон.", "Page has no or an empty <title>."))];
        if (/^(untitled|document|home|index|new page|нүүр|гарчиггүй|page)$/i.test(t) || /^https?:\/\//.test(t)) {
          return [review(ctx.doc.documentElement, m(`Хуудасны гарчиг "${t}" агуулгыг тодорхойлохгүй байж магадгүй.`, `Page title "${t}" may not describe its purpose.`))];
        }
        return [];
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          if (f.outcome !== "fail") return false;
          const h1 = ctx.doc.querySelector("h1");
          const txt = h1 && normalize(h1.textContent);
          if (!txt) return false;
          const prev = ctx.doc.title;
          ctx.doc.title = txt;
          ctx.changes.custom(() => {
            ctx.doc.title = prev;
          }, "document-title");
          return m(`Хуудасны гарчгийг h1-ээс "${txt}" болгов.`, `Set page title from h1: "${txt}".`);
        }
      }
    },
    {
      id: "heading-order",
      sc: ["1.3.1", "2.4.6"],
      impact: "moderate",
      run(ctx) {
        const hs = qsa(ctx.doc.body, 'h1, h2, h3, h4, h5, h6, [role="heading"]').filter((h) => !ctx.ignored(h) && !isHiddenFromAT(h));
        const out = [];
        let prev = 0;
        for (const h of hs) {
          const lvl = h.getAttribute("role") === "heading" ? parseInt(h.getAttribute("aria-level") || "2", 10) : +h.localName[1];
          if (prev && lvl > prev + 1) {
            out.push(review(h, m(`Гарчгийн түвшин h${prev}-ээс h${lvl} руу үсэрсэн. Бүтцийг шалгана уу.`, `Heading level jumps from h${prev} to h${lvl}. Check the outline.`), { from: prev, to: lvl }));
          }
          prev = lvl;
        }
        if (hs.length && !hs.some((h) => h.localName === "h1" || h.getAttribute("aria-level") === "1")) {
          out.push(review(ctx.doc.body, m("Хуудсанд h1 түвшний гарчиг алга.", "Page has no level-one heading.")));
        }
        if (!hs.length && normalize(ctx.doc.body.innerText).length > 800) {
          out.push(review(ctx.doc.body, m("Урт контенттой ч нэг ч гарчиггүй байна (1.3.1, 2.4.10).", "Long content has no headings (1.3.1, 2.4.10).")));
        }
        return out;
      }
    },
    {
      id: "empty-heading",
      sc: ["1.3.1", "2.4.6"],
      impact: "serious",
      selector: 'h1, h2, h3, h4, h5, h6, [role="heading"]',
      evaluate(el) {
        if (isHiddenFromAT(el) || /^(presentation|none)$/.test(el.getAttribute("role") || "")) return null;
        return accessibleName(el) ? null : fail(el, m("Гарчиг хоосон байна.", "Heading is empty."));
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          if (normalize(f.node.textContent) || f.node.querySelector("img, svg")) return false;
          ctx.changes.setAttr(f.node, "role", "presentation", "empty-heading");
          return m('Хоосон гарчгийг гарчгийн жагсаалтаас хасав (role="presentation").', 'Removed empty heading from the outline (role="presentation").');
        }
      }
    },
    {
      id: "list-structure",
      sc: ["1.3.1"],
      impact: "serious",
      selector: "li, ul > *, ol > *, dt, dd",
      evaluate(el) {
        if (el.localName === "li") {
          const p2 = el.parentElement;
          if (!p2 || ["ul", "ol", "menu"].includes(p2.localName) || p2.getAttribute("role") === "list") return null;
          return fail(el, m("<li> нь <ul>/<ol> дотор байх ёстой.", "<li> must be contained in a <ul> or <ol>."));
        }
        if (el.localName === "dt" || el.localName === "dd") {
          const p2 = el.closest("dl");
          return p2 ? null : fail(el, m(`<${el.localName}> нь <dl> дотор байх ёстой.`, `<${el.localName}> must be inside a <dl>.`));
        }
        const p = el.parentElement;
        if (p.getAttribute("role")) return null;
        if (["li", "script", "template"].includes(el.localName)) return null;
        return fail(el, m(`<${p.localName}> жагсаалтын шууд хүүхэд нь зөвхөн <li> байх ёстой (<${el.localName}> олдов).`, `<${p.localName}> may only directly contain <li> (found <${el.localName}>).`));
      }
    },
    {
      id: "table-headers",
      sc: ["1.3.1"],
      impact: "serious",
      selector: "table",
      evaluate(el) {
        var _a3, _b;
        const role = el.getAttribute("role");
        if (role === "presentation" || role === "none" || isHiddenFromAT(el)) return null;
        const rows = el.rows ? el.rows.length : 0;
        const cols = ((_b = (_a3 = el.rows) == null ? void 0 : _a3[0]) == null ? void 0 : _b.cells.length) || 0;
        if (rows < 2 || cols < 2) return null;
        if (el.querySelector('th, [role="columnheader"], [role="rowheader"]')) {
          const ths = el.querySelectorAll("th");
          const empty = [...ths].filter((th) => !normalize(th.textContent) && !th.getAttribute("aria-label"));
          if (empty.length) return fail(empty[0], m("Хүснэгтийн толгой нүд (<th>) хоосон.", "Table header cell is empty."));
          return null;
        }
        return review(el, m('Өгөгдлийн хүснэгт толгой нүдгүй (<th>) байна. Байршлын хүснэгт бол role="presentation" өгнө үү.', 'Data table has no header cells (<th>). If it is a layout table add role="presentation".'));
      }
    },
    {
      id: "landmark-main",
      sc: ["1.3.1", "2.4.1"],
      impact: "moderate",
      run(ctx) {
        const mains = qsa(ctx.doc, 'main, [role="main"]').filter((n) => !isHiddenFromAT(n));
        if (mains.length > 1) return [fail(mains[1], m("Хуудсанд нэгээс олон main landmark байна.", "Page has more than one main landmark."))];
        if (!mains.length) return [review(ctx.doc.body, m("Хуудсанд <main> landmark алга. Гол контентыг <main> элементэд байрлуулна уу.", "Page has no <main> landmark. Wrap the primary content in <main>."))];
        return [];
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          if (f.outcome !== "review") return false;
          for (const sel of MAIN_CANDIDATES.slice(0, -2)) {
            const hits = ctx.doc.querySelectorAll(sel);
            if (hits.length === 1 && isVisible(hits[0]) && !hits[0].getAttribute("role")) {
              ctx.changes.setAttr(hits[0], "role", "main", "landmark-main");
              return m(`${sel} элементэд role="main" өгөв.`, `Added role="main" to ${sel}.`);
            }
          }
          return false;
        }
      }
    },
    {
      id: "bypass",
      sc: ["2.4.1"],
      impact: "serious",
      run(ctx) {
        const doc = ctx.doc;
        const firstLinks = qsa(doc.body, 'a[href^="#"]').slice(0, 5);
        const skip = firstLinks.find((a) => {
          const id = decodeURIComponent(a.getAttribute("href").slice(1));
          return id && doc.getElementById(id);
        });
        if (skip) return [];
        const hasMain = !!doc.querySelector('main, [role="main"]');
        const hasHeadings = !!doc.querySelector("h1, h2, h3");
        const navLinks = qsa(doc.body, 'nav a[href], header a[href], [role="navigation"] a[href]').length;
        if (navLinks < 4) return [];
        const out = hasMain || hasHeadings ? review : fail;
        return [out(doc.body, m('"Үндсэн агуулга руу шилжих" (skip link) холбоос алга. Гарын хэрэглэгч навигацийг дахин дахин дамжих болно.', 'No "Skip to main content" link. Keyboard users must tab through navigation on every page.'), { hasMain })];
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          const target = findMainTarget(ctx.doc);
          if (!target) return false;
          if (!target.id) ctx.changes.setAttr(target, "id", "hj-main", "bypass");
          if (!target.hasAttribute("tabindex")) ctx.changes.setAttr(target, "tabindex", "-1", "bypass");
          const a = ctx.doc.createElement("a");
          a.href = `#${target.id}`;
          a.className = "hj-skip-link";
          a.setAttribute("data-hurteemj-ui", "skip");
          a.textContent = ctx.pageLang === "mn" ? "Үндсэн агуулга руу шилжих" : "Skip to main content";
          a.addEventListener("click", (e) => {
            e.preventDefault();
            target.focus();
            target.scrollIntoView();
          });
          ctx.changes.insert(a, ctx.doc.body, ctx.doc.body.firstChild, "bypass");
          return m('Хуудасны эхэнд "Үндсэн агуулга руу шилжих" холбоос нэмэв.', 'Inserted a "Skip to main content" link.');
        }
      }
    },
    {
      id: "meta-viewport",
      sc: ["1.4.4", "1.4.10"],
      impact: "critical",
      selector: 'meta[name="viewport"]',
      root: "document",
      evaluate(el) {
        var _a3, _b;
        const c = (el.getAttribute("content") || "").toLowerCase().replace(/\s/g, "");
        const userScalable = (_a3 = c.match(/user-scalable=([^,]+)/)) == null ? void 0 : _a3[1];
        const max = parseFloat((_b = c.match(/maximum-scale=([^,]+)/)) == null ? void 0 : _b[1]);
        if (userScalable === "no" || userScalable === "0" || !Number.isNaN(max) && max < 2) {
          return fail(el, m("Viewport тохиргоо томруулах (zoom) боломжийг хааж байна.", "Viewport meta prevents zooming."), { content: c });
        }
        return null;
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          const c = (f.node.getAttribute("content") || "").split(",").map((s) => s.trim()).filter((p) => p && !/^(user-scalable|maximum-scale)\s*=/i.test(p));
          ctx.changes.setAttr(f.node, "content", c.join(", ") || "width=device-width, initial-scale=1", "meta-viewport");
          return m("Viewport-ийн zoom хоригийг арилгав.", "Removed the viewport zoom restriction.");
        }
      }
    },
    {
      id: "meta-refresh",
      sc: ["2.2.1", "3.2.5"],
      impact: "critical",
      selector: 'meta[http-equiv="refresh" i]',
      root: "document",
      evaluate(el) {
        const delay = parseFloat((el.getAttribute("content") || "").split(/[;,]/)[0]);
        if (Number.isNaN(delay) || delay === 0 || delay > 72e3) return null;
        return fail(el, m(`Хуудас ${delay} секундын дараа автоматаар шинэчлэгдэх/шилжих тохиргоотой.`, `Page automatically refreshes/redirects after ${delay}s.`));
      }
    },
    {
      id: "text-spacing-important",
      sc: ["1.4.12"],
      impact: "serious",
      selector: "[style]",
      evaluate(el) {
        const props = ["line-height", "letter-spacing", "word-spacing"];
        const bad = props.filter((p) => el.style.getPropertyPriority(p) === "important");
        if (!bad.length) return null;
        return fail(el, m(`Inline style дээрх !important (${bad.join(", ")}) нь хэрэглэгч текстийн зайг өөрчлөхийг хориглоно.`, `Inline !important on ${bad.join(", ")} prevents users from overriding text spacing.`), { props: bad });
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          for (const p of f.data.props) ctx.changes.setStyle(f.node, p, f.node.style.getPropertyValue(p), "text-spacing-important", "");
          return m("Текстийн зайн !important-ыг арилгав (утга хэвээр).", "Removed !important from text-spacing properties (values kept).");
        }
      }
    },
    {
      id: "text-spacing-clip",
      sc: ["1.4.12"],
      impact: "serious",
      deep: true,
      run(ctx) {
        const doc = ctx.doc;
        const cands = qsa(doc.body, "p, li, a, button, label, h1, h2, h3, h4, span, td, div").filter((el) => !ctx.ignored(el) && isVisible(el) && normalize(el.textContent).length > 3).filter((el) => {
          const s = getComputedStyle(el);
          return /hidden|clip/.test(s.overflow + s.overflowX + s.overflowY) || s.height !== "auto" && /px/.test(el.style.height);
        }).slice(0, 400);
        const before = new Map(cands.map((el) => [el, el.scrollHeight - el.clientHeight]));
        const style = doc.createElement("style");
        if (ctx.config.nonce) style.nonce = ctx.config.nonce;
        style.textContent = "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }";
        doc.head.appendChild(style);
        const out = [];
        for (const el of cands) {
          const s = getComputedStyle(el);
          if (!/hidden|clip/.test(s.overflow + s.overflowX + s.overflowY)) continue;
          const grow = el.scrollHeight - el.clientHeight;
          const growX = el.scrollWidth - el.clientWidth;
          if (grow > 2 && grow > before.get(el) || growX > 2) {
            out.push(fail(el, m("Текстийн зайг 1.4.12-ын дагуу өсгөхөд агуулга тасарч (overflow: hidden) байна.", "Content is clipped when text spacing is increased per 1.4.12 (overflow: hidden).")));
          }
        }
        style.remove();
        return out;
      }
    },
    {
      id: "reflow",
      sc: ["1.4.10"],
      impact: "serious",
      run(ctx) {
        const w = ctx.win.innerWidth;
        if (w > 420) return [];
        const doc = ctx.doc.documentElement;
        if (doc.scrollWidth <= w + 1) return [];
        const offenders = qsa(ctx.doc.body, "*").filter((el) => {
          if (ctx.ignored(el) || !isVisible(el)) return false;
          const r = el.getBoundingClientRect();
          if (r.right <= w + 1) return false;
          if (el.closest('pre, code, table, [role="table"], [role="grid"], svg, canvas, video, iframe, [style*="overflow"]')) return false;
          const p = el.parentElement;
          return !p || p.getBoundingClientRect().right <= w + 1;
        }).slice(0, 10);
        return (offenders.length ? offenders : [ctx.doc.body]).map((el) => fail(el, m(`${w}px өргөнтэй дэлгэц дээр хэвтээ гүйлгэх шаардлага гарч байна.`, `Horizontal scrolling is required at ${w}px viewport width.`)));
      }
    }
  ];

  // src/wcag/aria.js
  var ROLES = /* @__PURE__ */ new Set([
    "alert",
    "alertdialog",
    "application",
    "article",
    "banner",
    "blockquote",
    "button",
    "caption",
    "cell",
    "checkbox",
    "code",
    "columnheader",
    "combobox",
    "complementary",
    "contentinfo",
    "definition",
    "deletion",
    "dialog",
    "directory",
    "document",
    "emphasis",
    "feed",
    "figure",
    "form",
    "generic",
    "grid",
    "gridcell",
    "group",
    "heading",
    "img",
    "image",
    "insertion",
    "link",
    "list",
    "listbox",
    "listitem",
    "log",
    "main",
    "mark",
    "marquee",
    "math",
    "menu",
    "menubar",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "meter",
    "navigation",
    "none",
    "note",
    "option",
    "paragraph",
    "presentation",
    "progressbar",
    "radio",
    "radiogroup",
    "region",
    "row",
    "rowgroup",
    "rowheader",
    "scrollbar",
    "search",
    "searchbox",
    "separator",
    "slider",
    "spinbutton",
    "status",
    "strong",
    "subscript",
    "superscript",
    "switch",
    "tab",
    "table",
    "tablist",
    "tabpanel",
    "term",
    "textbox",
    "time",
    "timer",
    "toolbar",
    "tooltip",
    "tree",
    "treegrid",
    "treeitem",
    "comment",
    "suggestion",
    "sectionheader",
    "sectionfooter",
    // DPUB-ARIA ба Graphics-ARIA
    "doc-abstract",
    "doc-acknowledgments",
    "doc-afterword",
    "doc-appendix",
    "doc-backlink",
    "doc-biblioentry",
    "doc-bibliography",
    "doc-biblioref",
    "doc-chapter",
    "doc-colophon",
    "doc-conclusion",
    "doc-cover",
    "doc-credit",
    "doc-credits",
    "doc-dedication",
    "doc-endnote",
    "doc-endnotes",
    "doc-epigraph",
    "doc-epilogue",
    "doc-errata",
    "doc-example",
    "doc-footnote",
    "doc-foreword",
    "doc-glossary",
    "doc-glossref",
    "doc-index",
    "doc-introduction",
    "doc-noteref",
    "doc-notice",
    "doc-pagebreak",
    "doc-pagefooter",
    "doc-pageheader",
    "doc-pagelist",
    "doc-part",
    "doc-preface",
    "doc-prologue",
    "doc-pullquote",
    "doc-qna",
    "doc-subtitle",
    "doc-tip",
    "doc-toc",
    "graphics-document",
    "graphics-object",
    "graphics-symbol"
  ]);
  var ABSTRACT_ROLES = /* @__PURE__ */ new Set([
    "command",
    "composite",
    "input",
    "landmark",
    "range",
    "roletype",
    "section",
    "sectionhead",
    "select",
    "structure",
    "widget",
    "window"
  ]);
  var ARIA_ATTRS = /* @__PURE__ */ new Set([
    "aria-activedescendant",
    "aria-atomic",
    "aria-autocomplete",
    "aria-braillelabel",
    "aria-brailleroledescription",
    "aria-busy",
    "aria-checked",
    "aria-colcount",
    "aria-colindex",
    "aria-colindextext",
    "aria-colspan",
    "aria-controls",
    "aria-current",
    "aria-describedby",
    "aria-description",
    "aria-details",
    "aria-disabled",
    "aria-dropeffect",
    "aria-errormessage",
    "aria-expanded",
    "aria-flowto",
    "aria-grabbed",
    "aria-haspopup",
    "aria-hidden",
    "aria-invalid",
    "aria-keyshortcuts",
    "aria-label",
    "aria-labelledby",
    "aria-level",
    "aria-live",
    "aria-modal",
    "aria-multiline",
    "aria-multiselectable",
    "aria-orientation",
    "aria-owns",
    "aria-placeholder",
    "aria-posinset",
    "aria-pressed",
    "aria-readonly",
    "aria-relevant",
    "aria-required",
    "aria-roledescription",
    "aria-rowcount",
    "aria-rowindex",
    "aria-rowindextext",
    "aria-rowspan",
    "aria-selected",
    "aria-setsize",
    "aria-sort",
    "aria-valuemax",
    "aria-valuemin",
    "aria-valuenow",
    "aria-valuetext",
    "aria-actions"
  ]);
  var ATTR_VALUES = {
    "aria-autocomplete": ["inline", "list", "both", "none"],
    "aria-busy": ["true", "false"],
    "aria-checked": ["true", "false", "mixed", "undefined"],
    "aria-current": ["page", "step", "location", "date", "time", "true", "false"],
    "aria-disabled": ["true", "false"],
    "aria-expanded": ["true", "false", "undefined"],
    "aria-haspopup": ["true", "false", "menu", "listbox", "tree", "grid", "dialog"],
    "aria-hidden": ["true", "false", "undefined"],
    "aria-invalid": ["true", "false", "grammar", "spelling"],
    "aria-live": ["assertive", "polite", "off"],
    "aria-modal": ["true", "false"],
    "aria-multiline": ["true", "false"],
    "aria-multiselectable": ["true", "false"],
    "aria-orientation": ["horizontal", "vertical", "undefined"],
    "aria-pressed": ["true", "false", "mixed", "undefined"],
    "aria-readonly": ["true", "false"],
    "aria-required": ["true", "false"],
    "aria-selected": ["true", "false", "undefined"],
    "aria-sort": ["ascending", "descending", "none", "other"]
  };
  var IDREF_ATTRS = [
    "aria-labelledby",
    "aria-describedby",
    "aria-controls",
    "aria-owns",
    "aria-activedescendant",
    "aria-errormessage",
    "aria-flowto",
    "aria-details"
  ];
  var REQUIRED_ATTRS = {
    checkbox: ["aria-checked"],
    combobox: ["aria-expanded"],
    heading: ["aria-level"],
    menuitemcheckbox: ["aria-checked"],
    menuitemradio: ["aria-checked"],
    meter: ["aria-valuenow"],
    radio: ["aria-checked"],
    scrollbar: ["aria-controls", "aria-valuenow"],
    slider: ["aria-valuenow"],
    switch: ["aria-checked"]
  };
  var NAME_REQUIRED = /* @__PURE__ */ new Set([
    "button",
    "link",
    "checkbox",
    "combobox",
    "listbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "meter",
    "option",
    "progressbar",
    "radio",
    "radiogroup",
    "searchbox",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "tabpanel",
    "textbox",
    "treeitem",
    "dialog",
    "alertdialog",
    "img",
    "image",
    "tree",
    "grid",
    "treegrid",
    "table",
    "form",
    "region",
    "menu",
    "menubar",
    "toolbar"
  ]);
  var INTERACTIVE_ROLES = /* @__PURE__ */ new Set([
    "button",
    "link",
    "checkbox",
    "combobox",
    "listbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "radio",
    "searchbox",
    "slider",
    "spinbutton",
    "switch",
    "tab",
    "textbox",
    "treeitem",
    "gridcell"
  ]);
  var AUTOCOMPLETE_TOKENS = /* @__PURE__ */ new Set([
    "name",
    "honorific-prefix",
    "given-name",
    "additional-name",
    "family-name",
    "honorific-suffix",
    "nickname",
    "username",
    "new-password",
    "current-password",
    "one-time-code",
    "organization-title",
    "organization",
    "street-address",
    "address-line1",
    "address-line2",
    "address-line3",
    "address-level4",
    "address-level3",
    "address-level2",
    "address-level1",
    "country",
    "country-name",
    "postal-code",
    "cc-name",
    "cc-given-name",
    "cc-additional-name",
    "cc-family-name",
    "cc-number",
    "cc-exp",
    "cc-exp-month",
    "cc-exp-year",
    "cc-csc",
    "cc-type",
    "transaction-currency",
    "transaction-amount",
    "language",
    "bday",
    "bday-day",
    "bday-month",
    "bday-year",
    "sex",
    "url",
    "photo",
    "tel",
    "tel-country-code",
    "tel-national",
    "tel-area-code",
    "tel-local",
    "tel-local-prefix",
    "tel-local-suffix",
    "tel-extension",
    "email",
    "impp",
    "webauthn"
  ]);
  var AUTOCOMPLETE_MODIFIERS = /* @__PURE__ */ new Set(["home", "work", "mobile", "fax", "pager", "shipping", "billing"]);

  // src/rules/forms.js
  var FIELD_SEL = 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]):not([type="image"]), select, textarea, [role="textbox"], [role="combobox"], [role="searchbox"], [role="spinbutton"], [role="slider"], [role="checkbox"]:not(input), [role="radio"]:not(input), [role="switch"]';
  function nearbyLabelText(el) {
    let prev = el.previousElementSibling;
    if (prev && !prev.matches("input, select, textarea, button") && normalize(prev.textContent).length && normalize(prev.textContent).length < 60) return normalize(prev.textContent);
    const p = el.parentElement;
    if (p && p.querySelectorAll("input, select, textarea").length === 1) {
      const t = normalize(p.textContent);
      if (t && t.length < 60) return t;
    }
    return null;
  }
  var AC_GUESS = [
    [/e-?mail|и-?мэйл|имэйл|цахим\s*шуудан/i, "email"],
    [/(^|[^a-z])(tel|phone|mobile|утас|гар\s*утас)/i, "tel"],
    [/first.?name|given.?name|fname|^нэр$|өөрийн\s*нэр/i, "given-name"],
    [/last.?name|family.?name|surname|lname|овог/i, "family-name"],
    [/full.?name|^name$|овог\s*нэр/i, "name"],
    [/user.?name|login|нэвтрэх\s*нэр/i, "username"],
    [/zip|postal|шуудангийн\s*код|индекс/i, "postal-code"],
    [/(street|address)(.?line)?.?1?$|хаяг/i, "street-address"],
    [/city|town|хот|аймаг/i, "address-level2"],
    [/country|улс/i, "country-name"],
    [/organi[sz]ation|company|байгууллага/i, "organization"],
    [/birth|bday|төрсөн\s*өдөр/i, "bday"],
    [/otp|one.?time|баталгаажуулах\s*код|нэг\s*удаагийн/i, "one-time-code"]
  ];
  function validAutocomplete(v) {
    var _a3;
    const tokens = v.toLowerCase().trim().split(/\s+/);
    if (tokens.length === 1 && ["on", "off"].includes(tokens[0])) return true;
    let i = 0;
    if ((_a3 = tokens[i]) == null ? void 0 : _a3.startsWith("section-")) i++;
    if (["shipping", "billing"].includes(tokens[i])) i++;
    if (["home", "work", "mobile", "fax", "pager"].includes(tokens[i])) i++;
    if (!AUTOCOMPLETE_TOKENS.has(tokens[i])) return false;
    i++;
    if (tokens[i] === "webauthn") i++;
    return i === tokens.length && !tokens.slice(0, -1).some((t) => !t.startsWith("section-") && !AUTOCOMPLETE_MODIFIERS.has(t) && !AUTOCOMPLETE_TOKENS.has(t));
  }
  var forms_default = [
    {
      id: "label",
      sc: ["1.3.1", "3.3.2", "4.1.2"],
      impact: "critical",
      selector: FIELD_SEL,
      evaluate(el) {
        var _a3;
        if (isHiddenFromAT(el) || !isVisible(el)) return null;
        const name = accessibleName(el);
        const ph = normalize(el.getAttribute("placeholder"));
        const labelled = ((_a3 = el.labels) == null ? void 0 : _a3.length) || el.hasAttribute("aria-label") || el.hasAttribute("aria-labelledby") || el.hasAttribute("title");
        if (!name) {
          return fail(el, m("Оролтын талбарт шошго (label) алга. <label for> эсвэл aria-label ашиглана уу.", "Form field has no label. Use <label for> or aria-label."));
        }
        if (!labelled && ph && name === ph) {
          return fail(el, m("Талбарыг зөвхөн placeholder-оор тайлбарласан. Бичиж эхлэхэд алга болдог тул харагдах шошго хэрэгтэй.", "Field is labelled only by its placeholder, which disappears on input. Add a visible label."), { placeholderOnly: true });
        }
        return null;
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          const el = f.node;
          const ph = normalize(el.getAttribute("placeholder"));
          const title = normalize(el.getAttribute("title"));
          let txt = ph || title;
          let how = "placeholder";
          if (!txt && ctx.tier === "heuristic") {
            txt = nearbyLabelText(el);
            how = "nearby";
          }
          if (!txt) return false;
          ctx.changes.setAttr(el, "aria-label", txt, "label");
          return how === "nearby" ? m(`Ойролцоох текстээс aria-label="${txt}" өгөв.`, `Set aria-label="${txt}" from nearby text.`) : m(`Програмын нэр aria-label="${txt}" өгөв. Харагдах <label> нэмэх нь зөв шийдэл хэвээр.`, `Set aria-label="${txt}". A visible <label> is still the correct fix.`);
        }
      }
    },
    {
      id: "autocomplete-valid",
      sc: ["1.3.5"],
      impact: "serious",
      selector: "input[autocomplete], select[autocomplete], textarea[autocomplete]",
      evaluate(el) {
        const v = el.getAttribute("autocomplete");
        if (!v.trim() || validAutocomplete(v)) return null;
        return fail(el, m(`autocomplete="${v}" нь HTML стандартын хүчинтэй утга биш.`, `autocomplete="${v}" is not a valid HTML token.`));
      }
    },
    {
      id: "autocomplete-purpose",
      sc: ["1.3.5"],
      impact: "moderate",
      selector: 'input:not([autocomplete]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="button"]):not([type="search"]):not([type="file"])',
      evaluate(el) {
        var _a3;
        if (!isVisible(el) || el.closest('form[autocomplete="off"]')) return null;
        const type = (el.getAttribute("type") || "text").toLowerCase();
        if (type === "password") return null;
        const hay = `${el.name} ${el.id} ${accessibleName(el)}`;
        const guess = type === "email" ? "email" : type === "tel" ? "tel" : (_a3 = AC_GUESS.find(([re]) => re.test(hay))) == null ? void 0 : _a3[1];
        if (!guess) return null;
        return review(el, m(`Хэрэглэгчийн мэдээллийн талбар бололтой — autocomplete="${guess}" нэмнэ үү.`, `Looks like a personal-data field — add autocomplete="${guess}".`), { guess });
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          ctx.changes.setAttr(f.node, "autocomplete", f.data.guess, "autocomplete-purpose");
          return m(`autocomplete="${f.data.guess}" нэмэв.`, `Added autocomplete="${f.data.guess}".`);
        }
      }
    },
    {
      id: "required-indicator",
      sc: ["3.3.2", "1.3.1"],
      impact: "moderate",
      selector: "input:not([required]):not([aria-required]), select:not([required]):not([aria-required]), textarea:not([required]):not([aria-required])",
      evaluate(el) {
        var _a3;
        const lbl = (_a3 = el.labels) == null ? void 0 : _a3[0];
        const t = lbl ? normalize(lbl.textContent) : "";
        if (/\*\s*$|^\*|\(заавал\)|\(required\)|заавал бөглөх/i.test(t)) {
          return fail(el, m('Шошгонд "*" (заавал) тэмдэг байгаа ч талбарт required/aria-required алга.', "Label shows a required marker (*) but the field lacks required/aria-required."));
        }
        return null;
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          ctx.changes.setAttr(f.node, "aria-required", "true", "required-indicator");
          return m('aria-required="true" нэмэв.', 'Added aria-required="true".');
        }
      }
    },
    {
      id: "error-identification",
      sc: ["3.3.1", "3.3.3"],
      impact: "serious",
      selector: '[aria-invalid="true"]',
      evaluate(el, ctx) {
        const ids = `${el.getAttribute("aria-describedby") || ""} ${el.getAttribute("aria-errormessage") || ""}`.trim().split(/\s+/).filter(Boolean);
        const msg = ids.map((id) => ctx.doc.getElementById(id)).filter(Boolean).map((n) => normalize(n.textContent)).join(" ");
        if (msg) return null;
        return fail(el, m("Алдаатай (aria-invalid) талбарт алдааны тайлбар холбогдоогүй (aria-describedby/aria-errormessage).", "Invalid field has no associated error message (aria-describedby/aria-errormessage)."));
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const scope = f.node.closest(".form-group, .field, .form-field, div, li, p") || f.node.parentElement;
          const err = scope == null ? void 0 : scope.querySelector('.error, .invalid-feedback, .field-error, .help-block.error, [class*="error-message"], [class*="errorMessage"]');
          if (!err || !normalize(err.textContent)) return false;
          if (!err.id) ctx.changes.setAttr(err, "id", `hj-err-${Math.random().toString(36).slice(2, 8)}`, "error-identification");
          const cur = f.node.getAttribute("aria-describedby");
          ctx.changes.setAttr(f.node, "aria-describedby", cur ? `${cur} ${err.id}` : err.id, "error-identification");
          return m("Ойролцоох алдааны текстийг aria-describedby-оор холбов.", "Linked the nearby error text via aria-describedby.");
        }
      }
    },
    {
      id: "accessible-auth-paste",
      sc: ["3.3.8"],
      impact: "critical",
      selector: 'input[type="password"], input[autocomplete="one-time-code"], input[autocomplete~="username"], input[name*="otp" i], input[name*="code" i][inputmode="numeric"]',
      evaluate(el) {
        if (!isVisible(el)) return null;
        let blocked = /return\s+false|preventDefault/.test(el.getAttribute("onpaste") || "");
        if (!blocked) {
          try {
            const ev = new Event("paste", { bubbles: true, cancelable: true });
            Object.defineProperty(ev, "clipboardData", { value: { getData: () => "", types: [] } });
            Object.defineProperty(ev, "__hjProbe", { value: true });
            el.dispatchEvent(ev);
            blocked = ev.defaultPrevented;
          } catch {
          }
        }
        if (blocked) {
          return fail(el, m("Нэвтрэх талбарт хуулж буулгах (paste) хориглогдсон. Нууц үг менежер ашиглах боломжийг хааж, танин мэдэхүйн тест болж байна.", "Pasting is blocked in an authentication field. This blocks password managers and creates a cognitive function test."), { paste: true });
        }
        return null;
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const el = f.node;
          if (el.hasAttribute("onpaste")) ctx.changes.removeAttr(el, "onpaste", "accessible-auth-paste");
          const guard = (e) => {
            if (e.target === el && !e.__hjProbe) e.stopImmediatePropagation();
          };
          ctx.changes.listen(ctx.win, "paste", guard, true, "accessible-auth-paste");
          return m("Нэвтрэх талбарын paste хоригийг цуцлав.", "Unblocked paste in the authentication field.");
        }
      }
    },
    {
      id: "accessible-auth-autocomplete",
      sc: ["3.3.8", "1.3.5"],
      impact: "serious",
      selector: 'input[type="password"]',
      evaluate(el) {
        var _a3;
        const ac = (el.getAttribute("autocomplete") || "").toLowerCase();
        const formOff = ((_a3 = el.form) == null ? void 0 : _a3.getAttribute("autocomplete")) === "off";
        if (ac === "off" || !ac && formOff) {
          return fail(el, m('Нууц үгийн талбарт autocomplete="off" — нууц үг менежер ажиллахгүй. "current-password" эсвэл "new-password" ашиглана уу.', 'Password field has autocomplete="off", blocking password managers. Use "current-password" or "new-password".'));
        }
        if (!ac) return review(el, m('Нууц үгийн талбарт autocomplete="current-password"/"new-password" нэмэхийг зөвлөж байна.', 'Add autocomplete="current-password" or "new-password" to the password field.'));
        return null;
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          const form = f.node.form;
          const isNew = form && form.querySelectorAll('input[type="password"]').length > 1 || /new|register|signup|бүртгүүлэх|шинэ/i.test(`${f.node.name} ${f.node.id} ${(form == null ? void 0 : form.action) || ""}`);
          const v = isNew ? "new-password" : "current-password";
          ctx.changes.setAttr(f.node, "autocomplete", v, "accessible-auth-autocomplete");
          return m(`autocomplete="${v}" тохируулав.`, `Set autocomplete="${v}".`);
        }
      }
    },
    {
      id: "captcha-alternative",
      sc: ["3.3.8", "1.1.1"],
      impact: "serious",
      run(ctx) {
        const hits = qsa(ctx.doc, 'img[src*="captcha" i], img[alt*="captcha" i], img[id*="captcha" i], [class*="captcha" i]:not(.g-recaptcha):not(.h-captcha):not(.cf-turnstile)').filter((el) => !ctx.ignored(el) && isVisible(el));
        return hits.slice(0, 3).map((el) => review(el, m("Зурган CAPTCHA илэрлээ. Танин мэдэхүйн тест (тэмдэгт таних) шаардахгүй өөр арга (жишээ нь passkey, имэйл холбоос, Turnstile) санал болгоно уу.", "Image CAPTCHA detected. Provide an alternative that does not require a cognitive function test (e.g. passkey, email link, invisible challenge).")));
      }
    },
    {
      id: "select-auto-navigation",
      sc: ["3.2.2"],
      impact: "serious",
      selector: "select[onchange]",
      evaluate(el) {
        const h = el.getAttribute("onchange") || "";
        if (/location|submit\(|window\.open|href/.test(h)) {
          return fail(el, m("Сонголт өөрчлөгдөхөд урьдчилан мэдэгдэлгүйгээр хуудас шилжиж/илгээгдэж байна.", "Changing the selection navigates or submits without warning."));
        }
        return null;
      }
    },
    {
      id: "fieldset-group",
      sc: ["1.3.1", "3.3.2"],
      impact: "moderate",
      run(ctx) {
        const out = [];
        const groups = /* @__PURE__ */ new Map();
        qsa(ctx.doc, 'input[type="radio"][name]').forEach((r) => {
          if (ctx.ignored(r)) return;
          const k = `${r.form ? "f" : "d"}:${r.name}`;
          (groups.get(k) || groups.set(k, []).get(k)).push(r);
        });
        for (const [, radios] of groups) {
          if (radios.length < 2) continue;
          const g = radios[0].closest('fieldset, [role="radiogroup"], [role="group"]');
          if (!g || !accessibleName(g)) {
            out.push(review(radios[0], m('Радио товчнуудын бүлэг нэргүй. <fieldset><legend> эсвэл role="radiogroup" + aria-label ашиглана уу.', 'Radio group has no group label. Use <fieldset><legend> or role="radiogroup" with a label.')));
          }
        }
        return out;
      }
    }
  ];

  // src/rules/interaction.js
  var TARGET_SEL = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [role="button"], [role="link"], [role="checkbox"], [role="radio"], [role="tab"], [role="menuitem"], [role="switch"], [role="option"], [onclick]';
  function isInlineInText(el) {
    var _a3;
    const s = getComputedStyle(el);
    if (s.display !== "inline") return false;
    const block = (_a3 = el.parentElement) == null ? void 0 : _a3.closest("p, li, td, dd, span, label, blockquote, figcaption, div");
    if (!block) return false;
    const total = normalize(block.textContent).length;
    return total - normalize(el.textContent).length > 5;
  }
  function* walkRules(rules2) {
    var _a3;
    for (const r of rules2) {
      if (r.cssRules && !(r instanceof CSSStyleRule)) yield* walkRules(r.cssRules);
      else if (r instanceof CSSStyleRule) {
        yield r;
        if ((_a3 = r.cssRules) == null ? void 0 : _a3.length) yield* walkRules(r.cssRules);
      }
    }
  }
  function stickyEdges(ctx) {
    const vw = ctx.win.innerWidth, vh = ctx.win.innerHeight;
    let top = 0, bottom = 0;
    const els = [];
    for (const el of qsa(ctx.doc.body, "*")) {
      if (ctx.ignored(el)) continue;
      const s = getComputedStyle(el);
      if (s.position !== "fixed" && s.position !== "sticky") continue;
      if (!isVisible(el)) continue;
      const r = el.getBoundingClientRect();
      if (r.width < vw * 0.5 || r.height < 20 || r.height > vh * 0.6) continue;
      if (r.top <= 2 && r.bottom > 0) {
        top = Math.max(top, r.bottom);
        els.push({ el, edge: "top", h: r.bottom });
      } else if (r.bottom >= vh - 2 && r.top < vh) {
        bottom = Math.max(bottom, vh - r.top);
        els.push({ el, edge: "bottom", h: vh - r.top });
      }
    }
    return { top, bottom, els };
  }
  var interaction_default = [
    {
      id: "focus-visible",
      sc: ["2.4.7", "2.4.13"],
      impact: "serious",
      run(ctx) {
        var _a3, _b;
        const out = [];
        const ringOn = !!ctx.doc.querySelector('style[data-hurteemj-ui="focus-ring"]');
        for (const sheet of ctx.doc.styleSheets) {
          if ((_b = (_a3 = sheet.ownerNode) == null ? void 0 : _a3.hasAttribute) == null ? void 0 : _b.call(_a3, "data-hurteemj-ui")) continue;
          let rules2;
          try {
            rules2 = sheet.cssRules;
          } catch {
            continue;
          }
          for (const r of walkRules(rules2)) {
            const sel = r.selectorText || "";
            if (!/:focus(?!-within)/.test(sel)) continue;
            const st = r.style;
            const killed = st.outlineStyle === "none" || st.outline === "none" || st.outline === "0" || st.outlineWidth === "0px" || st.outlineWidth === "0" || st.outline === "0px";
            if (!killed) continue;
            if (ringOn && !st.getPropertyPriority("outline") && !st.getPropertyPriority("outline-style") && !st.getPropertyPriority("outline-width")) continue;
            const replaced = st.boxShadow && st.boxShadow !== "none" || st.borderColor || st.borderBottomColor || st.backgroundColor || st.textDecoration || st.textDecorationLine;
            if (replaced) {
              out.push(review(ctx.doc.documentElement, m(`"${sel}" дүрэм outline-ыг арилгаад өөр тэмдэглэгээ (сүүдэр/хүрээ) өгсөн. 3:1 тодрол ба 2px зузаантай эсэхийг шалгана уу.`, `"${sel}" removes the outline but adds another indicator. Verify it has 3:1 contrast and 2px thickness.`), { selector: sel }));
            } else {
              out.push(fail(ctx.doc.documentElement, m(`CSS дүрэм "${sel}" фокусын тоймыг (outline) орлуулгагүйгээр арилгаж байна.`, `CSS rule "${sel}" removes the focus outline without a replacement.`), { selector: sel }));
            }
            if (out.length > 20) return out;
          }
        }
        return out;
      },
      fix: {
        tier: "safe",
        once: true,
        apply(f, ctx) {
          if (f.outcome !== "fail") return false;
          ctx.runtime.enableFocusRing();
          return m("Бүх элементэд 2.4.13-ыг хангах хоёр өнгийн (бараан+цагаан) фокусын тойм нэмэв.", "Added a dual-tone focus ring meeting 2.4.13 to all focusable elements.");
        }
      }
    },
    {
      id: "focus-not-obscured",
      sc: ["2.4.11", "2.4.12"],
      impact: "serious",
      run(ctx) {
        const { top, bottom, els } = stickyEdges(ctx);
        if (!els.length) return [];
        const hs = getComputedStyle(ctx.doc.documentElement);
        const spTop = parseFloat(hs.scrollPaddingTop) || 0;
        const spBottom = parseFloat(hs.scrollPaddingBottom) || 0;
        const out = [];
        for (const { el, edge, h } of els) {
          const pad = edge === "top" ? spTop : spBottom;
          if (pad + 1 >= h) continue;
          out.push(fail(el, m(`Байнгын (${edge === "top" ? "дээд" : "доод"}) элемент ${Math.round(h)}px өндөртэй ч scroll-padding-${edge} ${Math.round(pad)}px. Гараар шилжихэд фокус энэ элементийн ард далдлагдана.`, `Sticky/fixed ${edge} element is ${Math.round(h)}px tall but scroll-padding-${edge} is ${Math.round(pad)}px. Keyboard focus can be hidden behind it.`), { edge, h, top, bottom }));
        }
        return out;
      },
      fix: {
        tier: "safe",
        once: true,
        apply(f, ctx) {
          ctx.runtime.enableFocusGuard();
          return m("scroll-padding тохируулж, фокус далдлагдвал автоматаар гүйлгэдэг хамгаалалт идэвхжүүлэв.", "Set scroll-padding and enabled a guard that scrolls focused elements out from under sticky content.");
        }
      }
    },
    {
      id: "target-size",
      sc: ["2.5.8", "2.5.5"],
      impact: "serious",
      run(ctx) {
        var _a3;
        const aaa = ctx.level === "AAA";
        const min = aaa ? 44 : 24;
        const targets = qsa(ctx.scope, TARGET_SEL).filter((el) => !ctx.ignored(el) && isVisible(el) && !isHiddenFromAT(el) && !el.disabled).map((el) => ({ el, r: el.getBoundingClientRect() })).filter(({ r }) => r.width > 0 && r.height > 0);
        const uniq = targets.filter((t) => !targets.some((o) => o !== t && o.el.contains(t.el) && o.el.matches("a[href], button")));
        const small = uniq.filter(({ el, r }) => (r.width < min - 0.5 || r.height < min - 0.5) && !isInlineInText(el));
        const out = [];
        for (const t of small) {
          const { el, r } = t;
          if (el.localName === "input" && ["checkbox", "radio"].includes(el.type)) {
            const s = getComputedStyle(el);
            if (s.appearance !== "none" && ((_a3 = el.labels) == null ? void 0 : _a3.length)) continue;
          }
          if (aaa) {
            out.push(fail(el, m(`Товшилтын талбай ${Math.round(r.width)}×${Math.round(r.height)}px (AAA шаардлага 44×44px).`, `Target is ${Math.round(r.width)}×${Math.round(r.height)}px (AAA requires 44×44px).`), { w: r.width, h: r.height, sc: ["2.5.5"] }));
            continue;
          }
          const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const conflict = uniq.find((o) => {
            if (o === t || o.el.contains(el) || el.contains(o.el)) return false;
            const ox = o.r.left + o.r.width / 2, oy = o.r.top + o.r.height / 2;
            const oSmall = o.r.width < 24 || o.r.height < 24;
            if (oSmall) return Math.hypot(cx - ox, cy - oy) < 24;
            const dx = Math.max(o.r.left - cx, 0, cx - o.r.right);
            const dy = Math.max(o.r.top - cy, 0, cy - o.r.bottom);
            return Math.hypot(dx, dy) < 12;
          });
          if (conflict) {
            out.push(fail(el, m(`Товшилтын талбай ${Math.round(r.width)}×${Math.round(r.height)}px (<24px) бөгөөд хөрш элементтэй хэт ойр.`, `Target is ${Math.round(r.width)}×${Math.round(r.height)}px (<24px) and too close to a neighbouring target.`), { w: r.width, h: r.height, sc: ["2.5.8"] }));
          }
        }
        return out;
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const el = f.node;
          const s = getComputedStyle(el);
          const min = ctx.level === "AAA" ? 44 : 24;
          if (s.display === "inline") ctx.changes.setStyle(el, "display", "inline-block", "target-size");
          ctx.changes.setStyle(el, "min-width", `${min}px`, "target-size");
          ctx.changes.setStyle(el, "min-height", `${min}px`, "target-size");
          return m(`Товшилтын талбайг ${min}×${min}px болгов.`, `Enlarged target to ${min}×${min}px.`);
        }
      }
    },
    {
      id: "tabindex-positive",
      sc: ["2.4.3"],
      impact: "serious",
      selector: "[tabindex]",
      evaluate(el) {
        const v = parseInt(el.getAttribute("tabindex"), 10);
        return v > 0 ? fail(el, m(`tabindex="${v}" (эерэг) нь фокусын байгалийн дарааллыг эвддэг.`, `tabindex="${v}" (positive) breaks the natural focus order.`)) : null;
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          ctx.changes.setAttr(f.node, "tabindex", "0", "tabindex-positive");
          return m("tabindex-ыг 0 болгов.", "Changed tabindex to 0.");
        }
      }
    },
    {
      id: "scrollable-region-focusable",
      sc: ["2.1.1"],
      impact: "serious",
      selector: "div, section, pre, ul, ol, article, aside, table, main, nav, code",
      evaluate(el) {
        const s = getComputedStyle(el);
        const sx = /(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 2;
        const sy = /(auto|scroll)/.test(s.overflowY) && el.scrollHeight > el.clientHeight + 2;
        if (!sx && !sy) return null;
        if (el === document.scrollingElement || !isVisible(el)) return null;
        if (isFocusable(el) || el.querySelector('a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])')) return null;
        return fail(el, m("Гүйлгэх (scroll) боломжтой хэсэгт гараар хүрэх боломжгүй.", "Scrollable region is not keyboard accessible."));
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          ctx.changes.setAttr(f.node, "tabindex", "0", "scrollable-region-focusable");
          if (!f.node.getAttribute("role") && !accessibleName(f.node)) {
            ctx.changes.setAttr(f.node, "role", "region", "scrollable-region-focusable");
            const h = f.node.querySelector("h1,h2,h3,h4,h5,h6,caption");
            ctx.changes.setAttr(f.node, "aria-label", h ? normalize(h.textContent) : ctx.pageLang === "mn" ? "Гүйлгэх хэсэг" : "Scrollable region", "scrollable-region-focusable");
          }
          return m('Гүйлгэх хэсгийг гараар фокуслах боломжтой болгов (tabindex="0").', 'Made the scroll region keyboard-focusable (tabindex="0").');
        }
      }
    },
    {
      id: "click-without-keyboard",
      sc: ["2.1.1", "4.1.2"],
      impact: "critical",
      selector: "div, span, li, img, p, td, i, svg, label:not([for])",
      evaluate(el, ctx) {
        if (el.closest('a[href], button, [role="button"], [role="link"], label, summary') && el.localName !== "label") return null;
        const role = getRole(el);
        if (role && INTERACTIVE_ROLES.has(role) && el.hasAttribute("tabindex")) return null;
        const hasHandler = el.hasAttribute("onclick") || ctx.clickTracked && ctx.clickTracked.has(el);
        if (!hasHandler) {
          const s = getComputedStyle(el);
          if (s.cursor !== "pointer" || !isVisible(el)) return null;
          const pS = el.parentElement && getComputedStyle(el.parentElement);
          if (pS && pS.cursor === "pointer") return null;
          if (el.querySelector("a[href], button, input, select, textarea")) return null;
          return review(el, m("Заагч (cursor: pointer) нь товшдог мэт харагдах ч гар болон дэлгэц уншигчид хүрэх боломжгүй.", "Element looks clickable (cursor: pointer) but is not reachable by keyboard or announced as a control."), { evidence: "cursor" });
        }
        if (isFocusable(el) && role) return null;
        return fail(el, m(`<${el.localName}> дээр click үйлдэл байгаа ч гараар ашиглах боломжгүй (role, tabindex, Enter/Space алга).`, `<${el.localName}> has a click handler but is not keyboard operable (missing role, tabindex, Enter/Space).`), { evidence: "handler" });
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          var _a3;
          if (((_a3 = f.data) == null ? void 0 : _a3.evidence) !== "handler") return false;
          const el = f.node;
          if (!el.getAttribute("role")) ctx.changes.setAttr(el, "role", "button", "click-without-keyboard");
          if (!el.hasAttribute("tabindex")) ctx.changes.setAttr(el, "tabindex", "0", "click-without-keyboard");
          const onKey = (e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === el) {
              e.preventDefault();
              el.click();
            }
          };
          ctx.changes.listen(el, "keydown", onKey, false, "click-without-keyboard");
          return m('role="button", tabindex="0", Enter/Space товчлуурын дэмжлэг нэмэв.', 'Added role="button", tabindex="0" and Enter/Space activation.');
        }
      }
    },
    {
      id: "motion-animation",
      sc: ["2.2.2", "2.3.3"],
      impact: "moderate",
      run(ctx) {
        var _a3, _b, _c;
        if (typeof ctx.doc.getAnimations !== "function") return [];
        const seen = /* @__PURE__ */ new Set();
        const out = [];
        for (const a of ctx.doc.getAnimations()) {
          const t = (_a3 = a.effect) == null ? void 0 : _a3.target;
          if (!t || seen.has(t) || ctx.ignored(t) || a.playState !== "running") continue;
          const timing = (_c = (_b = a.effect).getComputedTiming) == null ? void 0 : _c.call(_b);
          if (!timing) continue;
          const total = timing.iterations === Infinity ? Infinity : timing.activeDuration;
          if (total > 5e3 && isVisible(t)) {
            seen.add(t);
            out.push(review(t, m("5 секундээс урт/тасралтгүй хөдөлгөөн байна. Түр зогсоох, нуух удирдлага байгаа эсэх, prefers-reduced-motion дэмжиж буйг шалгана уу.", "Animation runs longer than 5 seconds. Verify a pause control exists and prefers-reduced-motion is honoured.")));
          }
        }
        return out.slice(0, 15);
      }
    },
    {
      id: "dragging-alternative",
      sc: ["2.5.7"],
      impact: "serious",
      selector: '[draggable="true"], .sortable, [data-sortable], .ui-sortable, .ui-draggable, .draggable, [data-rbd-draggable-id], [data-swapy-item]',
      evaluate(el) {
        if (!isVisible(el)) return null;
        const box = el.closest('ul, ol, [role="list"], [role="listbox"], [role="grid"], div') || el;
        if (box.querySelector('button, [role="button"], select')) return null;
        return review(el, m("Чирж зөөх (drag) үйлдэлд нэг цэгийн товшилтоор хийх хувилбар (дээш/доош товч гэх мэт) байгаа эсэхийг шалгана уу.", "Verify dragging has a single-pointer alternative (e.g. move up/down buttons)."));
      }
    },
    {
      id: "consistent-help",
      sc: ["3.2.6"],
      impact: "moderate",
      run(ctx) {
        const HELP = /(тусламж|холбоо\s*барих|бидэнтэй\s*холбогдох|асуулт|help|support|contact|faq|chat)/i;
        const items = qsa(ctx.doc.body, "a[href], button").filter((el) => !ctx.ignored(el) && isVisible(el)).filter((el) => /^(tel:|mailto:)/.test(el.getAttribute("href") || "") || HELP.test(accessibleName(el))).map((el) => /^tel:/.test(el.getAttribute("href") || "") ? "tel" : /^mailto:/.test(el.getAttribute("href") || "") ? "mail" : normalize(accessibleName(el)).toLowerCase().slice(0, 30));
        if (!items.length) return [];
        const key = "hj-help-order";
        let prev = null;
        try {
          prev = JSON.parse(ctx.win.sessionStorage.getItem(key) || "null");
        } catch {
        }
        try {
          ctx.win.sessionStorage.setItem(key, JSON.stringify({ path: ctx.win.location.pathname, items }));
        } catch {
        }
        if (!prev || prev.path === ctx.win.location.pathname) return [];
        const common = prev.items.filter((i) => items.includes(i));
        const a = common.join("|");
        const b = items.filter((i) => common.includes(i)).join("|");
        if (common.length >= 2 && a !== b) {
          return [review(ctx.doc.body, m(`Тусламжийн холбоосуудын дараалал өмнөх хуудаснаас (${prev.path}) өөр байна.`, `Help mechanisms appear in a different order than on the previous page (${prev.path}).`))];
        }
        return [];
      }
    },
    {
      id: "accesskey-unique",
      sc: ["2.1.4", "4.1.2"],
      impact: "moderate",
      run(ctx) {
        const map = /* @__PURE__ */ new Map();
        qsa(ctx.doc, "[accesskey]").forEach((el) => {
          const k = el.getAttribute("accesskey").toLowerCase();
          (map.get(k) || map.set(k, []).get(k)).push(el);
        });
        const out = [];
        for (const [k, els] of map) if (els.length > 1) out.push(fail(els[1], m(`accesskey="${k}" давхардсан байна.`, `accesskey="${k}" is duplicated.`)));
        return out;
      }
    }
  ];

  // src/rules/aria.js
  var nameFold = (s) => normalize(s).toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
  function nearestHeadingText(el) {
    const card = el.closest('article, li, section, .card, [class*="card"], [class*="item"], [class*="post"]');
    const h = card == null ? void 0 : card.querySelector('h1, h2, h3, h4, h5, h6, [role="heading"]');
    return h ? normalize(h.textContent) : null;
  }
  var aria_default = [
    {
      id: "button-name",
      sc: ["4.1.2"],
      impact: "critical",
      selector: 'button, [role="button"], input[type="button"], input[type="submit"], input[type="reset"]',
      evaluate(el) {
        if (isHiddenFromAT(el) || !isVisible(el)) return null;
        return accessibleName(el) ? null : fail(el, m('Товч нэргүй (дэлгэц уншигч "товч" гэж л уншина). Текст эсвэл aria-label нэмнэ үү.', "Button has no accessible name. Add text or aria-label."));
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const name = guessIconName(f.node, ctx.pageLang);
          if (!name) return false;
          ctx.changes.setAttr(f.node, "aria-label", name, "button-name");
          return m(`Icon-оос таамаглаж aria-label="${name}" өгөв (шалгана уу).`, `Guessed aria-label="${name}" from the icon (please verify).`);
        }
      }
    },
    {
      id: "link-name",
      sc: ["2.4.4", "4.1.2"],
      impact: "critical",
      selector: 'a[href], [role="link"]',
      evaluate(el) {
        if (isHiddenFromAT(el) || !isVisible(el)) return null;
        return accessibleName(el) ? null : fail(el, m("Холбоос нэргүй. Холбоосын текст, зургийн alt эсвэл aria-label нэмнэ үү.", "Link has no accessible name. Add link text, image alt, or aria-label."));
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const name = guessIconName(f.node, ctx.pageLang);
          if (!name) return false;
          ctx.changes.setAttr(f.node, "aria-label", name, "link-name");
          return m(`Icon/хаягаас таамаглаж aria-label="${name}" өгөв (шалгана уу).`, `Guessed aria-label="${name}" from icon/URL (please verify).`);
        }
      }
    },
    {
      id: "link-purpose",
      sc: ["2.4.4", "2.4.9"],
      impact: "moderate",
      selector: "a[href]",
      evaluate(el) {
        if (isHiddenFromAT(el)) return null;
        const name = nameFold(accessibleName(el));
        if (!name || !AMBIGUOUS_LINK_TEXT.has(name)) return null;
        if (el.hasAttribute("aria-describedby")) return null;
        return review(el, m(`Холбоосын текст "${accessibleName(el)}" нь зорилгоо дангаараа илэрхийлэхгүй. Контекстоо (жишээ нь гарчгийг) нэмнэ үү.`, `Link text "${accessibleName(el)}" does not describe its purpose on its own. Add context such as the heading.`));
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const h = nearestHeadingText(f.node);
          if (!h) return false;
          const vis = visibleText(f.node);
          const label = `${vis}: ${h}`;
          ctx.changes.setAttr(f.node, "aria-label", label, "link-purpose");
          return m(`aria-label="${label}" болгон контекст нэмэв.`, `Added context: aria-label="${label}".`);
        }
      }
    },
    {
      id: "label-in-name",
      sc: ["2.5.3"],
      impact: "serious",
      selector: "[aria-label], [aria-labelledby]",
      evaluate(el) {
        const role = getRole(el);
        if (!INTERACTIVE_ROLES.has(role)) return null;
        if (["textbox", "searchbox", "combobox", "slider", "spinbutton"].includes(role)) return null;
        const vis = nameFold(visibleText(el));
        if (!vis || vis.length < 2) return null;
        const name = nameFold(accessibleName(el));
        if (name.includes(vis)) return null;
        return fail(el, m(`Харагдах текст "${visibleText(el)}" нь програмын нэр "${accessibleName(el)}"-д агуулагдаагүй. Дуу хоолойгоор удирдах хэрэглэгч товчийг дуудаж чадахгүй.`, `Visible label "${visibleText(el)}" is not part of the accessible name "${accessibleName(el)}". Voice control users cannot activate it.`), { visible: visibleText(el), name: accessibleName(el) });
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          if (!f.node.hasAttribute("aria-label")) return false;
          const label = `${f.data.visible} (${f.data.name})`;
          ctx.changes.setAttr(f.node, "aria-label", label, "label-in-name");
          return m(`aria-label-ийг харагдах текстээр эхлүүлэв: "${label}".`, `Prefixed aria-label with visible text: "${label}".`);
        }
      }
    },
    {
      id: "aria-valid-role",
      sc: ["4.1.2", "1.3.1"],
      impact: "critical",
      selector: "[role]",
      evaluate(el) {
        const roles = el.getAttribute("role").trim().split(/\s+/).filter(Boolean);
        if (!roles.length) return null;
        const bad = roles.filter((r) => !ROLES.has(r));
        if (!bad.length) return null;
        if (roles.some((r) => ROLES.has(r))) return review(el, m(`role жагсаалтад хүчингүй утга бий: ${bad.join(", ")} (fallback-д хүчинтэй нь хэрэглэгдэнэ).`, `Role list contains invalid values: ${bad.join(", ")} (a valid fallback exists).`));
        const abstract = bad.filter((r) => ABSTRACT_ROLES.has(r));
        return fail(el, abstract.length ? m(`Хийсвэр (abstract) ARIA үүрэг "${abstract[0]}"-ийг хуудсанд ашиглах хориотой.`, `Abstract ARIA role "${abstract[0]}" must not be used.`) : m(`role="${bad.join(" ")}" нь хүчинтэй ARIA үүрэг биш.`, `role="${bad.join(" ")}" is not a valid ARIA role.`));
      }
    },
    {
      id: "aria-valid-attr",
      sc: ["4.1.2"],
      impact: "critical",
      run(ctx) {
        const out = [];
        for (const el of qsa(ctx.scope, "*")) {
          if (ctx.ignored(el)) continue;
          for (const a of el.attributes) {
            if (!a.name.startsWith("aria-")) continue;
            if (!ARIA_ATTRS.has(a.name)) {
              out.push(fail(el, m(`"${a.name}" нь хүчинтэй ARIA атрибут биш (үсгийн алдаа?).`, `"${a.name}" is not a valid ARIA attribute (typo?).`), { attr: a.name }));
              continue;
            }
            const allowed = ATTR_VALUES[a.name];
            const v = a.value.trim().toLowerCase();
            if (allowed && v && !allowed.includes(v)) {
              out.push(fail(el, m(`${a.name}="${a.value}" — зөвшөөрөгдөх утга: ${allowed.join(", ")}.`, `${a.name}="${a.value}" — allowed values: ${allowed.join(", ")}.`), { attr: a.name, value: a.value }));
            }
            if (/^aria-(valuenow|valuemin|valuemax|level|posinset|setsize|colcount|rowcount|colindex|rowindex|colspan|rowspan)$/.test(a.name) && v && Number.isNaN(Number(v))) {
              out.push(fail(el, m(`${a.name}="${a.value}" нь тоон утга байх ёстой.`, `${a.name}="${a.value}" must be a number.`)));
            }
          }
          if (out.length > 200) break;
        }
        return out;
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          var _a3;
          const typos = { "aria-labeledby": "aria-labelledby", "aria-role": null, "aria-descibedby": "aria-describedby", "aria-describeby": "aria-describedby", "aria-hiden": "aria-hidden" };
          const attr = (_a3 = f.data) == null ? void 0 : _a3.attr;
          if (!attr || !(attr in typos) || f.data.value !== void 0) return false;
          const val = f.node.getAttribute(attr);
          if (typos[attr]) ctx.changes.setAttr(f.node, typos[attr], val, "aria-valid-attr");
          ctx.changes.removeAttr(f.node, attr, "aria-valid-attr");
          return typos[attr] ? m(`${attr} -> ${typos[attr]} болгон засав.`, `Corrected ${attr} to ${typos[attr]}.`) : m(`Хүчингүй ${attr}-ийг устгав.`, `Removed invalid ${attr}.`);
        }
      }
    },
    {
      id: "aria-required-attr",
      sc: ["4.1.2"],
      impact: "critical",
      selector: "[role]",
      evaluate(el) {
        const role = el.getAttribute("role").trim().split(/\s+/)[0];
        const req = REQUIRED_ATTRS[role];
        if (!req) return null;
        if (el.localName === "input" && ["checkbox", "radio"].includes(el.type) && ["checkbox", "radio", "switch", "menuitemcheckbox", "menuitemradio"].includes(role)) return null;
        if (role === "heading" && /^h[1-6]$/.test(el.localName)) return null;
        if (role === "slider" && el.localName === "input" && el.type === "range") return null;
        if (role === "combobox" && el.localName === "select") return null;
        const missing = req.filter((a) => !el.hasAttribute(a));
        if (role === "scrollbar" && missing.length === 1 && missing[0] === "aria-controls") return null;
        if (!missing.length) return null;
        return fail(el, m(`role="${role}" нь ${missing.join(", ")} атрибутыг шаарддаг.`, `role="${role}" requires ${missing.join(", ")}.`), { role, missing });
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const { role, missing } = f.data;
          const defaults = { "aria-checked": "false", "aria-expanded": "false", "aria-level": "2" };
          const applied = missing.filter((a) => defaults[a]);
          if (!applied.length) return false;
          applied.forEach((a) => ctx.changes.setAttr(f.node, a, defaults[a], "aria-required-attr"));
          return m(`${role}-д анхны утга нэмэв: ${applied.join(", ")}. Төлөвийг JavaScript-ээр шинэчилж байгаа эсэхийг шалгана уу.`, `Added default ${applied.join(", ")} to ${role}. Ensure scripts update the state.`);
        }
      }
    },
    {
      id: "aria-idrefs",
      sc: ["1.3.1", "4.1.2"],
      impact: "serious",
      selector: IDREF_ATTRS.map((a) => `[${a}]`).join(","),
      evaluate(el) {
        const root = el.getRootNode();
        const missing = [];
        for (const a of IDREF_ATTRS) {
          const v = el.getAttribute(a);
          if (!v) continue;
          for (const id of v.trim().split(/\s+/)) if (id && !(root.getElementById ? root.getElementById(id) : document.getElementById(id))) missing.push(`${a}→#${id}`);
        }
        if (!missing.length) return null;
        const onlyControls = missing.every((x) => x.startsWith("aria-controls") || x.startsWith("aria-activedescendant"));
        return (onlyControls ? review : fail)(el, m(`ARIA лавлагаа байхгүй ID рүү заасан: ${missing.join(", ")}.`, `ARIA reference points to missing IDs: ${missing.join(", ")}.`));
      }
    },
    {
      id: "duplicate-id-aria",
      sc: ["4.1.2", "1.3.1"],
      impact: "serious",
      run(ctx) {
        const refd = /* @__PURE__ */ new Set();
        qsa(ctx.doc, IDREF_ATTRS.map((a) => `[${a}]`).join(",") + ", label[for]").forEach((el) => {
          [...IDREF_ATTRS, "for"].forEach((a) => (el.getAttribute(a) || "").split(/\s+/).filter(Boolean).forEach((id) => refd.add(id)));
        });
        const out = [];
        for (const id of refd) {
          let els;
          try {
            els = ctx.doc.querySelectorAll(`[id="${CSS.escape(id)}"]`);
          } catch {
            continue;
          }
          if (els.length > 1) out.push(fail(els[1], m(`Шошго/ARIA-д ашиглагдсан id="${id}" давхардсан тул буруу элемент холбогдоно.`, `id="${id}" is referenced by a label/ARIA but is duplicated.`)));
        }
        return out;
      }
    },
    {
      id: "aria-hidden-focus",
      sc: ["4.1.2", "1.3.1"],
      impact: "serious",
      selector: '[aria-hidden="true"]',
      evaluate(el) {
        if (el === document.body || el === document.documentElement) {
          return fail(el, m(`<${el.localName}> дээр aria-hidden="true" — хуудас бүхэлдээ дэлгэц уншигчаас нуугдсан.`, `aria-hidden="true" on <${el.localName}> hides the whole page.`), { whole: true });
        }
        const focusables = [el, ...el.querySelectorAll('a[href], button, input, select, textarea, [tabindex], iframe, summary, [contenteditable="true"]')].filter((n) => isFocusable(n) && isVisible(n) && !n.disabled);
        if (!focusables.length) return null;
        return fail(focusables[0], m('aria-hidden="true" дотор фокуслах боломжтой элемент байна — дэлгэц уншигч "хоосон" фокус дээр зогсоно.', 'Focusable element inside aria-hidden="true" — screen readers land on a "ghost" control.'), { container: el, count: focusables.length });
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          var _a3;
          if ((_a3 = f.data) == null ? void 0 : _a3.whole) return false;
          const box = f.data.container;
          const r = box.getBoundingClientRect();
          if (r.width > 1 && r.height > 1 && getComputedStyle(box).visibility === "visible" && getComputedStyle(box).opacity !== "0") {
            ctx.changes.removeAttr(box, "aria-hidden", "aria-hidden-focus");
            return m("Харагдаж буй хэсгээс aria-hidden-ыг авав.", "Removed aria-hidden from visible content.");
          }
          box.querySelectorAll("a[href], button, input, select, textarea, [tabindex], iframe").forEach((n) => ctx.changes.setAttr(n, "tabindex", "-1", "aria-hidden-focus"));
          return m('Нуугдсан хэсгийн элементүүдийг фокусаас хасав (tabindex="-1").', 'Removed hidden elements from the tab order (tabindex="-1").');
        }
      }
    },
    {
      id: "aria-name-required",
      sc: ["4.1.2"],
      impact: "serious",
      selector: '[role]:not(button):not(a):not(input):not(img):not([role="button"]):not([role="link"]):not([role="img"])',
      evaluate(el) {
        const role = el.getAttribute("role").trim().split(/\s+/)[0];
        if (!NAME_REQUIRED.has(role) || ["region", "form", "table", "grid", "treegrid", "dialog", "alertdialog"].includes(role)) return null;
        if (isHiddenFromAT(el) || !isVisible(el)) return null;
        return accessibleName(el) ? null : fail(el, m(`role="${role}" элемент нэргүй байна.`, `Element with role="${role}" has no accessible name.`));
      }
    },
    {
      id: "iframe-title",
      sc: ["4.1.2", "2.4.1"],
      impact: "serious",
      selector: "iframe, frame",
      evaluate(el) {
        if (isHiddenFromAT(el) || el.getAttribute("tabindex") === "-1" && !isVisible(el)) return null;
        return accessibleName(el) || normalize(el.title) ? null : fail(el, m("iframe-д title (агуулгыг тайлбарласан нэр) алга.", "iframe has no title describing its content."));
      },
      fix: {
        tier: "heuristic",
        apply(f, ctx) {
          const src = f.node.getAttribute("src") || "";
          const known = [[/youtube|youtu\.be/, "YouTube video"], [/vimeo/, "Vimeo video"], [/google\.[a-z.]+\/maps|maps\.google/, ctx.pageLang === "mn" ? "Google газрын зураг" : "Google Map"], [/facebook/, "Facebook"], [/recaptcha/, "reCAPTCHA"], [/twitter|x\.com/, "X (Twitter)"]];
          const hit = known.find(([re]) => re.test(src));
          if (!hit) return false;
          ctx.changes.setAttr(f.node, "title", hit[1], "iframe-title");
          return m(`iframe-д title="${hit[1]}" өгөв.`, `Set iframe title="${hit[1]}".`);
        }
      }
    },
    {
      id: "nested-interactive",
      sc: ["4.1.2"],
      impact: "serious",
      selector: 'a[href], button, [role="button"], [role="link"]',
      evaluate(el) {
        const inner = el.querySelector('a[href], button, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])');
        return inner ? fail(el, m(`Идэвхтэй элемент (<${el.localName}>) дотор өөр идэвхтэй элемент (<${inner.localName}>) байна.`, `Interactive <${el.localName}> contains another interactive <${inner.localName}>.`)) : null;
      }
    },
    {
      id: "dialog-name",
      sc: ["4.1.2"],
      impact: "serious",
      selector: 'dialog, [role="dialog"], [role="alertdialog"]',
      evaluate(el) {
        if (!isVisible(el)) return null;
        return accessibleName(el) ? null : fail(el, m("Харилцах цонх (dialog) нэргүй. aria-labelledby-оор гарчигтай нь холбоно уу.", "Dialog has no accessible name. Reference its heading via aria-labelledby."));
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          const h = f.node.querySelector('h1, h2, h3, h4, [role="heading"]');
          if (!h || !normalize(h.textContent)) return false;
          if (!h.id) ctx.changes.setAttr(h, "id", `hj-dlg-${Math.random().toString(36).slice(2, 8)}`, "dialog-name");
          ctx.changes.setAttr(f.node, "aria-labelledby", h.id, "dialog-name");
          return m("Dialog-ийг гарчигтай нь aria-labelledby-оор холбов.", "Linked the dialog to its heading via aria-labelledby.");
        }
      }
    },
    {
      id: "status-messages",
      sc: ["4.1.3"],
      impact: "serious",
      selector: '.toast, .snackbar, .notification, .alert, .flash, .notice, [class*="toast"], [class*="snackbar"], [class*="alert-"], .message.success, .message.error, .invalid-feedback, .form-error, [class*="flash-"]',
      evaluate(el) {
        if (!isVisible(el) || !normalize(el.textContent)) return null;
        if (el.closest('[role="status"], [role="alert"], [role="log"], [aria-live], output, [role="alertdialog"]')) return null;
        if (el.matches("a, button") || el.querySelector("a[href], button, input")) {
          return review(el, m('Мэдэгдлийн элемент бололтой. Динамикаар гарч ирдэг бол role="status"/"alert" эсвэл aria-live хэрэгтэй.', 'Looks like a notification. If it appears dynamically it needs role="status"/"alert" or aria-live.'));
        }
        const isError = /(error|danger|fail|invalid|алдаа)/i.test(el.className + el.textContent.slice(0, 40));
        return fail(el, m('Төлөвийн мессеж дэлгэц уншигчид зарлагдахгүй (role="status" / role="alert" / aria-live алга).', 'Status message is not announced to screen readers (no role="status"/"alert"/aria-live).'), { isError });
      },
      fix: {
        tier: "safe",
        apply(f, ctx) {
          var _a3;
          if (f.outcome !== "fail") return false;
          const role = ((_a3 = f.data) == null ? void 0 : _a3.isError) ? "alert" : "status";
          ctx.changes.setAttr(f.node, "role", role, "status-messages");
          ctx.runtime.announce(normalize(f.node.textContent), role === "alert" ? "assertive" : "polite");
          return m(`role="${role}" нэмэв.`, `Added role="${role}".`);
        }
      }
    },
    {
      id: "presentation-role-conflict",
      sc: ["4.1.2"],
      impact: "moderate",
      selector: '[role="presentation"], [role="none"]',
      evaluate(el) {
        if (isFocusable(el) || [...el.attributes].some((a) => ["aria-label", "aria-labelledby", "aria-describedby", "aria-live"].includes(a.name))) {
          return fail(el, m('role="presentation/none" боловч фокуслах боломжтой эсвэл глобал ARIA атрибуттай — үүрэг үл тоогдоно.', 'role="presentation/none" is ignored because the element is focusable or has global ARIA attributes.'));
        }
        return null;
      }
    }
  ];

  // src/rules/index.js
  var RULES = [...structure_default, ...media_default, ...contrast_default, ...forms_default, ...interaction_default, ...aria_default];
  var RULES_BY_ID = Object.fromEntries(RULES.map((r) => [r.id, r]));

  // src/wcag/criteria.js
  var C = (id, level, automation, en, mn, extra = {}) => ({ id, level, automation, title: { en, mn }, ...extra });
  var CRITERIA = [
    // 1. Мэдрэгдэхүйц (Perceivable)
    C("1.1.1", "A", "partial", "Non-text Content", "Текст бус контент"),
    C("1.2.1", "A", "partial", "Audio-only and Video-only (Prerecorded)", "Зөвхөн аудио ба зөвхөн видео (бичлэг)"),
    C("1.2.2", "A", "partial", "Captions (Prerecorded)", "Хадмал (бичлэг)"),
    C("1.2.3", "A", "manual", "Audio Description or Media Alternative (Prerecorded)", "Аудио тайлбар эсвэл медиа хувилбар (бичлэг)"),
    C("1.2.4", "AA", "manual", "Captions (Live)", "Хадмал (шууд)"),
    C("1.2.5", "AA", "manual", "Audio Description (Prerecorded)", "Аудио тайлбар (бичлэг)"),
    C("1.2.6", "AAA", "manual", "Sign Language (Prerecorded)", "Дохионы хэл (бичлэг)"),
    C("1.2.7", "AAA", "manual", "Extended Audio Description (Prerecorded)", "Өргөтгөсөн аудио тайлбар (бичлэг)"),
    C("1.2.8", "AAA", "manual", "Media Alternative (Prerecorded)", "Медиа хувилбар (бичлэг)"),
    C("1.2.9", "AAA", "manual", "Audio-only (Live)", "Зөвхөн аудио (шууд)"),
    C("1.3.1", "A", "partial", "Info and Relationships", "Мэдээлэл ба хамаарал"),
    C("1.3.2", "A", "manual", "Meaningful Sequence", "Утга бүхий дараалал"),
    C("1.3.3", "A", "manual", "Sensory Characteristics", "Мэдрэхүйн шинж"),
    C("1.3.4", "AA", "partial", "Orientation", "Чиглэл (босоо/хэвтээ)"),
    C("1.3.5", "AA", "partial", "Identify Input Purpose", "Оролтын зорилгыг тодорхойлох"),
    C("1.3.6", "AAA", "manual", "Identify Purpose", "Зорилгыг тодорхойлох"),
    C("1.4.1", "A", "partial", "Use of Color", "Өнгөний хэрэглээ"),
    C("1.4.2", "A", "partial", "Audio Control", "Аудио удирдлага"),
    C("1.4.3", "AA", "auto", "Contrast (Minimum)", "Тодрол (доод)"),
    C("1.4.4", "AA", "partial", "Resize Text", "Текстийн хэмжээ өөрчлөх"),
    C("1.4.5", "AA", "manual", "Images of Text", "Текстэн зураг"),
    C("1.4.6", "AAA", "auto", "Contrast (Enhanced)", "Тодрол (сайжруулсан)"),
    C("1.4.7", "AAA", "manual", "Low or No Background Audio", "Арын дуу бага эсвэл байхгүй"),
    C("1.4.8", "AAA", "partial", "Visual Presentation", "Харагдах байдал"),
    C("1.4.9", "AAA", "manual", "Images of Text (No Exception)", "Текстэн зураг (үл хамаарах заалтгүй)"),
    C("1.4.10", "AA", "partial", "Reflow", "Дахин байрлалт (320px)"),
    C("1.4.11", "AA", "partial", "Non-text Contrast", "Текст бус тодрол"),
    C("1.4.12", "AA", "partial", "Text Spacing", "Текстийн зай"),
    C("1.4.13", "AA", "manual", "Content on Hover or Focus", "Hover/фокус дээр гарах контент"),
    // 2. Удирдах боломжтой (Operable)
    C("2.1.1", "A", "partial", "Keyboard", "Гар"),
    C("2.1.2", "A", "manual", "No Keyboard Trap", "Гарын хавх байхгүй"),
    C("2.1.3", "AAA", "manual", "Keyboard (No Exception)", "Гар (үл хамаарах заалтгүй)"),
    C("2.1.4", "A", "manual", "Character Key Shortcuts", "Нэг тэмдэгтийн товчлол"),
    C("2.2.1", "A", "partial", "Timing Adjustable", "Хугацааг тохируулах"),
    C("2.2.2", "A", "partial", "Pause, Stop, Hide", "Түр зогсоох, зогсоох, нуух"),
    C("2.2.3", "AAA", "manual", "No Timing", "Хугацааны хязгааргүй"),
    C("2.2.4", "AAA", "manual", "Interruptions", "Тасалдал"),
    C("2.2.5", "AAA", "manual", "Re-authenticating", "Дахин нэвтрэх"),
    C("2.2.6", "AAA", "manual", "Timeouts", "Хугацаа дуусах анхааруулга"),
    C("2.3.1", "A", "manual", "Three Flashes or Below Threshold", "Гурван анивчилт эсвэл босгоос доош"),
    C("2.3.2", "AAA", "manual", "Three Flashes", "Гурван анивчилт"),
    C("2.3.3", "AAA", "partial", "Animation from Interactions", "Харилцан үйлдлийн хөдөлгөөн"),
    C("2.4.1", "A", "auto", "Bypass Blocks", "Блок алгасах"),
    C("2.4.2", "A", "auto", "Page Titled", "Хуудасны гарчиг"),
    C("2.4.3", "A", "partial", "Focus Order", "Фокусын дараалал"),
    C("2.4.4", "A", "partial", "Link Purpose (In Context)", "Холбоосын зорилго (контекстэд)"),
    C("2.4.5", "AA", "manual", "Multiple Ways", "Олон арга зам"),
    C("2.4.6", "AA", "partial", "Headings and Labels", "Гарчиг ба шошго"),
    C("2.4.7", "AA", "partial", "Focus Visible", "Фокус харагдах"),
    C("2.4.8", "AAA", "manual", "Location", "Байршил"),
    C("2.4.9", "AAA", "partial", "Link Purpose (Link Only)", "Холбоосын зорилго (зөвхөн холбоос)"),
    C("2.4.10", "AAA", "partial", "Section Headings", "Хэсгийн гарчиг"),
    C("2.4.11", "AA", "partial", "Focus Not Obscured (Minimum)", "Фокус далдлагдахгүй (доод)", { new22: true }),
    C("2.4.12", "AAA", "partial", "Focus Not Obscured (Enhanced)", "Фокус далдлагдахгүй (сайжруулсан)", { new22: true }),
    C("2.4.13", "AAA", "partial", "Focus Appearance", "Фокусын дүр төрх", { new22: true }),
    C("2.5.1", "A", "manual", "Pointer Gestures", "Заагчийн дохио зангаа"),
    C("2.5.2", "A", "manual", "Pointer Cancellation", "Заагчийн үйлдэл цуцлах"),
    C("2.5.3", "A", "auto", "Label in Name", "Нэрэнд шошго агуулагдах"),
    C("2.5.4", "A", "manual", "Motion Actuation", "Хөдөлгөөнөөр идэвхжүүлэх"),
    C("2.5.5", "AAA", "auto", "Target Size (Enhanced)", "Товшилтын хэмжээ (сайжруулсан, 44px)"),
    C("2.5.6", "AAA", "manual", "Concurrent Input Mechanisms", "Зэрэгцээ оролтын механизм"),
    C("2.5.7", "AA", "partial", "Dragging Movements", "Чирэх хөдөлгөөн", { new22: true }),
    C("2.5.8", "AA", "auto", "Target Size (Minimum)", "Товшилтын хэмжээ (доод, 24px)", { new22: true }),
    // 3. Ойлгомжтой (Understandable)
    C("3.1.1", "A", "auto", "Language of Page", "Хуудасны хэл"),
    C("3.1.2", "AA", "partial", "Language of Parts", "Хэсгийн хэл"),
    C("3.1.3", "AAA", "manual", "Unusual Words", "Ер бусын үг"),
    C("3.1.4", "AAA", "partial", "Abbreviations", "Товчлол"),
    C("3.1.5", "AAA", "manual", "Reading Level", "Уншлагын түвшин"),
    C("3.1.6", "AAA", "manual", "Pronunciation", "Дуудлага"),
    C("3.2.1", "A", "manual", "On Focus", "Фокус авахад"),
    C("3.2.2", "A", "partial", "On Input", "Оролт хийхэд"),
    C("3.2.3", "AA", "manual", "Consistent Navigation", "Тогтвортой навигаци"),
    C("3.2.4", "AA", "manual", "Consistent Identification", "Тогтвортой тодорхойлолт"),
    C("3.2.5", "AAA", "partial", "Change on Request", "Хүсэлтээр өөрчлөх"),
    C("3.2.6", "A", "partial", "Consistent Help", "Тогтвортой тусламж", { new22: true }),
    C("3.3.1", "A", "partial", "Error Identification", "Алдааг тодорхойлох"),
    C("3.3.2", "A", "partial", "Labels or Instructions", "Шошго эсвэл заавар"),
    C("3.3.3", "AA", "manual", "Error Suggestion", "Алдааны зөвлөмж"),
    C("3.3.4", "AA", "manual", "Error Prevention (Legal, Financial, Data)", "Алдаанаас сэргийлэх (хууль, санхүү, өгөгдөл)"),
    C("3.3.5", "AAA", "manual", "Help", "Тусламж"),
    C("3.3.6", "AAA", "manual", "Error Prevention (All)", "Алдаанаас сэргийлэх (бүгд)"),
    C("3.3.7", "A", "manual", "Redundant Entry", "Давхардсан оруулга", { new22: true }),
    C("3.3.8", "AA", "partial", "Accessible Authentication (Minimum)", "Хүртээмжтэй нэвтрэлт (доод)", { new22: true }),
    C("3.3.9", "AAA", "partial", "Accessible Authentication (Enhanced)", "Хүртээмжтэй нэвтрэлт (сайжруулсан)", { new22: true }),
    // 4. Бат бөх (Robust)
    C("4.1.2", "A", "auto", "Name, Role, Value", "Нэр, үүрэг, утга"),
    C("4.1.3", "AA", "partial", "Status Messages", "Төлөвийн мессеж")
  ];
  var CRITERIA_BY_ID = Object.fromEntries(CRITERIA.map((c) => [c.id, c]));
  var LEVEL_RANK = { A: 1, AA: 2, AAA: 3 };
  function criteriaForLevel(level = "AA") {
    const max = LEVEL_RANK[level] || 2;
    return CRITERIA.filter((c) => LEVEL_RANK[c.level] <= max);
  }
  function levelIncludes(target, scLevel) {
    return LEVEL_RANK[scLevel] <= (LEVEL_RANK[target] || 2);
  }

  // src/core/engine.js
  var TIER = { safe: 1, heuristic: 2 };
  var IMPACT_ORDER = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  var seq = 0;
  function ruleSetting(config, id) {
    var _a3;
    const r = (_a3 = config.rules) == null ? void 0 : _a3[id];
    if (r === false) return { enabled: false };
    if (r === true || r === void 0) return { enabled: true };
    return { enabled: r.enabled !== false, ...r };
  }
  function activeRules(config) {
    const only = config.only && new Set(config.only);
    return RULES.filter((r) => {
      if (only && !only.has(r.id) && !r.sc.some((sc) => only.has(sc))) return false;
      return ruleSetting(config, r.id).enabled;
    });
  }
  function normalizeResult(rule, res, config) {
    var _a3, _b;
    const sc = ((_a3 = res.data) == null ? void 0 : _a3.sc) || rule.sc;
    const inLevel = sc.filter((id) => CRITERIA_BY_ID[id] && levelIncludes(config.level, CRITERIA_BY_ID[id].level));
    if (!inLevel.length) return null;
    const override = ruleSetting(config, rule.id);
    return {
      id: `hj-${++seq}`,
      ruleId: rule.id,
      sc: inLevel,
      level: inLevel.map((id) => CRITERIA_BY_ID[id].level).sort()[0],
      impact: override.impact || rule.impact,
      outcome: res.outcome,
      message: res.message,
      data: res.data,
      node: res.node,
      selector: res.node ? cssPath(res.node) : null,
      html: ((_b = res.node) == null ? void 0 : _b.outerHTML) ? snippet(res.node) : null,
      fixed: false,
      fix: null
    };
  }
  function runAudit({ doc, win, config, scope, deep = false, runtime, changes, clickTracked, pageLang }) {
    var _a3;
    const t0 = (win.performance || Date).now();
    const partial = scope && scope !== doc;
    const ctx = {
      doc,
      win,
      config,
      level: config.level,
      scope: scope || doc,
      runtime,
      changes,
      clickTracked,
      pageLang: pageLang || (doc.documentElement.lang || config.lang || "mn").split("-")[0],
      ignored: (el) => isIgnored(el, config.ignore)
    };
    const findings = [];
    const errors = [];
    for (const rule of activeRules(config)) {
      if (rule.deep && !deep) continue;
      if (partial && rule.run && !rule.scoped) continue;
      try {
        let results = [];
        if (rule.run) {
          results = rule.run(ctx) || [];
        } else {
          const root = rule.root === "document" ? doc : ctx.scope;
          let els = qsa(root, rule.selector);
          if (partial && ((_a3 = scope.matches) == null ? void 0 : _a3.call(scope, rule.selector))) els.unshift(scope);
          for (const el of els) {
            if (ctx.ignored(el)) continue;
            const r = rule.evaluate(el, ctx);
            if (r) Array.isArray(r) ? results.push(...r) : results.push(r);
          }
        }
        for (const res of results) {
          if (res.node && ctx.ignored(res.node)) continue;
          const f = normalizeResult(rule, res, config);
          if (f) findings.push(f);
        }
      } catch (e) {
        errors.push({ ruleId: rule.id, error: String(e && e.message || e) });
      }
    }
    findings.sort((a, b) => (a.outcome === b.outcome ? 0 : a.outcome === "fail" ? -1 : 1) || IMPACT_ORDER[a.impact] - IMPACT_ORDER[b.impact]);
    return buildReport({ doc, win, config, findings, errors, partial, duration: (win.performance || Date).now() - t0 });
  }
  function buildReport({ doc, win, config, findings, errors = [], partial = false, duration = 0 }) {
    var _a3;
    const bySC = {};
    for (const f of findings) for (const sc of f.sc) (bySC[sc] || (bySC[sc] = { fail: 0, review: 0, fixed: 0 }))[f.outcome]++;
    for (const f of findings) if (f.fixed) for (const sc of f.sc) bySC[sc].fixed++;
    const coveredSC = new Set(activeRules(config).flatMap((r) => r.sc));
    const criteria2 = criteriaForLevel(config.level).map((c) => {
      const s = bySC[c.id];
      let status;
      if (s == null ? void 0 : s.fail) status = "fail";
      else if (s == null ? void 0 : s.review) status = "review";
      else if (c.automation === "manual" || !coveredSC.has(c.id)) status = "manual";
      else status = "no-issues-detected";
      return { id: c.id, level: c.level, title: c.title, automation: c.automation, new22: !!c.new22, status, counts: s || { fail: 0, review: 0, fixed: 0 } };
    });
    const count = (o) => findings.filter((f) => f.outcome === o).length;
    const report = {
      tool: { name: "hurteemj", version: "1.0.0" },
      standard: "WCAG 2.2 (ISO/IEC 40500)",
      level: config.level,
      url: (_a3 = win.location) == null ? void 0 : _a3.href,
      title: doc.title,
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      partial,
      durationMs: Math.round(duration),
      summary: {
        fail: count("fail"),
        review: count("review"),
        fixed: findings.filter((f) => f.fixed).length,
        byImpact: Object.fromEntries(["critical", "serious", "moderate", "minor"].map((i) => [i, findings.filter((f) => f.impact === i && f.outcome === "fail" && !f.fixed).length])),
        criteria: {
          total: criteria2.length,
          failing: criteria2.filter((c) => c.status === "fail").length,
          needsReview: criteria2.filter((c) => c.status === "review").length,
          manualOnly: criteria2.filter((c) => c.status === "manual").length,
          noIssuesDetected: criteria2.filter((c) => c.status === "no-issues-detected").length
        }
      },
      disclaimer: {
        mn: 'Автомат шалгалт WCAG-ийн бүх шаардлагыг баталгаажуулж чадахгүй. "Гараар шалгах" болон "Хянах" ангиллыг мэргэжилтэн, хөгжлийн бэрхшээлтэй хэрэглэгчидтэй хамт шалгана уу.',
        en: "Automated testing cannot verify all WCAG requirements. Items marked manual or review must be evaluated by experts and users with disabilities."
      },
      criteria: criteria2,
      findings,
      errors
    };
    Object.defineProperty(report, "toJSON", { enumerable: false, value: () => serialize(report) });
    return report;
  }
  function serialize(report, lang) {
    const pick = (msg) => lang ? msg == null ? void 0 : msg[lang] : msg;
    return {
      ...report,
      findings: report.findings.map(({ node, message, fix, ...f }) => ({ ...f, message: pick(message), fix: fix ? pick(fix) : null }))
    };
  }
  async function applyFixes(report, { doc, win, config, runtime, changes, pageLang, onlyIds }) {
    const globalTier = config.fix === true ? "safe" : config.fix;
    const ctxBase = { doc, win, config, level: config.level, runtime, changes, pageLang: pageLang || (doc.documentElement.lang || "mn").split("-")[0] };
    const onceDone = /* @__PURE__ */ new Map();
    let fixed = 0;
    for (const f of report.findings) {
      if (f.fixed || onlyIds && !onlyIds.includes(f.id)) continue;
      const rule = RULES.find((r) => r.id === f.ruleId);
      if (!(rule == null ? void 0 : rule.fix)) continue;
      const setting = ruleSetting(config, rule.id);
      const tier = setting.fix === void 0 ? globalTier : setting.fix === true ? "safe" : setting.fix;
      if (!tier || !TIER[tier] || TIER[rule.fix.tier] > TIER[tier]) continue;
      if (rule.fix.once && onceDone.has(rule.id)) {
        f.fixed = true;
        f.fix = onceDone.get(rule.id);
        continue;
      }
      if (f.node && !f.node.isConnected && f.node !== doc.documentElement) continue;
      try {
        const res = await rule.fix.apply(f, { ...ctxBase, tier });
        if (res) {
          f.fixed = true;
          f.fix = res;
          f.fixTier = rule.fix.tier;
          fixed++;
          if (rule.fix.once) onceDone.set(rule.id, res);
        }
      } catch (e) {
        report.errors.push({ ruleId: rule.id, phase: "fix", error: String(e && e.message || e) });
      }
    }
    report.summary.fixed = report.findings.filter((x) => x.fixed).length;
    for (const k of Object.keys(report.summary.byImpact)) {
      report.summary.byImpact[k] = report.findings.filter((x) => x.impact === k && x.outcome === "fail" && !x.fixed).length;
    }
    for (const c of report.criteria) c.counts.fixed = report.findings.filter((x) => x.fixed && x.sc.includes(c.id)).length;
    return fixed;
  }
  function messageText(f, lang = "mn") {
    var _a3, _b;
    return fmt(((_a3 = f.message) == null ? void 0 : _a3[lang]) || ((_b = f.message) == null ? void 0 : _b.en) || "", f.data || {});
  }

  // src/fix/changes.js
  var ChangeLog = class {
    constructor() {
      this.items = [];
    }
    setAttr(el, name, value, ruleId) {
      const had = el.hasAttribute(name);
      const prev = el.getAttribute(name);
      if (had && prev === String(value)) return;
      this.items.push({ type: "attr", el, name, had, prev, ruleId });
      el.setAttribute(name, value);
      this._mark(el, ruleId);
    }
    removeAttr(el, name, ruleId) {
      if (!el.hasAttribute(name)) return;
      this.items.push({ type: "attr", el, name, had: true, prev: el.getAttribute(name), ruleId });
      el.removeAttribute(name);
      this._mark(el, ruleId);
    }
    setStyle(el, prop, value, ruleId, priority = "important") {
      this.items.push({ type: "style", el, prop, prev: el.style.getPropertyValue(prop), prevPriority: el.style.getPropertyPriority(prop), hadAttr: el.hasAttribute("style"), ruleId });
      el.style.setProperty(prop, value, priority);
      this._mark(el, ruleId);
    }
    insert(node, parent, before = null, ruleId) {
      parent.insertBefore(node, before);
      this.items.push({ type: "node", node, ruleId });
    }
    listen(target, type, fn, opts, ruleId) {
      target.addEventListener(type, fn, opts);
      this.items.push({ type: "listener", target, evt: type, fn, opts, ruleId });
    }
    custom(undo, ruleId) {
      this.items.push({ type: "custom", undo, ruleId });
    }
    _mark(el, ruleId) {
      if (!ruleId || !el.setAttribute) return;
      const cur = (el.getAttribute("data-hj-fixed") || "").split(" ").filter(Boolean);
      if (!cur.includes(ruleId)) {
        cur.push(ruleId);
        el.setAttribute("data-hj-fixed", cur.join(" "));
        this.items.push({ type: "mark", el });
      }
    }
    /** ruleId өгвөл зөвхөн тэр дүрмийн өөрчлөлтийг буцаана */
    revert(ruleId) {
      const keep = [];
      for (let i = this.items.length - 1; i >= 0; i--) {
        const c = this.items[i];
        if (ruleId && c.ruleId !== ruleId && c.type !== "mark") {
          keep.unshift(c);
          continue;
        }
        if (ruleId && c.type === "mark") {
          keep.unshift(c);
          continue;
        }
        try {
          if (c.type === "attr") c.had ? c.el.setAttribute(c.name, c.prev) : c.el.removeAttribute(c.name);
          else if (c.type === "style") {
            c.prev ? c.el.style.setProperty(c.prop, c.prev, c.prevPriority) : c.el.style.removeProperty(c.prop);
            if (!c.hadAttr && !c.el.getAttribute("style")) c.el.removeAttribute("style");
          } else if (c.type === "node") c.node.remove();
          else if (c.type === "listener") c.target.removeEventListener(c.evt, c.fn, c.opts);
          else if (c.type === "custom") c.undo();
          else if (c.type === "mark") c.el.removeAttribute("data-hj-fixed");
        } catch {
        }
      }
      this.items = keep;
    }
    get count() {
      return this.items.filter((c) => c.type !== "mark").length;
    }
  };

  // src/fix/runtime.js
  function createRuntime(doc, win, changes, config) {
    const state = { focusRing: false, focusGuard: false, regions: null, base: null };
    function ensureBase() {
      if (state.base) return;
      const st = doc.createElement("style");
      if (config.nonce) st.nonce = config.nonce;
      st.setAttribute(HOST_ATTR, "base");
      st.textContent = `
.hj-skip-link{position:fixed;top:8px;left:8px;z-index:2147483646;padding:12px 18px;background:#0b1f3a;color:#fff;font:600 16px/1.3 system-ui,sans-serif;border-radius:6px;text-decoration:underline;transform:translateY(-200%);transition:transform .15s}
.hj-skip-link:focus{transform:none;outline:3px solid #ffbf47;outline-offset:2px}
@media (prefers-reduced-motion: reduce){.hj-skip-link{transition:none}}
.hj-sr-only{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0 0 0 0)!important;clip-path:inset(50%)!important;white-space:nowrap!important;border:0!important}`;
      (doc.head || doc.documentElement).appendChild(st);
      state.base = st;
    }
    function enableFocusRing() {
      if (state.focusRing) return;
      const c = config.focusColor || "#0b1f3a";
      const st = doc.createElement("style");
      if (config.nonce) st.nonce = config.nonce;
      st.setAttribute(HOST_ATTR, "focus-ring");
      st.textContent = `:where(a[href],area[href],button,input,select,textarea,summary,iframe,[tabindex],[contenteditable]:not([contenteditable="false"]),[role="button"],[role="link"],[role="tab"],[role="menuitem"],[role="checkbox"],[role="radio"],[role="switch"],[role="option"]):focus-visible{outline:3px solid ${c}!important;outline-offset:2px!important;box-shadow:0 0 0 2px #fff,0 0 0 7px ${c}22!important}
@media (forced-colors: active){:focus-visible{outline:3px solid Highlight!important}}`;
      (doc.head || doc.documentElement).appendChild(st);
      state.focusRing = true;
      changes.custom(() => {
        st.remove();
        state.focusRing = false;
      }, "focus-visible");
    }
    function stickyOffsets() {
      let top = 0, bottom = 0;
      const vw = win.innerWidth, vh = win.innerHeight;
      const all = doc.body ? doc.body.getElementsByTagName("*") : [];
      for (const el of all) {
        if (el.closest(`[${HOST_ATTR}]`)) continue;
        const s = win.getComputedStyle(el);
        if (s.position !== "fixed" && s.position !== "sticky") continue;
        if (s.display === "none" || s.visibility === "hidden") continue;
        const r = el.getBoundingClientRect();
        if (r.width < vw * 0.5 || r.height < 20 || r.height > vh * 0.6) continue;
        if (r.top <= 2 && r.bottom > 0) top = Math.max(top, r.bottom);
        else if (r.bottom >= vh - 2 && r.top < vh) bottom = Math.max(bottom, vh - r.top);
      }
      return { top, bottom };
    }
    function enableFocusGuard() {
      if (state.focusGuard) return;
      state.focusGuard = true;
      const html = doc.documentElement;
      const prev = { t: html.style.scrollPaddingTop, b: html.style.scrollPaddingBottom };
      const applyPadding = () => {
        const { top, bottom } = stickyOffsets();
        html.style.scrollPaddingTop = top ? `${Math.ceil(top + 8)}px` : prev.t;
        html.style.scrollPaddingBottom = bottom ? `${Math.ceil(bottom + 8)}px` : prev.b;
        return { top, bottom };
      };
      let offs = applyPadding();
      const onFocus = (e) => {
        const el = e.target;
        if (!(el instanceof win.Element) || el.closest(`[${HOST_ATTR}]`)) return;
        const r = el.getBoundingClientRect();
        if (!r.width && !r.height) return;
        const pts = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 2, r.top + 2], [r.right - 2, r.bottom - 2]];
        const covered = pts.every(([x, y]) => {
          if (x < 0 || y < 0 || x >= win.innerWidth || y >= win.innerHeight) return true;
          const top = doc.elementFromPoint(x, y);
          return top && top !== el && !el.contains(top) && !top.contains(el);
        });
        if (!covered) return;
        offs = applyPadding();
        if (r.top < offs.top + 4) win.scrollBy({ top: r.top - offs.top - 12, behavior: "instant" });
        else if (r.bottom > win.innerHeight - offs.bottom - 4) win.scrollBy({ top: r.bottom - (win.innerHeight - offs.bottom) + 12, behavior: "instant" });
      };
      const onResize = () => {
        offs = applyPadding();
      };
      doc.addEventListener("focusin", onFocus, true);
      win.addEventListener("resize", onResize);
      changes.custom(() => {
        doc.removeEventListener("focusin", onFocus, true);
        win.removeEventListener("resize", onResize);
        html.style.scrollPaddingTop = prev.t;
        html.style.scrollPaddingBottom = prev.b;
        state.focusGuard = false;
      }, "focus-not-obscured");
    }
    function regions() {
      if (state.regions && state.regions.polite.isConnected) return state.regions;
      const box = doc.createElement("div");
      box.setAttribute(HOST_ATTR, "live");
      box.className = "hj-sr-only";
      const mk = (p) => {
        const d = doc.createElement("div");
        d.setAttribute("aria-live", p);
        d.setAttribute("aria-atomic", "true");
        box.appendChild(d);
        return d;
      };
      const polite = mk("polite"), assertive = mk("assertive");
      ensureBase();
      doc.body.appendChild(box);
      state.regions = { box, polite, assertive };
      return state.regions;
    }
    function announce(text, politeness = "polite") {
      if (!text || !doc.body) return;
      const r = regions()[politeness === "assertive" ? "assertive" : "polite"];
      r.textContent = "";
      win.setTimeout(() => {
        r.textContent = text;
      }, 60);
    }
    function destroy() {
      var _a3, _b;
      (_a3 = state.base) == null ? void 0 : _a3.remove();
      state.base = null;
      (_b = state.regions) == null ? void 0 : _b.box.remove();
      state.regions = null;
    }
    return { ensureBase, enableFocusRing, enableFocusGuard, announce, destroy, stickyOffsets };
  }

  // src/prefs/preferences.js
  var DEFAULT_PREFS = {
    fontScale: 1,
    textSpacing: false,
    readableFont: false,
    alignLeft: false,
    highlightLinks: false,
    highlightHeadings: false,
    contrast: "default",
    // default | light | dark | invert
    saturation: "default",
    // default | low | high | mono
    stopMotion: false,
    focusRing: false,
    bigCursor: false,
    largeTargets: false,
    hideImages: false,
    readingGuide: "off",
    // off | line | mask
    tts: false
  };
  var PROFILES = {
    lowVision: { fontScale: 1.3, contrast: "light", focusRing: true, bigCursor: true, highlightLinks: true },
    dyslexia: { readableFont: true, textSpacing: true, alignLeft: true, readingGuide: "line" },
    seizure: { stopMotion: true, saturation: "low" },
    adhd: { stopMotion: true, readingGuide: "mask", saturation: "low", hideImages: false },
    motor: { focusRing: true, largeTargets: true, stopMotion: true },
    elderly: { fontScale: 1.2, highlightLinks: true, largeTargets: true, bigCursor: true, focusRing: true }
  };
  var NOT_UI = `:not([${HOST_ATTR}]):not([${HOST_ATTR}] *)`;
  var CURSOR = (fill) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 48 48'><path d='M6 3l30 28H21l9 15-6 2-9-15-9 9z' fill='${fill}' stroke='white' stroke-width='2.5' stroke-linejoin='round'/></svg>`)}") 4 2`;
  function buildCss(p, config) {
    const css2 = [];
    const fc = config.focusColor || "#0b1f3a";
    if (p.textSpacing) {
      css2.push(`body *${NOT_UI}{line-height:1.5!important;letter-spacing:.12em!important;word-spacing:.16em!important}
body p${NOT_UI}{margin-bottom:2em!important}`);
    }
    if (p.readableFont) {
      css2.push(`body, body *${NOT_UI}:not(i):not(code):not(pre):not(kbd):not(samp):not([class*="icon"]):not([class*="fa-"]):not([class^="fa"]):not([class*="material-symbols"]):not([class*="glyph"]):not([aria-hidden="true"]){font-family:"Atkinson Hyperlegible","Verdana","Segoe UI","Tahoma","Arial",sans-serif!important}`);
    }
    if (p.alignLeft) css2.push(`body :is(p,li,td,dd,blockquote,div,article,section)${NOT_UI}{text-align:start!important}`);
    if (p.highlightLinks) css2.push(`body a[href]${NOT_UI}{text-decoration:underline!important;text-decoration-thickness:2px!important;text-underline-offset:.18em!important;outline:2px dashed currentColor!important;outline-offset:2px!important}`);
    if (p.highlightHeadings) css2.push(`body :is(h1,h2,h3,h4,h5,h6,[role="heading"])${NOT_UI}{outline:3px solid #b45309!important;outline-offset:3px!important;background-color:rgba(255,237,180,.35)!important}`);
    if (p.contrast === "light" || p.contrast === "dark") {
      const [bg, fg, link, border] = p.contrast === "light" ? ["#ffffff", "#000000", "#0000c8", "#000000"] : ["#000000", "#ffffff", "#ffff00", "#ffffff"];
      css2.push(`html, body, body *${NOT_UI}:not(img):not(video):not(picture):not(canvas):not(svg):not(svg *){background-color:${bg}!important;color:${fg}!important;border-color:${border}!important;text-shadow:none!important;box-shadow:none!important}
body *${NOT_UI}:not(img):not(video):not(picture){background-image:none!important}
body a[href]${NOT_UI}, body a[href] *${NOT_UI}{color:${link}!important;text-decoration:underline!important}
body :is(input,select,textarea,button)${NOT_UI}{border:2px solid ${border}!important}
body svg${NOT_UI}:not([fill]){fill:currentColor}`);
    }
    const filters = [];
    if (p.contrast === "invert") filters.push("invert(1) hue-rotate(180deg)");
    if (p.saturation === "low") filters.push("saturate(.5)");
    if (p.saturation === "high") filters.push("saturate(1.8)");
    if (p.saturation === "mono") filters.push("grayscale(1)");
    if (filters.length) {
      css2.push(`html{filter:${filters.join(" ")}!important}`);
      if (p.contrast === "invert") css2.push(`:is(img,video,picture,canvas,iframe,[style*="background-image"])${NOT_UI}{filter:invert(1) hue-rotate(180deg)!important}`);
    }
    if (p.stopMotion) {
      css2.push(`*,*::before,*::after{animation-duration:.001ms!important;animation-iteration-count:1!important;animation-delay:0s!important;transition-duration:.001ms!important;transition-delay:0s!important;scroll-behavior:auto!important}`);
    }
    if (p.focusRing) {
      css2.push(`body :focus-visible${NOT_UI}{outline:4px solid ${fc}!important;outline-offset:3px!important;box-shadow:0 0 0 3px #fff,0 0 0 9px #ffbf47!important}`);
    }
    if (p.bigCursor) {
      css2.push(`html, body, body *${NOT_UI}{cursor:${CURSOR("black")}, auto!important}
body :is(a[href],button,[role="button"],label,select,summary,[onclick])${NOT_UI}, body :is(a[href],button,[role="button"]) *${NOT_UI}{cursor:${CURSOR("#0b5fff")}, pointer!important}`);
    }
    if (p.largeTargets) {
      css2.push(`body :is(button,[role="button"],select,input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),summary)${NOT_UI}{min-height:44px!important;min-width:44px!important}
body :is(nav,header,footer,[role="navigation"],[role="menu"],[role="toolbar"]) a[href]${NOT_UI}{display:inline-block!important;min-height:44px!important;min-width:44px!important;padding-block:10px!important;box-sizing:border-box!important}
body input:is([type="checkbox"],[type="radio"])${NOT_UI}{width:24px!important;height:24px!important}`);
    }
    if (p.hideImages) css2.push(`body :is(img,picture,video,svg[role="img"],[role="img"])${NOT_UI}{opacity:0!important}
body *${NOT_UI}{background-image:none!important}`);
    return css2.join("\n");
  }
  function createPreferences({ doc, win, config, storage, onChange }) {
    var _a3;
    let prefs = { ...DEFAULT_PREFS, ...config.defaults || {} };
    const saved = storage.get();
    if (saved) prefs = { ...prefs, ...saved };
    else if (config.respectOS !== false && ((_a3 = win.matchMedia) == null ? void 0 : _a3.call(win, "(prefers-reduced-motion: reduce)").matches)) {
      prefs.stopMotion = true;
    }
    const style = doc.createElement("style");
    if (config.nonce) style.nonce = config.nonce;
    style.setAttribute(HOST_ATTR, "prefs");
    const scaled = /* @__PURE__ */ new Map();
    let original = /* @__PURE__ */ new WeakMap();
    const paused = /* @__PURE__ */ new Set();
    const frozen = /* @__PURE__ */ new Map();
    function unscale() {
      for (const [el, o] of scaled) {
        o.prev ? el.style.setProperty("font-size", o.prev, o.prevPriority) : el.style.removeProperty("font-size");
      }
      scaled.clear();
      original = /* @__PURE__ */ new WeakMap();
    }
    function scaleText(root = doc.body) {
      if (!root) return;
      const s = prefs.fontScale;
      if (s === 1) {
        unscale();
        return;
      }
      const walker = doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
      const els = [];
      for (let n = walker.currentNode; n; n = walker.nextNode()) {
        if (n.nodeType !== 1 || n.closest(`[${HOST_ATTR}]`) || /^(script|style|svg|noscript|template|br|img|video)$/i.test(n.localName)) continue;
        if (![...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) {
          if (!/^(input|select|textarea|button)$/i.test(n.localName)) continue;
        }
        els.push(n);
        if (els.length > 8e3) break;
      }
      for (const el of els) {
        if (!original.has(el)) original.set(el, parseFloat(win.getComputedStyle(el).fontSize));
      }
      for (const el of els) {
        const px = original.get(el);
        if (!px) continue;
        if (!scaled.has(el)) scaled.set(el, { prev: el.style.getPropertyValue("font-size"), prevPriority: el.style.getPropertyPriority("font-size") });
        el.style.setProperty("font-size", `${(px * s).toFixed(2)}px`, "important");
      }
    }
    function motion(root = doc) {
      var _a4;
      if (prefs.stopMotion) {
        root.querySelectorAll("video[autoplay], video").forEach((v) => {
          if (!v.paused && !v.closest(`[${HOST_ATTR}]`)) {
            v.pause();
            paused.add(v);
          }
        });
        (_a4 = doc.getAnimations) == null ? void 0 : _a4.call(doc).forEach((a) => {
          try {
            if (a.playState === "running") {
              a.pause();
              paused.add(a);
            }
          } catch {
          }
        });
        root.querySelectorAll('img[src*=".gif" i]').forEach((img) => {
          if (frozen.has(img) || !img.complete || !img.naturalWidth) return;
          try {
            const c = doc.createElement("canvas");
            c.width = img.naturalWidth;
            c.height = img.naturalHeight;
            c.getContext("2d").drawImage(img, 0, 0);
            c.className = img.className;
            c.style.cssText = img.style.cssText;
            c.style.width = `${img.width}px`;
            c.style.height = `${img.height}px`;
            c.setAttribute("role", "img");
            c.setAttribute("aria-label", img.alt || "");
            img.insertAdjacentElement("beforebegin", c);
            img.style.setProperty("display", "none", "important");
            frozen.set(img, c);
          } catch {
          }
        });
      } else {
        for (const p of paused) {
          try {
            p.play();
          } catch {
          }
        }
        paused.clear();
        for (const [img, c] of frozen) {
          c.remove();
          img.style.removeProperty("display");
        }
        frozen.clear();
      }
    }
    function apply() {
      style.textContent = buildCss(prefs, config);
      if (!style.isConnected) (doc.head || doc.documentElement).appendChild(style);
      doc.documentElement.toggleAttribute("data-hj-active", Object.keys(DEFAULT_PREFS).some((k) => prefs[k] !== DEFAULT_PREFS[k]));
      scaleText();
      motion();
    }
    function set(patch, { silent = false } = {}) {
      prefs = { ...prefs, ...patch };
      prefs.fontScale = Math.min(2, Math.max(1, Math.round(prefs.fontScale * 10) / 10));
      storage.set(prefs);
      apply();
      if (!silent) onChange == null ? void 0 : onChange(prefs, patch);
    }
    function applyProfile(name, on = true) {
      const p = PROFILES[name];
      if (!p) return;
      if (on) set(p);
      else set(Object.fromEntries(Object.keys(p).map((k) => [k, DEFAULT_PREFS[k]])));
    }
    function profileActive(name) {
      const p = PROFILES[name];
      return !!p && Object.entries(p).every(([k, v]) => prefs[k] === v);
    }
    function reset() {
      set({ ...DEFAULT_PREFS });
    }
    function refresh(root) {
      if (prefs.fontScale !== 1) {
        unscale();
        scaleText();
      }
      if (prefs.stopMotion) motion(root.querySelectorAll ? root : doc);
    }
    function destroy() {
      prefs = { ...DEFAULT_PREFS };
      scaleText();
      motion();
      style.remove();
      doc.documentElement.removeAttribute("data-hj-active");
    }
    return { get: () => ({ ...prefs }), set, reset, apply, applyProfile, profileActive, refresh, destroy };
  }
  function createStorage(config, win) {
    const key = config.storageKey || "hurteemj:prefs";
    const mode = config.storage ?? "local";
    return {
      get() {
        try {
          if (mode === "local") return JSON.parse(win.localStorage.getItem(key) || "null");
          if (mode === "cookie") {
            const m2 = win.document.cookie.match(new RegExp(`(?:^|; )${encodeURIComponent(key)}=([^;]*)`));
            return m2 ? JSON.parse(decodeURIComponent(m2[1])) : null;
          }
        } catch {
        }
        return null;
      },
      set(v) {
        try {
          if (mode === "local") win.localStorage.setItem(key, JSON.stringify(v));
          else if (mode === "cookie") {
            const domain = config.cookieDomain ? `; domain=${config.cookieDomain}` : "";
            win.document.cookie = `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(v))}; path=/; max-age=31536000; SameSite=Lax${domain}`;
          }
        } catch {
        }
      }
    };
  }

  // src/ui/styles.js
  var css = (accent, accentText) => `
:host{all:initial}
*,*::before,*::after{box-sizing:border-box}
.root{--accent:${accent};--accent-text:${accentText};--bg:#ffffff;--fg:#14171f;--muted:#4a5162;--line:#8a91a3;--soft:#f1f3f8;--focus:#0b1f3a;--ring:#ffbf47;
  font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Helvetica Neue",Arial,sans-serif;font-size:1em;line-height:1.45;color:var(--fg)}
.sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;border:0}
button,select,input,a{font:inherit;color:inherit}
:focus{outline:none}
:focus-visible{outline:3px solid var(--focus);outline-offset:2px;box-shadow:0 0 0 6px var(--ring)}

.launcher{position:fixed;z-index:2147483600;width:3.25em;height:3.25em;min-width:44px;min-height:44px;border-radius:50%;border:2px solid #fff;background:var(--accent);color:var(--accent-text);
  display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.28);transition:transform .15s,inset .2s}
.launcher:hover{transform:scale(1.06)}
.launcher svg{width:60%;height:60%}
.pos-bottom-right .launcher{right:var(--ox);bottom:var(--oy)}
.pos-bottom-left .launcher{left:var(--ox);bottom:var(--oy)}
.pos-top-right .launcher{right:var(--ox);top:var(--oy)}
.pos-top-left .launcher{left:var(--ox);top:var(--oy)}
.dodge.pos-bottom-right .launcher,.dodge.pos-top-right .launcher{right:auto;left:var(--ox)}
.dodge.pos-bottom-left .launcher,.dodge.pos-top-left .launcher{left:auto;right:var(--ox)}
.launcher.hidden{display:none}

.panel{position:fixed;z-index:2147483601;width:24em;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px);
  background:var(--bg);color:var(--fg);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 48px rgba(0,0,0,.3);display:flex;flex-direction:column;overflow:hidden}
.panel[hidden]{display:none}
.pos-bottom-right .panel{right:8px;bottom:8px}
.pos-bottom-left .panel{left:8px;bottom:8px}
.pos-top-right .panel{right:8px;top:8px}
.pos-top-left .panel{left:8px;top:8px}


.head{background:var(--accent);color:var(--accent-text);padding:.8em 1em;display:flex;gap:.6em;align-items:flex-start;flex-wrap:wrap}

.head .t{flex:1 1 10em;min-width:0}
h2{margin:0;font-size:1.2em;line-height:1.25}
.head p{margin:.15em 0 0;font-size:.875em;opacity:1}
.hbtns{display:flex;gap:.4em;align-items:center}
.lang{min-height:44px;border-radius:8px;border:2px solid currentColor;background:transparent;color:inherit;padding:0 .4em}
.lang option{color:#14171f;background:#fff}
.close{min-width:44px;min-height:44px;border-radius:8px;border:2px solid currentColor;background:transparent;color:inherit;cursor:pointer;font-size:1.3em;line-height:1}
.head h2:focus-visible{outline:2px solid var(--accent-text);outline-offset:3px;box-shadow:none;border-radius:4px}
.head :focus-visible{outline-color:var(--accent-text);box-shadow:0 0 0 6px var(--ring)}

.body{overflow:auto;padding:.4em 1em 1em;overscroll-behavior:contain}
section{padding:.6em 0;border-bottom:1px solid #d9dce4}
section:last-child{border-bottom:0}
h3{font-size:.95em;margin:.4em 0 .6em;color:var(--fg);letter-spacing:.01em}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(9.5em,100%),1fr));gap:.5em}
.chip{min-height:44px;padding:.5em .7em;border-radius:10px;border:2px solid var(--line);background:var(--soft);cursor:pointer;text-align:start;display:flex;align-items:center;gap:.5em}
.chip[aria-pressed="true"]{border-color:var(--accent);background:var(--accent);color:var(--accent-text)}
.chip span{min-width:0;overflow-wrap:anywhere}
.chip .ic{width:1.3em;height:1.3em;flex:none}

.row{display:flex;align-items:center;justify-content:space-between;gap:.75em;min-height:44px}
.stepper{display:flex;align-items:center;gap:.4em}
.step{min-width:44px;min-height:44px;border-radius:10px;border:2px solid var(--line);background:var(--soft);cursor:pointer;font-size:1.2em;font-weight:700}
.step:disabled{opacity:.55;cursor:not-allowed}
output{min-width:3.5em;text-align:center;font-weight:700;font-variant-numeric:tabular-nums}

.switch{width:100%;min-height:44px;display:flex;align-items:center;justify-content:space-between;gap:.75em;padding:.35em .2em;border:0;background:transparent;cursor:pointer;text-align:start;border-radius:8px}
.switch:hover{background:var(--soft)}
.track{flex:none;width:2.75em;height:1.6em;border-radius:1em;border:2px solid var(--muted);background:#fff;position:relative;transition:background .15s}
.track::after{content:"";position:absolute;top:.15em;left:.15em;width:1.05em;height:1.05em;border-radius:50%;background:var(--muted);transition:transform .15s}
.switch[aria-checked="true"] .track{background:var(--accent);border-color:var(--accent)}
.switch[aria-checked="true"] .track::after{transform:translateX(1.15em);background:var(--accent-text)}

fieldset{border:0;padding:0;margin:.4em 0 .6em}
legend{font-weight:600;margin-bottom:.35em;padding:0}
.radios{display:flex;flex-wrap:wrap;gap:.4em}
.radios label{position:relative;min-height:44px;display:inline-flex;align-items:center;padding:.4em .75em;border-radius:10px;border:2px solid var(--line);background:var(--soft);cursor:pointer}
.radios input{position:absolute;opacity:0;inset:0;width:100%;height:100%;margin:0;cursor:pointer}
.radios input:checked + span{font-weight:700}
.radios label:has(input:checked){border-color:var(--accent);background:var(--accent);color:var(--accent-text)}
.radios label:has(input:focus-visible){outline:3px solid var(--focus);outline-offset:2px;box-shadow:0 0 0 6px var(--ring)}

.foot{padding:.7em 1em;border-top:1px solid #d9dce4;display:flex;flex-wrap:wrap;gap:.5em;align-items:center;background:var(--soft)}
.btn{min-height:44px;padding:.45em .9em;border-radius:10px;border:2px solid var(--accent);background:#fff;color:var(--fg);cursor:pointer;font-weight:600}
.btn.primary{background:var(--accent);color:var(--accent-text)}
.foot a{color:#0b4bd1;text-decoration:underline;min-height:32px;display:inline-flex;align-items:center;padding:0 .2em}
.brand{margin-inline-start:auto;font-size:.8em;color:var(--muted)}

.audit .stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.4em;margin-bottom:.6em}
.stat{border:1px solid var(--line);border-radius:10px;padding:.4em;text-align:center}
.stat b{display:block;font-size:1.3em}
.audit ol{list-style:none;margin:0;padding:0;display:grid;gap:.45em}
.audit li{border:1px solid #d9dce4;border-radius:10px;padding:.5em .6em;font-size:.875em}
.badge{display:inline-block;font-size:.78em;font-weight:700;border-radius:6px;padding:.05em .45em;margin-inline-end:.35em;border:1px solid}
.b-fail{background:#fde8e8;color:#8a1111;border-color:#8a1111}
.b-review{background:#fff4d6;color:#6b4300;border-color:#6b4300}
.b-fixed{background:#e3f6e8;color:#0f5a26;border-color:#0f5a26}
.audit .meta{color:var(--muted);font-size:.85em;margin-top:.2em;word-break:break-all}
.note{font-size:.82em;color:var(--muted);margin:.4em 0}
.small{min-height:36px;padding:.2em .6em;font-size:.85em;margin-top:.35em}

.guide{position:fixed;left:0;right:0;height:14px;margin-top:-7px;background:rgba(255,191,71,.35);border-top:2px solid #b45309;border-bottom:2px solid #b45309;pointer-events:none;z-index:2147483590;top:-100px}
.mask{position:fixed;left:0;right:0;background:rgba(0,0,0,.55);pointer-events:none;z-index:2147483590}
.hl{position:fixed;border:3px solid #d00;box-shadow:0 0 0 4px #fff,0 0 0 9999px rgba(0,0,0,.25);border-radius:4px;pointer-events:none;z-index:2147483599;transition:opacity .3s}

@media (max-width:420px){.panel{width:calc(100vw - 16px)}.brand{display:none}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}.chip{padding:.45em .5em}}
@media (prefers-reduced-motion:reduce){*{transition:none!important}}
@media (forced-colors:active){
  .launcher,.panel,.chip,.step,.btn,.radios label,.track,.lang,.close{border:2px solid CanvasText;forced-color-adjust:auto}
  .chip[aria-pressed="true"],.radios label:has(input:checked){background:Highlight;color:HighlightText}
  .switch[aria-checked="true"] .track{background:Highlight}
  :focus-visible{outline:3px solid Highlight}
}
`;

  // src/ui/widget.js
  var esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  var ICONS = {
    person: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="4.2" r="2.2" fill="currentColor"/><path d="M4 7.6c2.7.8 5.3 1.2 8 1.2s5.3-.4 8-1.2l.5 1.9c-2.2.7-4.3 1.1-6.3 1.3v3.3l2.3 7.4-1.9.6L12 15.6l-2.6 6.5-1.9-.6 2.3-7.4v-3.3c-2-.2-4.1-.6-6.3-1.3z" fill="currentColor"/></svg>',
    lowVision: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 11a4 4 0 110-8 4 4 0 010 8z" fill="currentColor"/></svg>',
    dyslexia: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v2H4zm0 4h10v2H4zm0 4h16v2H4zm0 4h10v2H4z" fill="currentColor"/></svg>',
    seizure: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2L4 14h6l-1 8 9-12h-6z" fill="currentColor"/></svg>',
    adhd: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>',
    motor: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v10H3zM6 10h2v2H6zm4 0h2v2h-2zm4 0h2v2h-2zM7 14h10v1.5H7z" fill="currentColor"/></svg>',
    elderly: '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="4" r="2" fill="currentColor"/><path d="M9 7h3l2 5 3 1v2l-4-1-1-2-1 4 2 6h-2l-2-5-1 5H6l2-9z" fill="currentColor"/><path d="M17 13v9" stroke="currentColor" stroke-width="1.6"/></svg>'
  };
  function accentPair(color) {
    let c = parseColor(color) || [11, 75, 209, 1];
    c = adjustForContrast(c, [255, 255, 255, 1], 4.6);
    const text = contrastRatio([255, 255, 255], c) >= 4.5 ? "#ffffff" : "#000000";
    return [toCss(c), text];
  }
  function createWidget({ doc, win, config, prefs, t, getLang, setLang, onAudit, getReport, runtime }) {
    const host = doc.createElement("div");
    host.setAttribute(HOST_ATTR, "widget");
    const shadow = host.attachShadow({ mode: "open" });
    const [accent, accentText] = accentPair(config.color);
    const pos = config.position || "bottom-right";
    const [ox, oy] = [config.offsetX ?? 16, config.offsetY ?? 16];
    shadow.innerHTML = `<style${config.nonce ? ` nonce="${esc(config.nonce)}"` : ""}>${css(accent, accentText)}</style>
<div class="root pos-${esc(pos)}">
  <button type="button" class="launcher${config.launcher === false ? " hidden" : ""}" aria-expanded="false" aria-controls="hj-panel" aria-keyshortcuts="${esc(config.shortcutLabel || "Alt+Shift+A")}">${ICONS.person}<span class="sr" data-t="launcher"></span></button>
  <div class="panel" id="hj-panel" role="dialog" aria-modal="false" aria-labelledby="hj-title" hidden></div>
  <div class="sr" role="status" aria-live="polite" id="hj-status"></div>
  <div class="guide" aria-hidden="true" hidden></div>
  <div class="mask m1" aria-hidden="true" hidden></div><div class="mask m2" aria-hidden="true" hidden></div>
</div>`;
    const $ = (s) => shadow.querySelector(s);
    const root = $(".root");
    root.style.setProperty("--ox", `${+ox || 0}px`);
    root.style.setProperty("--oy", `${+oy || 0}px`);
    const launcher = $(".launcher");
    const panel = $("#hj-panel");
    const status = $("#hj-status");
    let open = false;
    let lastFocus = null;
    const say = (msg) => {
      status.textContent = "";
      win.setTimeout(() => {
        status.textContent = msg;
      }, 50);
    };
    function sw(key) {
      const p = prefs.get();
      return `<button type="button" class="switch" role="switch" aria-checked="${!!p[key]}" data-pref="${key}"><span>${esc(t(key))}</span><span class="track" aria-hidden="true"></span></button>`;
    }
    function radios(key, opts) {
      const p = prefs.get();
      return `<fieldset><legend>${esc(t(key))}</legend><div class="radios">${opts.map((o) => `<label><input type="radio" name="hj-${key}" value="${o}" data-radio="${key}"${p[key] === o ? " checked" : ""}><span>${esc(t(`${key}_${o}`))}</span></label>`).join("")}</div></fieldset>`;
    }
    function auditHtml() {
      const r = getReport();
      if (!r) return `<p class="note">…</p>`;
      const lang = getLang();
      const items = r.findings.slice(0, 60).map((f) => `<li>
      <span class="badge ${f.fixed ? "b-fixed" : f.outcome === "fail" ? "b-fail" : "b-review"}">${esc(f.fixed ? t("auditFixed") : f.outcome === "fail" ? t("auditFail") : t("auditReview"))}</span>
      <strong>${esc(f.sc.join(", "))}</strong> · ${esc(f.impact)}
      <div>${esc(messageText(f, lang))}</div>
      ${f.fixed && f.fix ? `<div class="meta">✓ ${esc(f.fix[lang] || f.fix.en)}</div>` : ""}
      ${f.selector ? `<div class="meta"><code>${esc(f.selector)}</code></div><button type="button" class="btn small" data-show="${esc(f.id)}">${esc(t("auditShow"))}<span class="sr"> ${esc(f.sc.join(", "))}</span></button>` : ""}
    </li>`).join("");
      const unfixedFail = r.findings.filter((f) => f.outcome === "fail" && !f.fixed).length;
      return `<div class="stats">
      <div class="stat"><b>${unfixedFail}</b>${esc(t("auditFail"))}</div>
      <div class="stat"><b>${r.summary.review}</b>${esc(t("auditReview"))}</div>
      <div class="stat"><b>${r.summary.fixed}</b>${esc(t("auditFixed"))}</div>
    </div>
    <p class="note">${esc(t("auditManual"))}: ${r.summary.criteria.manualOnly} / ${r.summary.criteria.total} · WCAG 2.2 ${esc(r.level)}</p>
    <p class="note">${esc(t("auditDisclaimer"))}</p>
    <div class="row"><button type="button" class="btn" data-act="audit">${esc(t("auditRun"))}</button><button type="button" class="btn" data-act="export">${esc(t("auditExport"))}</button></div>
    <ol>${items}</ol>`;
    }
    function render() {
      const p = prefs.get();
      const lang = getLang();
      host.setAttribute("lang", lang);
      shadow.querySelectorAll("[data-t]").forEach((n) => {
        n.textContent = t(n.dataset.t);
      });
      launcher.setAttribute("title", `${t("launcher")} (${config.shortcutLabel || "Alt+Shift+A"})`);
      const langs = config.languages || ["mn", "en"];
      const langNames = { mn: "Монгол", en: "English", ru: "Русский", kk: "Қазақша", zh: "中文", ko: "한국어", ja: "日本語" };
      const pct = Math.round(p.fontScale * 100);
      panel.innerHTML = `
<div class="head">
  <div class="t"><h2 id="hj-title" tabindex="-1">${esc(t("title"))}</h2><p>${esc(t("subtitle"))}</p></div>
  <div class="hbtns">
    ${langs.length > 1 ? `<label class="sr" for="hj-lang">${esc(t("language"))}</label><select class="lang" id="hj-lang">${langs.map((l) => `<option value="${l}" lang="${l}"${l === lang ? " selected" : ""}>${esc(langNames[l] || l)}</option>`).join("")}</select>` : ""}
    <button type="button" class="close" data-act="close" aria-label="${esc(t("close"))}">×</button>
  </div>
</div>
<div class="body">
  <section aria-labelledby="hj-s1"><h3 id="hj-s1">${esc(t("profiles"))}</h3>
    <div class="grid">${Object.keys(PROFILES).filter((k) => !config.profiles || config.profiles.includes(k)).map((k) => `<button type="button" class="chip" aria-pressed="${prefs.profileActive(k)}" data-profile="${k}">${ICONS[k] || ""}<span>${esc(t(`profile_${k}`))}</span></button>`).join("")}</div>
  </section>
  <section aria-labelledby="hj-s2"><h3 id="hj-s2">${esc(t("content"))}</h3>
    <div class="row" role="group" aria-labelledby="hj-fs-l">
      <span id="hj-fs-l">${esc(t("fontScale"))}</span>
      <span class="stepper">
        <button type="button" class="step" data-act="font-dec" aria-label="${esc(t("decrease"))}: ${esc(t("fontScale"))}"${p.fontScale <= 1 ? " disabled" : ""}>−</button>
        <output id="hj-fs" aria-live="polite">${pct}%</output>
        <button type="button" class="step" data-act="font-inc" aria-label="${esc(t("increase"))}: ${esc(t("fontScale"))}"${p.fontScale >= 2 ? " disabled" : ""}>+</button>
      </span>
    </div>
    ${sw("textSpacing")}${sw("readableFont")}${sw("alignLeft")}${sw("highlightLinks")}${sw("highlightHeadings")}${"speechSynthesis" in win ? sw("tts") : ""}
  </section>
  <section aria-labelledby="hj-s3"><h3 id="hj-s3">${esc(t("color"))}</h3>
    ${radios("contrast", ["default", "light", "dark", "invert"])}
    ${radios("saturation", ["default", "low", "high", "mono"])}
  </section>
  <section aria-labelledby="hj-s4"><h3 id="hj-s4">${esc(t("navigation"))}</h3>
    ${sw("stopMotion")}${sw("focusRing")}${sw("bigCursor")}${sw("largeTargets")}${sw("hideImages")}
    ${radios("readingGuide", ["off", "line", "mask"])}
  </section>
  ${config.auditor ? `<section class="audit" aria-labelledby="hj-s5"><h3 id="hj-s5">${esc(t("auditor"))}</h3>${auditHtml()}</section>` : ""}
</div>
<div class="foot">
  <button type="button" class="btn primary" data-act="reset">${esc(t("reset"))}</button>
  ${config.statementUrl ? `<a href="${esc(config.statementUrl)}">${esc(t("statement"))}</a>` : ""}
  ${config.feedbackUrl ? `<a href="${esc(config.feedbackUrl)}">${esc(t("feedback"))}</a>` : ""}
  <span class="brand">${esc(t("poweredBy"))}</span>
</div>`;
    }
    function focusKey(sel) {
      var _a3;
      const n = sel && panel.querySelector(sel);
      if (n && !n.disabled) n.focus();
      else (_a3 = panel.querySelector("#hj-title")) == null ? void 0 : _a3.focus();
    }
    function rerender(keepSel) {
      render();
      focusKey(keepSel);
      updateGuide();
    }
    function keyOf(el) {
      var _a3, _b;
      if (!el) return null;
      for (const a of ["data-pref", "data-profile", "data-act", "data-show"]) if ((_a3 = el.hasAttribute) == null ? void 0 : _a3.call(el, a)) return `[${a}="${el.getAttribute(a)}"]`;
      if ((_b = el.dataset) == null ? void 0 : _b.radio) return `input[data-radio="${el.dataset.radio}"][value="${el.value}"]`;
      if (el.id) return `#${el.id}`;
      return null;
    }
    function show() {
      if (open) return;
      open = true;
      lastFocus = doc.activeElement;
      render();
      panel.hidden = false;
      launcher.setAttribute("aria-expanded", "true");
      panel.querySelector("#hj-title").focus();
    }
    function hide() {
      if (!open) return;
      open = false;
      panel.hidden = true;
      launcher.setAttribute("aria-expanded", "false");
      if (lastFocus && lastFocus !== doc.body && lastFocus.isConnected && config.launcher === false) lastFocus.focus();
      else launcher.focus();
    }
    const toggle = () => open ? hide() : show();
    launcher.addEventListener("click", toggle);
    panel.addEventListener("click", (e) => {
      const el = e.target.closest("button");
      if (!el) return;
      const key = keyOf(el);
      if (el.dataset.pref) {
        const k = el.dataset.pref;
        const v = !prefs.get()[k];
        prefs.set({ [k]: v });
        say(`${t(k)}: ${v ? t("on") : t("off")}`);
        return rerender(key);
      }
      if (el.dataset.profile) {
        const k = el.dataset.profile;
        const on = !prefs.profileActive(k);
        prefs.applyProfile(k, on);
        say(`${t(`profile_${k}`)}: ${on ? t("on") : t("off")}`);
        return rerender(key);
      }
      if (el.dataset.show) return highlight(el.dataset.show);
      switch (el.dataset.act) {
        case "close":
          return hide();
        case "font-inc":
          prefs.set({ fontScale: prefs.get().fontScale + 0.1 });
          return rerender(prefs.get().fontScale >= 2 ? '[data-act="font-dec"]' : key);
        case "font-dec":
          prefs.set({ fontScale: prefs.get().fontScale - 0.1 });
          return rerender(prefs.get().fontScale <= 1 ? '[data-act="font-inc"]' : key);
        case "reset":
          prefs.reset();
          say(t("resetDone"));
          return rerender(key);
        case "audit":
          return Promise.resolve(onAudit()).then(() => rerender(key));
        case "export":
          return exportJson();
        default:
      }
    });
    panel.addEventListener("change", (e) => {
      const el = e.target;
      if (el.id === "hj-lang") {
        setLang(el.value);
        return rerender("#hj-lang");
      }
      if (el.dataset.radio) {
        prefs.set({ [el.dataset.radio]: el.value });
        say(`${t(el.dataset.radio)}: ${t(`${el.dataset.radio}_${el.value}`)}`);
        rerender(keyOf(el));
      }
    });
    shadow.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && open) {
        e.preventDefault();
        e.stopPropagation();
        hide();
      }
    });
    function matchShortcut(e) {
      const sc = config.shortcut ?? "alt+shift+a";
      if (!sc) return false;
      const parts = sc.toLowerCase().split("+");
      const key = parts.pop();
      return e.altKey === parts.includes("alt") && e.shiftKey === parts.includes("shift") && e.ctrlKey === parts.includes("ctrl") && e.metaKey === parts.includes("meta") && (e.key.toLowerCase() === key || e.code.toLowerCase() === `key${key}`);
    }
    const onKey = (e) => {
      if (matchShortcut(e)) {
        e.preventDefault();
        toggle();
      }
    };
    doc.addEventListener("keydown", onKey, true);
    const onOpenTrigger = (e) => {
      var _a3, _b;
      const tr = (_b = (_a3 = e.target).closest) == null ? void 0 : _b.call(_a3, "[data-hurteemj-open]");
      if (tr) {
        e.preventDefault();
        lastFocus = tr;
        show();
      }
    };
    doc.addEventListener("click", onOpenTrigger);
    const onFocusIn = (e) => {
      var _a3, _b;
      if (host.contains(e.target) || e.target === host) return;
      const r = (_b = (_a3 = e.target).getBoundingClientRect) == null ? void 0 : _b.call(_a3);
      const l = launcher.getBoundingClientRect();
      if (!r) return;
      const overlap = !(r.right < l.left || r.left > l.right || r.bottom < l.top || r.top > l.bottom);
      if (overlap) root.classList.toggle("dodge");
    };
    doc.addEventListener("focusin", onFocusIn);
    const guide = $(".guide"), m1 = $(".m1"), m2 = $(".m2");
    let lastY = -100;
    const onMove = (e) => {
      lastY = e.clientY;
      placeGuide();
    };
    function placeGuide() {
      const mode = prefs.get().readingGuide;
      if (mode === "line") guide.style.top = `${lastY}px`;
      if (mode === "mask") {
        const h = 90;
        m1.style.top = "0px";
        m1.style.height = `${Math.max(0, lastY - h / 2)}px`;
        m2.style.top = `${lastY + h / 2}px`;
        m2.style.bottom = "0px";
      }
    }
    function updateGuide() {
      const mode = prefs.get().readingGuide;
      guide.hidden = mode !== "line";
      m1.hidden = m2.hidden = mode !== "mask";
      if (mode !== "off") {
        if (lastY < 0) lastY = win.innerHeight / 3;
        placeGuide();
      }
    }
    doc.addEventListener("pointermove", onMove, { passive: true });
    const synth = win.speechSynthesis;
    const onTtsClick = (e) => {
      var _a3, _b, _c, _d;
      if (!prefs.get().tts || !synth || host.contains(e.target)) return;
      const sel = String(((_a3 = win.getSelection) == null ? void 0 : _a3.call(win)) || "").trim();
      const el = (_c = (_b = e.target).closest) == null ? void 0 : _c.call(_b, "p, li, h1, h2, h3, h4, h5, h6, td, th, figcaption, blockquote, label, a, button, dd, dt, span, div");
      const text = sel || (el ? (el.innerText || el.textContent || "").trim().slice(0, 1200) : "");
      if (!text) return;
      synth.cancel();
      const u = new win.SpeechSynthesisUtterance(text);
      const pageLang = (((_d = el == null ? void 0 : el.closest("[lang]")) == null ? void 0 : _d.getAttribute("lang")) || doc.documentElement.lang || getLang()).toLowerCase();
      u.lang = pageLang;
      const voice = synth.getVoices().find((v) => v.lang.toLowerCase().startsWith(pageLang.split("-")[0]));
      if (voice) u.voice = voice;
      else if (pageLang.startsWith("mn")) say(t("ttsNoVoice"));
      u.rate = 0.95;
      synth.speak(u);
    };
    doc.addEventListener("click", onTtsClick, true);
    const onEscTts = (e) => {
      if (e.key === "Escape") synth == null ? void 0 : synth.cancel();
    };
    doc.addEventListener("keydown", onEscTts);
    function highlight(id) {
      var _a3;
      const f = (_a3 = getReport()) == null ? void 0 : _a3.findings.find((x) => x.id === id);
      const n = f == null ? void 0 : f.node;
      if (!n || !n.isConnected) return;
      n.scrollIntoView({ block: "center", behavior: "instant" });
      const r = n.getBoundingClientRect();
      const box = doc.createElement("div");
      box.className = "hl";
      Object.assign(box.style, { left: `${r.left - 4}px`, top: `${r.top - 4}px`, width: `${r.width + 8}px`, height: `${r.height + 8}px` });
      root.appendChild(box);
      say(messageText(f, getLang()));
      win.setTimeout(() => box.remove(), 3500);
    }
    function exportJson() {
      const r = getReport();
      if (!r) return;
      const blob = new Blob([JSON.stringify(serialize(r, getLang()), null, 2)], { type: "application/json" });
      const a = doc.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `hurteemj-report-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      a.setAttribute(HOST_ATTR, "download");
      doc.body.appendChild(a);
      a.click();
      a.remove();
      win.setTimeout(() => URL.revokeObjectURL(a.href), 2e3);
    }
    render();
    (doc.body || doc.documentElement).appendChild(host);
    updateGuide();
    return {
      host,
      open: show,
      close: hide,
      toggle,
      refresh: () => {
        if (open) rerender(keyOf(shadow.activeElement));
        updateGuide();
      },
      destroy() {
        doc.removeEventListener("keydown", onKey, true);
        doc.removeEventListener("click", onOpenTrigger);
        doc.removeEventListener("focusin", onFocusIn);
        doc.removeEventListener("pointermove", onMove);
        doc.removeEventListener("click", onTtsClick, true);
        doc.removeEventListener("keydown", onEscTts);
        synth == null ? void 0 : synth.cancel();
        host.remove();
      }
    };
  }

  // src/i18n/index.js
  var STRINGS = {
    mn: {
      launcher: "Хүртээмжийн тохиргоо",
      title: "Хүртээмж",
      subtitle: "Сайтыг өөрт тохируулах",
      close: "Хаах",
      language: "Хэл",
      profiles: "Бэлэн тохиргоо",
      profile_lowVision: "Харааны бэрхшээл",
      profile_dyslexia: "Дислекси / уншлага",
      profile_seizure: "Эпилепсийн аюулгүй",
      profile_adhd: "Анхаарал төвлөрөл",
      profile_motor: "Гар / хөдөлгөөн",
      profile_elderly: "Ахмад настан",
      content: "Текст ба агуулга",
      fontScale: "Текстийн хэмжээ",
      decrease: "Багасгах",
      increase: "Томруулах",
      textSpacing: "Текстийн зай (WCAG 1.4.12)",
      readableFont: "Уншихад хялбар фонт",
      alignLeft: "Зүүн тийш тэгшлэх",
      highlightLinks: "Холбоосыг тодруулах",
      highlightHeadings: "Гарчгийг тодруулах",
      color: "Өнгө ба тодрол",
      contrast: "Тодрол",
      contrast_default: "Анхны",
      contrast_light: "Цайвар өндөр тодрол",
      contrast_dark: "Бараан өндөр тодрол",
      contrast_invert: "Урвуу өнгө",
      saturation: "Өнгөний ханалт",
      saturation_default: "Анхны",
      saturation_low: "Бага",
      saturation_high: "Өндөр",
      saturation_mono: "Хар цагаан",
      navigation: "Навигаци ба хөдөлгөөн",
      stopMotion: "Хөдөлгөөн, анимацийг зогсоох",
      focusRing: "Фокусыг тод харуулах",
      bigCursor: "Том курсор",
      largeTargets: "Товчийг томруулах",
      hideImages: "Зургийг нуух",
      readingGuide: "Уншлагын туслах",
      readingGuide_off: "Унтраах",
      readingGuide_line: "Шугам",
      readingGuide_mask: "Маск",
      tts: "Товшсон текстийг унших",
      ttsNoVoice: "Энэ хэлний дуу хоолой төхөөрөмжид алга — өөр хэлний дуугаар уншина.",
      reset: "Бүгдийг анхны байдалд",
      statement: "Хүртээмжийн мэдэгдэл",
      feedback: "Асуудал мэдэгдэх",
      on: "асаалттай",
      off: "унтраалттай",
      applied: "Тохиргоо хэрэгжлээ",
      resetDone: "Бүх тохиргоог анхны байдалд оруулав",
      auditor: "Хөгжүүлэгчийн тайлан",
      auditRun: "Дахин шалгах",
      auditExport: "JSON татах",
      auditFail: "Зөрчил",
      auditReview: "Хянах",
      auditFixed: "Зассан",
      auditShow: "Харуулах",
      auditManual: "Гараар шалгах SC",
      auditDisclaimer: "Автомат шалгалт WCAG-ийн бүх шаардлагыг илрүүлэхгүй. Энэ нь эцсийн дүгнэлт биш.",
      shortcut: "Товчлол",
      poweredBy: "Хүртээмж · WCAG 2.2"
    },
    en: {
      launcher: "Accessibility settings",
      title: "Accessibility",
      subtitle: "Adjust this site to your needs",
      close: "Close",
      language: "Language",
      profiles: "Profiles",
      profile_lowVision: "Low vision",
      profile_dyslexia: "Dyslexia / reading",
      profile_seizure: "Seizure safe",
      profile_adhd: "Focus (ADHD)",
      profile_motor: "Motor / keyboard",
      profile_elderly: "Older adults",
      content: "Text and content",
      fontScale: "Text size",
      decrease: "Decrease",
      increase: "Increase",
      textSpacing: "Text spacing (WCAG 1.4.12)",
      readableFont: "Readable font",
      alignLeft: "Align text left",
      highlightLinks: "Highlight links",
      highlightHeadings: "Highlight headings",
      color: "Color and contrast",
      contrast: "Contrast",
      contrast_default: "Default",
      contrast_light: "Light high contrast",
      contrast_dark: "Dark high contrast",
      contrast_invert: "Invert colors",
      saturation: "Saturation",
      saturation_default: "Default",
      saturation_low: "Low",
      saturation_high: "High",
      saturation_mono: "Monochrome",
      navigation: "Navigation and motion",
      stopMotion: "Stop animations and motion",
      focusRing: "Strong focus indicator",
      bigCursor: "Large cursor",
      largeTargets: "Larger click targets",
      hideImages: "Hide images",
      readingGuide: "Reading aid",
      readingGuide_off: "Off",
      readingGuide_line: "Line",
      readingGuide_mask: "Mask",
      tts: "Read clicked text aloud",
      ttsNoVoice: "No voice for this language on your device — another voice will be used.",
      reset: "Reset all",
      statement: "Accessibility statement",
      feedback: "Report a problem",
      on: "on",
      off: "off",
      applied: "Setting applied",
      resetDone: "All settings were reset",
      auditor: "Developer report",
      auditRun: "Re-run audit",
      auditExport: "Download JSON",
      auditFail: "Failures",
      auditReview: "Review",
      auditFixed: "Fixed",
      auditShow: "Show",
      auditManual: "Manual-check SC",
      auditDisclaimer: "Automated testing does not detect every WCAG issue. This is not a conformance claim.",
      shortcut: "Shortcut",
      poweredBy: "Hurteemj · WCAG 2.2"
    }
  };
  function translator(getLang, overrides = {}) {
    return (key) => {
      var _a3, _b;
      const lang = getLang();
      return ((_a3 = overrides == null ? void 0 : overrides[lang]) == null ? void 0 : _a3[key]) ?? ((_b = STRINGS[lang]) == null ? void 0 : _b[key]) ?? STRINGS.en[key] ?? key;
    };
  }

  // src/core/listeners.js
  var KEY = "__hurteemjClickTargets";
  var TYPES = /* @__PURE__ */ new Set(["click", "mousedown", "mouseup", "pointerdown", "pointerup", "touchstart", "touchend"]);
  function trackListeners(win = typeof window !== "undefined" ? window : null) {
    if (!win || win[KEY]) return win == null ? void 0 : win[KEY];
    const set = /* @__PURE__ */ new WeakSet();
    win[KEY] = set;
    const proto = win.EventTarget.prototype;
    const orig = proto.addEventListener;
    proto.addEventListener = function(type, fn, opts) {
      if (TYPES.has(type) && this && this.nodeType === 1) set.add(this);
      return orig.call(this, type, fn, opts);
    };
    return set;
  }
  function trackedTargets(win = typeof window !== "undefined" ? window : null) {
    return (win == null ? void 0 : win[KEY]) || null;
  }

  // src/index.js
  var VERSION = "1.0.0";
  var DEFAULTS = {
    level: "AA",
    // A | AA | AAA
    fix: "safe",
    // false | 'safe' | 'heuristic'
    audit: true,
    deep: false,
    observe: true,
    widget: true,
    launcher: true,
    auditor: false,
    lang: null,
    // засварт хэрэглэх хуудасны хэл (html lang байхгүй үед)
    uiLang: null,
    // самбарын хэл
    languages: ["mn", "en"],
    position: "bottom-right",
    color: "#0b4bd1",
    focusColor: "#0b1f3a",
    shortcut: "alt+shift+a",
    ignore: [],
    rules: {},
    only: null,
    storage: "local",
    respectOS: true,
    console: false,
    reportEndpoint: null,
    reportSampleRate: 1,
    statementUrl: null,
    feedbackUrl: null
  };
  var ATTR_MAP = {
    lang: "lang",
    uiLang: "ui-lang",
    level: "level",
    fix: "fix",
    auditor: "auditor",
    widget: "widget",
    launcher: "launcher",
    position: "position",
    color: "color",
    focusColor: "focus-color",
    statementUrl: "statement-url",
    feedbackUrl: "feedback-url",
    reportEndpoint: "report-endpoint",
    ignore: "ignore",
    shortcut: "shortcut",
    observe: "observe",
    audit: "audit",
    deep: "deep",
    storage: "storage",
    console: "console",
    languages: "languages",
    only: "only",
    nonce: "nonce"
  };
  function configFromScript(script2) {
    if (!script2) return {};
    const out = {};
    for (const [k, a] of Object.entries(ATTR_MAP)) {
      const v = script2.getAttribute(`data-${a}`);
      if (v === null) continue;
      if (v === "true" || v === "") out[k] = true;
      else if (v === "false") out[k] = false;
      else if (["ignore", "languages", "only"].includes(k)) out[k] = v.split(",").map((s) => s.trim()).filter(Boolean);
      else out[k] = v;
    }
    return out;
  }
  function emit(doc, name, detail) {
    try {
      doc.dispatchEvent(new CustomEvent(`hurteemj:${name}`, { detail }));
    } catch {
    }
  }
  function init(userConfig = {}) {
    var _a3, _b, _c;
    const win = userConfig.window || window;
    const doc = win.document;
    if (win.__hurteemj && !userConfig.force) return win.__hurteemj;
    const config = { ...DEFAULTS, ...win.HurteemjConfig || {}, ...userConfig };
    if (/[?&]hurteemj-audit\b/.test(((_a3 = win.location) == null ? void 0 : _a3.search) || "")) config.auditor = true;
    if (config.level) config.level = String(config.level).toUpperCase();
    if (config.fix === "off" || config.fix === "none") config.fix = false;
    const changes = new ChangeLog();
    const runtime = createRuntime(doc, win, changes, config);
    const pageLang = () => (doc.documentElement.getAttribute("lang") || config.lang || "mn").split("-")[0].toLowerCase();
    let uiLang = config.uiLang || (config.languages.includes(pageLang()) ? pageLang() : config.languages[0] || "mn");
    const t = translator(() => uiLang, config.strings);
    const clickTracked = trackedTargets();
    const state = { report: null, busy: false, destroyed: false };
    const storage = config.storage ? createStorage(config, win) : { get: () => null, set: () => {
    } };
    const prefs = createPreferences({
      doc,
      win,
      config,
      storage,
      onChange: (p, patch) => {
        var _a4;
        emit(doc, "prefs", { prefs: p, patch });
        (_a4 = config.onPrefsChange) == null ? void 0 : _a4.call(config, p, patch);
      }
    });
    async function audit({ deep = config.deep, fix: fix2 = true, scope } = {}) {
      var _a4;
      state.busy = true;
      try {
        const rep = runAudit({ doc, win, config, deep, runtime, changes, clickTracked, pageLang: pageLang(), scope });
        if (fix2 && config.fix) await applyFixes(rep, { doc, win, config, runtime, changes, pageLang: pageLang() });
        if (scope && state.report) {
          const keep = state.report.findings.filter((f) => !f.node || f.node.isConnected);
          state.report = buildReport({ doc, win, config, findings: keep.concat(rep.findings), errors: state.report.errors.concat(rep.errors) });
        } else {
          state.report = rep;
        }
        emit(doc, "audit", state.report);
        (_a4 = config.onAudit) == null ? void 0 : _a4.call(config, state.report);
        if (config.console && !scope) logReport(state.report, uiLang);
        return state.report;
      } finally {
        observer == null ? void 0 : observer.takeRecords();
        state.busy = false;
      }
    }
    async function fix({ tier = config.fix || "safe", ids } = {}) {
      if (!state.report) await audit({ fix: false });
      state.busy = true;
      try {
        const n = await applyFixes(state.report, { doc, win, config: { ...config, fix: tier }, runtime, changes, pageLang: pageLang(), onlyIds: ids });
        emit(doc, "fix", { fixed: n, report: state.report });
        return n;
      } finally {
        observer == null ? void 0 : observer.takeRecords();
        state.busy = false;
      }
    }
    function revert(ruleId) {
      state.busy = true;
      changes.revert(ruleId);
      if (state.report) {
        for (const f of state.report.findings) if (!ruleId || f.ruleId === ruleId) {
          f.fixed = false;
          f.fix = null;
        }
      }
      observer == null ? void 0 : observer.takeRecords();
      state.busy = false;
    }
    function sendReport(rep) {
      var _a4, _b2, _c2, _d;
      if (!config.reportEndpoint && !config.onReport) return;
      if (Math.random() > config.reportSampleRate) return;
      const payload = serialize(rep, uiLang);
      payload.findings = payload.findings.slice(0, 500);
      (_a4 = config.onReport) == null ? void 0 : _a4.call(config, payload);
      if (!config.reportEndpoint) return;
      try {
        const body = JSON.stringify(payload);
        const ok = (_c2 = (_b2 = win.navigator).sendBeacon) == null ? void 0 : _c2.call(_b2, config.reportEndpoint, new Blob([body], { type: "application/json" }));
        if (!ok) (_d = win.fetch) == null ? void 0 : _d.call(win, config.reportEndpoint, { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true, credentials: "omit" }).catch(() => {
        });
      } catch {
      }
    }
    let observer = null;
    const pending = /* @__PURE__ */ new Set();
    let timer = null;
    function flush() {
      timer = null;
      if (state.destroyed) return;
      const roots = [...pending].filter((n) => n.isConnected && ![...pending].some((o) => o !== n && o.contains(n)));
      pending.clear();
      idle(async () => {
        for (const r of roots) {
          if (config.audit) await audit({ scope: r, deep: false });
          prefs.refresh(r);
        }
        widget == null ? void 0 : widget.refresh();
      });
    }
    function schedule(delay = 400) {
      if (!timer) timer = win.setTimeout(flush, delay);
    }
    if (config.observe && "MutationObserver" in win) {
      observer = new win.MutationObserver((records) => {
        var _a4;
        if (state.busy) return;
        for (const r of records) {
          for (const n of r.addedNodes) {
            if (n.nodeType === 1 && !isOwnUi(n) && !((_a4 = n.hasAttribute) == null ? void 0 : _a4.call(n, HOST_ATTR))) pending.add(n);
          }
        }
        if (pending.size) schedule();
      });
    }
    let fullTimer = null;
    const onNav = () => {
      win.clearTimeout(fullTimer);
      fullTimer = win.setTimeout(() => audit().then(() => widget == null ? void 0 : widget.refresh()), 800);
    };
    const origPush = (_b = win.history) == null ? void 0 : _b.pushState;
    const origReplace = (_c = win.history) == null ? void 0 : _c.replaceState;
    if (config.observe && origPush) {
      win.history.pushState = function(...a) {
        const r = origPush.apply(this, a);
        onNav();
        return r;
      };
      win.history.replaceState = function(...a) {
        const r = origReplace.apply(this, a);
        onNav();
        return r;
      };
      win.addEventListener("popstate", onNav);
    }
    let widget = null;
    const api = {
      version: VERSION,
      config,
      get report() {
        return state.report;
      },
      audit,
      fix,
      revert,
      prefs: {
        get: prefs.get,
        set: (p) => {
          prefs.set(p);
          widget == null ? void 0 : widget.refresh();
        },
        reset: () => {
          prefs.reset();
          widget == null ? void 0 : widget.refresh();
        },
        applyProfile: (n, on) => {
          prefs.applyProfile(n, on);
          widget == null ? void 0 : widget.refresh();
        },
        profiles: Object.keys(PROFILES),
        defaults: { ...DEFAULT_PREFS }
      },
      open: () => widget == null ? void 0 : widget.open(),
      close: () => widget == null ? void 0 : widget.close(),
      toggle: () => widget == null ? void 0 : widget.toggle(),
      setLanguage(l) {
        uiLang = l;
        widget == null ? void 0 : widget.refresh();
      },
      announce: (text, p) => runtime.announce(text, p),
      toJSON: () => state.report ? serialize(state.report, uiLang) : null,
      changes: () => changes.items.filter((c) => c.type !== "mark").map((c) => ({ type: c.type, ruleId: c.ruleId, attr: c.name || c.prop, prev: c.prev })),
      destroy() {
        state.destroyed = true;
        observer == null ? void 0 : observer.disconnect();
        if (origPush) {
          win.history.pushState = origPush;
          win.history.replaceState = origReplace;
          win.removeEventListener("popstate", onNav);
        }
        changes.revert();
        prefs.destroy();
        widget == null ? void 0 : widget.destroy();
        runtime.destroy();
        if (win.__hurteemj === api) delete win.__hurteemj;
      }
    };
    win.__hurteemj = api;
    const start = async () => {
      var _a4;
      runtime.ensureBase();
      prefs.apply();
      if (config.widget) {
        widget = createWidget({
          doc,
          win,
          config,
          prefs,
          t,
          runtime,
          getLang: () => uiLang,
          setLang: (l) => {
            uiLang = l;
          },
          onAudit: () => audit(),
          getReport: () => state.report
        });
      }
      if (config.audit) {
        await new Promise((r) => idle(r));
        if (state.destroyed) return;
        await audit();
        sendReport(state.report);
        widget == null ? void 0 : widget.refresh();
      }
      observer == null ? void 0 : observer.observe(doc.body, { childList: true, subtree: true });
      emit(doc, "ready", api);
      (_a4 = config.onReady) == null ? void 0 : _a4.call(config, api);
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", start, { once: true });
    else start();
    return api;
  }
  function auditPage(config = {}) {
    const win = config.window || window;
    const cfg = { ...DEFAULTS, ...config, fix: false };
    const changes = new ChangeLog();
    const runtime = createRuntime(win.document, win, changes, cfg);
    const rep = runAudit({ doc: win.document, win, config: cfg, deep: !!config.deep, runtime, changes, clickTracked: trackedTargets() });
    return rep;
  }
  function logReport(rep, lang) {
    var _a3, _b, _c;
    const c = console;
    (_a3 = c.groupCollapsed) == null ? void 0 : _a3.call(c, `%cHurteemj WCAG 2.2 ${rep.level}: ${rep.summary.fail} fail · ${rep.summary.review} review · ${rep.summary.fixed} fixed`, "font-weight:bold");
    (_b = c.table) == null ? void 0 : _b.call(c, rep.findings.map((f) => ({ sc: f.sc.join(","), outcome: f.fixed ? "fixed" : f.outcome, impact: f.impact, rule: f.ruleId, message: messageText(f, lang), selector: f.selector })));
    (_c = c.groupEnd) == null ? void 0 : _c.call(c);
  }
  var criteria = CRITERIA;
  var rules = RULES.map((r) => ({ id: r.id, sc: r.sc, impact: r.impact, fix: r.fix ? r.fix.tier : null, deep: !!r.deep }));
  var index_default = { init, auditPage, criteria, rules, version: VERSION, trackListeners };

  // src/browser.js
  var script = document.currentScript;
  var fromAttr = configFromScript(script);
  if ((script == null ? void 0 : script.nonce) && !fromAttr.nonce) fromAttr.nonce = script.nonce;
  var _a;
  if ((script == null ? void 0 : script.hasAttribute("data-track-listeners")) || ((_a = window.HurteemjConfig) == null ? void 0 : _a.trackListeners)) trackListeners(window);
  window.Hurteemj = { ...index_exports, init: (c) => init({ ...fromAttr, ...c }) };
  var auto = script ? script.getAttribute("data-auto") !== "false" : true;
  var _a2;
  if (auto && ((_a2 = window.HurteemjConfig) == null ? void 0 : _a2.auto) !== false) init(fromAttr);
})();
