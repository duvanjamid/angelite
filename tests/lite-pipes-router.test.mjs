import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn, tick } from './setup.mjs';

const lite = await import('../src/lite/index.js');
await import('../src/lite/pipes.js').catch(() => {});
const { signal, component, mount, registerPipe, provideRouter, router } = lite;

function define(template, init = () => ({}), meta = {}) {
  class C { constructor() { Object.assign(this, init()); } }
  component(C, { selector: 'x-app', template, ...meta });
  return C;
}
const render = (expr, ctx = {}) => mountIn(mount, define(`<p id="p">{{ ${expr} }}</p>`, () => ctx)).text('#p');

/* ---- pipes ---- */

test('built-in pipes', () => {
  assert.equal(render("'ada lovelace' | uppercase"), 'ADA LOVELACE');
  assert.equal(render("'ADA' | lowercase"), 'ada');
  assert.equal(render("'hello big WORLD' | titlecase"), 'Hello Big World');
  assert.equal(render("[1, 'a'] | json").replace(/\s/g, ''), '[1,"a"]');
  assert.match(render("1234.5678 | number:2"), /^1[.,]?234[.,]57$/);
  assert.match(render("0.256 | percent"), /25[.,]6\s?%/);
  assert.match(render("5 | currency:'EUR'"), /5/);
  assert.equal(render("'abcdef' | slice:1:3"), 'bc');
  assert.match(render("d | date", { d: new Date(Date.UTC(2020, 0, 15, 12)) }), /2020|15|1/);
  assert.equal(render("'x' | uppercase | lowercase"), 'x', 'pipes chain left to right');
  assert.equal(render("null | uppercase"), '');
});

test('registerPipe: custom pipes receive the value and evaluated arguments', () => {
  registerPipe('wrap', (v, l, r) => `${l}${v}${r}`);
  assert.equal(render("'x' | wrap:'[':']'"), '[x]');
  assert.equal(render("name | wrap:pre:'!'", { name: 'bob', pre: '>' }), '>bob!');
});

test('pipe arguments may contain ":" and "|" inside strings and parentheses', () => {
  registerPipe('same', v => v);
  assert.equal(render(`'a:b|c' | same`), 'a:b|c');
  assert.equal(render(`(1 || 2) | same`), '1');
});

test('"||" is the logical operator, not a pipe', () => {
  assert.equal(render("a || 'fallback'", { a: '' }), 'fallback');
});

/* ---- router ---- */

async function go(hash) {
  window.location.hash = hash;
  await new Promise(r => setTimeout(r, 20));
}

test('router: outlet renders the matching route, exposes params, handles wildcard and navigation', async () => {
  class Home {}
  component(Home, { selector: 'x-home', template: '<h1>home</h1>' });
  class User {}
  component(User, { selector: 'x-user', template: '<h1>user {{ id() }}</h1>' });
  User.prototype.id = () => router.params().id;
  class Missing {}
  component(Missing, { selector: 'x-missing', template: '<h1>404</h1>' });
  provideRouter([
    { path: '/', component: Home },
    { path: 'users/:id', component: User },
    { path: '**', component: Missing }
  ]);
  class App {}
  component(App, { selector: 'x-app', template: '<a id="l" routerLink="/users/7">u</a><router-outlet></router-outlet>' });
  await go('#/');
  const { $, root } = mountIn(mount, App);
  const h1 = () => root.querySelector('h1')?.textContent;
  assert.equal($('#l').getAttribute('href'), '#/users/7');
  assert.equal(h1(), 'home');
  await go('#/users/42');
  assert.equal(h1(), 'user 42');
  await go('#/users/a%20b');
  assert.equal(h1(), 'user a b', 'params are decoded');
  await go('#/nothing/here');
  assert.equal(h1(), '404');
  router.navigate('#/');
  await new Promise(r => setTimeout(r, 20));
  assert.equal(h1(), 'home');
  assert.equal(root.querySelectorAll('h1').length, 1, 'the previous route view was removed');
});
