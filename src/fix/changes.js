/**
 * Plugin-ийн хийсэн DOM өөрчлөлт бүрийг бүртгэж, бүрэн буцаах (revert) боломж олгоно.
 * Энэ нь "ил тод засвар" зарчмын үндэс: юу өөрчлөгдсөнийг тайланд харуулж,
 * хөгжүүлэгч эх кодондоо засах үед plugin-ийн засварыг унтрааж болно.
 */
export class ChangeLog {
  constructor() { this.items = []; }

  setAttr(el, name, value, ruleId) {
    const had = el.hasAttribute(name);
    const prev = el.getAttribute(name);
    if (had && prev === String(value)) return;
    this.items.push({ type: 'attr', el, name, had, prev, ruleId });
    el.setAttribute(name, value);
    this._mark(el, ruleId);
  }

  removeAttr(el, name, ruleId) {
    if (!el.hasAttribute(name)) return;
    this.items.push({ type: 'attr', el, name, had: true, prev: el.getAttribute(name), ruleId });
    el.removeAttribute(name);
    this._mark(el, ruleId);
  }

  setStyle(el, prop, value, ruleId, priority = 'important') {
    this.items.push({ type: 'style', el, prop, prev: el.style.getPropertyValue(prop), prevPriority: el.style.getPropertyPriority(prop), hadAttr: el.hasAttribute('style'), ruleId });
    el.style.setProperty(prop, value, priority);
    this._mark(el, ruleId);
  }

  insert(node, parent, before = null, ruleId) {
    parent.insertBefore(node, before);
    this.items.push({ type: 'node', node, ruleId });
  }

  listen(target, type, fn, opts, ruleId) {
    target.addEventListener(type, fn, opts);
    this.items.push({ type: 'listener', target, evt: type, fn, opts, ruleId });
  }

  custom(undo, ruleId) { this.items.push({ type: 'custom', undo, ruleId }); }

  _mark(el, ruleId) {
    if (!ruleId || !el.setAttribute) return;
    const cur = (el.getAttribute('data-hj-fixed') || '').split(' ').filter(Boolean);
    if (!cur.includes(ruleId)) {
      cur.push(ruleId);
      // data-hj-fixed өөрөө бүртгэгдэхгүй — revert үед бүгдийг цэвэрлэнэ
      el.setAttribute('data-hj-fixed', cur.join(' '));
      this.items.push({ type: 'mark', el });
    }
  }

  /** ruleId өгвөл зөвхөн тэр дүрмийн өөрчлөлтийг буцаана */
  revert(ruleId) {
    const keep = [];
    for (let i = this.items.length - 1; i >= 0; i--) {
      const c = this.items[i];
      if (ruleId && c.ruleId !== ruleId && c.type !== 'mark') { keep.unshift(c); continue; }
      if (ruleId && c.type === 'mark') { keep.unshift(c); continue; }
      try {
        if (c.type === 'attr') c.had ? c.el.setAttribute(c.name, c.prev) : c.el.removeAttribute(c.name);
        else if (c.type === 'style') {
          c.prev ? c.el.style.setProperty(c.prop, c.prev, c.prevPriority) : c.el.style.removeProperty(c.prop);
          if (!c.hadAttr && !c.el.getAttribute('style')) c.el.removeAttribute('style');
        }
        else if (c.type === 'node') c.node.remove();
        else if (c.type === 'listener') c.target.removeEventListener(c.evt, c.fn, c.opts);
        else if (c.type === 'custom') c.undo();
        else if (c.type === 'mark') c.el.removeAttribute('data-hj-fixed');
      } catch { /* элемент устсан байж болно */ }
    }
    this.items = keep;
  }

  get count() { return this.items.filter((c) => c.type !== 'mark').length; }
}
