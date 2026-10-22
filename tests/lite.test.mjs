import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, document } from './setup.mjs';

const A = await import('../src/lite/index.js');
const { signal, computed, effect, component, mount, input, output } = A;

const tick = () => new Promise(r => setTimeout(r, 0));

function run(Comp) {
  const root = document.createElement('div');
  document.body.append(root);
  const app = mount(Comp, root);
  return { root, app, $: s => root.querySelector(s), $$: s => [...root.querySelectorAll(s)] };
}

test('signals: computed and effect are lazy, batched and glitch-free', async () => {
  const a = signal(1), b = signal(2);
  const sum = computed(() => a() + b());
  const seen = [];
  const stop = effect(() => { seen.push(sum()); });
  a.set(10); b.set(20);
  await tick();
  assert.deepEqual(seen, [3, 30]);
  stop();
  a.set(0);
  await tick();
  assert.deepEqual(seen, [3, 30]);
});

test('text, events and class bindings update surgically', async () => {
  class Counter {
    count = signal(0);
    inc() { this.count.update(n => n + 1); }
  }
  component(Counter, {
    template: `<button (click)="inc()" [class.big]="count() > 1">{{ count() }}</button>`
  });
  const { $ } = run(Counter);
  const btn = $('button');
  assert.equal(btn.textContent, '0');
  btn.click(); btn.click();
  await tick();
  assert.equal(btn.textContent, '2');
  assert.ok(btn.classList.contains('big'));
  assert.equal($('button'), btn, 'element identity is preserved');
});

test('@if / @else if / @else', async () => {
  const n = signal(0);
  class C { n = n; }
  component(C, {
    template: `@if (n() > 1) {<p>big</p>} @else if (n() === 1) {<p>one</p>} @else {<p>none</p>}`
  });
  const { $$ } = run(C);
  const text = () => $$('p').map(p => p.textContent).join();
  assert.equal(text(), 'none');
  n.set(1); await tick();
  assert.equal(text(), 'one');
  n.set(5); await tick();
  assert.equal(text(), 'big');
  n.set(0); await tick();
  assert.equal(text(), 'none');
});

test('@for keeps DOM for tracked items and handles reorder / empty', async () => {
  class C {
    items = signal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    rotate() { this.items.update(l => [...l.slice(1), l[0]]); }
    clear() { this.items.set([]); }
  }
  component(C, {
    template: `<button id="r" (click)="rotate()"></button><button id="c" (click)="clear()"></button>
      <ul>@for (it of items(); track it.id) {<li>{{ $index }}:{{ it.t }}</li>} @empty {<li>empty</li>}</ul>`
  });
  const { $, $$ } = run(C);
  const [first] = $$('li');
  assert.deepEqual($$('li').map(l => l.textContent), ['0:a', '1:b']);
  $('#r').click();
  await tick();
  assert.deepEqual($$('li').map(l => l.textContent), ['0:b', '1:a']);
  assert.equal($$('li')[1], first, 'moved, not re-created');
  $('#c').click();
  await tick();
  assert.deepEqual($$('li').map(l => l.textContent), ['empty']);
});

test('[(ngModel)] two-way binds a signal', async () => {
  class C { name = signal('Ana'); }
  component(C, { template: `<input [(ngModel)]="name"><p>Hi {{ name() | uppercase }}</p>` });
  const { $ } = run(C);
  assert.equal($('input').value, 'Ana');
  $('input').value = 'Bob';
  $('input').dispatchEvent(new window.Event('input'));
  await tick();
  assert.equal($('p').textContent, 'Hi BOB');
});

test('child components: inputs, outputs and content projection', async () => {
  class Card {
    title = input('');
    picked = output();
    pick() { this.picked.emit('clicked'); }
  }
  component(Card, {
    selector: 'x-card',
    template: `<h3>{{ title() }}</h3><div class="slot"><ng-content></ng-content></div><button (click)="pick()">go</button>`
  });
  class App {
    label = signal('One');
    log = signal('');
    onPick(v) { this.log.set(v); }
  }
  component(App, {
    imports: [Card],
    template: `<x-card [title]="label()" (picked)="onPick($event)"><em>{{ label() }}!</em></x-card><span id="log">{{ log() }}</span>`
  });
  const { $ } = run(App);
  assert.equal($('h3').textContent, 'One');
  assert.equal($('.slot em').textContent, 'One!');
  $('button').click();
  await tick();
  assert.equal($('#log').textContent, 'clicked');
});

test('destroy stops effects and lifecycle hooks run', async () => {
  const log = [];
  const s = signal(0);
  class C { ngOnInit() { log.push('init'); } ngOnDestroy() { log.push('destroy'); } s = s; }
  component(C, { template: `<i>{{ s() }}</i>` });
  const { app, root } = run(C);
  const i = root.querySelector('i');
  app.destroy();
  s.set(5);
  await tick();
  assert.deepEqual(log, ['init', 'destroy']);
  assert.equal(i.textContent, '0');
});

test('interpolated values are text, never HTML', async () => {
  class C { v = signal('<img src=x onerror=alert(1)>'); }
  component(C, { template: `<p>{{ v() }}</p>` });
  const { $ } = run(C);
  assert.equal($('img'), null);
  assert.equal($('p').textContent, '<img src=x onerror=alert(1)>');
});

test('projected content survives its container being toggled', async () => {
  class Box { open = input(false); }
  component(Box, { selector: 'x-box', template: `@if (open()) {<div class="b"><ng-content></ng-content></div>}` });
  const open = signal(true);
  class App { open = open; n = signal(1); }
  component(App, { imports: [Box], template: `<x-box [open]="open()"><i>{{ n() }}</i></x-box>` });
  const { $ } = run(App);
  assert.equal($('.b i').textContent, '1');
  open.set(false); await tick();
  assert.equal($('.b'), null);
  open.set(true); await tick();
  assert.equal($('.b i').textContent, '1');
});

test('$el and ngAfterViewInit give access to the rendered host', async () => {
  let seen;
  class C { ngAfterViewInit() { seen = this.$el.querySelector('b').textContent; } }
  component(C, { selector: 'x-c', template: `<b>{{ 1 + 1 }}</b>` });
  const { $ } = run(C);
  assert.equal(seen, '2');
  assert.equal($('x-c').tagName, 'X-C');
});

test('nested @for loops (inner track sees outer item scope)', async () => {
  const data = signal([{ id: 1, kids: ['a', 'b'] }, { id: 2, kids: ['c'] }]);
  class C { data = data; }
  component(C, {
    template: `@for (g of data(); track g.id) {<ul>@for (k of g.kids; track k) {<li>{{ g.id }}{{ k }}{{ $index }}</li>}</ul>}`
  });
  const { $$ } = run(C);
  assert.deepEqual($$('li').map(l => l.textContent), ['1a0', '1b1', '2c0']);
  data.set([{ id: 2, kids: ['c', 'd'] }, { id: 1, kids: ['b'] }]);
  await tick();
  assert.deepEqual($$('li').map(l => l.textContent), ['2c0', '2d1', '1b0']);
});

test('nested blocks: nodes inserted later are moved/removed with their parent view', async () => {
  const all = [{ g: 'A', items: [1, 2, 3] }, { g: 'B', items: [4, 5] }, { g: 'C', items: [6, 7, 8] }];
  const even = signal(false);
  const groups = computed(() => all
    .map(g => ({ g: g.g, items: g.items.filter(i => !even() || i % 2 === 0) }))
    .filter(g => g.items.length));
  const show = signal(true);
  class C { groups = groups; show = show; }
  component(C, {
    template: `@if (show()) {@for (g of groups(); track g.g) {<h2>{{ g.g }}</h2>@for (i of g.items; track i) {<p>{{ i }}</p>}}}`
  });
  const { root } = run(C);
  const dump = () => [...root.querySelectorAll('h2,p')].map(n => n.textContent).join(' ');
  assert.equal(dump(), 'A 1 2 3 B 4 5 C 6 7 8');
  even.set(true); await tick();
  assert.equal(dump(), 'A 2 B 4 C 6 8');
  even.set(false); await tick();
  assert.equal(dump(), 'A 1 2 3 B 4 5 C 6 7 8');
  show.set(false); await tick();
  assert.equal(dump(), '', 'no orphan nodes after the @if closes');
});
