/** IIFE (<script>) хувилбарын оролт: window.Hurteemj үүсгэж, автоматаар эхлүүлнэ. */
import * as H from './index.js';

const script = document.currentScript;
const fromAttr = H.configFromScript(script);
// CSP: <script nonce> -ийн nonce-г (браузер атрибутыг нуудаг тул .nonce-оос) өвлөнө
if (script?.nonce && !fromAttr.nonce) fromAttr.nonce = script.nonce;
if (script?.hasAttribute('data-track-listeners') || window.HurteemjConfig?.trackListeners) H.trackListeners(window);

window.Hurteemj = { ...H, init: (c) => H.init({ ...fromAttr, ...c }) };

const auto = script ? script.getAttribute('data-auto') !== 'false' : true;
if (auto && window.HurteemjConfig?.auto !== false) H.init(fromAttr);
