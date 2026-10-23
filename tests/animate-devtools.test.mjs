import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { window, document, mountIn, tick } from './setup.mjs';

const angelite = await import('../src/full.js');
const { enableDevtools } = await import('../src/devtools.js');
const { signal, component, mount, input } = angelite;
const { compileTemplate } = await import('../tools/aot.mjs');

let n = 0;
const define = (template, init = () => ({}), meta = {}) => {
  class C { constructor() { Object.assign(this, init()); } }
  component(C, { selector: `x-an${++n}`, template, ...meta });
  return C;
};
const fire = (el, type) => el.dispatchEvent(new window.Event(type, { bubbles: true }));

// jsdom does not run CSS animations: pretend the stylesheet gives every element these durations
const realStyle = globalThis.getComputedStyle;
const styles = { animationDuration: '0.2s', animationDelay: '0s', transitionDuration: '0s', transitionDelay: '0s' };
globalThis.getComputedStyle = () => styles;
afterEach(() => { Object.assign(styles, { animationDuration: '0.2s', animationDelay: '0s', transitionDuration: '0s', transitionDelay: '0s' }); delete globalThis.matchMedia; });
process.on('exit', () => { globalThis.getComputedStyle = realStyle; });

test('animate.enter adds the class and removes it when the animation ends', async () => {
  const { $ } = mountIn(mount, define('<div id="d" animate.enter="fade-in slide">x</div>'));
  assert.ok($('#d').classList.contains('fade-in') && $('#d').classList.contains('slide'));
  assert.equal($('#d').hasAttribute('animate.enter'), false, 'the attribute is consumed');
  fire($('#d'), 'animationend');
  assert.equal($('#d').className, '');
});

test('animate.leave keeps the element until its animation ends; @if and @for removals both wait', async () => {
  const show = signal(true), items = signal([1, 2, 3]);
  const App = define(
    '@if (show()) {<p id="p" animate.leave="bye">p</p>}<ul>@for (i of items(); track i) {<li animate.leave="bye" animate.enter="hi">{{ i }}</li>}</ul>',
    () => ({ show, items })
  );
  const { $, $$ } = mountIn(mount, App);
  show.set(false);
  await tick();
  assert.ok($('#p'), 'still in the DOM while it leaves');
  assert.ok($('#p').classList.contains('bye'));
  fire($('#p'), 'animationend');
  assert.equal($('#p'), null);

  items.set([1, 3]);
  await tick();
  assert.equal($$('li').length, 3, 'the removed row is still there');
  const leaving = $$('li').find(li => li.classList.contains('bye'));
  assert.equal(leaving.textContent, '2');
  leaving.dispatchEvent(new window.Event('transitionend', { bubbles: true }));
  assert.equal($$('li').length, 2);
  show.set(true);
  await tick();
  assert.ok($('#p') && !$('#p').classList.contains('bye'), 'a new element does not inherit the leave class');
});

test('a safety timeout removes the element when no animation event arrives; no duration removes it at once', async () => {
  const show = signal(true);
  const App = define('@if (show()) {<p id="p" animate.leave="bye">p</p>}', () => ({ show }));
  const { $ } = mountIn(mount, App);
  show.set(false);
  await tick();
  assert.ok($('#p'));
  await new Promise(r => setTimeout(r, 330));
  assert.equal($('#p'), null, 'removed after duration + margin without an animationend');

  Object.assign(styles, { animationDuration: '0s', transitionDuration: '0.1s', transitionDelay: '0.05s' });
  show.set(true);
  await tick();
  show.set(false);
  await tick();
  await new Promise(r => setTimeout(r, 250));
  assert.equal($('#p'), null, 'transition duration + delay is honoured');

  Object.assign(styles, { animationDuration: '', animationDelay: '', transitionDuration: '', transitionDelay: '' });
  show.set(true);
  await tick();
  show.set(false);
  await tick();
  await new Promise(r => setTimeout(r, 10));
  assert.equal($('#p'), null, 'no animation defined: removed right away');
});

test('prefers-reduced-motion: no classes, immediate removal', async () => {
  globalThis.matchMedia = q => ({ matches: /reduce/.test(q) });
  const show = signal(true);
  const { $ } = mountIn(mount, define('@if (show()) {<p id="p" animate.enter="in" animate.leave="out">p</p>}', () => ({ show })));
  assert.equal($('#p').className, '');
  show.set(false);
  await tick();
  assert.equal($('#p'), null);
});

test('elements without animate.* are removed immediately; the attribute is ignored on component tags; AOT keeps it', async () => {
  const show = signal(true);
  const Kid = define('<i>k</i>');
  Kid.$meta.selector = 'x-kidanim';
  const App = define('@if (show()) {<b id="b">b</b>}<x-kidanim animate.enter="x"></x-kidanim>', () => ({ show }), { imports: [Kid] });
  const { $ } = mountIn(mount, App);
  show.set(false);
  await tick();
  assert.equal($('#b'), null);
  assert.match(compileTemplate('<p animate.enter="a" animate.leave="b">x</p>', { check: false }), /"type":"anim"/);
});

/* ---- devtools ---- */

test('devtools: tree, state, inspect, set and the panel', async () => {
  const Kid = define('<i>{{ label() }}</i>', () => ({ label: input('kid'), plain: 7, fn() {} }));
  Kid.$meta.selector = 'x-dtkid';
  const count = signal(2);
  const App = define('<h1>t</h1><div><x-dtkid [label]="\'hi\'"></x-dtkid></div>', () => ({ count, name: 'app' }), { imports: [Kid] });
  const { root } = mountIn(mount, App);
  const api = enableDevtools();
  assert.equal(window.__ANGELITE__, api);
  const tree = api.tree(root);
  assert.equal(tree.length, 1);
  assert.deepEqual(tree[0].state, { count: 2, name: 'app' });
  assert.equal(tree[0].children.length, 1);
  assert.deepEqual(tree[0].children[0].state, { label: 'hi', plain: 7 });
  assert.equal(tree[0].children[0].name, 'x-dtkid');
  const kidEl = root.querySelector('x-dtkid');
  assert.equal(api.inspect(kidEl), tree[0].children[0].instance);
  assert.equal(api.inspect(root), null);
  assert.equal(api.inspect(null), null);
  assert.equal(api.set(tree[0].instance, 'count', 5), true);
  assert.equal(count(), 5);
  assert.equal(api.set(tree[0].instance, 'name', 'x'), false, 'plain fields are not signals');
  assert.equal(api.state(tree[0].instance).count, 5);

  const withPanel = enableDevtools({ panel: true });
  const box = document.querySelector('[data-angelite-devtools]');
  assert.ok(box);
  assert.match(box.textContent, /<x-an\d+> count=5/);
  assert.match(box.textContent, /<x-dtkid> label="hi"/);
  const log = console.log;
  const logged = [];
  console.log = (...a) => logged.push(a);
  try { box.querySelector('div').click(); } finally { console.log = log; }
  assert.equal(logged.length, 1);
  count.set(9);
  await new Promise(r => setTimeout(r, 600));
  assert.match(box.textContent, /count=9/, 'the panel refreshes itself');
  withPanel.closePanel();
  assert.equal(document.querySelector('[data-angelite-devtools]'), null);
});
