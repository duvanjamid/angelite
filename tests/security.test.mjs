// Security behaviour of AngeLite Lite, for both the in-browser compiler and precompiled templates.
// Every attack here must stay blocked: if one of these fails, a vulnerability was reintroduced.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { window, mountIn, tick } from './setup.mjs';

const lite = await import('../src/lite/index.js');
const { signal, component, mount, trustHtml, trustUrl, sanitizeUrl } = lite;
const { compileTemplate } = await import('../tools/aot.mjs');

function app(template, init = () => ({}), proto = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  Object.assign(C.prototype, proto);
  component(C, { selector: 'x-app', template });
  return mountIn(mount, C);
}

/** Captures console.warn while `fn` runs. */
function warnings(fn) {
  const seen = [];
  const original = console.warn;
  console.warn = (...a) => seen.push(a.map(String).join(' '));
  try { fn(); } finally { console.warn = original; }
  return seen;
}

const evil = '<img src=x onerror=alert(1)>';

/* ---------- text and attribute interpolation ---------- */

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

/* ---------- URLs ---------- */

const UNSAFE_URLS = [
  'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)',
  '\u0001javascript:alert(1)', ' javascript:alert(1)', 'vbscript:msgbox(1)', 'data:text/html;base64,PHNjcmlwdD4=',
  'data:image/svg+xml;base64,PHN2Zz4=', 'file:///etc/passwd', 'blob:https://example.com/x'
];
const SAFE_URLS = [
  'https://example.com/a?b=1#c', 'HTTP://UPPER.EXAMPLE', 'http://localhost:3000', 'mailto:a@b.c', 'tel:+123', 'sms:+123',
  'ftp://files.example.com', '/relative/path', 'relative/path', '#hash', '?q=1', '//cdn.example.com/x', 'page.html?x=a:b'
];

const URL_CONTEXTS = [
  ['[href]', v => `<a id="t" [href]="u()">x</a>`, 'href'],
  ['href="{{ }}"', v => `<a id="t" href="{{ u() }}">x</a>`, 'href'],
  ['[attr.href]', v => `<a id="t" [attr.href]="u()">x</a>`, 'href'],
  ['[src]', v => `<img id="t" [src]="u()">`, 'src'],
  ['[action]', v => `<form id="t" [action]="u()"></form>`, 'action'],
  ['formaction="{{ }}"', v => `<button id="t" formaction="{{ u() }}">x</button>`, 'formaction'],
  ['[attr.xlink:href]', v => `<svg><use id="t" [attr.xlink:href]="u()"></use></svg>`, 'xlink:href']
];

for (const [name, template, attr] of URL_CONTEXTS) {
  test(`URLs in ${name}: unsafe schemes are neutralised, safe ones pass untouched`, () => {
    for (const url of UNSAFE_URLS) {
      const out = [];
      const logged = warnings(() => {
        const { $ } = app(template(), () => ({ u: signal(url) }));
        const el = $('#t');
        out.push(el.getAttribute(attr) ?? el[attr]);
      });
      const value = String(out[0]);
      assert.ok(value.startsWith('unsafe:'), `${JSON.stringify(url)} -> ${value}`);
      assert.match(logged.join(), /unsafe URL/);
    }
    for (const url of SAFE_URLS) {
      const { $ } = app(template(), () => ({ u: signal(url) }));
      const el = $('#t');
      assert.equal(el.getAttribute(attr), url, url);
    }
  });
}

test('URLs keep being checked when the value changes later', async () => {
  const u = signal('https://ok.example');
  const { $ } = app(`<a id="t" [href]="u()">x</a>`, () => ({ u }));
  warnings(() => { u.set('javascript:alert(1)'); });
  await tick();
  assert.equal($('#t').getAttribute('href'), 'unsafe:javascript:alert(1)');
});

test('small inline images are allowed in src, nowhere else', () => {
  const png = 'data:image/png;base64,iVBORw0KGgo=';
  assert.equal(app(`<img id="t" [src]="u()">`, () => ({ u: signal(png) })).$('#t').getAttribute('src'), png);
  assert.ok(app(`<a id="t" [href]="u()">x</a>`, () => ({ u: signal(png) })).$('#t').getAttribute('href').startsWith('unsafe:'));
});

test('trustUrl() is the explicit escape hatch for custom schemes', () => {
  const { $ } = app(`<a id="t" [href]="u()">x</a>`, () => ({ u: signal(trustUrl('whatsapp://send?text=hi')) }));
  assert.equal($('#t').getAttribute('href'), 'whatsapp://send?text=hi');
  assert.equal(sanitizeUrl('slack://open', 'href'), 'unsafe:slack://open');
  assert.equal(sanitizeUrl(null, 'href'), '');
});

test('a component host receiving [href] is sanitized too', () => {
  class Child {}
  component(Child, { selector: 'x-child', template: '<i>x</i>' });
  class Parent { u = signal('javascript:alert(1)'); }
  component(Parent, { selector: 'x-parent', imports: [Child], template: '<x-child id="t" [href]="u()"></x-child>' });
  let el;
  warnings(() => { el = mountIn(mount, Parent).$('#t'); });
  assert.ok(String(el.getAttribute('href') ?? el.href).startsWith('unsafe:'));
});

/* ---------- event handler attributes, srcdoc, dangerous elements ---------- */

const REFUSED = [
  ['[onclick]', '<div [onclick]="x()">a</div>', /"onclick"/],
  ['[attr.onclick]', '<div [attr.onclick]="x()">a</div>', /"attr\.onclick"/],
  ['[onerror] on img', '<img [onerror]="x()">', /"onerror"/],
  ['[ONCLICK] (any case)', '<div [ONCLICK]="x()">a</div>', /not allowed/],
  ['onclick="{{ }}"', '<div onclick="{{ x() }}">a</div>', /interpolating into "onclick"/],
  ['[srcdoc]', '<iframe [srcdoc]="x()"></iframe>', /"srcdoc"/],
  ['[attr.srcdoc]', '<iframe [attr.srcdoc]="x()"></iframe>', /srcdoc/],
  ['[outerHTML]', '<div [outerHTML]="x()"></div>', /outerhtml/i],
  ['binding on <script>', '<script [src]="x()"></script>', /<script>/i],
  ['interpolation in <script>', '<script>{{ x() }}</script>', /<script>/i],
  ['interpolation in <style>', '<style>{{ x() }}</style>', /<style>/],
  ['binding on <base>', '<base [href]="x()">', /<base>/],
  ['binding on <link>', '<link [href]="x()" rel="stylesheet">', /<link>/],
  ['binding on <meta>', '<meta [content]="x()">', /<meta>/]
];

for (const [name, template, pattern] of REFUSED) {
  test(`compile-time error: ${name}`, () => {
    assert.throws(() => app(template, () => ({ x: () => 'alert(1)' })), pattern);
    assert.throws(() => compileTemplate(template), pattern, 'the AOT tool refuses it too');
  });
}

test('legitimate bindings that merely look similar still work', () => {
  const on = signal(true);
  const { $ } = app(`<div id="d" [class.online]="on()" [attr.data-on]="'1'" [style.width.px]="5" (click)="noop()">x</div>`, () => ({ on }), { noop() {} });
  assert.ok($('#d').classList.contains('online'));
  assert.equal($('#d').getAttribute('data-on'), '1');
});

/* ---------- [innerHTML] ---------- */

test('[innerHTML] without trustHtml() inserts text, never markup, and warns', () => {
  let root;
  const logged = warnings(() => { ({ root } = app(`<div id="d" [innerHTML]="h()"></div>`, () => ({ h: signal(evil) }))); });
  assert.equal(root.querySelector('img'), null);
  assert.equal(root.querySelector('#d, [id="d"]').textContent, evil);
  assert.match(logged.join(), /trustHtml/);
});

test('[innerHTML] with trustHtml() renders the markup you vouched for', async () => {
  const h = signal(trustHtml('<b id="bold">hi</b>'));
  const { root } = app(`<div [innerHTML]="h()"></div>`, () => ({ h }));
  assert.equal(root.querySelector('b').textContent, 'hi');
  h.set(trustHtml('<i>next</i>')); await tick();
  assert.equal(root.querySelector('i').textContent, 'next');
  h.set('<img src=x onerror=alert(1)>'); await tick();
  assert.equal(root.querySelector('img'), null, 'a plain string afterwards is text again');
});

test('[innerHTML] with null or empty values clears the element silently', () => {
  let root;
  const logged = warnings(() => { ({ root } = app(`<div [innerHTML]="h()">old</div>`, () => ({ h: signal(null) }))); });
  assert.equal(root.querySelector('div').textContent, '');
  assert.equal(logged.length, 0);
});

/* ---------- expression sandbox ---------- */

test('prototype and constructor access is blocked in expressions', () => {
  const { text } = app('<p id="p">{{ constructor }}|{{ __proto__ }}|{{ x.constructor }}|{{ x["__proto__"] }}|{{ x.constructor.constructor }}</p>', () => ({ x: {} }));
  assert.equal(text('#p'), '||||');
});

const WINDOW_ATTACKS = [
  '$el.ownerDocument.defaultView.__hit()',
  '$el.ownerDocument.defaultView',
  '$el.getRootNode().defaultView.__hit()',
  '$el.parentNode.parentNode.parentNode.defaultView.__hit()',
  '$el.ownerDocument.location',
  'win.__hit()',
  'getWindow().__hit()',
  'self.document.defaultView.__hit()'
];

test('window and document cannot be reached from template expressions', () => {
  for (const expr of WINDOW_ATTACKS) {
    let hit = false;
    window.__hit = () => { hit = true; return 'ran'; };
    const { text } = app(`<p id="p">{{ ${expr} }}</p>`, () => ({ win: window, self: { document: window.document } }), { getWindow() { return window; } });
    assert.equal(hit, false, expr);
    assert.notEqual(text('#p'), 'ran', expr);
  }
});

test('window cannot be reached through events either ($event.view, composedPath)', () => {
  const grabbed = [];
  window.__hit = () => { grabbed.push('called'); };
  const { $ } = app(
    `<button id="b" (click)="take($event.view); take($event.composedPath().pop()); take($event.composedPath().at(-1)); take($event.target.ownerDocument); take($event.currentTarget.getRootNode())">x</button>`,
    () => ({}), { take(v) { grabbed.push(v); } });
  $('#b').click();
  assert.deepEqual(grabbed, [undefined, undefined, undefined, undefined, undefined]);
});

test('DOM methods that turn strings into markup or attributes are blocked', () => {
  const { root, $ } = app(
    `<p id="p">{{ $el.insertAdjacentHTML('beforeend', payload) }}{{ $el.setAttribute('onclick', 'alert(1)') }}{{ $el.ownerDocument.write('x') }}</p>`,
    () => ({ payload: evil }));
  assert.equal(root.querySelector('img'), null);
  assert.equal(root.querySelector('x-app').hasAttribute('onclick'), false);
  void $;
});

test('the sandbox does not break ordinary objects (even ones that have a "window" property)', () => {
  const { text } = app('<p id="p">{{ o.window }}|{{ o.nodeType }}|{{ o.list.length }}|{{ fn(2) }}</p>',
    () => ({ o: { window: 5, nodeType: 1, list: [1, 2, 3] }, fn: x => x * 2 }));
  assert.equal(text('#p'), '5|1|3|4');
});

test('no source file uses eval or new Function', () => {
  const dir = new URL('../src/lite/', import.meta.url);
  for (const f of readdirSync(dir)) {
    const src = readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(src, /\beval\s*\(|new\s+Function\b/, f);
  }
});

/* ---------- the precompiled runtime enforces the same rules ---------- */

let aotN = 0;
async function precompiled(source, components = []) {
  const dir = mkdtempSync(join(tmpdir(), 'angelite-sec-'));
  const file = join(dir, `t${aotN++}.mjs`);
  writeFileSync(file, compileTemplate(source, { components }));
  return (await import(pathToFileURL(file).href)).default;
}

test('precompiled templates: URLs are sanitized, innerHTML needs trustHtml, the sandbox holds', async () => {
  window.__hit = () => { window.__hitCalled = true; };
  window.__hitCalled = false;
  const aot = await precompiled(
    `<a id="a" [href]="u()">x</a><a id="b" href="{{ u() }}">y</a><div id="h" [innerHTML]="h()"></div><p id="w">{{ $el.ownerDocument.defaultView.__hit() }}|{{ win }}</p>`);
  class C { u = signal('javascript:alert(1)'); h = signal(evil); win = window; }
  component(C, { selector: 'x-aot', aot });
  let res;
  warnings(() => { res = mountIn(mount, C); });
  assert.ok(res.$('#a').getAttribute('href').startsWith('unsafe:'));
  assert.ok(res.$('#b').getAttribute('href').startsWith('unsafe:'));
  assert.equal(res.root.querySelector('img'), null);
  assert.equal(window.__hitCalled, false);
  assert.equal(res.$('#w').textContent, '|');
});

test('precompiled output contains no eval, no new Function and no imports', () => {
  const src = compileTemplate('<a [href]="u()">{{ a.b }}</a>');
  assert.doesNotMatch(src, /\beval\b|new\s+Function|import\s/);
});

test('built bundles contain no eval or new Function', { skip: !existsSync(new URL('../dist/angelite-lite.min.js', import.meta.url)) && 'dist/ not built' }, () => {
  for (const f of ['angelite-lite.min.js', 'angelite-runtime.min.js', 'angelite-ui.min.js']) {
    const code = readFileSync(new URL(`../dist/${f}`, import.meta.url), 'utf8');
    assert.doesNotMatch(code, /\beval\s*\(|new Function/, f);
  }
});
