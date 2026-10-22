import { signal, component, mount } from '../../../src/lite/index.js';
import { buildRows, updateEveryTenth, swapRows, removeRow } from '../shared.js';

const rows = signal([]);
const selected = signal(0);

class App {
  rows = rows;
  selected = selected;
  select(id) { selected.set(id); }
  remove(id) { rows.update(r => removeRow(r, id)); }
}
component(App, {
  template: `<table class="table"><tbody>
    @for (r of rows(); track r.id) {
      <tr [class.danger]="r.id === selected()">
        <td class="col-id">{{ r.id }}</td>
        <td class="col-label"><a (click)="select(r.id)">{{ r.label }}</a></td>
        <td class="col-remove"><a (click)="remove(r.id)">×</a></td>
      </tr>
    }
  </tbody></table>`
});

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
