import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountIn, tick } from './setup.mjs';

const { signal, component, mount } = await import('../src/lite/index.js');

function define(template, init, proto = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  Object.assign(C.prototype, proto);
  component(C, { selector: 'x-app', template });
  return C;
}

const lis = $$ => $$('li').map(l => l.textContent);

/* ---- @for ---- */

test('@for: loop variables $index, $count, $first, $last, $even, $odd', async () => {
  const items = signal(['a', 'b', 'c']);
  const { $$ } = mountIn(mount, define(
    `<ul>@for (x of items(); track x) {<li>{{ $index }}/{{ $count }} {{ x }} {{ $first }} {{ $last }} {{ $even }} {{ $odd }}</li>}</ul>`, () => ({ items })));
  assert.deepEqual(lis($$), ['0/3 a true false true false', '1/3 b false false false true', '2/3 c false true true false']);
  items.set(['c', 'a']); await tick();
  assert.deepEqual(lis($$), ['0/2 c true false true false', '1/2 a false true false true']);
});

test('@for: keyed rows are reused (same DOM node), new keys create nodes, removed keys drop them', async () => {
  const items = signal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }, { id: 3, t: 'c' }]);
  const { $$ } = mountIn(mount, define(`<ul>@for (it of items(); track it.id) {<li>{{ it.t }}</li>}</ul>`, () => ({ items })));
  const [n1, , n3] = $$('li');
  items.set([{ id: 3, t: 'c!' }, { id: 4, t: 'd' }, { id: 1, t: 'a' }]); await tick();
  assert.deepEqual(lis($$), ['c!', 'd', 'a']);
  assert.equal($$('li')[0], n3, 'id 3 moved, not re-created');
  assert.equal($$('li')[2], n1, 'id 1 moved, not re-created');
});

test('@for without track uses item identity', async () => {
  const a = { n: 'a' }, b = { n: 'b' };
  const items = signal([a, b]);
  const { $$ } = mountIn(mount, define(`<ul>@for (x of items(); track x) {<li>{{ x.n }}</li>}</ul>`, () => ({ items })));
  const [la, lb] = $$('li');
  items.set([b, a]); await tick();
  assert.equal($$('li')[0], lb);
  assert.equal($$('li')[1], la);
});

test('@for: duplicate keys, null/undefined lists and non-array iterables do not break', async () => {
  const items = signal([1, 1, 2]);
  const { $$ } = mountIn(mount, define(`<ul>@for (x of items(); track x) {<li>{{ x }}</li>} @empty {<li>none</li>}</ul>`, () => ({ items })));
  assert.deepEqual(lis($$), ['1', '1', '2']);
  items.set(null); await tick();
  assert.deepEqual(lis($$), ['none']);
  items.set(new Set([7, 8])); await tick();
  assert.deepEqual(lis($$), ['7', '8']);
  items.set(undefined); await tick();
  assert.deepEqual(lis($$), ['none']);
});

test('@for: rows are updated in place when an item changes under the same key', async () => {
  const items = signal([{ id: 1, t: 'a' }]);
  const { $$ } = mountIn(mount, define(`<ul>@for (it of items(); track it.id) {<li>{{ it.t }}</li>}</ul>`, () => ({ items })));
  const node = $$('li')[0];
  items.set([{ id: 1, t: 'changed' }]); await tick();
  assert.equal($$('li')[0], node);
  assert.equal(node.textContent, 'changed');
});

test('@for: randomized updates always match a plain model (and keep node identity for stable keys)', async () => {
  let seed = 12345;
  const rnd = n => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed % n; };
  const items = signal([]);
  const { $$ } = mountIn(mount, define(`<ul>@for (it of items(); track it.id) {<li>{{ it.id }}:{{ it.v }}</li>}</ul>`, () => ({ items })));
  let model = [];
  const nodes = new Map();
  let nextId = 1;
  for (let step = 0; step < 150; step++) {
    const op = rnd(6);
    const copy = model.map(x => ({ ...x }));
    if (op === 0) copy.push({ id: nextId++, v: rnd(100) });
    else if (op === 1 && copy.length) copy.splice(rnd(copy.length), 1);
    else if (op === 2 && copy.length > 1) { const i = rnd(copy.length), j = rnd(copy.length); [copy[i], copy[j]] = [copy[j], copy[i]]; }
    else if (op === 3 && copy.length) copy[rnd(copy.length)].v = rnd(100);
    else if (op === 4) { for (let i = copy.length - 1; i > 0; i--) { const j = rnd(i + 1); [copy[i], copy[j]] = [copy[j], copy[i]]; } }
    else if (op === 5 && rnd(10) === 0) copy.length = 0;
    model = copy;
    items.set(model);
    await tick();
    assert.deepEqual(lis($$), model.map(x => `${x.id}:${x.v}`), `step ${step}`);
    // identity: a key present before and after keeps its node
    const now = new Map($$('li').map((n, i) => [model[i].id, n]));
    for (const [id, node] of now) if (nodes.has(id)) assert.equal(node, nodes.get(id), `node for ${id} replaced at step ${step}`);
    nodes.clear(); now.forEach((n, id) => nodes.set(id, n));
  }
});

test('@for inside tables keeps a valid table structure (no stray text nodes)', async () => {
  const rows = signal([{ id: 1, n: 'a' }, { id: 2, n: 'b' }]);
  const { root } = mountIn(mount, define(
    `<table><tbody>
       @for (r of rows(); track r.id) {
         <tr><td>{{ r.id }}</td><td>{{ r.n }}</td></tr>
       }
     </tbody></table>`, () => ({ rows })));
  const tbody = root.querySelector('tbody');
  assert.equal([...tbody.childNodes].filter(n => n.nodeType === 3).length, 0);
  assert.equal(tbody.querySelectorAll('tr').length, 2);
  rows.set([{ id: 2, n: 'b' }]); await tick();
  assert.equal(tbody.querySelectorAll('tr').length, 1);
});

test('@for: replacing every key (nothing survives) and clearing works repeatedly', async () => {
  const items = signal([{ id: 1 }, { id: 2 }]);
  const { $$ } = mountIn(mount, define(`<ul>@for (it of items(); track it.id) {<li>{{ it.id }}</li>}</ul>`, () => ({ items })));
  items.set([{ id: 10 }, { id: 11 }, { id: 12 }]); await tick();
  assert.deepEqual(lis($$), ['10', '11', '12']);
  items.set([]); await tick();
  assert.deepEqual(lis($$), []);
  items.set([{ id: 1 }]); await tick();
  assert.deepEqual(lis($$), ['1']);
});

test('@for with siblings around it only touches its own region', async () => {
  const items = signal([1, 2]);
  const { root } = mountIn(mount, define(`<p>before</p>@for (x of items(); track x) {<i>{{ x }}</i>}<p>after</p>`, () => ({ items })));
  items.set([3]); await tick();
  assert.equal(root.querySelector('app-root, x-app').textContent.replace(/\s+/g, ''), 'before3after');
  items.set([]); await tick();
  assert.equal(root.querySelector('x-app').textContent.replace(/\s+/g, ''), 'beforeafter');
});

/* ---- @if ---- */

test('@if / @else if / @else choose exactly one branch and clean up the others', async () => {
  const n = signal(0);
  const { $$ } = mountIn(mount, define(
    `@if (n() > 5) {<b>big</b>} @else if (n() > 0) {<i>small</i>} @else {<u>zero</u>}`, () => ({ n })));
  const tags = () => $$('b,i,u').map(e => e.tagName.toLowerCase()).join();
  assert.equal(tags(), 'u');
  n.set(3); await tick(); assert.equal(tags(), 'i');
  n.set(9); await tick(); assert.equal(tags(), 'b');
  n.set(0); await tick(); assert.equal(tags(), 'u');
});

test('@if without else renders nothing when false and re-creates the branch when true again', async () => {
  const show = signal(false), count = signal(0);
  const { $$ } = mountIn(mount, define(`@if (show()) {<p class="p">{{ count() }}</p>}`, () => ({ show, count })));
  assert.equal($$('.p').length, 0);
  show.set(true); await tick();
  assert.equal($$('.p')[0].textContent, '0');
  show.set(false); count.set(5); await tick();
  assert.equal($$('.p').length, 0);
  show.set(true); await tick();
  assert.equal($$('.p')[0].textContent, '5', 'fresh branch sees the current state');
});

test('@if nested in @for and @for nested in @if', async () => {
  const items = signal([{ id: 1, show: true }, { id: 2, show: false }]);
  const outer = signal(true);
  const { $$ } = mountIn(mount, define(
    `@if (outer()) {<ul>@for (it of items(); track it.id) {@if (it.show) {<li>{{ it.id }}</li>}}</ul>}`, () => ({ items, outer })));
  assert.deepEqual(lis($$), ['1']);
  items.set([{ id: 1, show: false }, { id: 2, show: true }]); await tick();
  assert.deepEqual(lis($$), ['2']);
  outer.set(false); await tick();
  assert.equal($$('li').length, 0);
  outer.set(true); await tick();
  assert.deepEqual(lis($$), ['2']);
});

test('an @if branch that is torn down stops reacting to its signals', async () => {
  const show = signal(true), n = signal(0);
  let evaluations = 0;
  const C = define(`@if (show()) {<p>{{ read() }}</p>}`, () => ({ show }), { read() { evaluations++; return n(); } });
  mountIn(mount, C);
  const before = evaluations;
  show.set(false); await tick();
  n.set(1); n.set(2); await tick();
  assert.equal(evaluations, before, 'no work for removed views');
});

/* ---- template syntax edge cases ---- */

test('"@" characters that are not control flow stay literal (emails, handles)', async () => {
  const { root } = mountIn(mount, define(`<p>write to dev@forma.com or @maria — not @iffy</p>`, () => ({})));
  assert.match(root.textContent, /dev@forma\.com or @maria — not @iffy/);
});

test('braces and quotes inside conditions are fine; a literal "}" in text is written &#125; (like Angular)', async () => {
  const x = signal(1);
  const { $ } = mountIn(mount, define(
    `@if (x() === 1 && "}" !== "{") {<p id="p">it's {{ x() }} &#125; fine</p>}`, () => ({ x })));
  assert.equal($('#p').textContent, "it's 1 } fine");
});

test('keywords only count as blocks when they are whole words (@format, @iffy, @forEach stay text)', async () => {
  const { root } = mountIn(mount, define(`<p>@format @iffy @forEach @elsewhere @emptyish</p>`, () => ({})));
  assert.equal(root.textContent.trim(), '@format @iffy @forEach @elsewhere @emptyish');
});

test('whitespace: spaces between inline siblings are kept, indentation inside tables is dropped', async () => {
  const { root } = mountIn(mount, define(
    `<p><b>a</b>
       <i>b</i></p>
     <table><tr>
       <td>x</td>
       <td>y</td>
     </tr></table>`, () => ({})));
  assert.equal(root.querySelector('p').textContent, 'a b');
  assert.equal([...root.querySelector('tr').childNodes].filter(n => n.nodeType === 3).length, 0);
});

test('control-flow syntax errors are reported clearly', () => {
  assert.throws(() => mountIn(mount, define(`@if (x {<p></p>}`, () => ({}))), /Unclosed/);
  assert.throws(() => mountIn(mount, define(`@for (broken) {<p></p>}`, () => ({}))), /Invalid @for/);
});

/* ---- regression: scope variables replaced in place must reach nested views ---- */

test('nested @for reads an outer loop variable that changes under the same key', async () => {
  const rows = signal([{ id: 1, cells: ['x', 'y'], label: 'one' }]);
  const { $$ } = mountIn(mount, define(
    `<ul>@for (r of rows(); track r.id) {<li>@for (c of r.cells; track c) {<b>{{ r.label }}:{{ c }}</b>}</li>}</ul>`, () => ({ rows })));
  const text = () => $$('b').map(b => b.textContent).join();
  assert.equal(text(), 'one:x,one:y');
  rows.set([{ id: 1, cells: ['x', 'y'], label: 'uno' }]); await tick();
  assert.equal(text(), 'uno:x,uno:y');
});

test('@if inside a @for row follows the row item when it changes in place', async () => {
  const rows = signal([{ id: 1, on: false, t: 'a' }]);
  const { $$ } = mountIn(mount, define(
    `<ul>@for (r of rows(); track r.id) {<li>@if (r.on) {<b>{{ r.t }}</b>} @else {<i>{{ r.t }}</i>}</li>}</ul>`, () => ({ rows })));
  assert.deepEqual($$('li').map(l => l.innerHTML.replace(/<!--.*?-->/g, '')), ['<i>a</i>']);
  rows.set([{ id: 1, on: true, t: 'b' }]); await tick();
  assert.deepEqual($$('b').map(e => e.textContent), ['b']);
  rows.set([{ id: 1, on: true, t: 'c' }]); await tick();
  assert.deepEqual($$('b').map(e => e.textContent), ['c'], 'the open branch refreshes too');
});

test('content projected inside a @for row follows the row item', async () => {
  class Box {}
  component(Box, { selector: 'x-box', template: '<section><ng-content></ng-content></section>' });
  const rows = signal([{ id: 1, t: 'a' }]);
  class App { rows = rows; }
  component(App, { selector: 'x-app', imports: [Box], template: '@for (r of rows(); track r.id) {<x-box><em>{{ r.t }}</em></x-box>}' });
  const { $$ } = mountIn(mount, App);
  assert.equal($$('em')[0].textContent, 'a');
  rows.set([{ id: 1, t: 'z' }]); await tick();
  assert.equal($$('em')[0].textContent, 'z');
});

test('$index in a nested view updates when rows are reordered', async () => {
  const items = signal(['a', 'b', 'c']);
  const { $$ } = mountIn(mount, define(
    `@for (x of items(); track x) {<p>@if (true) {<i>{{ $index }}{{ x }}</i>}</p>}`, () => ({ items })));
  items.set(['c', 'a', 'b']); await tick();
  assert.deepEqual($$('i').map(i => i.textContent), ['0c', '1a', '2b']);
});
