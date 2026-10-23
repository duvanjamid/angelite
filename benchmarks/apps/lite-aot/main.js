// Same app as ../lite, but the template is precompiled (tools/aot.mjs) and only the runtime is shipped.
import { signal, component, mount } from '../../../src/lite/api.js';
import { buildRows, updateEveryTenth, swapRows, removeRow } from '../shared.js';
import aot from './app.ng.html';

const rows = signal([]);
const selected = signal(0);

class App {
  rows = rows;
  selected = selected;
  select(id) { selected.set(id); }
  remove(id) { rows.update(r => removeRow(r, id)); }
}
component(App, { aot });

mount(App, document.getElementById('app'));
setTimeout(() => { window.__ready = performance.now(); });
window.bench = {
  run: n => rows.set(buildRows(n)),
  add: n => rows.update(r => r.concat(buildRows(n))),
  update: () => rows.update(updateEveryTenth),
  swap: () => rows.update(swapRows),
  select: id => selected.set(id),
  remove: id => rows.update(r => removeRow(r, id)),
  clear: () => rows.set([])
};
