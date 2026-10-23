import { test } from 'node:test';
import assert from 'node:assert/strict';

await import('./setup.mjs');
const { renderToString, renderPage, serializeState } = await import('../tools/ssr.mjs');
const angelite = await import('../src/full.js');
const { hydrate } = await import('../src/hydrate.js');
const { component, signal, input } = angelite;

let n = 0;
const define = (template, init = () => ({}), meta = {}) => {
  class C { constructor() { Object.assign(this, init()); } }
  component(C, { selector: `x-ssr${++n}`, template, ...meta });
  return C;
};

test('renderToString: renders blocks, bindings, pipes and child components to markup', async () => {
  const Card = define('<div class="card"><b>{{ title() }}</b><ng-content></ng-content></div>', () => ({ title: input('') }));
  Card.$meta.selector = 'x-ssrcard';
  const App = define(
    '<h1 [class.big]="big">{{ name | uppercase }}</h1><ul>@for (i of items; track i) {<li>{{ i }}</li>} @empty {<li>none</li>}</ul>@if (show) {<x-ssrcard [title]="\'T\'">body</x-ssrcard>}',
    () => ({ name: 'ada', big: true, items: ['a', 'b'], show: true }),
    { imports: [Card] }
  );
  const html = await renderToString(App);
  assert.match(html, /<h1 class="big">ADA<\/h1>/);
  assert.match(html, /<li>a<\/li><li>b<\/li>/);
  assert.match(html, /<div class="card"><b>T<\/b>body/);
  assert.match(html, /^<x-ssr\d+ style="display: contents;">/, 'the host element is part of the output (hydrate() replaces it)');
});

test('output is escaped and URLs are sanitized exactly as in the browser', async () => {
  const App = define('<p>{{ x }}</p><a [href]="u">l</a><div [innerHTML]="h"></div>', () => ({ x: '<img src=x onerror=alert(1)>', u: 'javascript:alert(1)', h: '<b>no</b>' }));
  const orig = console.warn;
  console.warn = () => {};
  let html;
  try { html = await renderToString(App); } finally { console.warn = orig; }
  assert.ok(!html.includes('<img'), 'markup in data stays text');
  assert.match(html, /&lt;img/);
  assert.match(html, /href="unsafe:javascript:alert\(1\)"/);
  assert.ok(!html.includes('<b>no</b>'), 'innerHTML needs trustHtml');
});

test('ready() lets async data settle before the markup is taken', async () => {
  const App = define('<p>{{ data() }}</p>', () => ({ data: signal('loading') }));
  const html = await renderToString(App, { ready: async app => { await new Promise(r => setTimeout(r, 5)); app.data.set('loaded'); } });
  assert.match(html, /<p>loaded<\/p>/);
});

test('router state: the url option decides the page', async () => {
  const Home = define('<h1>home</h1>'), About = define('<h1>about</h1>');
  const { provideRouter } = angelite;
  const App = define('<router-outlet></router-outlet>');
  const run = url => renderToString(App, { url, setup: () => { provideRouter([{ path: '/', component: Home }, { path: 'about', component: About }], { mode: 'history' }); } });
  assert.match(await run('/about'), /<h1>about<\/h1>/);
  assert.match(await run('/'), /<h1>home<\/h1>/);
  provideRouter([]); // leave the module in hash mode for other tests
});

test('renderPage fills the shell and embeds state safely; renders are queued and globals are restored', async () => {
  const App = define('<p>{{ n }}</p>', () => ({ n: 1 }));
  const shell = '<!doctype html><html><body><!--app--><!--state--></body></html>';
  const before = Object.keys(globalThis).includes('document') ? globalThis.document : undefined;
  const pages = await Promise.all([1, 2, 3].map(i => renderPage(define(`<p>${i}</p>`), { shell, state: { i, evil: '</script><script>alert(1)</script>' } })));
  pages.forEach((p, k) => {
    assert.match(p, new RegExp(`<div id="app"><x-ssr\\d+[^>]*><p>${k + 1}</p>`));
    assert.ok(!p.includes('</script><script>alert'), 'state cannot close the script tag');
    assert.match(p, /window\.__STATE__=\{"i":\d,"evil":"\\u003c\/script\\u003e/);
  });
  assert.equal(globalThis.document, before, 'document is back to what it was');
  assert.match(await renderPage(App, { shell: '<body><!--app--></body>' }), /<div id="app"><x-ssr\d+[^>]*><p>1<\/p>/);
  assert.equal(serializeState({ a: '\u2028&' }), '{"a":"\\u2028\\u0026"}');
});

test('a custom shell/selector, a missing mount point, and failures that do not break later renders', async () => {
  const App = define('<i>x</i>');
  assert.match(await renderToString(App, { shell: '<body><main id="root"></main></body>', selector: '#root' }), /<i>x<\/i>/);
  await assert.rejects(renderToString(App, { shell: '<body></body>' }), /#app not found/);
  const Bad = define('<p>{{ x }}</p>');
  await assert.rejects(renderToString(Bad, { ready: () => { throw new Error('data failed'); } }), /data failed/);
  assert.match(await renderToString(App), /<i>x<\/i>/, 'the queue recovers');
  assert.match(await renderToString(App, { mount: angelite.mount }), /<i>x<\/i>/, 'a custom mount is used');
});

test('hydrate(): replaces the server markup with the live app in one go', async () => {
  const count = signal(0);
  const App = define('<button id="b" (click)="count.set(count() + 1)">{{ count() }}</button>', () => ({ count }));
  const root = document.createElement('div');
  root.innerHTML = '<x-ssr><button id="b">0</button></x-ssr>';
  document.body.append(root);
  const app = hydrate(App, root);
  assert.equal(root.querySelectorAll('button').length, 1, 'no duplicated markup');
  root.querySelector('button').click();
  await new Promise(r => setTimeout(r, 0));
  assert.equal(root.querySelector('button').textContent, '1');
  app.destroy();
});
