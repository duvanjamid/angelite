// Tests the BUILT bundles (run `npm run build` first). Skipped when dist/ is missing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';

const has = f => existsSync(new URL(`../dist/${f}`, import.meta.url));
const read = f => readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');
const skip = !has('angelite-lite.min.js') && 'dist/ not built';

function page() {
  const dom = new JSDOM('<!doctype html><body><div id="app"></div></body>', { runScripts: 'outside-only', pretendToBeVisual: true, url: 'http://localhost/' });
  return dom.window;
}
const tick = w => new Promise(r => w.setTimeout(r, 0));

test('dist/angelite-lite.min.js works as a plain <script>: global AngeLite, signals, pipes, router', { skip }, async () => {
  const w = page();
  w.eval(read('angelite-lite.min.js'));
  const { signal, component, mount, registerPipe, provideRouter, router, inject, computed, effect } = w.AngeLite;
  for (const fn of [signal, component, mount, registerPipe, provideRouter, inject, computed, effect]) assert.equal(typeof fn, 'function');
  assert.ok(router);
  w.eval(`
    class Counter { count = AngeLite.signal(1); inc() { this.count.update(n => n + 1); } }
    AngeLite.component(Counter, { selector: 'x-counter', template: '<button id="b" (click)="inc()">{{ count() }} {{ "hi" | uppercase }}</button>' });
    AngeLite.mount(Counter, document.getElementById('app'));
  `);
  const btn = w.document.getElementById('b');
  assert.equal(btn.textContent, '1 HI');
  btn.click();
  await tick(w);
  assert.equal(btn.textContent, '2 HI');
});

test('dist/angelite-ui.min.js adds the component library on top of the lite bundle', { skip }, async () => {
  const w = page();
  w.eval(read('angelite-lite.min.js'));
  w.eval(read('angelite-ui.min.js'));
  const ui = w.AngeLiteUI;
  assert.equal(ui.all.length, 21);
  assert.ok(w.document.getElementById('angelite-ui-css'));
  w.eval(`
    class A { }
    AngeLite.component(A, { selector: 'x-a', imports: AngeLiteUI.all, template: '<ui-button variant="primary">ok</ui-button><ui-progress [value]="40"></ui-progress>' });
    AngeLite.mount(A, document.getElementById('app'));
  `);
  assert.equal(w.document.querySelector('.ui-btn').dataset.variant, 'primary');
  assert.equal(w.document.querySelector('.ui-progress i').style.width, '40%');
});

test('dist/angelite.esm.js (lite) can be imported as an ES module', { skip: skip || !has('angelite-lite.esm.js') }, async () => {
  const { window } = await import('./setup.mjs');
  const mod = await import(new URL('../dist/angelite-lite.esm.js', import.meta.url).href);
  assert.equal(typeof mod.signal, 'function');
  assert.equal(typeof mod.mount, 'function');
  void window;
});

test('the legacy bundle still loads and defines window.AngeLite', { skip: !has('angelite.min.js') && 'dist/ not built' }, () => {
  const w = page();
  w.eval(read('angelite.min.js'));
  assert.ok(w.AngeLite.Component);
  assert.ok(w.AngeLite.FormControl);
});
