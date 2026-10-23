/**
 * Server-side rendering for AngeLite apps (Node). It renders the component in jsdom, so there is no second
 * implementation to keep in sync: the output is exactly what the browser would build.
 *
 *   import { renderToString, renderPage, serializeState } from '@duvanjamid/angelite/tools/ssr.mjs';
 *
 *   const html = await renderToString(App, { url: '/users/3' });             // markup of <div id="app">
 *   const page = await renderPage(App, { shell, url: req.url, state });      // shell with <!--app--> and <!--state--> filled in
 *
 * Client side, `hydrate(App, el)` (lite/hydrate.js) replaces the server markup with the live app in one go: the
 * result looks the same, and the content is visible before the JavaScript arrives. It does not adopt the existing
 * nodes (a full hydration that reuses them is not implemented), so the client renders once more.
 *
 * `setup` runs inside the render before the component is mounted (call `provideRouter(routes, { mode: 'history' })`
 * there so the router reads `url`). Components that load data asynchronously should be awaited with `ready` (it
 * receives the component instance and may return a promise).
 * Renders are queued: jsdom provides the globals while one runs.
 */

import { JSDOM } from 'jsdom';

let queue = Promise.resolve();

const GLOBALS = ['document', 'window', 'location', 'history', 'Element', 'HTMLElement', 'Node', 'Event', 'MutationObserver',
  'addEventListener', 'removeEventListener', 'customElements', 'HTMLInputElement', 'getComputedStyle'];

async function loadRuntime() {
  return import('../src/lite/full.js');
}

async function render(Comp, { url = 'http://localhost/', mount, shell, setup, ready, settle = 2, selector = '#app' }) {
  const html = shell || '<!doctype html><html><head></head><body><div id="app"></div></body></html>';
  const dom = new JSDOM(html.includes('<!--app-->') ? html.replace('<!--app-->', '<div id="app"></div>') : html, { url: new URL(url, 'http://localhost/').href });
  const w = dom.window;
  const saved = {};
  for (const k of GLOBALS) {
    saved[k] = Object.getOwnPropertyDescriptor(globalThis, k);
    Object.defineProperty(globalThis, k, { value: typeof w[k] === 'function' && !/^[A-Z]/.test(k) ? w[k].bind(w) : w[k], configurable: true, writable: true });
  }
  try {
    const run = mount || (await loadRuntime()).mount;
    const host = w.document.querySelector(selector);
    if (!host) throw new Error(`renderToString: ${selector} not found in the shell`);
    if (setup) await setup();
    const app = run(Comp, host);
    if (ready) await ready(app.instance);
    for (let i = 0; i < settle; i++) await new Promise(r => setTimeout(r, 0));
    const out = host.innerHTML;
    const whole = dom.serialize();
    app.destroy();
    return { html: out, document: whole };
  } finally {
    for (const k of GLOBALS) {
      if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k];
    }
    w.close();
  }
}

/** Renders `Comp` and returns the markup inside the mount element (default `#app`). */
export function renderToString(Comp, options = {}) {
  const result = queue.then(() => render(Comp, options));
  queue = result.catch(() => {});
  return result.then(r => r.html);
}

/** JSON that is safe to place inside a <script> tag. */
export const serializeState = state => JSON.stringify(state).replace(/[<>&\u2028\u2029]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

/**
 * Fills a page shell: `<!--app-->` becomes the rendered markup and `<!--state-->` a script that sets
 * `window.__STATE__` (read it on the client to start from the same data).
 */
export async function renderPage(Comp, { shell, state, ...options }) {
  const body = await renderToString(Comp, options);
  const script = state === undefined ? '' : `<script>window.__STATE__=${serializeState(state)}</script>`;
  return shell.replace('<!--app-->', () => `<div id="app">${body}</div>`).replace('<!--state-->', () => script);
}
