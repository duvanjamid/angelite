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
 * A guard receives `{ path, params, route }` and returns true to allow, false to stay where you were,
 * or a path (string) to redirect there. Guards and loaders may be async.
 */

import { signal, computed, effect, untracked } from './signals.js';
import { setOutletBinder } from './runtime.js';

const read = () => (location.hash.slice(1) || '/').replace(/^(?!\/)/, '/');

const path = /* @__PURE__ */ signal(read());
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

const commit = (m, p) => {
  committed = p;
  chain.set(m || []);
};

function resolve(p) {
  const id = ++nav, m = match(table, p, {});
  if (!m || !m.some(({ route }) => route.canActivate || route.redirectTo || (route.load && !route.component))) return commit(m, p);
  return (async () => {
    for (const { route, params } of m) {
      if (route.redirectTo) return go(route.redirectTo);
      for (const guard of route.canActivate || []) {
        const verdict = await guard({ path: p, params, route });
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
    }
    commit(m, p);
  })();
}

// a guard said no: put the address bar back
function stay() {
  if (committed != null) {
    history.replaceState(null, '', '#' + committed);
    path.set(committed);
  }
}

// replace the current history entry (redirects)
function go(to) {
  history.replaceState(null, '', '#' + to);
  path.set(to);
  return resolve(to);
}

export const router = {
  path,
  current: /* @__PURE__ */ computed(() => {
    const m = chain();
    const leaf = m[m.length - 1];
    return leaf ? { component: leaf.route.component, params: leaf.params } : null;
  }),
  params: () => (router.current() || {}).params || {},
  navigate(to) { location.hash = to; }
};

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

let onHash = null;

export function provideRouter(routes) {
  setOutletBinder(bindOutlet);
  table = routes.map(compile);
  path.set(read());
  resolve(path());
  removeEventListener('hashchange', onHash);
  onHash = () => {
    path.set(read());
    resolve(path());
  };
  addEventListener('hashchange', onHash);
  return router;
}
