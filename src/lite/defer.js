/**
 * `@defer (on idle; on viewport; on interaction; on hover; on timer(2s); on immediate; when expr) { ... }
 *  @placeholder { ... }` renders the block when a trigger fires. Importing this module enables it.
 */

import { untracked } from './signals.js';
import { ops, instantiate, removeView, destroyView, refresh, ownOf, rangeOf } from './runtime.js';

class DeferState {
  constructor(anchor, op, scope, ctx, view) {
    this.anchor = anchor;
    this.op = op;
    this.scope = scope;
    this.ctx = ctx;
    this.v = null;
    this.ph = null;
    this.done = false;
    this.off = [];
    if (op.placeholder) {
      this.ph = instantiate(op.placeholder, scope, ctx);
      anchor.after(this.ph.frag);
      this.ph.frag = null;
    }
    ownOf(view).push(() => {
      this.done = true;
      this.disarm();
      if (this.ph) destroyView(this.ph);
      if (this.v) destroyView(this.v);
    });
    (view.dep || (view.dep = [])).push(this);
    this.arm();
  }

  refresh() {
    if (this.ph) refresh(this.ph);
    if (this.v) refresh(this.v);
  }

  update(v) { if (v) this.fire(); }

  disarm() {
    this.off.forEach(fn => fn());
    this.off = [];
  }

  arm() {
    const el = this.ph && rangeOf(this.ph).find(n => n.nodeType === 1);
    for (const t of this.op.triggers) {
      const fire = () => this.fire();
      if (t.on === 'idle') {
        const id = typeof requestIdleCallback === 'function' ? requestIdleCallback(fire) : setTimeout(fire, 1);
        this.off.push(() => (typeof requestIdleCallback === 'function' ? cancelIdleCallback(id) : clearTimeout(id)));
      } else if (t.on === 'immediate' || t.on === 'timer') {
        const id = setTimeout(fire, t.ms || 0);
        this.off.push(() => clearTimeout(id));
      } else if (!el) {
        console.warn(`[AngeLite] @defer (on ${t.on}) needs an element in @placeholder; rendering now`);
        fire();
      } else if (t.on === 'viewport') {
        if (typeof IntersectionObserver !== 'function') { fire(); continue; }
        const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) fire(); });
        io.observe(el);
        this.off.push(() => io.disconnect());
      } else {
        const events = t.on === 'hover' ? ['mouseenter', 'focusin'] : ['click', 'keydown'];
        events.forEach(type => el.addEventListener(type, fire, { once: true }));
        this.off.push(() => events.forEach(type => el.removeEventListener(type, fire)));
      }
    }
  }

  fire() {
    if (this.done) return;
    this.done = true;
    this.disarm();
    untracked(() => {
      if (this.ph) { removeView(this.ph); this.ph = null; }
      this.v = instantiate(this.op.bp, this.scope, this.ctx);
      this.anchor.after(this.v.frag);
      this.v.frag = null;
    });
  }
}

ops.defer = (op, anchor, view, scope, ctx, st) => {
  const state = new DeferState(anchor, op, scope, ctx, view);
  if (op.slot != null) st[op.slot] = state;
};
