// Runs the same attack inputs against AngeLite, Preact, Vue, and React, and prints what each one does.
//   cd benchmarks && npm install && node security-probe.mjs
// (Angular needs its AOT build to run, so it is covered by reading its sanitizer in the package and its docs.)
import { JSDOM } from 'jsdom';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/', pretendToBeVisual: true });
for (const k of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event', 'MouseEvent', 'MutationObserver',
  'SVGElement', 'HTMLInputElement', 'HTMLSelectElement', 'HTMLTextAreaElement', 'DocumentFragment', 'Text', 'Comment', 'location', 'history', 'localStorage']) {
  Object.defineProperty(globalThis, k, { value: dom.window[k], configurable: true, writable: true });
}
globalThis.addEventListener = dom.window.addEventListener.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);

const unsafe = 'javascript:alert(1)', evil = '<img src=x onerror=alert(1)>';
const rows = [];
const rec = (fw, test, result) => rows.push({ framework: fw, test, result: String(result) });
const mk = () => { const d = document.createElement('div'); document.body.append(d); return d; };
const guard = (fw, fn) => { try { fn(); } catch (e) { rec(fw, 'ERROR', String(e.message).slice(0, 100)); } };
const quiet = () => { console.error = () => {}; console.warn = () => {}; };

await (async () => {
  try {
    const { signal, component, mount } = await import('../src/index.js');
    let n = 0;
    const app = (template, init) => {
      class C { constructor() { Object.assign(this, init()); } }
      component(C, { selector: 'x-probe-' + n++, template });
      const root = mk();
      mount(C, root);
      return root;
    };
    let r = app('<a [href]="u()">x</a>', () => ({ u: signal(unsafe) }));
    rec('angelite', 'href javascript:', r.querySelector('a').getAttribute('href'));
    r = app('<div [attr.onclick]="s()">x</div>', () => ({ s: signal('alert(1)') }));
    rec('angelite', 'onclick as text', r.querySelector('div').getAttribute('onclick') ?? 'not set');
    r = app('<div [innerHTML]="h()"></div>', () => ({ h: signal(evil) }));
    rec('angelite', 'innerHTML renders markup', !!r.querySelector('img'));
    r = app('<p>{{ h() }}</p>', () => ({ h: signal(evil) }));
    rec('angelite', 'text child escaped', !r.querySelector('img'));
    window.__hit = () => 'ran';
    r = app('<p>{{ $el.ownerDocument.defaultView.__hit() }}</p>', () => ({}));
    rec('angelite', 'template reaches window via $el', r.querySelector('p').textContent === 'ran');
  } catch (e) { rec('angelite', 'ERROR', e.message); }
})();

guard('react', () => {
  const React = require('react'), { flushSync } = require('react-dom'), { createRoot } = require('react-dom/client');
  quiet();
  const run = el => { const host = mk(); flushSync(() => createRoot(host).render(el)); return host; };
  rec('react', 'href javascript:', run(React.createElement('a', { href: unsafe }, 'x')).querySelector('a').getAttribute('href'));
  rec('react', 'onclick as text', run(React.createElement('div', { onClick: 'alert(1)' }, 'x')).firstChild.getAttribute('onclick') ?? 'not set');
  rec('react', 'innerHTML renders markup', !!run(React.createElement('div', { dangerouslySetInnerHTML: { __html: evil } })).querySelector('img'));
  rec('react', 'text child escaped', !run(React.createElement('p', null, evil)).querySelector('img'));
});

guard('preact', () => {
  const { h, render } = require('preact');
  let host = mk(); render(h('a', { href: unsafe }, 'x'), host);
  rec('preact', 'href javascript:', host.querySelector('a').getAttribute('href'));
  host = mk(); render(h('div', { onClick: 'alert(1)' }, 'x'), host);
  rec('preact', 'onclick as text', host.firstChild.getAttribute('onclick') ?? 'not set');
  host = mk(); render(h('div', { dangerouslySetInnerHTML: { __html: evil } }), host);
  rec('preact', 'innerHTML renders markup', !!host.querySelector('img'));
  host = mk(); render(h('p', null, evil), host);
  rec('preact', 'text child escaped', !host.querySelector('img'));
});

guard('vue', () => {
  const Vue = require('vue');
  quiet();
  const mountVue = (template, data) => { const host = mk(); Vue.createApp({ template, data: () => data }).mount(host); return host; };
  rec('vue', 'href javascript:', mountVue('<a :href="u">x</a>', { u: unsafe }).querySelector('a').getAttribute('href'));
  rec('vue', 'onclick as text', mountVue('<div :onclick="s">x</div>', { s: 'alert(1)' }).firstChild.getAttribute('onclick') ?? 'not set');
  rec('vue', 'innerHTML renders markup', !!mountVue('<div v-html="h"></div>', { h: evil }).querySelector('img'));
  rec('vue', 'text child escaped', !mountVue('<p>{{ h }}</p>', { h: evil }).querySelector('img'));
  rec('vue', 'template reaches window', mountVue('<p>{{ typeof window }}</p>', {}).textContent !== 'undefined');
});

console.table(rows);
process.exit(0);
