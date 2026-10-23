// Performance budget that does not depend on timing: how much DOM work and how many effect runs each
// benchmark scenario costs. The counts are deterministic, so any change that makes the core do more
// work per operation fails here, however fast the machine is. See analysis/performance.md in the angelite-docs repository.
//
//   UPDATE_PERF=1 npm test      rewrites tests/perf-budget.json with the current counts (do it on purpose,
//                               in the commit that explains why the work grew, or to lock in an improvement)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { window, tick } from './setup.mjs';

// every optional module loaded: unused features must cost nothing on the hot paths
const angelite = await import('../src/full.js');
const { Effect } = await import('../src/signals.js');
const { compileTemplate } = await import('../tools/aot.mjs');
const { signal, component, mount } = angelite;

const BUDGET = new URL('./perf-budget.json', import.meta.url);

/* ---------- counters ---------- */

let counts = {};
const bump = key => { counts[key] = (counts[key] || 0) + 1; };

function wrap(proto, name) {
  if (!proto || !Object.prototype.hasOwnProperty.call(proto, name)) return;
  const original = proto[name];
  proto[name] = function (...args) { bump(name); return original.apply(this, args); };
}
function wrapSetter(proto, name) {
  const d = proto && Object.getOwnPropertyDescriptor(proto, name);
  if (!d || !d.set) return;
  Object.defineProperty(proto, name, { ...d, set(v) { bump('set:' + name); d.set.call(this, v); } });
}

const W = window;
for (const [proto, names] of [
  [W.Document.prototype, ['createElement', 'createTextNode', 'createComment', 'createDocumentFragment', 'importNode']],
  [W.Node.prototype, ['appendChild', 'insertBefore', 'removeChild', 'replaceChild', 'cloneNode']],
  [W.Element.prototype, ['after', 'before', 'remove', 'replaceWith', 'append', 'prepend', 'setAttribute', 'removeAttribute']],
  [W.CharacterData.prototype, ['after', 'before', 'remove', 'replaceWith']],
  [W.DocumentFragment.prototype, ['append', 'prepend']],
  [W.DOMTokenList.prototype, ['toggle', 'add', 'remove']],
  [W.EventTarget.prototype, ['addEventListener', 'removeEventListener']]
]) names.forEach(n => wrap(proto, n));
wrapSetter(W.CharacterData.prototype, 'data');
wrapSetter(W.Node.prototype, 'textContent');
wrapSetter(W.Element.prototype, 'className');
wrapSetter(W.Element.prototype, 'innerHTML');
wrapSetter(W.HTMLInputElement.prototype, 'value');
wrap(Effect.prototype, 'run');

const total = c => Object.entries(c).filter(([k]) => k !== 'run').reduce((s, [, v]) => s + v, 0);

/* ---------- the benchmark app (same template as benchmarks/apps/angelite-aot) ---------- */

const TEMPLATE = `<table class="table"><tbody>
  @for (r of rows(); track r.id) {
    <tr [class.danger]="r.id === selected()">
      <td class="col-id">{{ r.id }}</td>
      <td class="col-label"><a (click)="select(r.id)">{{ r.label }}</a></td>
      <td class="col-remove"><a (click)="remove(r.id)">×</a></td>
    </tr>
  }
</tbody></table>`;

let nextId = 1;
const build = n => Array.from({ length: n }, () => ({ id: nextId++, label: 'label ' + nextId }));

function makeApp(meta) {
  const rows = signal([]), selected = signal(0);
  class App {
    constructor() { this.rows = rows; this.selected = selected; }
    select(id) { selected.set(id); }
    remove(id) { rows.update(r => r.filter(x => x.id !== id)); }
  }
  component(App, { selector: `x-perf${nextId++}`, ...meta });
  const root = document.createElement('div');
  document.body.append(root);
  const app = mount(App, root);
  return { rows, selected, destroy: () => { app.destroy(); root.remove(); } };
}

async function measure(app, setup, action) {
  // one-time costs (parsing the template, delegating the first event type) are not per-operation work
  app.rows.set(build(2));
  await tick();
  app.rows.set([]);
  await tick();
  await setup(app);
  await tick();
  counts = {};
  await action(app);
  await tick();
  const c = counts;
  return { dom: total(c), effects: c.run || 0, detail: { ...c } };
}

const SCENARIOS = {
  create1k: [() => {}, a => a.rows.set(build(1000))],
  replace1k: [async a => a.rows.set(build(1000)), a => a.rows.set(build(1000))],
  update10th: [async a => a.rows.set(build(1000)), a => a.rows.update(r => r.map((x, i) => (i % 10 === 0 ? { ...x, label: x.label + ' !!!' } : x)))],
  select: [async a => a.rows.set(build(1000)), a => a.selected.set(a.rows()[500].id)],
  swap: [async a => a.rows.set(build(1000)), a => a.rows.update(r => { const c = r.slice(); [c[1], c[998]] = [c[998], c[1]]; return c; })],
  remove: [async a => a.rows.set(build(1000)), a => a.rows.update(r => r.filter((_, i) => i !== 500))],
  append1k: [async a => a.rows.set(build(1000)), a => a.rows.update(r => r.concat(build(1000)))],
  clear1k: [async a => a.rows.set(build(1000)), a => a.rows.set([])]
};

/* ---------- the check ---------- */

test('the benchmark scenarios do no more DOM work and run no more effects than the budget', async () => {
  const aot = await (async () => {
    const { writeFileSync: w, mkdtempSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const { pathToFileURL } = await import('node:url');
    const file = join(mkdtempSync(join(tmpdir(), 'angelite-perf-')), 'app.mjs');
    w(file, compileTemplate(TEMPLATE, { check: false }));
    return (await import(pathToFileURL(file).href)).default;
  })();

  const result = {}, jit = {};
  for (const [name, [setup, action]] of Object.entries(SCENARIOS)) {
    const app = makeApp({ aot });
    result[name] = await measure(app, setup, action);
    app.destroy();
    const app2 = makeApp({ template: TEMPLATE });
    jit[name] = await measure(app2, setup, action);
    app2.destroy();
  }

  // the in-browser compiler and the precompiled template must do exactly the same work
  for (const name of Object.keys(SCENARIOS)) assert.deepEqual(jit[name].detail, result[name].detail, `${name}: JIT and AOT differ`);

  const current = Object.fromEntries(Object.entries(result).map(([k, v]) => [k, { dom: v.dom, effects: v.effects }]));
  if (process.env.UPDATE_PERF || !existsSync(BUDGET)) {
    writeFileSync(BUDGET, JSON.stringify({ note: 'DOM calls and effect runs per scenario (1000 rows). Regenerate with UPDATE_PERF=1 npm test.', scenarios: current }, null, 2) + '\n');
    return;
  }
  const budget = JSON.parse(readFileSync(BUDGET, 'utf8')).scenarios;
  const over = [], better = [];
  for (const [name, now] of Object.entries(current)) {
    const was = budget[name];
    assert.ok(was, `${name} is missing from tests/perf-budget.json (UPDATE_PERF=1 npm test)`);
    for (const metric of ['dom', 'effects']) {
      if (now[metric] > was[metric]) over.push(`${name}.${metric}: ${now[metric]} > ${was[metric]}  ${JSON.stringify(result[name].detail)}`);
      else if (now[metric] < was[metric]) better.push(`${name}.${metric}: ${now[metric]} < ${was[metric]}`);
    }
  }
  if (better.length) console.log('perf budget: improved (lock it in with UPDATE_PERF=1 npm test):\n  ' + better.join('\n  '));
  assert.deepEqual(over, [], 'a scenario now does more work than its budget. If that is intended, explain why and run UPDATE_PERF=1 npm test');
});
