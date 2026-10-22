/**
 * AngeLite UI — a small component library built on AngeLite Lite.
 * Every component is a plain class + component(); inputs are input(), events are output().
 */

import { signal, computed, component, input, output, inject } from '../lite/index.js';
import { css } from './styles.js';
import { installStyles } from './install.js';

installStyles(css);

export class Button {
  variant = input('default');
  size = input('md');
  disabled = input(false);
  loading = input(false);
}
component(Button, {
  selector: 'ui-button',
  template: `<button class="ui-btn" [attr.data-variant]="variant()" [attr.data-size]="size()" [disabled]="disabled() || loading()">
    @if (loading()) {<span class="ui-spinner"></span>}<ng-content></ng-content></button>`
});

export class Badge { variant = input('default'); }
component(Badge, {
  selector: 'ui-badge',
  template: `<span class="ui-badge" [attr.data-variant]="variant()"><ng-content></ng-content></span>`
});

export class Card { title = input(''); }
component(Card, {
  selector: 'ui-card',
  template: `<div class="ui-card">@if (title()) {<h4>{{ title() }}</h4>}<div class="body"><ng-content></ng-content></div></div>`
});

export class Alert {
  type = input('info');
  dismissible = input(false);
  closed = output();
  visible = signal(true);
  close() { this.visible.set(false); this.closed.emit(); }
}
component(Alert, {
  selector: 'ui-alert',
  template: `@if (visible()) {<div class="ui-alert" role="alert" [attr.data-type]="type()">
    <div class="msg"><ng-content></ng-content></div>
    @if (dismissible()) {<button aria-label="Cerrar" (click)="close()">×</button>}</div>}`
});

export class Avatar {
  name = input('');
  src = input('');
  size = input(36);
  initials = computed(() => this.name().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''));
}
component(Avatar, {
  selector: 'ui-avatar',
  template: `<span class="ui-avatar" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.4" [attr.title]="name()">
    @if (src()) {<img [src]="src()" [alt]="name()">} @else {{{ initials() }}}</span>`
});

export class Spinner {}
component(Spinner, { selector: 'ui-spinner', template: `<span class="ui-spinner" role="status"></span>` });

export class Progress {
  value = input(0);
  pct = computed(() => Math.max(0, Math.min(100, this.value())));
}
component(Progress, {
  selector: 'ui-progress',
  template: `<div class="ui-progress" role="progressbar" [attr.aria-valuenow]="pct()"><i [style.width.%]="pct()"></i></div>`
});

export class Skeleton { height = input(16); }
component(Skeleton, { selector: 'ui-skeleton', template: `<div class="ui-skeleton" [style.height.px]="height()"></div>` });

export class Toggle {
  checked = input(false);
  label = input('');
  changed = output();
  flip() { this.changed.emit(!this.checked()); }
}
component(Toggle, {
  selector: 'ui-toggle',
  template: `<label class="ui-toggle" [attr.data-on]="checked() ? 'true' : 'false'" (click)="flip()"><span class="track"></span>@if (label()) {<span>{{ label() }}</span>}</label>`
});

export class TextField {
  label = input('');
  value = input('');
  type = input('text');
  placeholder = input('');
  error = input('');
  valueChange = output();
  edit(e) { this.valueChange.emit(e.target.value); }
}
component(TextField, {
  selector: 'ui-text-field',
  template: `<div class="ui-field">@if (label()) {<label>{{ label() }}</label>}
    <input [type]="type()" [value]="value()" [placeholder]="placeholder()" (input)="edit($event)">
    @if (error()) {<div class="err">{{ error() }}</div>}</div>`
});

export class Select {
  label = input('');
  options = input([]);
  value = input('');
  valueChange = output();
  opts = computed(() => this.options().map(o => (typeof o === 'object' ? o : { value: o, label: o })));
  pick(e) { this.valueChange.emit(e.target.value); }
}
component(Select, {
  selector: 'ui-select',
  template: `<div class="ui-field">@if (label()) {<label>{{ label() }}</label>}
    <select (change)="pick($event)">@for (o of opts(); track o.value) {<option [value]="o.value" [selected]="o.value === value()">{{ o.label }}</option>}</select></div>`
});

export class Tabs {
  tabs = input([]);
  active = input('');
  activeChange = output();
  go(id) { this.activeChange.emit(id); }
}
component(Tabs, {
  selector: 'ui-tabs',
  template: `<div class="ui-tabs" role="tablist">@for (t of tabs(); track t.id) {
    <button role="tab" [class.active]="t.id === active()" (click)="go(t.id)">{{ t.label }}</button>}</div>`
});

export class AccordionItem {
  title = input('');
  open = signal(false);
  toggle() { this.open.update(v => !v); }
}
component(AccordionItem, {
  selector: 'ui-accordion-item',
  template: `<div class="ui-acc"><button (click)="toggle()"><span>{{ title() }}</span><span>{{ open() ? '−' : '+' }}</span></button>
    @if (open()) {<div class="body"><ng-content></ng-content></div>}</div>`
});

export class Modal {
  open = input(false);
  title = input('');
  closed = output();
  close() { this.closed.emit(); }
}
component(Modal, {
  selector: 'ui-modal',
  template: `@if (open()) {<div class="ui-backdrop" (click)="close()"><div class="ui-modal" role="dialog" (click)="$event.stopPropagation()">
    <header><span>{{ title() }}</span><button aria-label="Cerrar" (click)="close()">×</button></header>
    <div class="body"><ng-content></ng-content></div></div></div>}`
});

export class Dropdown {
  label = input('Menú');
  items = input([]);
  picked = output();
  open = signal(false);
  toggle() { this.open.update(v => !v); }
  pick(item) { this.open.set(false); this.picked.emit(item); }
}
component(Dropdown, {
  selector: 'ui-dropdown',
  template: `<div class="ui-dd"><button class="ui-btn" (click)="toggle()">{{ label() }} ▾</button>
    @if (open()) {<div class="menu">@for (it of items(); track it) {<button (click)="pick(it)">{{ it }}</button>}</div>}</div>`
});

export class Table {
  columns = input([]);
  rows = input([]);
  sortKey = signal('');
  sortDir = signal(1);
  sorted = computed(() => {
    const key = this.sortKey(), dir = this.sortDir(), rows = this.rows();
    if (!key) return rows;
    return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  });
  sort(key) {
    if (this.sortKey() === key) this.sortDir.update(d => -d);
    else { this.sortKey.set(key); this.sortDir.set(1); }
  }
}
component(Table, {
  selector: 'ui-table',
  template: `<table class="ui-table"><thead><tr>@for (c of columns(); track c.key) {
    <th (click)="sort(c.key)">{{ c.label }}{{ sortKey() === c.key ? (sortDir() > 0 ? ' ▲' : ' ▼') : '' }}</th>}</tr></thead>
    <tbody>@for (r of sorted(); track $index) {<tr>@for (c of columns(); track c.key) {<td>{{ r[c.key] }}</td>}</tr>}</tbody></table>`
});

export class Pagination {
  total = input(0);
  pageSize = input(10);
  page = input(1);
  pageChange = output();
  count = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  pages = computed(() => Array.from({ length: this.count() }, (_, i) => i + 1));
  go(p) { if (p >= 1 && p <= this.count()) this.pageChange.emit(p); }
}
component(Pagination, {
  selector: 'ui-pagination',
  template: `<div class="ui-pager"><button [disabled]="page() <= 1" (click)="go(page() - 1)">‹</button>
    @for (p of pages(); track p) {<button [class.active]="p === page()" (click)="go(p)">{{ p }}</button>}
    <button [disabled]="page() >= count()" (click)="go(page() + 1)">›</button></div>`
});

export class Stepper {
  steps = input([]);
  current = input(0);
}
component(Stepper, {
  selector: 'ui-stepper',
  template: `<div class="ui-stepper">@for (s of steps(); track $index) {
    @if ($index > 0) {<span class="bar"></span>}
    <span class="st" [class.done]="$index < current()" [class.now]="$index === current()"><span class="dot">{{ $index < current() ? '✓' : $index + 1 }}</span>{{ s }}</span>}</div>`
});

export class Rating {
  value = input(0);
  max = input(5);
  valueChange = output();
  stars = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));
}
component(Rating, {
  selector: 'ui-rating',
  template: `<span class="ui-rating">@for (n of stars(); track n)
    {<button [class.on]="n <= value()" [attr.aria-label]="n + ' estrellas'" (click)="valueChange.emit(n)">★</button>}</span>`
});

export class Tooltip { text = input(''); }
component(Tooltip, {
  selector: 'ui-tooltip',
  template: `<span class="ui-tip" [attr.data-text]="text()"><ng-content></ng-content></span>`
});

/** Shared service: inject(ToastService).show('Saved', 'success') */
export class ToastService {
  items = signal([]);
  next = 1;
  show(message, type = 'info', ms = 3000) {
    const id = this.next++;
    this.items.update(l => [...l, { id, message, type }]);
    setTimeout(() => this.dismiss(id), ms);
    return id;
  }
  dismiss(id) { this.items.update(l => l.filter(t => t.id !== id)); }
}

export class Toasts { toast = inject(ToastService); }
component(Toasts, {
  selector: 'ui-toasts',
  template: `<div class="ui-toasts">@for (t of toast.items(); track t.id) {<div class="ui-toast" role="status" [attr.data-type]="t.type" (click)="toast.dismiss(t.id)">{{ t.message }}</div>}</div>`
});

/** Every component, handy for `imports: UI.all`. */
export const all = [Button, Badge, Card, Alert, Avatar, Spinner, Progress, Skeleton, Toggle, TextField, Select,
  Tabs, AccordionItem, Modal, Dropdown, Table, Pagination, Stepper, Rating, Tooltip, Toasts];
