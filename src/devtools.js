/**
 * Inspector for AngeLite apps.
 *
 *   import { enableDevtools } from '@duvanjamid/angelite/devtools';
 *   enableDevtools();            // adds window.__ANGELITE__ and, with { panel: true }, a floating component tree
 *
 *   __ANGELITE__.tree()          // [{ name, el, state, children }]
 *   __ANGELITE__.inspect(el)     // the component instance behind an element
 *   __ANGELITE__.state(instance) // its fields; signals are read with peek() and can be changed with set()
 *
 * Components are found through the `$c` property AngeLite puts on every component host element.
 */

const isSignal = v => typeof v === 'function' && typeof v.peek === 'function';
const nameOf = el => el.localName;

function stateOf(instance) {
  const out = {};
  for (const key of Object.keys(instance)) {
    if (key === '$el') continue;
    const v = instance[key];
    if (isSignal(v)) out[key] = v.peek();
    else if (typeof v !== 'function') out[key] = v;
  }
  return out;
}

function buildTree(root) {
  const nodes = [];
  const visit = (el, into) => {
    for (const child of el.children) {
      if (child.$c) {
        const node = { name: nameOf(child), el: child, instance: child.$c, state: stateOf(child.$c), children: [] };
        into.push(node);
        visit(child, node.children);
      } else visit(child, into);
    }
  };
  visit(root, nodes);
  return nodes;
}

/** Sets a signal field of a component from the console or the panel. Returns true if it was a signal. */
function set(instance, key, value) {
  const s = instance[key];
  if (!isSignal(s) || !s.set) return false;
  s.set(value);
  return true;
}

function panel(api) {
  const box = document.createElement('div');
  box.setAttribute('data-angelite-devtools', '');
  box.style.cssText = 'position:fixed;right:8px;bottom:8px;z-index:2147483647;width:340px;max-height:50vh;overflow:auto;background:#14161df2;color:#e8eaf1;font:12px/1.4 ui-monospace,monospace;border:1px solid #444;border-radius:8px;padding:8px';
  const render = () => {
    box.textContent = '';
    const title = document.createElement('b');
    title.textContent = 'AngeLite';
    box.append(title);
    const list = (nodes, depth) => nodes.forEach(n => {
      const row = document.createElement('div');
      row.style.cssText = `padding-left:${depth * 12}px;cursor:pointer;margin-top:2px`;
      const keys = Object.keys(n.state);
      row.textContent = `<${n.name}>` + (keys.length ? ' ' + keys.map(k => `${k}=${JSON.stringify(n.state[k])}`).join(' ') : '');
      row.title = 'click: console.log the instance';
      row.onclick = () => console.log(n.name, n.instance); // eslint-disable-line no-console
      box.append(row);
      list(n.children, depth + 1);
    });
    list(api.tree(), 0);
  };
  render();
  const timer = setInterval(render, 500);
  document.body.append(box);
  return () => { clearInterval(timer); box.remove(); };
}

export function enableDevtools({ panel: showPanel = false } = {}) {
  const api = {
    tree: (root = document.body) => buildTree(root),
    inspect: el => (el && el.$c) || null,
    state: stateOf,
    set
  };
  window.__ANGELITE__ = api;
  if (showPanel) api.closePanel = panel(api);
  return api;
}
