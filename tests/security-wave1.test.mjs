import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mountIn, tick, captureErrors } from './setup.mjs';

const angelite = await import('../src/index.js');
await import('../src/portal.js');
await import('../src/defer.js');
const { component, mount, signal, trustHtml } = angelite;

let n = 0;
const define = (template, init = () => ({}), meta = {}) => {
  class C { constructor() { Object.assign(this, init()); } }
  component(C, { selector: `x-sec${++n}`, template, ...meta });
  return C;
};
const quiet = async fn => {
  const orig = console.warn;
  console.warn = () => {};
  try { return await fn(); } finally { console.warn = orig; }
};

test('the new template features go through the same sanitizing as everything else', async () => {
  const evil = 'javascript:alert(1)';
  const Box = define('<ng-content select="a"></ng-content><ng-content></ng-content>');
  Box.$meta.selector = 'x-secbox';
  const App = define(`
    <x-secbox><a slot="a" id="slot" [href]="evil">s</a><a id="def" [href]="evil">d</a></x-secbox>
    <ng-portal><a id="portal" [href]="evil">p</a><div id="html" [innerHTML]="evil"></div></ng-portal>
    @defer (on immediate) {<a id="deferred" [href]="evil">x</a>}`,
  () => ({ evil }), { imports: [Box] });
  await quiet(async () => {
    const { root } = mountIn(mount, App);
    await new Promise(r => setTimeout(r, 20));
    const find = id => root.querySelector(`[id="${id}"]`) || document.querySelector(`[id="${id}"]`);
    for (const id of ['slot', 'def', 'portal', 'deferred']) assert.equal(find(id).getAttribute('href'), `unsafe:${evil}`, id);
    assert.equal(find('html').textContent, evil, 'innerHTML without trustHtml is text');
  });
});

test('compile-time refusals apply inside slots, portals, @defer and component tags', () => {
  const Box = define('<ng-content></ng-content>');
  Box.$meta.selector = 'x-secbox2';
  for (const template of [
    '<x-secbox2><b [onclick]="x">a</b></x-secbox2>',
    '<ng-portal><iframe [srcdoc]="x"></iframe></ng-portal>',
    '@defer (on idle) {<b [attr.onload]="x"></b>}',
    '<ng-portal><script>{{ x }}</script></ng-portal>'
  ]) {
    assert.throws(() => mountIn(mount, define(template, () => ({ x: 1 }), { imports: [Box] })), /not allowed/, template);
  }
});

test('expressions cannot reach the internals the new features add (contexts, injector, router state)', async () => {
  const seen = [];
  const App = define('{{ probe($el) }}', () => ({ probe(el) { seen.push(Object.getOwnPropertySymbols(el).length); return ''; } }));
  mountIn(mount, App);
  const attempts = [
    '$el.$ctx', '$el.ctx', '$el.constructor', '$el.ownerDocument', 'ctx', 'slots', 'made', 'prov', 'ops'
  ];
  await captureErrors(async () => {
    const out = mountIn(mount, define(`<p id="p">${attempts.map(a => `{{ ${a} }}`).join('|')}</p>`));
    assert.equal(out.text('#p'), attempts.map(() => '').join('|'));
  });
  assert.ok(seen.length >= 1);
});

test('ngOnError does not turn a handled error into a way out of the sandbox', async () => {
  const caught = [];
  class Guard { ngOnError(e) { caught.push(e); } }
  component(Guard, { selector: 'x-secguard', template: '<ng-content></ng-content>' });
  const App = define('<x-secguard><p id="p">{{ $el.ownerDocument.body }}</p></x-secguard>', () => ({}), { imports: [Guard] });
  const { text } = mountIn(mount, App);
  assert.equal(text('#p'), '', 'the sandbox returns undefined; nothing to catch');
  assert.deepEqual(caught, []);
  void tick; void signal; void trustHtml;
});
