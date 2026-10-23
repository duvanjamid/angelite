/**
 * Test helpers: render a component into the document, interact with it and wait for updates.
 *
 *   const t = render(Counter, { props: { start: 5 }, provide: [[Api, fakeApi]] });
 *   t.click('button'); await t.flush();
 *   assert.equal(t.text('output'), '6');
 *   t.unmount();   // or cleanup() after each test
 */

import { mount } from './runtime.js';

const mounted = new Set();

/** Resolves after pending signal updates have been applied to the DOM. */
export const flush = () => new Promise(resolve => setTimeout(resolve, 0));

/** Dispatches a bubbling DOM event on an element. */
export function fire(el, type, init) {
  const win = el.ownerDocument.defaultView;
  const Type = /^(?:click|dblclick|mouse|pointer|contextmenu)/.test(type) ? win.MouseEvent
    : /^key/.test(type) ? win.KeyboardEvent : win.Event;
  return el.dispatchEvent(new Type(type, { bubbles: true, cancelable: true, ...init }));
}

/**
 * Renders `Comp`. Options: `props` (inputs to set), `provide` ([[Token, value], ...] visible to the whole tree),
 * `into` (container; a new <div> in document.body by default).
 */
export function render(Comp, { props, provide, into } = {}) {
  const container = into || document.body.appendChild(document.createElement('div'));
  const up = provide ? { up: null, prov: new Map(provide.map(([token, useValue]) => [token, { useValue }])), made: new Map() } : null;
  const app = mount(Comp, container, up);
  const { instance } = app;
  for (const key in props || {}) {
    if (instance[key] && instance[key].set) instance[key].set(props[key]); else instance[key] = props[key];
  }
  const find = target => (typeof target === 'string' ? container.querySelector(target) : target);
  const need = target => {
    const el = find(target);
    if (!el) throw new Error(`render: nothing matches ${String(target)}`);
    return el;
  };
  const result = {
    container, instance, flush,
    host: container.firstElementChild,
    $: sel => container.querySelector(sel),
    $$: sel => [...container.querySelectorAll(sel)],
    text: sel => need(sel).textContent,
    fire: (target, type, init) => fire(need(target), type, init),
    click: target => fire(need(target), 'click'),
    /** Types into an input/textarea/select (fires `input` and `change`), or sets a checkbox. */
    type(target, value) {
      const el = need(target);
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = !!value; else el.value = value;
      fire(el, 'input');
      fire(el, 'change');
    },
    unmount() {
      app.destroy();
      if (!into) container.remove();
      mounted.delete(result);
    }
  };
  mounted.add(result);
  return result;
}

/** Unmounts everything rendered so far (call it in afterEach). */
export function cleanup() {
  [...mounted].forEach(r => r.unmount());
}
