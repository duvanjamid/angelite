import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom;

globalThis.window = window;
globalThis.document = window.document;
globalThis.EventTarget = window.EventTarget;
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window);
globalThis.Element = window.Element;
globalThis.HTMLElement = window.HTMLElement;
globalThis.MutationObserver = window.MutationObserver;
globalThis.Node = window.Node;
globalThis.history = window.history;
globalThis.location = window.location;
globalThis.localStorage = window.localStorage;
globalThis.addEventListener = window.addEventListener.bind(window);
globalThis.Event = window.Event;
globalThis.HTMLInputElement = window.HTMLInputElement;

const document = window.document;
export { window, document };

/** Mounts a component in a fresh container; returns helpers. Ids are matched with attribute selectors (nwsapi quirk with duplicate ids). */
export function mountIn(mount, Comp) {
  const root = document.createElement('div');
  document.body.append(root);
  const app = mount(Comp, root);
  const sel = s => s.replace(/#([\w-]+)/g, '[id="$1"]');
  return {
    root, app,
    $: s => root.querySelector(sel(s)),
    $$: s => [...root.querySelectorAll(sel(s))],
    text: s => root.querySelector(sel(s))?.textContent
  };
}

export const tick = () => new Promise(r => setTimeout(r, 0));

/** Silences and records console.error for the duration of `fn`. */
export async function captureErrors(fn) {
  const seen = [];
  const original = console.error;
  console.error = (...args) => seen.push(args.map(String).join(' '));
  try { await fn(); } finally { console.error = original; }
  return seen;
}
