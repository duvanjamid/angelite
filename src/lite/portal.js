/**
 * `<ng-portal to="#modals">...</ng-portal>` renders its content inside another element (default: document.body)
 * while keeping it in this component's scope. Importing this module enables it.
 */

import { ops, instantiate, removeView, refresh, ownOf } from './runtime.js';

ops.portal = (op, node, view, scope, ctx) => {
  node.remove();
  const target = document.querySelector(op.to) || document.body;
  const v = instantiate(op.bp, scope, ctx);
  target.append(v.frag);
  v.frag = null;
  ownOf(view).push(() => removeView(v));
  (view.dep || (view.dep = [])).push({ refresh: () => refresh(v) });
};
