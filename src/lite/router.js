/**
 * Minimal hash router: provideRouter(routes), <router-outlet>, routerLink.
 *
 *   provideRouter([
 *     { path: '/', component: Home },
 *     { path: 'admin', component: Admin, canActivate: [isAdmin], children: [   // Admin renders a nested <router-outlet>
 *       { path: '', component: AdminHome },
 *       { path: 'users/:id', component: AdminUser }
 *     ] },
 *     { path: 'reports', load: () => import('./reports.js') },                   // code splitting: loaded on first visit
 *     { path: 'old', redirectTo: '/' },
 *     { path: '**', component: NotFound }
 *   ]);
 *
 * A guard receives `{ path, params, query, route }` and returns true to allow, false to stay where you were,
 * or a path (string) to redirect there. Guards, resolvers and loaders may be async.
 *
 *   { path: 'users/:id', component: User, resolve: { user: ({ params }) => http.get('/users/' + params.id) } }
 *   router.data().user       // what the resolvers returned, available when the page renders
 *   router.query().page      // ?page=2
 *
 * Modes: hash (default, works on any static host) or `provideRouter(routes, { mode: 'history', base: '/app' })`,
 * which uses real paths; the server must answer the same page for every route.
 */

import { signal, computed, effect, untracked } from './signals.js';
import { setOutletBinder } from './runtime.js';

let mode = 'hash', base = '';
const read = () => (mode === 'history' ? location.pathname.slice(base.length) + location.search : location.hash.slice(1) || '/').replace(/^(?!\/)/, '/');

const path = /* @__PURE__ */ signal('/');
const search = /* @__PURE__ */ signal('');
const data = /* @__PURE__ */ signal({});
const chain = /* @__PURE__ */ signal([]); // matched routes, outermost first: [{ route, params }]
let table = [];
let nav = 0; // navigation counter: a newer navigation cancels an older one that is still waiting on a guard/loader
let committed = null; // last path that was fully resolved

function compile(route) {
  const names = [];
  const children = (route.children || []).map(compile);
  const source = route.path === '**'
    ? '.*'
    : route.path.replace(/^\/|\/$/g, '').replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)'));
  const start = source ? '/' + source : '';
  return { route, names, children, re: new RegExp(children.length ? `^${start}(?=/|$)` : `^${start}/?$`) };
}

function match(nodes, p, params) {
  for (const { route, names, children, re } of nodes) {
    const m = re.exec(p);
    if (!m) continue;
    const own = { ...params };
    names.forEach((n, i) => { own[n] = decodeURIComponent(m[i + 1]); });
    const self = { route, params: own };
    if (!children.length) return [self];
    const sub = match(children, p.slice(m[0].length) || '/', own);
    if (sub) return [self, ...sub];
    if (/^\/?$/.test(p.slice(m[0].length))) return [self];
  }
  return null;
}

const commit = (m, p, resolved) => {
  committed = p;
  data.set(resolved || {});
  chain.set(m || []);
};

const queryOf = () => Object.fromEntries(new URLSearchParams(search.peek()));

// sets path and query from "/a/b?x=1"
function setLocation(full) {
  const i = full.indexOf('?');
  path.set(i < 0 ? full : full.slice(0, i));
  search.set(i < 0 ? '' : full.slice(i + 1));
}

function resolve(p) {
  const id = ++nav, m = match(table, p, {});
  if (!m || !m.some(({ route }) => route.canActivate || route.resolve || route.redirectTo || (route.load && !route.component))) return commit(m, p);
  return (async () => {
    const resolved = {};
    for (const { route, params } of m) {
      if (route.redirectTo) return go(route.redirectTo);
      const to = { path: p, params, query: queryOf(), route };
      for (const guard of route.canActivate || []) {
        const verdict = await guard(to);
        if (id !== nav) return;
        if (verdict === false) return stay();
        if (typeof verdict === 'string') return go(verdict);
      }
      if (route.load && !route.component) {
        try {
          const mod = await route.load();
          route.component = mod && mod.default ? mod.default : mod;
        } catch (e) {
          console.error('[AngeLite] route failed to load:', e);
          return stay();
        }
        if (id !== nav) return;
      }
      for (const key in route.resolve || {}) {
        try {
          resolved[key] = await route.resolve[key](to);
        } catch (e) {
          console.error(`[AngeLite] resolver "${key}" failed:`, e);
          return stay();
        }
        if (id !== nav) return;
      }
    }
    commit(m, p, resolved);
  })();
}

// a guard said no: put the address bar back
// history mode: always a path on this site ("//evil.test" would otherwise be read as another origin)
const href = to => (mode === 'history' ? base + '/' + to.replace(/^\/+/, '') : '#' + to);

function stay() {
  if (committed != null) {
    history.replaceState(null, '', href(committed));
    path.set(committed);
  }
}

// replace the current history entry (redirects)
function go(to) {
  history.replaceState(null, '', href(to));
  setLocation(to);
  return resolve(path.peek());
}

export const router = {
  path,
  /** Query string as an object: /users?page=2 -> { page: '2' }. */
  query: /* @__PURE__ */ computed(() => Object.fromEntries(new URLSearchParams(search()))),
  /** What the matched routes' `resolve` functions returned. */
  data,
  current: /* @__PURE__ */ computed(() => {
    const m = chain();
    const leaf = m[m.length - 1];
    return leaf ? { component: leaf.route.component, params: leaf.params } : null;
  }),
  params: () => (router.current() || {}).params || {},
  /** Goes to a path ("/users/3?tab=info"). With `{ replace: true }` the current history entry is replaced. */
  navigate(to, { replace } = {}) {
    if (mode === 'history') {
      history[replace ? 'replaceState' : 'pushState'](null, '', href(to));
      update();
    } else if (replace) {
      history.replaceState(null, '', '#' + to);
      update();
    } else location.hash = to;
  }
};

function update() {
  setLocation(read());
  resolve(path.peek());
}

// history mode: <a routerLink> renders "#/x"; turn plain clicks on it into history navigation
function onClick(e) {
  const a = e.target.closest && e.target.closest('a[href^="#/"]');
  if (a && !e.defaultPrevented && e.button === 0 && !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) && !a.target) {
    e.preventDefault();
    router.navigate(a.getAttribute('href').slice(1));
  }
}

function bindOutlet(el, own, mount, ctx) {
  let depth = 0;
  for (let c = ctx; c; c = c.up) if (c.depth != null) { depth = c.depth; break; }
  let view = null, shown = null;
  const clear = () => { if (view) view.destroy(); view = null; shown = null; el.textContent = ''; };
  own.push(clear);
  effect(() => {
    const level = chain()[depth];
    untracked(() => {
      const key = level && level.route.component ? level.route.component : null;
      const sig = key && JSON.stringify(level.params);
      if (shown && shown.key === key && shown.sig === sig) return;
      clear();
      if (key) {
        view = mount(key, el, { up: ctx, depth: depth + 1 });
        shown = { key, sig };
      }
    });
  }, own);
}

let stopListening = null;

export function provideRouter(routes, options = {}) {
  setOutletBinder(bindOutlet);
  mode = options.mode === 'history' ? 'history' : 'hash';
  base = mode === 'history' ? (options.base || '').replace(/\/+$/, '') : '';
  table = routes.map(compile);
  if (stopListening) stopListening();
  if (mode === 'history') {
    // a link shared as "/app#/users/3" lands on "/app/users/3"
    if (location.hash.startsWith('#/')) history.replaceState(null, '', base + location.hash.slice(1));
    addEventListener('popstate', update);
    document.addEventListener('click', onClick);
    stopListening = () => { removeEventListener('popstate', update); document.removeEventListener('click', onClick); };
  } else {
    addEventListener('hashchange', update);
    stopListening = () => removeEventListener('hashchange', update);
  }
  update();
  return router;
}
