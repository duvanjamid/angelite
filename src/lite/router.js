/** Minimal hash router: provideRouter(routes), <router-outlet>, routerLink. */

import { signal, computed, effect, untracked } from './signals.js';
import { setOutletBinder } from './view.js';

const read = () => (location.hash.slice(1) || '/').replace(/^(?!\/)/, '/');

const path = signal(read());
let table = [];

function compile(route) {
  const names = [];
  const source = route.path === '**'
    ? '.*'
    : '/' + route.path.replace(/^\/|\/$/g, '').replace(/:(\w+)/g, (_, n) => (names.push(n), '([^/]+)'));
  return { route, names, re: new RegExp(`^${source}/?$`) };
}

export const router = {
  path,
  current: computed(() => {
    const p = path();
    for (const { route, names, re } of table) {
      const m = re.exec(p);
      if (m) return { component: route.component, params: Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])])) };
    }
    return null;
  }),
  params: () => (router.current() || {}).params || {},
  navigate(to) { location.hash = to; }
};

export function provideRouter(routes) {
  table = routes.map(compile);
  path.set(read());
  addEventListener('hashchange', () => path.set(read()));
  return router;
}

setOutletBinder((el, own, mount) => {
  let view = null;
  const clear = () => { if (view) view.destroy(); view = null; el.textContent = ''; };
  own.push(clear);
  effect(() => {
    const match = router.current();
    untracked(() => {
      clear();
      if (match) view = mount(match.component, el);
    });
  }, own);
});
