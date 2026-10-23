import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { window, document } from './setup.mjs';

const full = await import('../src/lite/full.js');
const { compileTemplate } = await import('../tools/aot.mjs');
const { signal, computed, component, mount, input, output } = full;

const tick = () => new Promise(r => setTimeout(r, 0));
let n = 0;
const dir = mkdtempSync(join(tmpdir(), 'angelite-aot-'));

async function aotOf(source, components = []) {
  const file = join(dir, `t${n++}.mjs`);
  writeFileSync(file, compileTemplate(source, { components }));
  return (await import(pathToFileURL(file).href)).default;
}

const TEMPLATE = `
  <h1 [class.big]="n() > 1" [attr.data-n]="n()">Total: {{ n() }} · {{ label | uppercase }}</h1>
  <button id="inc" (click)="inc(); log.set('inc ' + n())">+</button>
  <input id="name" [(ngModel)]="name">
  <p id="greet">{{ name() ? 'Hola ' + name() : 'sin nombre' }} {{ fmt(n(), 2) }}</p>
  @if (n() > 2) {<b id="many">many</b>} @else if (n() === 1) {<i id="one">one</i>} @else {<u id="none">none</u>}
  <ul>
    @for (it of items(); track it.id) {<li>{{ $index }}:{{ it.t }}{{ $last ? '!' : '' }}</li>} @empty {<li>empty</li>}
  </ul>
  <x-card [title]="'Card ' + n()" (picked)="log.set('picked ' + $event)">inside {{ n() }}</x-card>
  <span id="log">{{ log() }}</span>`;

function makeApp() {
  class Card {
    title = input('');
    picked = output();
    pick() { this.picked.emit('card'); }
  }
  class App {
    n = signal(0);
    name = signal('');
    label = 'lite';
    log = signal('');
    items = signal([{ id: 1, t: 'a' }, { id: 2, t: 'b' }]);
    inc() { this.n.update(v => v + 1); }
    fmt(a, b) { return a * b; }
  }
  return { Card, App };
}

function mountApp(meta, cardMeta) {
  const { Card, App } = makeApp();
  component(Card, { selector: 'x-card', template: `<div class="card"><b>{{ title() }}</b><ng-content></ng-content><button id="pick" (click)="pick()">p</button></div>`, ...cardMeta });
  component(App, { imports: [Card], ...meta });
  const root = document.createElement('div');
  document.body.append(root);
  const app = mount(App, root);
  return { root, app, $: s => root.querySelector(s.replace(/#(\w+)/g, '[id="$1"]')) };
}

test('precompiled (runtime-only) templates behave exactly like in-browser compiled ones', async () => {
  const aot = await aotOf(TEMPLATE, ['x-card']);
  const jit = mountApp({ template: TEMPLATE });
  const pre = mountApp({ aot });
  const same = (msg) => assert.equal(pre.root.innerHTML, jit.root.innerHTML, msg);

  same('initial render');
  for (const env of [jit, pre]) {
    env.$('#inc').click(); env.$('#inc').click(); env.$('#inc').click();
    env.$('#name').value = 'Ana';
    env.$('#name').dispatchEvent(new window.Event('input', { bubbles: true }));
  }
  await tick();
  same('after clicks and typing');
  assert.match(pre.$('#greet').textContent, /Hola Ana 6/);
  assert.ok(pre.$('#many'));
  for (const env of [jit, pre]) env.$('#pick').click();
  await tick();
  same('after output event');
  assert.equal(pre.$('#log').textContent, 'picked card');
  pre.app.destroy(); jit.app.destroy();
});

test('precompiled output contains no parser: it only needs the runtime kit', async () => {
  const src = compileTemplate('<p>{{ a.b }}</p>');
  assert.doesNotMatch(src, /import /);
  assert.match(src, /A\.interp/);
});
