/**
 * Framework-гүй Web Component:
 *   <script type="module" src="hurteemj/element"></script>
 *   <hurteemj-widget level="AA" fix="safe" ui-lang="mn" position="bottom-left" color="#004b8d"></hurteemj-widget>
 */
import { init, configFromScript } from '../../dist/hurteemj.esm.js';

class HurteemjElement extends HTMLElement {
  connectedCallback() {
    if (this._api) return;
    // configFromScript нь data-* уншдаг тул атрибутуудыг data- болгон хувиргана
    const shim = { getAttribute: (n) => this.getAttribute(n.replace(/^data-/, '')) };
    this._api = init(configFromScript(shim));
    this.style.display = 'none';
  }
  disconnectedCallback() { if (this.hasAttribute('destroy-on-remove')) this._api?.destroy(); }
  get api() { return this._api; }
}
if (!customElements.get('hurteemj-widget')) customElements.define('hurteemj-widget', HurteemjElement);
export default HurteemjElement;
