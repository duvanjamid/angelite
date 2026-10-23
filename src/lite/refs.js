/**
 * Template references: `<input #box>` + `box = viewChild('box')` in the component.
 * The signal holds the element (or the component instance, for `<app-x #x>`), and goes back to null when it leaves the DOM.
 */

import { signal } from './signals.js';
import { ops, ownOf } from './runtime.js';

/** Signal that receives the element/instance of the template reference called `name`. */
export const viewChild = name => {
  const s = signal(null);
  s.$ref = name.toLowerCase();
  return s;
};

const keysOf = Comp => {
  if (!Comp.$refs) Comp.$refs = {};
  return Comp.$refs;
};

ops.tref = (op, node, view, scope, ctx) => {
  const self = ctx.self, Comp = self.constructor;
  const refs = keysOf(Comp);
  if (!(op.name in refs)) {
    refs[op.name] = null;
    for (const k of Object.keys(self)) if (typeof self[k] === 'function' && self[k].$ref === op.name) refs[op.name] = k;
  }
  const sig = refs[op.name] && self[refs[op.name]];
  if (!sig) return;
  sig.set(op.value || node);
  ownOf(view).push(() => sig.set(null));
};
