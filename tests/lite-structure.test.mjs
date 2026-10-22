import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, document, mountIn, tick, captureErrors } from './setup.mjs';

const lite = await import('../src/lite/index.js');
await import('../src/lite/portal.js');
await import('../src/lite/defer.js');
const { viewChild } = await import('../src/lite/refs.js');
const { signal, component, mount, inject, provide, input, output } = lite;

let n = 0;
function define(template, init = () => ({}), meta = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  component(C, { selector: `x-s${++n}`, template, ...meta });
  return C;
}

/* ---- named slots ---- */

test('named slots: slot="name" goes to <ng-content select="name">, the rest to the default', () => {
  const Card = define('<header><ng-content select="title"></ng-content></header><main><ng-content></ng-content></main><footer><ng-content select="foot"></ng-content></footer>');
  const App = define(
    '<x-card><h1 slot="title">T {{ n }}</h1>body {{ n }}<em slot="foot">F</em></x-card>',
    () => ({ n: 1 }),
    { imports: [Card] }
  );
  Card.$meta.selector = 'x-card';
  const { root } = mountIn(mount, App);
  assert.equal(root.querySelector('header h1').textContent, 'T 1');
  assert.match(root.querySelector('main').textContent, /body 1/);
  assert.equal(root.querySelector('footer em').textContent, 'F');
  assert.equal(root.querySelector('h1').hasAttribute('slot'), false, 'the slot attribute is consumed');
});

test('named slots stay reactive and are destroyed with the component', async () => {
  const Box = define('<ng-content select="a"></ng-content>|<ng-content></ng-content>');
  Box.$meta.selector = 'x-box';
  const show = signal(true), text = signal('x');
  const App = define('@if (show()) {<x-box><b slot="a">{{ text() }}</b>d{{ text() }}</x-box>}', () => ({ show, text }), { imports: [Box] });
  const { root } = mountIn(mount, App);
  assert.equal(root.textContent.replace(/\s/g, ''), 'x|dx');
  text.set('y');
  await tick();
  assert.equal(root.textContent.replace(/\s/g, ''), 'y|dy');
  show.set(false);
  await tick();
  assert.equal(root.textContent.trim(), '');
  text.set('z'); // must not throw nor render: the slot views were destroyed
  await tick();
  assert.equal(root.textContent.trim(), '');
});

test('an unfilled slot renders nothing', () => {
  const Box = define('[<ng-content select="a"></ng-content>]');
  Box.$meta.selector = 'x-box2';
  const App = define('<x-box2></x-box2>', () => ({}), { imports: [Box] });
  assert.equal(mountIn(mount, App).root.textContent, '[]');
});

/* ---- portals ---- */

test('ng-portal renders into another element, stays reactive and cleans up', async () => {
  const target = document.createElement('div');
  target.id = 'modals';
  document.body.append(target);
  const open = signal(true), msg = signal('hi');
  const App = define('<p id="here">here</p>@if (open()) {<ng-portal to="#modals"><dialog id="d">{{ msg() }}</dialog></ng-portal>}', () => ({ open, msg }));
  const { root } = mountIn(mount, App);
  assert.equal(target.querySelector('dialog').textContent, 'hi');
  assert.equal(root.querySelector('dialog'), null, 'not rendered in place');
  msg.set('yo');
  await tick();
  assert.equal(target.querySelector('dialog').textContent, 'yo');
  open.set(false);
  await tick();
  assert.equal(target.querySelector('dialog'), null, 'removed with its block');
  target.remove();
});

test('ng-portal defaults to <body> and events keep working', async () => {
  const hits = signal(0);
  const App = define('<ng-portal><button id="pb" (click)="hits.set(hits() + 1)">go</button></ng-portal>', () => ({ hits }));
  const { app } = mountIn(mount, App);
  const btn = document.body.querySelector('#pb') || document.querySelector('[id="pb"]');
  assert.ok(btn && btn.parentNode === document.body);
  btn.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  assert.equal(hits(), 1);
  app.destroy();
  assert.equal(document.querySelector('[id="pb"]'), null);
});

/* ---- template references / viewChild ---- */

test('viewChild gives the element of a #reference and resets when it leaves the DOM', async () => {
  const show = signal(true);
  class App {
    constructor() { this.box = viewChild('box'); this.show = show; }
  }
  component(App, { selector: 'x-refs', template: '@if (show()) {<input #box value="v">}' });
  const { root, app } = mountIn(mount, App);
  let inst;
  const probe = define('<input #box value="q">', () => (inst = { box: viewChild('box') }));
  mountIn(mount, probe);
  assert.equal(inst.box().value, 'q');
  assert.equal(root.querySelector('input').value, 'v');
  show.set(false);
  await tick();
  assert.equal(root.querySelector('input'), null);
  app.destroy();
});

test('viewChild on a component tag returns the component instance', () => {
  const Child = define('<i>c</i>', () => ({ hello: () => 'hi' }));
  Child.$meta.selector = 'x-kid';
  let parent;
  const App = define('<x-kid #kid></x-kid>', () => (parent = { kid: viewChild('kid') }), { imports: [Child] });
  mountIn(mount, App);
  assert.equal(parent.kid().hello(), 'hi');
});

/* ---- @defer ---- */

test('@defer on timer shows the placeholder first, then the block', async () => {
  const App = define('@defer (on timer(10ms)) {<p id="late">late</p>} @placeholder {<p id="soon">soon</p>}');
  const { $ } = mountIn(mount, App);
  assert.equal($('#soon').textContent, 'soon');
  assert.equal($('#late'), null);
  await new Promise(r => setTimeout(r, 40));
  assert.equal($('#late').textContent, 'late');
  assert.equal($('#soon'), null);
});

test('@defer (when cond) renders once the condition is true and never goes back', async () => {
  const ready = signal(false);
  const App = define('@defer (when ready()) {<p id="x">ok</p>} @placeholder {<p id="ph">wait</p>}', () => ({ ready }));
  const { $ } = mountIn(mount, App);
  assert.ok($('#ph'));
  ready.set(true);
  await tick();
  assert.ok($('#x'));
  ready.set(false);
  await tick();
  assert.ok($('#x'), 'stays rendered');
});

test('@defer on idle / immediate fire on their own; on interaction waits for the placeholder', async () => {
  const idle = mountIn(mount, define('@defer (on idle) {<p id="i">i</p>}'));
  const imm = mountIn(mount, define('@defer (on immediate) {<p id="m">m</p>}'));
  const click = mountIn(mount, define('@defer (on interaction) {<p id="c">c</p>} @placeholder {<button id="b">load</button>}'));
  await new Promise(r => setTimeout(r, 30));
  assert.ok(idle.$('#i') && imm.$('#m'));
  assert.equal(click.$('#c'), null);
  click.$('#b').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  await tick();
  assert.ok(click.$('#c'));
  assert.equal(click.$('#b'), null);
});

test('@defer on viewport/hover use the placeholder element; without one they render at once with a warning', async () => {
  const hover = mountIn(mount, define('@defer (on hover) {<p id="h">h</p>} @placeholder {<span id="s">…</span>}'));
  hover.$('#s').dispatchEvent(new window.MouseEvent('mouseenter'));
  await tick();
  assert.ok(hover.$('#h'));
  const warned = [];
  const orig = console.warn;
  console.warn = (...a) => warned.push(a.join(' '));
  try {
    const bare = mountIn(mount, define('@defer (on viewport) {<p id="v">v</p>}'));
    assert.ok(bare.$('#v'));
  } finally { console.warn = orig; }
  assert.match(warned.join(), /needs an element in @placeholder/);
  // viewport with an element: no IntersectionObserver in jsdom -> renders at once
  const vp = mountIn(mount, define('@defer (on viewport) {<p id="v2">v</p>} @placeholder {<i id="pi">.</i>}'));
  assert.ok(vp.$('#v2'));
});

test('@defer is destroyed with its parent before firing (no late render)', async () => {
  const App = define('@defer (on timer(20ms)) {<p id="z">z</p>}');
  const { root, app } = mountIn(mount, App);
  app.destroy();
  await new Promise(r => setTimeout(r, 50));
  assert.equal(root.querySelector('[id="z"]'), null);
});

test('@defer rejects unknown triggers at compile time', () => {
  assert.throws(() => mountIn(mount, define('@defer (on never) {<p>x</p>}')), /Unknown @defer trigger/);
  assert.throws(() => mountIn(mount, define('@defer (soon) {<p>x</p>}')), /Invalid @defer trigger/);
});

/* ---- error boundaries ---- */

test('ngOnError catches binding errors of the component and of projected content', async () => {
  const seen = [];
  class Boundary {
    constructor() { this.failed = signal(false); }
    ngOnError(e, where) { seen.push([e.message, where]); this.failed.set(true); }
  }
  component(Boundary, { selector: 'x-boundary', template: '@if (failed()) {<p id="fallback">oops</p>} @else {<ng-content></ng-content>}' });
  const App = define('<x-boundary><p id="child">{{ boom() }}</p></x-boundary>', () => ({
    boom() { throw new Error('bad'); }
  }), { imports: [Boundary] });
  const errors = await captureErrors(async () => {
    const { $ } = mountIn(mount, App);
    await tick();
    assert.ok($('#fallback'), 'fallback rendered');
    assert.equal($('#child'), null);
  });
  assert.deepEqual(seen, [['bad', 'template expression']]);
  assert.deepEqual(errors, [], 'handled errors are not logged');
});

test('without ngOnError errors are logged; the nearest ancestor with ngOnError wins; a failing handler is logged', async () => {
  const App = define('<p id="p">{{ boom() }}</p><button id="b" (click)="boom()">x</button>', () => ({ boom() { throw new Error('plain'); } }));
  const errors = await captureErrors(async () => {
    const { $ } = mountIn(mount, App);
    $('#b').dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
  });
  assert.equal(errors.length, 2);

  const handled = [];
  const Outer = define('<x-inner2></x-inner2>', () => ({ ngOnError: e => handled.push(e.message) }));
  const Inner = define('<p>{{ boom() }}</p>', () => ({ boom() { throw new Error('deep'); } }));
  Inner.$meta.selector = 'x-inner2';
  Outer.$meta.imports = [Inner];
  mountIn(mount, Outer);
  assert.deepEqual(handled, ['deep'], 'bubbles to the parent component');

  const Bad = define('<p>{{ boom() }}</p>', () => ({ boom() { throw new Error('x'); }, ngOnError() { throw new Error('handler broke'); } }));
  const logged = await captureErrors(async () => { mountIn(mount, Bad); });
  assert.match(logged.join(), /ngOnError.*handler broke/s);
});

/* ---- scoped dependency injection ---- */

test('providers scope a service to a component and its descendants', () => {
  class Counter { constructor() { this.id = ++Counter.count; } }
  Counter.count = 0;
  const seen = [];
  const Leaf = define('<i></i>', function () { seen.push(inject(Counter).id); return {}; });
  Leaf.$meta.selector = 'x-leaf';
  const Scope = define('<x-leaf></x-leaf><x-leaf></x-leaf>', function () { seen.push(inject(Counter).id); return {}; }, { providers: [Counter], imports: [Leaf] });
  Scope.$meta.selector = 'x-scope';
  const App = define('<x-scope></x-scope><x-scope></x-scope><x-leaf></x-leaf>', () => ({}), { imports: [Scope, Leaf] });
  mountIn(mount, App);
  // two scopes -> two private instances (1 and 2), each shared by its leaves; the outside leaf gets the shared singleton (3)
  assert.deepEqual(seen, [1, 1, 1, 2, 2, 2, 3]);
});

test('providers accept useValue, useFactory and useClass; provide() still overrides the shared instance', () => {
  class Api { who() { return 'real'; } }
  class Fake extends Api { who() { return 'fake'; } }
  const TOKEN = class Token {};
  let got;
  const App = define('<i></i>', function () {
    got = [inject(Api).who(), inject(TOKEN), inject(Fake).who()];
    return {};
  }, { providers: [{ provide: Api, useClass: Fake }, { provide: TOKEN, useValue: 42 }, { provide: Fake, useFactory: () => ({ who: () => 'factory' }) }] });
  mountIn(mount, App);
  assert.deepEqual(got, ['fake', 42, 'factory']);

  class Shared { }
  const mock = { m: 1 };
  provide(Shared, mock);
  assert.equal(inject(Shared), mock);
});

test('a provider can inject other providers of the same component', () => {
  class A { constructor() { this.v = 'a'; } }
  class B { constructor() { this.a = inject(A); } }
  let b;
  mountIn(mount, define('<i></i>', () => { b = inject(B); return {}; }, { providers: [A, B] }));
  assert.equal(b.a.v, 'a');
});

/* ---- router: nested routes, guards, lazy, redirect ---- */

const { provideRouter, router } = lite;
async function go(hash) {
  window.location.hash = hash;
  await new Promise(r => setTimeout(r, 25));
}

test('router: nested routes render nested outlets and keep the parent alive', async () => {
  let parentBuilds = 0;
  class Shell { constructor() { parentBuilds++; } }
  component(Shell, { selector: 'x-shell', template: '<nav>shell</nav><router-outlet></router-outlet>' });
  class Index {} component(Index, { selector: 'x-index', template: '<h2>index</h2>' });
  class Detail {} component(Detail, { selector: 'x-detail', template: '<h2>detail {{ id() }}</h2>' });
  Detail.prototype.id = () => router.params().id;
  class Nope {} component(Nope, { selector: 'x-nope', template: '<h2>nope</h2>' });
  provideRouter([
    { path: 'admin', component: Shell, children: [{ path: '', component: Index }, { path: 'users/:id', component: Detail }] },
    { path: '**', component: Nope }
  ]);
  await go('#/admin');
  class App {} component(App, { selector: 'x-nestapp', template: '<router-outlet></router-outlet>' });
  const { root } = mountIn(mount, App);
  const h2 = () => root.querySelector('h2')?.textContent;
  assert.equal(root.querySelector('nav').textContent, 'shell');
  assert.equal(h2(), 'index');
  await go('#/admin/users/9');
  assert.equal(h2(), 'detail 9');
  await go('#/admin/users/10');
  assert.equal(h2(), 'detail 10');
  assert.equal(parentBuilds, 1, 'the parent route component was not rebuilt');
  assert.equal(root.querySelectorAll('nav').length, 1);
  await go('#/admin/unknown/x');
  assert.equal(h2(), 'nope');
  assert.equal(root.querySelector('nav'), null);
});

test('router: guards allow, block (restoring the address) and redirect; async guards work', async () => {
  class Home {} component(Home, { selector: 'x-h', template: '<h1>home</h1>' });
  class Secret {} component(Secret, { selector: 'x-sec', template: '<h1>secret</h1>' });
  class Login {} component(Login, { selector: 'x-login', template: '<h1>login</h1>' });
  let allowed = false;
  const calls = [];
  provideRouter([
    { path: '/', component: Home },
    { path: 'login', component: Login },
    { path: 'secret', component: Secret, canActivate: [async ({ path, params, route }) => { calls.push([path, route.path]); return allowed; }] },
    { path: 'vip', component: Secret, canActivate: [() => '/login'] }
  ]);
  class App {} component(App, { selector: 'x-gapp', template: '<router-outlet></router-outlet>' });
  await go('#/');
  const { root } = mountIn(mount, App);
  const h1 = () => root.querySelector('h1')?.textContent;
  assert.equal(h1(), 'home');
  await go('#/secret');
  assert.equal(h1(), 'home', 'blocked');
  assert.equal(window.location.hash, '#/', 'address restored');
  allowed = true;
  await go('#/secret');
  assert.equal(h1(), 'secret');
  assert.deepEqual(calls[0], ['/secret', 'secret']);
  await go('#/vip');
  assert.equal(h1(), 'login', 'redirected');
  assert.equal(window.location.hash, '#/login');
});

test('router: a newer navigation cancels a slow guard', async () => {
  class A1 {} component(A1, { selector: 'x-a1', template: '<h1>a</h1>' });
  class B1 {} component(B1, { selector: 'x-b1', template: '<h1>b</h1>' });
  provideRouter([
    { path: 'slow', component: A1, canActivate: [() => new Promise(r => setTimeout(() => r(true), 40))] },
    { path: 'fast', component: B1 }
  ]);
  class App {} component(App, { selector: 'x-capp', template: '<router-outlet></router-outlet>' });
  await go('#/fast');
  const { root } = mountIn(mount, App);
  window.location.hash = '#/slow';
  await new Promise(r => setTimeout(r, 10));
  await go('#/fast');
  await new Promise(r => setTimeout(r, 60));
  assert.equal(root.querySelector('h1').textContent, 'b', 'the slow navigation did not win');
});

test('router: load() splits code (default export or the module itself), redirectTo and failed loads', async () => {
  class Lazy {} component(Lazy, { selector: 'x-lazy', template: '<h1>lazy</h1>' });
  class Plain {} component(Plain, { selector: 'x-plain', template: '<h1>plain</h1>' });
  class Home {} component(Home, { selector: 'x-h2', template: '<h1>home</h1>' });
  let loads = 0;
  provideRouter([
    { path: '/', component: Home },
    { path: 'lazy', load: async () => { loads++; return { default: Lazy }; } },
    { path: 'plain', load: async () => Plain },
    { path: 'broken', load: async () => { throw new Error('offline'); } },
    { path: 'old', redirectTo: '/lazy' }
  ]);
  class App {} component(App, { selector: 'x-lapp', template: '<router-outlet></router-outlet>' });
  await go('#/');
  const { root } = mountIn(mount, App);
  const h1 = () => root.querySelector('h1')?.textContent;
  await go('#/lazy');
  assert.equal(h1(), 'lazy');
  await go('#/');
  await go('#/lazy');
  assert.equal(loads, 1, 'loaded once');
  await go('#/plain');
  assert.equal(h1(), 'plain');
  const errors = await captureErrors(async () => { await go('#/broken'); });
  assert.match(errors.join(), /failed to load/);
  assert.equal(h1(), 'plain', 'stays on the previous page');
  await go('#/old');
  assert.equal(h1(), 'lazy');
  assert.equal(window.location.hash, '#/lazy');
});
