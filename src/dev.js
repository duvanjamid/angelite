/**
 * Development warnings. Call it in development only (before mounting):
 *
 *   if (import.meta.env?.DEV) enableDevWarnings();
 *
 * It reports mistakes that are otherwise silent: a binding to a property a component does not declare as an
 * input, duplicate @for track keys, a template that needs a module you did not import (portal, defer),
 * and an unknown element in a template (in-browser compiler). Each message is shown once.
 */

import { A, ops } from './runtime.js';
import { setWarn } from './warn.js';

const seen = new Set();
let sink = null;
let installed = false;

const say = message => {
  if (sink && !seen.has(message)) {
    seen.add(message);
    sink(message);
  }
};

function install() {
  // [prop]="..." on a custom element / component tag that has no such property or input
  const prop = A.prop;
  A.prop = name => {
    const apply = prop(name);
    if (/^(?:class|style|attr)\./.test(name)) return apply;
    return (el, v) => {
      if (el.localName.includes('-') && !(name.toLowerCase() in el)) say(`<${el.localName}> has no input "${name}" (declare it with input())`);
      return apply(el, v);
    };
  };

  // @for (x of xs; track key): duplicate keys
  const state = A.state;
  A.state = (st, v) => {
    if (st.op && st.op.track && Array.isArray(v)) {
      const keys = new Set();
      for (let i = 0; i < v.length; i++) {
        st.probe[st.op.name] = v[i];
        st.probe.$index = i;
        const key = st.op.track(st.probe);
        if (keys.has(key)) say(`@for: duplicate track key ${String(key)}`);
        keys.add(key);
      }
    }
    return state(st, v);
  };

  // instructions whose module was not imported
  Object.setPrototypeOf(ops, new Proxy(Object.prototype, {
    get: (target, key) => {
      if (key === 'portal' || key === 'defer') say(`this template needs the module src/${key}.js (import it, or use the runtime-plus build)`);
      return target[key];
    }
  }));
}

export function enableDevWarnings(log = message => console.warn(`[AngeLite] ${message}`)) {
  sink = log;
  seen.clear();
  setWarn(say);
  if (!installed) {
    installed = true;
    install();
  }
}
