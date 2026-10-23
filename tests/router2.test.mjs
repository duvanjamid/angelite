import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn, captureErrors } from './setup.mjs';

const angelite = await import('../src/index.js');
const { component, mount, provideRouter, router } = angelite;

const wait = (ms = 25) => new Promise(r => setTimeout(r, ms));
const go = async hash => { window.location.hash = hash; await wait(); };
let n = 0;
const page = (html, selector) => { class P {} component(P, { selector: selector || `x-rp${++n}`, template: html }); return P; };
const App = () => page('<router-outlet></router-outlet>');
const text = root => (root.querySelector('h1') || {}).textContent;

test('query string: router.query() and guards see it; path matching ignores it', async () => {
  let seen;
  const Home = page('<h1>{{ q() }}</h1>');
  Home.prototype.q = () => JSON.stringify(router.query());
  provideRouter([{ path: '/', component: Home, canActivate: [({ query }) => { seen = query; return true; }] }]);
  await go('#/?page=2&tag=a%20b');
  const { root } = mountIn(mount, App());
  assert.equal(text(root), '{"page":"2","tag":"a b"}');
  assert.deepEqual(seen, { page: '2', tag: 'a b' });
  assert.equal(router.path(), '/');
  await go('#/');
  assert.equal(text(root), '{}');
});

test('resolvers run before the page renders; router.data() has their results; a failing one keeps the previous page', async () => {
  const Home = page('<h1>home</h1>');
  const User = page('<h1>{{ name() }}</h1>');
  User.prototype.name = () => router.data().user.name + '/' + router.data().extra;
  let calls = 0;
  provideRouter([
    { path: '/', component: Home },
    { path: 'users/:id', component: User, resolve: {
      user: async ({ params }) => { calls++; await wait(5); return { name: 'user' + params.id }; },
      extra: () => 'x'
    } },
    { path: 'broken', component: User, resolve: { user: () => { throw new Error('no data'); } } }
  ]);
  await go('#/');
  const { root } = mountIn(mount, App());
  await go('#/users/7');
  assert.equal(text(root), 'user7/x');
  assert.equal(calls, 1);
  const errors = await captureErrors(async () => { await go('#/broken'); });
  assert.match(errors.join(), /resolver "user" failed/);
  assert.equal(text(root), 'user7/x', 'stays on the previous page');
  assert.equal(window.location.hash, '#/users/7', 'address restored');
  await go('#/');
  assert.deepEqual(router.data(), {}, 'pages without resolvers have no data');
});

test('navigate(): sets the hash, or replaces the entry with { replace: true }', async () => {
  const A = page('<h1>a</h1>'), B = page('<h1>b</h1>');
  provideRouter([{ path: '/', component: A }, { path: 'b', component: B }]);
  await go('#/');
  const { root } = mountIn(mount, App());
  const before = window.history.length;
  router.navigate('/b');
  await wait();
  assert.equal(text(root), 'b');
  assert.equal(window.history.length, before + 1);
  router.navigate('/', { replace: true });
  await wait();
  assert.equal(text(root), 'a');
  assert.equal(window.history.length, before + 1, 'no new entry');
  assert.equal(window.location.hash, '#/');
});

test('history mode: real paths, base, pushState navigation, popstate, link clicks and #/ links', async () => {
  const Home = page('<h1>home</h1><a id="l" routerLink="/about?x=1">about</a><a id="o" routerLink="/about" target="_blank">other tab</a>');
  const About = page('<h1>about {{ q() }}</h1>');
  About.prototype.q = () => router.query().x || '';
  window.history.replaceState(null, '', '/app/');
  provideRouter([{ path: '/', component: Home }, { path: 'about', component: About }], { mode: 'history', base: '/app/' });
  const { root, $ } = mountIn(mount, App());
  assert.equal(text(root), 'home');
  router.navigate('/about?x=5');
  await wait();
  assert.equal(window.location.pathname, '/app/about');
  assert.equal(window.location.search, '?x=5');
  assert.equal(text(root), 'about 5');
  window.history.back();
  await wait(50);
  assert.equal(window.location.pathname, '/app/');
  assert.equal(text(root), 'home');

  // clicking a routerLink navigates without reloading; modified clicks and target=_blank are left alone
  $('#l').dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 }));
  await wait();
  assert.equal(window.location.pathname, '/app/about');
  assert.equal(text(root), 'about 1');
  router.navigate('/', { replace: true });
  await wait();
  const ctrl = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true });
  $('#l').dispatchEvent(ctrl);
  assert.equal(ctrl.defaultPrevented, false);
  const blank = new window.MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
  $('#o').dispatchEvent(blank);
  assert.equal(blank.defaultPrevented, false);
  await wait();
  assert.equal(text(root), 'home');

  // a shared "#/about" address lands on the real path
  window.history.replaceState(null, '', '/app/#/about');
  provideRouter([{ path: '/', component: Home }, { path: 'about', component: About }], { mode: 'history', base: '/app' });
  await wait();
  assert.equal(window.location.pathname, '/app/about');

  // back to hash mode for the rest of the process
  window.history.replaceState(null, '', '/');
  provideRouter([{ path: '/', component: Home }]);
  await wait();
  assert.equal(window.location.pathname, '/');
});

test('guards cancelled in history mode restore the real path; redirects replace the entry', async () => {
  const Home = page('<h1>home</h1>'), Secret = page('<h1>secret</h1>'), Login = page('<h1>login</h1>');
  window.history.replaceState(null, '', '/');
  provideRouter([
    { path: '/', component: Home },
    { path: 'secret', component: Secret, canActivate: [() => false] },
    { path: 'vip', component: Secret, canActivate: [() => '/login'] },
    { path: 'login', component: Login }
  ], { mode: 'history' });
  const { root } = mountIn(mount, App());
  router.navigate('/secret');
  await wait();
  assert.equal(window.location.pathname, '/', 'restored');
  assert.equal(text(root), 'home');
  router.navigate('/vip');
  await wait();
  assert.equal(window.location.pathname, '/login');
  assert.equal(text(root), 'login');
  window.history.replaceState(null, '', '/');
  provideRouter([{ path: '/', component: Home }]);
});

test('history mode never leaves the site: "//host" paths stay on this origin, also through redirects', async () => {
  const Home = page('<h1>home</h1>'), Any = page('<h1>any</h1>');
  window.history.replaceState(null, '', '/');
  provideRouter([
    { path: '/', component: Home },
    { path: 'go', component: Home, canActivate: [() => '//evil.test/x'] },
    { path: '**', component: Any }
  ], { mode: 'history' });
  const { root } = mountIn(mount, App());
  router.navigate('//evil.test/path');
  await wait();
  assert.equal(window.location.origin, 'http://localhost');
  assert.equal(window.location.pathname, '/evil.test/path');
  assert.equal(text(root), 'any');
  router.navigate('/go');
  await wait();
  assert.equal(window.location.origin, 'http://localhost');
  assert.equal(window.location.pathname, '/evil.test/x', 'a guard redirect cannot leave either');
  window.history.replaceState(null, '', '/');
  provideRouter([{ path: '/', component: Home }]);
});
