// Security behaviour of AngeLite Lite. Safe behaviours are enforced; known gaps are `todo` (they run, and
// are reported as TODO, but do not fail CI). When a gap is fixed, remove its `todo` flag.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn, tick } from './setup.mjs';

const { signal, component, mount } = await import('../src/lite/index.js');

function app(template, init = () => ({})) {
  class C { constructor() { Object.assign(this, init()); } }
  component(C, { selector: 'x-app', template });
  return mountIn(mount, C);
}
const evil = '<img src=x onerror=alert(1)>';

/* ---- enforced ---- */

test('text interpolation never creates elements', () => {
  const { root } = app('<p>{{ h() }}</p>', () => ({ h: signal(evil) }));
  assert.equal(root.querySelector('img'), null);
  assert.equal(root.querySelector('p').textContent, evil);
});

test('interpolation inside attributes cannot break out of the attribute', () => {
  const { $ } = app(`<a id="a" title="{{ t() }}">x</a>`, () => ({ t: signal('" onmouseover="alert(1)') }));
  assert.equal($('#a').getAttribute('title'), '" onmouseover="alert(1)');
  assert.equal($('#a').hasAttribute('onmouseover'), false);
});

test('prototype and constructor access is blocked in expressions', () => {
  const { text } = app('<p id="p">{{ constructor }}|{{ __proto__ }}|{{ x.constructor }}|{{ x["__proto__"] }}</p>', () => ({ x: {} }));
  assert.equal(text('#p'), '|||');
});

test('no bundle source uses eval or new Function', async () => {
  const { readFileSync, readdirSync } = await import('node:fs');
  const dir = new URL('../src/lite/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\beval\s*\(|new\s+Function\b/, f);
  }
});

/* ---- known gaps (TODO): the assertion is the SAFE behaviour we want ---- */

test('javascript: URLs are neutralised in [href]', { todo: 'sanitize URL attributes (href, src, action, formaction, xlink:href)' }, () => {
  const { $ } = app(`<a id="a" [href]="u()">x</a>`, () => ({ u: signal('javascript:alert(1)') }));
  assert.doesNotMatch($('#a').getAttribute('href') || '', /^javascript:/i);
});

test('javascript: URLs are neutralised in interpolated href', { todo: 'sanitize URL attributes' }, () => {
  const { $ } = app(`<a id="a" href="{{ u() }}">x</a>`, () => ({ u: signal('javascript:alert(1)') }));
  assert.doesNotMatch($('#a').getAttribute('href') || '', /^javascript:/i);
});

test('event-handler attributes cannot be bound as text', { todo: 'reject [attr.on*] and [on*] string bindings' }, () => {
  const { $ } = app(`<div id="d" [attr.onclick]="h()">x</div>`, () => ({ h: signal('alert(1)') }));
  assert.equal($('#d').hasAttribute('onclick'), false);
});

test('[innerHTML] does not render script-capable markup', { todo: 'sanitize HTML or require an explicit trustHtml() wrapper' }, () => {
  const { root } = app(`<div [innerHTML]="h()"></div>`, () => ({ h: signal(evil) }));
  assert.equal(root.querySelector('img[onerror]'), null);
});

test('[srcdoc] is not accepted from data', { todo: 'block srcdoc bindings' }, () => {
  const { $ } = app(`<iframe id="f" [srcdoc]="h()"></iframe>`, () => ({ h: signal('<script>1</script>') }));
  assert.equal($('#f').hasAttribute('srcdoc'), false);
});

test('template expressions cannot reach window/document through $el', { todo: 'deny ownerDocument/defaultView/window/document/globalThis in expressions' }, () => {
  window.__hit = () => 'ran';
  const { text } = app(`<p id="p">{{ $el.ownerDocument.defaultView.__hit() }}</p>`);
  assert.notEqual(text('#p'), 'ran');
});
