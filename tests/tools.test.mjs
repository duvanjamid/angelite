import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { window, document, tick } from './setup.mjs';

const angelite = await import('../src/full.js');
await import('../src/portal.js');
await import('../src/defer.js');
const { viewChild } = await import('../src/refs.js');
const { render, cleanup, fire, flush } = await import('../src/testing.js');
const { compileTemplate, checkTemplate, aotPlugin, discoverMembers } = await import('../tools/aot.mjs');
const { signal, component, mount, inject, input, output } = angelite;

afterEach(cleanup);

let n = 0;
const dir = mkdtempSync(join(tmpdir(), 'angelite-tools-'));
async function aotOf(source, components = []) {
  const file = join(dir, `t${n++}.mjs`);
  writeFileSync(file, compileTemplate(source, { components }));
  return (await import(pathToFileURL(file).href)).default;
}

/* ---- the same features through the ahead-of-time compiler ---- */

test('AOT: named slots, portals, @defer and #refs behave like the in-browser compiler', async () => {
  const Card = class { };
  component(Card, { selector: 'x-acard', template: '<header><ng-content select="title"></ng-content></header><main><ng-content></ng-content></main>' });
  const target = document.body.appendChild(document.createElement('div'));
  target.id = 'aot-modals';
  class App {
    constructor() { this.n = signal(1); this.box = viewChild('box'); }
  }
  component(App, {
    selector: 'x-aotapp',
    imports: [Card],
    aot: await aotOf(`
      <x-acard><h1 slot="title">T{{ n() }}</h1>body{{ n() }}</x-acard>
      <input #box value="v">
      <ng-portal to="#aot-modals"><p id="inportal">{{ n() }}</p></ng-portal>
      @defer (on timer(5ms)) {<p id="late">late</p>} @placeholder {<p id="soon">soon</p>}
    `, ['x-acard'])
  });
  const t = render(App);
  assert.equal(t.$('h1').textContent, 'T1');
  assert.match(t.$('main').textContent, /body1/);
  assert.equal(t.instance.box().value, 'v');
  assert.equal(target.querySelector('p').textContent, '1');
  assert.ok(t.$('#soon'));
  t.instance.n.set(2);
  await new Promise(r => setTimeout(r, 30));
  assert.equal(t.$('h1').textContent, 'T2');
  assert.equal(target.querySelector('p').textContent, '2');
  assert.ok(t.$('#late') && !t.$('#soon'));
  t.unmount();
  assert.equal(target.querySelector('p'), null);
  target.remove();
});

test('a template that needs an optional module you did not import says so (dev warnings)', async () => {
  const { ops } = await import('../src/runtime.js');
  const { enableDevWarnings } = await import('../src/dev.js');
  const saved = { portal: ops.portal, defer: ops.defer };
  delete ops.portal;
  delete ops.defer;
  const warned = [];
  enableDevWarnings(m => warned.push(m));
  try {
    class App {}
    component(App, { selector: 'x-noportal', template: '<ng-portal>x</ng-portal>@defer (on immediate) {<b>d</b>}' });
    render(App);
  } finally { Object.assign(ops, saved); }
  assert.deepEqual(warned.map(m => m.match(/src\/(\w+)\.js/)[1]).sort(), ['defer', 'portal']);
  enableDevWarnings(); // back to console warnings for the following tests
});

/* ---- template checks ---- */

test('checkTemplate reports unknown elements, pipes and members', () => {
  const problems = checkTemplate(`
    <x-known [a]="ok"></x-known><x-typo></x-typo><my-widget></my-widget>
    <p>{{ missing }} {{ ok | uppercase }} {{ ok | nope }} {{ helper(item) }}</p>
    @for (item of list; track item) {<i>{{ item }} {{ $index }}</i>}
  `, { components: ['x-known'], elements: ['my-widget'], members: ['ok', 'list', 'helper'] });
  assert.deepEqual(problems.sort(), [
    '"missing" is not a member of the component',
    'unknown element <x-typo>: add it to "components" (or "elements" if it is a custom element)',
    'unknown pipe "nope"'
  ].sort());
});

test('checkTemplate does not check members unless they are given, and accepts extra pipes', () => {
  assert.deepEqual(checkTemplate('<p>{{ anything | custom }}</p>', { pipes: ['custom'] }), []);
  assert.deepEqual(checkTemplate('<svg><font-face></font-face></svg><p>{{ a }}</p>'), []);
});

test('compileTemplate: check "warn" logs, "error" throws, false is silent', () => {
  const src = '<x-oops></x-oops>';
  const warned = [];
  const orig = console.warn;
  console.warn = (...a) => warned.push(a.join(' '));
  try {
    compileTemplate(src);
    assert.match(warned.join(), /unknown element <x-oops>/);
    warned.length = 0;
    compileTemplate(src, { check: false });
    assert.equal(warned.length, 0);
  } finally { console.warn = orig; }
  assert.throws(() => compileTemplate(src, { check: 'error' }), /unknown element <x-oops>/);
});

test('discoverMembers reads fields, methods and this.x assignments from the class next to the template', () => {
  const file = join(dir, 'widget.ng.html');
  writeFileSync(join(dir, 'widget.js'), `
    export class Widget {
      count = signal(0);
      static defaults = {};
      label = 'x';
      constructor() { this.dynamic = 1; }
      inc() {}
      async load() {}
      get total() { return 1; }
    }`);
  const members = discoverMembers(file);
  for (const name of ['count', 'label', 'inc', 'load', 'total', 'dynamic']) assert.ok(members.includes(name), name);
  assert.deepEqual(discoverMembers(join(dir, 'nothing.ng.html')), []);
});

test('esbuild plugin: warns or fails with the template path; members: "auto"', () => {
  const file = join(dir, 'page.ng.html');
  writeFileSync(file, '<p>{{ title }} {{ missing }}</p><x-ghost></x-ghost>');
  writeFileSync(join(dir, 'page.js'), 'export class Page {\n  title = 1;\n}\n');
  let handler;
  const plugin = (opts) => {
    aotPlugin(opts).setup({ onLoad: (_, fn) => { handler = fn; } });
    return handler({ path: file });
  };
  const warn = plugin({ members: 'auto' });
  assert.ok(warn.contents.includes('export default'));
  assert.deepEqual(warn.warnings.map(w => w.text).sort(), ['"missing" is not a member of the component', 'unknown element <x-ghost>: add it to "components" (or "elements" if it is a custom element)'].sort());
  assert.equal(warn.warnings[0].location.file, file);
  const err = plugin({ members: 'auto', check: 'error' });
  assert.equal(err.errors.length, 2);
  const quiet = plugin({ members: ['title', 'missing'], components: ['x-ghost'] });
  assert.deepEqual(quiet.warnings, []);
  assert.deepEqual(plugin({ check: false, components: ['x-ghost'] }).warnings, []);
});

/* ---- testing helpers ---- */

test('testing: render, props, provide, click, type, flush, unmount and cleanup', async () => {
  class Api { who() { return 'real'; } }
  class Counter {
    constructor() { this.start = input(0); this.count = signal(0); this.name = signal(''); this.on = signal(false); this.api = inject(Api); this.plain = 'p'; }
    ngOnInit() { this.count.set(this.start()); }
    inc() { this.count.update(v => v + 1); }
  }
  component(Counter, {
    selector: 'x-ctr',
    template: '<button (click)="inc()">+</button><output>{{ count() }}</output><input [(ngModel)]="name"><input type="checkbox" [(ngModel)]="on"><u>{{ name() }}{{ on() }}</u><i>{{ api.who() }}{{ plain }}</i>'
  });
  const t = render(Counter, { props: { start: 5, plain: 'q' }, provide: [[Api, { who: () => 'fake' }]] });
  assert.equal(t.text('output'), '0', 'inputs are applied after the first render');
  await t.flush();
  assert.equal(t.instance.plain, 'q', 'non-signal props are assigned too');
  assert.equal(t.$('i').textContent, 'fakep');
  t.click('button');
  await flush();
  assert.equal(t.text('output'), '1');
  t.type('input', 'ada');
  t.type('input[type=checkbox]', true);
  await t.flush();
  assert.equal(t.text('u'), 'adatrue');
  assert.equal(t.$$('button').length, 1);
  assert.ok(t.host.tagName === 'X-CTR');
  assert.throws(() => t.click('.nothing'), /nothing matches/);
  t.fire(t.$('button'), 'keydown', { key: 'a' });
  t.fire(t.$('button'), 'custom');
  assert.equal(fire(t.$('button'), 'pointerdown'), true);
  t.unmount();
  assert.equal(document.querySelector('x-ctr'), null);

  const a = render(Counter), b = render(Counter, { into: document.body.appendChild(document.createElement('section')) });
  assert.equal(document.querySelectorAll('x-ctr').length, 2);
  cleanup();
  assert.equal(document.querySelectorAll('x-ctr').length, 0);
  void a; void b;
});

/* ---- development warnings ---- */

test('dev.js: warns once about unknown inputs, duplicate keys and unknown elements', async () => {
  const { enableDevWarnings } = await import('../src/dev.js');
  enableDevWarnings();
  const warned = [];
  const orig = console.warn;
  console.warn = (...a) => warned.push(a.join(' '));
  try {
    class Kid { constructor() { this.known = input(0); } }
    component(Kid, { selector: 'x-kid2', template: '<i>{{ known() }}</i>' });
    class App { constructor() { this.items = signal(['a', 'a']); } }
    component(App, { selector: 'x-devapp', imports: [Kid], template: '<x-kid2 [known]="1" [unknownthing]="2"></x-kid2><x-stranger></x-stranger>@for (i of items(); track i) {<b>{{ i }}</b>}' });
    render(App);
    render(App);
  } finally { console.warn = orig; }
  const all = warned.join('\n');
  assert.match(all, /has no input "unknownthing"/);
  assert.match(all, /duplicate track key a/);
  assert.match(all, /unknown element <x-stranger>/);
  assert.equal(warned.filter(w => /unknownthing/.test(w)).length, 1, 'repeated warnings are shown once');
  void window; void tick; void mount; void output;
});
