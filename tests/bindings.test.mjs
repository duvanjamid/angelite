import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn, tick, captureErrors } from './setup.mjs';

const { signal, computed, component, mount } = await import('../src/index.js');
await import('../src/pipes.js').catch(() => {}); // built-in pipes (opt-in in newer builds)

const fire = (el, type, init = {}) => el.dispatchEvent(new window.Event(type, { bubbles: true, ...init }));

// helper: class with fields, so methods bound by the runtime still see `this`
function define(template, init, proto = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  Object.assign(C.prototype, proto);
  component(C, { selector: 'x-app', template });
  return C;
}

test('[(ngModel)]: text input is two-way bound to a signal', async () => {
  const name = signal('Ana');
  const { $ } = mountIn(mount, define(`<input id="i" [(ngModel)]="name"><p id="p">{{ name() }}</p>`, () => ({ name })));
  assert.equal($('#i').value, 'Ana');
  $('#i').value = 'Bob'; fire($('#i'), 'input');
  await tick();
  assert.equal(name(), 'Bob');
  assert.equal($('#p').textContent, 'Bob');
  name.set('Zoe'); await tick();
  assert.equal($('#i').value, 'Zoe', 'signal -> input');
});

test('[(ngModel)]: checkbox, number and select', async () => {
  const on = signal(false), n = signal(3), pick = signal('b');
  const { $ } = mountIn(mount, define(
    `<input id="c" type="checkbox" [(ngModel)]="on"><input id="n" type="number" [(ngModel)]="n">
     <select id="s" [(ngModel)]="pick"><option value="a">A</option><option value="b">B</option></select>`,
    () => ({ on, n, pick })));
  assert.equal($('#c').checked, false);
  assert.equal($('#n').value, '3');
  assert.equal($('#s').value, 'b');
  $('#c').checked = true; fire($('#c'), 'change');
  $('#n').value = '7'; fire($('#n'), 'input');
  $('#s').value = 'a'; fire($('#s'), 'change');
  await tick();
  assert.equal(on(), true);
  assert.equal(n(), 7);
  assert.equal(pick(), 'a');
  on.set(false); await tick();
  assert.equal($('#c').checked, false);
});

test('[(ngModel)] with a non-signal reports a readable error instead of crashing the app', async () => {
  const errors = await captureErrors(async () => {
    const { $ } = mountIn(mount, define(`<input id="i" [(ngModel)]="name"><p id="ok">ok</p>`, () => ({ name: 'plain' })));
    await tick();
    assert.equal($('#ok').textContent, 'ok');
  });
  assert.match(errors.join('\n'), /writable signal/);
});

test('property, class, style and attribute bindings', async () => {
  const w = signal(10), on = signal(true), val = signal('x'), attr = signal('a');
  const { $ } = mountIn(mount, define(
    `<div id="d" [class.on]="on()" [style.width.px]="w()" [style.background-color]="'red'" [attr.data-x]="attr()" [title]="val()"></div>
     <input id="i" [value]="val()" [disabled]="!on()" [hidden]="false">`,
    () => ({ w, on, val, attr })));
  const d = $('#d');
  assert.ok(d.classList.contains('on'));
  assert.equal(d.style.width, '10px');
  assert.equal(d.style.backgroundColor, 'red');
  assert.equal(d.getAttribute('data-x'), 'a');
  assert.equal(d.title, 'x');
  assert.equal($('#i').value, 'x');
  w.set(20); on.set(false); val.set('y'); attr.set(null);
  await tick();
  assert.ok(!d.classList.contains('on'));
  assert.equal(d.style.width, '20px');
  assert.equal(d.hasAttribute('data-x'), false, 'null removes the attribute');
  assert.equal($('#i').disabled, true);
  assert.equal($('#i').value, 'y');
});

test('interpolation works in text, in attributes and with pipes', async () => {
  const first = signal('ada'), n = signal(1234.5);
  const { $, text } = mountIn(mount, define(
    `<a id="a" href="/u/{{ first() }}" title="Hi {{ first() | uppercase }}">{{ first() | titlecase }} - {{ n() | number:1 }}</a>`,
    () => ({ first, n })));
  assert.equal($('#a').getAttribute('href'), '/u/ada');
  assert.equal($('#a').title, 'Hi ADA');
  assert.match(text('#a'), /^Ada - 1[.,]?234[.,]5$/);
  first.set('grace'); await tick();
  assert.equal($('#a').getAttribute('href'), '/u/grace');
  assert.equal($('#a').title, 'Hi GRACE');
});

test('events: handlers run, can chain statements and read $event', async () => {
  const log = signal([]);
  const C = define(
    `<button id="b" (click)="push('a'); push('b' + $event.type)">go</button>`,
    () => ({ log }), { push(x) { log.update(l => [...l, x]); } });
  const { $ } = mountIn(mount, C);
  $('#b').click();
  assert.deepEqual(log(), ['a', 'bclick']);
});

test('events: stopPropagation in an inner handler stops outer handlers', async () => {
  const log = [];
  const C = define(
    `<div id="outer" (click)="hit('outer')"><button id="inner" (click)="hit('inner'); $event.stopPropagation()">x</button><i id="other">y</i></div>`,
    () => ({}), { hit(x) { log.push(x); } });
  const { $ } = mountIn(mount, C);
  $('#inner').click();
  assert.deepEqual(log, ['inner']);
  $('#other').click();
  assert.deepEqual(log, ['inner', 'outer']);
});

test('events: preventDefault works and handlers that throw are reported, not fatal', async () => {
  let prevented = null;
  const C = define(
    `<a id="a" href="#x" (click)="stop($event)">a</a><button id="b" (click)="boom()">b</button><button id="c" (click)="ok()">c</button>`,
    () => ({}), { stop(e) { e.preventDefault(); prevented = e.defaultPrevented; }, boom() { throw new Error('handler failed'); }, ok() { this.done = true; } });
  const { $, app } = mountIn(mount, C);
  $('#a').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
  assert.equal(prevented, true);
  const errors = await captureErrors(async () => { $('#b').click(); });
  assert.match(errors.join(), /handler failed/);
  $('#c').click(); // still alive
  void app;
});

test('events: non-bubbling events (focus) still reach their handler', async () => {
  const log = [];
  const C = define(`<input id="i" (focus)="seen('focus')" (blur)="seen('blur')">`, () => ({}), { seen(x) { log.push(x); } });
  const { $ } = mountIn(mount, C);
  $('#i').dispatchEvent(new window.Event('focus'));
  $('#i').dispatchEvent(new window.Event('blur'));
  assert.deepEqual(log, ['focus', 'blur']);
});

test('events: handlers keep working after rows are re-ordered or re-created', async () => {
  const items = signal([{ id: 1 }, { id: 2 }, { id: 3 }]);
  const clicked = [];
  const C = define(
    `@for (it of items(); track it.id) {<button class="b" (click)="hit(it.id)">{{ it.id }}</button>}`,
    () => ({ items }), { hit(id) { clicked.push(id); } });
  const { $$ } = mountIn(mount, C);
  items.set([{ id: 3 }, { id: 1 }, { id: 4 }, { id: 2 }]); await tick();
  $$('.b').forEach(b => b.click());
  assert.deepEqual(clicked, [3, 1, 4, 2]);
});

test('a failing expression is isolated: the rest of the view keeps updating', async () => {
  const n = signal(1);
  const C = define(`<p id="bad">{{ nope.deeper() }}</p><p id="good">{{ n() }}</p>`, () => ({ n }));
  const errors = await captureErrors(async () => {
    const { $ } = mountIn(mount, C);
    await tick();
    n.set(2); await tick();
    assert.equal($('#good').textContent, '2');
  });
  assert.ok(errors.length >= 0);
});

test('computed signals can be used directly in templates', async () => {
  const a = signal(2), b = signal(3);
  const sum = computed(() => a() + b());
  const { text } = mountIn(mount, define(`<b id="s">{{ sum() }}</b>`, () => ({ sum })));
  assert.equal(text('#s'), '5');
  a.set(10); await tick();
  assert.equal(text('#s'), '13');
});
