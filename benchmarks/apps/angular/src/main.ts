import { ChangeDetectionStrategy, Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
// @ts-ignore shared plain-JS module
import { buildRows, updateEveryTenth, swapRows, removeRow } from '../../shared.js';

interface Row { id: number; label: string }

const rows = signal<Row[]>([]);
const selected = signal(0);

@Component({
  selector: 'app-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<table class="table"><tbody>
    @for (r of rows(); track r.id) {
      <tr [class.danger]="r.id === selected()">
        <td class="col-id">{{ r.id }}</td>
        <td class="col-label"><a (click)="select(r.id)">{{ r.label }}</a></td>
        <td class="col-remove"><a (click)="remove(r.id)">×</a></td>
      </tr>
    }
  </tbody></table>`
})
class App {
  rows = rows;
  selected = selected;
  select(id: number) { selected.set(id); }
  remove(id: number) { rows.update(r => removeRow(r, id)); }
}

bootstrapApplication(App, { providers: [provideZonelessChangeDetection()] }).then(() => {
  setTimeout(() => { (window as any).__ready = performance.now(); });
});

(window as any).bench = {
  run: (n: number) => rows.set(buildRows(n)),
  add: (n: number) => rows.update(r => r.concat(buildRows(n))),
  update: () => rows.update(updateEveryTenth),
  swap: () => rows.update(swapRows),
  select: (id: number) => selected.set(id),
  remove: (id: number) => rows.update(r => removeRow(r, id)),
  clear: () => rows.set([])
};
