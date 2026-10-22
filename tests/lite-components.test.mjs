import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, document, mountIn, tick, captureErrors } from './setup.mjs';

const lite = await import('../src/lite/index.js');
const { signal, computed, component, Component, mount, input, output, inject, provide } = lite;

function define(template, init = () => ({}), proto = {}, meta = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  Object.assign(C.prototype, proto);
  component(C, { selector: 'x-app', template, ...meta });
  return C;
}

test('component(): requires a template and defaults the selector', () => {
  class Bad {}
  assert.throws(() => component(Bad, {}), /needs a template/);
  class Ok {}
  component(Ok, { template: '<i></i>' });
  assert.equal(Ok.$meta.selector, 'app-root');
});

test('Component(meta) works as a decorator factory', () => {
  class A {}
  const Decorated = Component({ selector: 'x-deco', template: '<b>hi</b>' })(A);
  assert.equal(Decorated, A);
  const { root } = mountIn(mount, A);
  assert.equal(root.querySelector('x-deco b').textContent, 'hi');
});

test('lifecycle order: ngOnInit (inputs ready) -> render -> ngAfterViewInit -> ngOnDestroy', async () => {
  const log = [];
  class Child {
    label = input('');
    ngOnInit() { log.push('child init ' + this.label()); }
    ngAfterViewInit() { log.push('child view ' + this.$el.querySelector('b').textContent); }
    ngOnDestroy() { log.push('child destroy'); }
  }
  component(Child, { selector: 'x-child', template: '<b>{{ label() }}</b>' });
  const show = signal(true);
  class Parent {
    show = show;
    ngOnInit() { log.push('parent init'); }
    ngAfterViewInit() { log.push('parent view'); }
    ngOnDestroy() { log.push('parent destroy'); }
  }
  component(Parent, { selector: 'x-parent', imports: [Child], template: '@if (show()) {<x-child label="L"></x-child>}' });
  const { app } = mountIn(mount, Parent);
  assert.deepEqual(log, ['parent init', 'child init L', 'child view L', 'parent view']);
  show.set(false); await tick();
  assert.deepEqual(log.slice(4), ['child destroy']);
  app.destroy();
  assert.equal(log.at(-1), 'parent destroy');
});

test('inputs: static attributes, bound expressions and interpolation all reach the child signal', async () => {
  class Child { a = input(''); b = input(0); c = input(''); }
  let child;
  component(Child, { selector: 'x-child', template: '<i>{{ a() }}|{{ b() }}|{{ c() }}</i>' });
  const n = signal(1);
  class Parent { n = n; }
  component(Parent, { selector: 'x-parent', imports: [Child], template: '<x-child a="static" [b]="n() * 2" c="v{{ n() }}"></x-child>' });
  void child;
  const { root } = mountIn(mount, Parent);
  const text = () => root.querySelector('i').textContent;
  assert.equal(text(), 'static|2|v1');
  n.set(5); await tick();
  assert.equal(text(), 'static|10|v5');
});

test('inputs are matched case-insensitively (HTML lower-cases attribute names)', async () => {
  class Child { userName = input(''); }
  component(Child, { selector: 'x-child', template: '<i>{{ userName() }}</i>' });
  class Parent {}
  component(Parent, { selector: 'x-parent', imports: [Child], template: '<x-child [userName]="\'Ada\'"></x-child>' });
  const { root } = mountIn(mount, Parent);
  assert.equal(root.querySelector('i').textContent, 'Ada');
});

test('outputs: emit reaches the parent handler with $event; DOM events on the host also work', async () => {
  class Child { done = output(); go() { this.done.emit({ ok: 1 }); } }
  component(Child, { selector: 'x-child', template: '<button id="go" (click)="go()">go</button>' });
  const log = [];
  class Parent { got(v) { log.push(v.ok); } host() { log.push('host'); } }
  component(Parent, { selector: 'x-parent', imports: [Child], template: '<x-child (done)="got($event)" (click)="host()"></x-child>' });
  const { $ } = mountIn(mount, Parent);
  $('#go').click();
  assert.deepEqual(log, [1, 'host']);
});

test('a bound property that is not an input falls back to the host element', async () => {
  class Child {}
  component(Child, { selector: 'x-child', template: '<i>x</i>' });
  class Parent { t = signal('tip'); }
  component(Parent, { selector: 'x-parent', imports: [Child], template: '<x-child [title]="t()" [class.on]="true"></x-child>' });
  const { root } = mountIn(mount, Parent);
  const host = root.querySelector('x-child');
  assert.equal(host.title, 'tip');
  assert.ok(host.classList.contains('on'));
});

test('content projection: parent scope, multiple uses, dynamic nested blocks survive re-parenting', async () => {
  class Box { open = input(true); }
  component(Box, { selector: 'x-box', template: '@if (open()) {<section><ng-content></ng-content></section>}' });
  const open = signal(true), list = signal([1, 2]);
  class Parent { open = open; list = list; }
  component(Parent, { selector: 'x-parent', imports: [Box],
    template: '<x-box [open]="open()"><ul>@for (x of list(); track x) {<li>{{ x }}</li>}</ul></x-box>' });
  const { root } = mountIn(mount, Parent);
  const items = () => [...root.querySelectorAll('li')].map(l => l.textContent).join();
  assert.equal(items(), '1,2');
  open.set(false); await tick();
  assert.equal(items(), '');
  list.set([1, 2, 3]); await tick();
  open.set(true); await tick();
  assert.equal(items(), '1,2,3', 'projected content kept reacting while detached');
});

test('components inside @for rows get their own instance and state', async () => {
  class Counter { n = signal(0); inc() { this.n.update(v => v + 1); } }
  component(Counter, { selector: 'x-counter', template: '<button class="c" (click)="inc()">{{ n() }}</button>' });
  const rows = signal([1, 2, 3]);
  class Parent { rows = rows; }
  component(Parent, { selector: 'x-parent', imports: [Counter], template: '@for (r of rows(); track r) {<x-counter></x-counter>}' });
  const { $$ } = mountIn(mount, Parent);
  $$('.c')[1].click(); $$('.c')[1].click(); $$('.c')[2].click();
  await tick();
  assert.deepEqual($$('.c').map(b => b.textContent), ['0', '2', '1']);
  rows.set([3, 1]); await tick();
  assert.deepEqual($$('.c').map(b => b.textContent), ['1', '0'], 'state follows the key');
});

test('destroy() removes the DOM, stops effects and runs nested ngOnDestroy', async () => {
  const s = signal(0);
  let renders = 0, destroyed = 0;
  class Inner { ngOnDestroy() { destroyed++; } read() { renders++; return s(); } }
  component(Inner, { selector: 'x-inner', template: '<i>{{ read() }}</i>' });
  class Outer {}
  component(Outer, { selector: 'x-outer', imports: [Inner], template: '<x-inner></x-inner>' });
  const { app, root } = mountIn(mount, Outer);
  const before = renders;
  app.destroy();
  s.set(1); await tick();
  assert.equal(renders, before);
  assert.equal(destroyed, 1);
  assert.equal(root.children.length, 0);
});

test('methods are bound: they keep `this` when called from templates', async () => {
  class C { count = signal(0); inc() { this.count.update(v => v + 1); } }
  component(C, { selector: 'x-c', template: '<button id="b" (click)="inc()">{{ count() }}</button>' });
  const { $ } = mountIn(mount, C);
  $('#b').click(); await tick();
  assert.equal($('#b').textContent, '1');
});

test('$el gives the host element and expressions cannot reach prototypes or constructors', async () => {
  class C { ngAfterViewInit() { this.seen = this.$el.tagName; } }
  component(C, { selector: 'x-c', template: '<p id="p">{{ constructor }}|{{ __proto__ }}|{{ seen }}</p>' });
  const { text } = mountIn(mount, C);
  assert.equal(text('#p'), '||');
});

test('inject() returns one shared instance per token; provide() overrides it', async () => {
  class Api { n = 0; }
  const a = inject(Api), b = inject(Api);
  assert.equal(a, b);
  class Fake { n = 42; }
  provide(Api, new Fake());
  assert.equal(inject(Api).n, 42);
});

test('output(): subscribe returns an unsubscribe function', () => {
  const o = output();
  const seen = [];
  const off = o.subscribe(v => seen.push(v));
  o.emit(1); off(); o.emit(2);
  assert.deepEqual(seen, [1]);
});

test('unknown pipes are reported as errors and the rest of the view still renders', async () => {
  const errors = await captureErrors(async () => {
    const { text } = mountIn(mount, define('<p id="a">{{ 1 | nope }}</p><p id="b">fine</p>'));
    await tick();
    assert.equal(text('#b'), 'fine');
  });
  assert.match(errors.join(), /Unknown pipe/);
});

test('a missing component import renders the tag as plain HTML instead of crashing', async () => {
  const { root } = mountIn(mount, define('<x-missing>text</x-missing>'));
  assert.equal(root.querySelector('x-missing').textContent, 'text');
});

test('two apps on one page do not interfere', async () => {
  const a = signal('A'), b = signal('B');
  const one = mountIn(mount, define('<p id="t">{{ v() }}</p>', () => ({ v: a })));
  const two = mountIn(mount, define('<p id="t">{{ v() }}</p>', () => ({ v: b })));
  a.set('A2'); await tick();
  assert.equal(one.text('#t'), 'A2');
  assert.equal(two.text('#t'), 'B');
});

test('the mounted root host makes no layout box (display: contents); child hosts are left alone', () => {
  class Child {}
  component(Child, { selector: 'x-child', template: '<i>x</i>' });
  class Parent {}
  component(Parent, { selector: 'x-parent', imports: [Child], template: '<x-child></x-child>' });
  const { root } = mountIn(mount, Parent);
  assert.equal(root.querySelector('x-parent').style.display, 'contents');
  assert.equal(root.querySelector('x-child').style.display, '');
});
