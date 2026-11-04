/** Самбарын CSS. Бүх өнгө WCAG AA (≥4.5:1 текст, ≥3:1 UI) тодролтойгоор сонгогдсон. */
export const css = (accent, accentText) => `
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
