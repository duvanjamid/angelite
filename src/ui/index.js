/**
 * AngeLite UI: accessible components built on AngeLite.
 * Every component is a plain class + component(); inputs are input(), events are output(). Importing this module installs
 * the stylesheet once (theme it with the --ui-* CSS variables). Each component is marked pure, so a bundler keeps only the
 * ones you import.
 */

import { signal, computed, effect, component, input, output, inject } from '../index.js';
import { css } from './styles.js';
import { installStyles } from './install.js';
import { nextId, focusables, overlay, outsideClick } from './base.js';

installStyles(css);

const text = v => (v == null ? '' : String(v));
const options = list => list.map(o => (o !== null && typeof o === 'object' ? { value: o.value, label: text(o.label ?? o.value), disabled: !!o.disabled } : { value: o, label: text(o), disabled: false }));

/* ---------- basics ---------- */

export const Button = /* @__PURE__ */ component(class Button {
  variant = input('default');
  size = input('md');
  disabled = input(false);
  loading = input(false);
  type = input('button');
  block = input(false);
}, {
  selector: 'ui-button',
  template: `<button class="ui-btn" [type]="type()" [attr.data-variant]="variant()" [attr.data-size]="size()" [attr.data-block]="block() ? 'true' : 'false'"
    [disabled]="disabled() || loading()" [attr.aria-busy]="loading() ? 'true' : null">
    @if (loading()) {<span class="ui-spinner" aria-hidden="true"></span>}<ng-content></ng-content></button>`
});

export const Badge = /* @__PURE__ */ component(class Badge {
  variant = input('default');
  dot = input(false);
}, {
  selector: 'ui-badge',
  template: `<span class="ui-badge" [attr.data-variant]="variant()">@if (dot()) {<i class="dot" aria-hidden="true"></i>}<ng-content></ng-content></span>`
});

export const Chip = /* @__PURE__ */ component(class Chip {
  variant = input('default');
  removable = input(false);
  removeLabel = input('Quitar');
  removed = output();
}, {
  selector: 'ui-chip',
  template: `<span class="ui-chip" [attr.data-variant]="variant()" [attr.data-removable]="removable() ? 'true' : 'false'"><span><ng-content></ng-content></span>
    @if (removable()) {<button type="button" [attr.aria-label]="removeLabel()" (click)="removed.emit()">×</button>}</span>`
});

export const Avatar = /* @__PURE__ */ component(class Avatar {
  name = input('');
  src = input('');
  size = input(36);
  shape = input('circle');
  status = input('');
  initials = computed(() => this.name().split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join(''));
}, {
  selector: 'ui-avatar',
  template: `<span class="ui-avatar" [attr.data-shape]="shape()" [style.width.px]="size()" [style.height.px]="size()" [style.font-size.px]="size() * 0.4" role="img" [attr.aria-label]="name() || 'Avatar'">
    @if (src()) {<img [src]="src()" alt="">} @else {{{ initials() }}}@if (status()) {<i class="st" [attr.data-s]="status()"></i>}</span>`
});

export const Divider = /* @__PURE__ */ component(class Divider {
  label = input('');
}, {
  selector: 'ui-divider',
  template: `<div class="ui-divider" role="separator" [attr.data-plain]="label() ? 'false' : 'true'">@if (label()) {<span>{{ label() }}</span>}</div>`
});

export const Card = /* @__PURE__ */ component(class Card {
  title = input('');
}, {
  selector: 'ui-card',
  template: `<div class="ui-card">@if (title()) {<h4>{{ title() }}</h4>}<div class="body"><ng-content></ng-content></div><div class="foot"><ng-content select="footer"></ng-content></div></div>`
});

export const Alert = /* @__PURE__ */ component(class Alert {
  type = input('info');
  title = input('');
  dismissible = input(false);
  closeLabel = input('Cerrar');
  closed = output();
  visible = signal(true);
  isUrgent = computed(() => this.type() === 'error' || this.type() === 'warning');
  close() { this.visible.set(false); this.closed.emit(); }
}, {
  selector: 'ui-alert',
  template: `@if (visible()) {<div class="ui-alert" [attr.role]="isUrgent() ? 'alert' : 'status'" [attr.data-type]="type()">
    <div class="msg">@if (title()) {<span class="ttl">{{ title() }}</span>}<ng-content></ng-content></div>
    @if (dismissible()) {<button type="button" [attr.aria-label]="closeLabel()" (click)="close()">×</button>}</div>}`
});

export const Spinner = /* @__PURE__ */ component(class Spinner {
  label = input('Cargando');
}, { selector: 'ui-spinner', template: `<span class="ui-spinner" role="status" [attr.aria-label]="label()"></span>` });

export const Progress = /* @__PURE__ */ component(class Progress {
  value = input(0);
  max = input(100);
  label = input('');
  variant = input('primary');
  indeterminate = input(false);
  pct = computed(() => (this.max() > 0 ? Math.max(0, Math.min(100, (this.value() / this.max()) * 100)) : 0));
  shown = computed(() => Math.round(this.pct()) + '%');
}, {
  selector: 'ui-progress',
  template: `<div class="ui-progress-wrap">@if (label()) {<div class="lbl"><span>{{ label() }}</span><span>{{ indeterminate() ? '' : shown() }}</span></div>}
    <div class="ui-progress" role="progressbar" [attr.aria-label]="label() || null" aria-valuemin="0" [attr.aria-valuemax]="max()" [attr.aria-valuenow]="indeterminate() ? null : value()"
      [attr.data-variant]="variant()" [attr.data-indeterminate]="indeterminate() ? 'true' : 'false'"><i [style.width.%]="indeterminate() ? null : pct()"></i></div></div>`
});

export const Skeleton = /* @__PURE__ */ component(class Skeleton {
  height = input(16);
  width = input('100%');
  circle = input(false);
}, { selector: 'ui-skeleton', template: `<div class="ui-skeleton" aria-hidden="true" [attr.data-circle]="circle() ? 'true' : 'false'" [style.height.px]="height()" [style.width]="width()"></div>` });

export const EmptyState = /* @__PURE__ */ component(class EmptyState {
  title = input('Sin resultados');
  description = input('');
}, {
  selector: 'ui-empty-state',
  template: `<div class="ui-empty"><h4>{{ title() }}</h4>@if (description()) {<p>{{ description() }}</p>}<div><ng-content></ng-content></div></div>`
});

/* ---------- form controls ---------- */

export const TextField = /* @__PURE__ */ component(class TextField {
  label = input('');
  value = input('');
  type = input('text');
  placeholder = input('');
  hint = input('');
  error = input('');
  name = input('');
  disabled = input(false);
  readonly = input(false);
  required = input(false);
  valueChange = output();
  id = nextId('field');
  edit(e) { this.valueChange.emit(e.target.value); }
}, {
  selector: 'ui-text-field',
  template: `<div class="ui-field" [attr.data-invalid]="error() ? 'true' : 'false'">
    @if (label()) {<label class="lbl" [attr.for]="id">{{ label() }}@if (required()) {<span class="req" aria-hidden="true"> *</span>}</label>}
    <input [attr.id]="id" [type]="type()" [value]="value()" [placeholder]="placeholder()" [attr.name]="name() || null" [disabled]="disabled()" [readOnly]="readonly()" [required]="required()"
      [attr.aria-invalid]="error() ? 'true' : null" [attr.aria-describedby]="error() || hint() ? id + '-d' : null" (input)="edit($event)">
    @if (error()) {<div class="err" [attr.id]="id + '-d'">{{ error() }}</div>} @else if (hint()) {<div class="hint" [attr.id]="id + '-d'">{{ hint() }}</div>}</div>`
});

export const Textarea = /* @__PURE__ */ component(class Textarea {
  label = input('');
  value = input('');
  rows = input(4);
  placeholder = input('');
  hint = input('');
  error = input('');
  name = input('');
  disabled = input(false);
  readonly = input(false);
  required = input(false);
  valueChange = output();
  id = nextId('area');
  edit(e) { this.valueChange.emit(e.target.value); }
}, {
  selector: 'ui-textarea',
  template: `<div class="ui-field" [attr.data-invalid]="error() ? 'true' : 'false'">
    @if (label()) {<label class="lbl" [attr.for]="id">{{ label() }}@if (required()) {<span class="req" aria-hidden="true"> *</span>}</label>}
    <textarea [attr.id]="id" [rows]="rows()" [value]="value()" [placeholder]="placeholder()" [attr.name]="name() || null" [disabled]="disabled()" [readOnly]="readonly()" [required]="required()"
      [attr.aria-invalid]="error() ? 'true' : null" [attr.aria-describedby]="error() || hint() ? id + '-d' : null" (input)="edit($event)"></textarea>
    @if (error()) {<div class="err" [attr.id]="id + '-d'">{{ error() }}</div>} @else if (hint()) {<div class="hint" [attr.id]="id + '-d'">{{ hint() }}</div>}</div>`
});

export const Select = /* @__PURE__ */ component(class Select {
  label = input('');
  options = input([]);
  value = input('');
  hint = input('');
  error = input('');
  disabled = input(false);
  required = input(false);
  valueChange = output();
  id = nextId('select');
  opts = computed(() => options(this.options()));
  pick(e) { this.valueChange.emit(e.target.value); }
}, {
  selector: 'ui-select',
  template: `<div class="ui-field" [attr.data-invalid]="error() ? 'true' : 'false'">
    @if (label()) {<label class="lbl" [attr.for]="id">{{ label() }}@if (required()) {<span class="req" aria-hidden="true"> *</span>}</label>}
    <select [attr.id]="id" [disabled]="disabled()" [required]="required()" [attr.aria-invalid]="error() ? 'true' : null" [attr.aria-describedby]="error() || hint() ? id + '-d' : null" (change)="pick($event)">
      @for (o of opts(); track o.value) {<option [value]="o.value" [disabled]="o.disabled" [selected]="o.value === value()">{{ o.label }}</option>}</select>
    @if (error()) {<div class="err" [attr.id]="id + '-d'">{{ error() }}</div>} @else if (hint()) {<div class="hint" [attr.id]="id + '-d'">{{ hint() }}</div>}</div>`
});

export const Checkbox = /* @__PURE__ */ component(class Checkbox {
  label = input('');
  checked = input(false);
  indeterminate = input(false);
  disabled = input(false);
  name = input('');
  changed = output();
  change(e) { this.changed.emit(e.target.checked); }
}, {
  selector: 'ui-checkbox',
  template: `<label class="ui-check" [attr.data-disabled]="disabled() ? 'true' : 'false'"><input type="checkbox" [attr.name]="name() || null" [checked]="checked()" [indeterminate]="indeterminate()" [disabled]="disabled()" (change)="change($event)">
    <span>@if (label()) {{{ label() }}}<ng-content></ng-content></span></label>`
});

export const RadioGroup = /* @__PURE__ */ component(class RadioGroup {
  label = input('');
  options = input([]);
  value = input('');
  disabled = input(false);
  valueChange = output();
  name = nextId('radio');
  opts = computed(() => options(this.options()));
  pick(v) { this.valueChange.emit(v); }
}, {
  selector: 'ui-radio-group',
  template: `<fieldset class="ui-radios" [disabled]="disabled()">@if (label()) {<legend>{{ label() }}</legend>}
    @for (o of opts(); track o.value) {<label><input type="radio" [attr.name]="name" [value]="o.value" [checked]="o.value === value()" [disabled]="o.disabled" (change)="pick(o.value)"><span>{{ o.label }}</span></label>}</fieldset>`
});

export const Toggle = /* @__PURE__ */ component(class Toggle {
  checked = input(false);
  label = input('');
  disabled = input(false);
  changed = output();
  flip() { if (!this.disabled()) this.changed.emit(!this.checked()); }
}, {
  selector: 'ui-toggle',
  template: `<button type="button" class="ui-toggle" role="switch" [attr.aria-checked]="checked() ? 'true' : 'false'" [attr.data-on]="checked() ? 'true' : 'false'" [disabled]="disabled()" (click)="flip()">
    <span class="track"></span>@if (label()) {<span>{{ label() }}</span>}</button>`
});

export const Slider = /* @__PURE__ */ component(class Slider {
  label = input('');
  value = input(0);
  min = input(0);
  max = input(100);
  step = input(1);
  disabled = input(false);
  showValue = input(true);
  valueChange = output();
  id = nextId('slider');
  edit(e) { this.valueChange.emit(Number(e.target.value)); }
}, {
  selector: 'ui-slider',
  template: `<div class="ui-field">@if (label()) {<label class="lbl" [attr.for]="id">{{ label() }}</label>}
    <div class="ui-slider"><input [attr.id]="id" type="range" [min]="min()" [max]="max()" [step]="step()" [value]="value()" [disabled]="disabled()" (input)="edit($event)">
    @if (showValue()) {<output [attr.for]="id">{{ value() }}</output>}</div></div>`
});

export const Rating = /* @__PURE__ */ component(class Rating {
  value = input(0);
  max = input(5);
  readonly = input(false);
  label = input('Valoración');
  valueChange = output();
  stars = computed(() => Array.from({ length: this.max() }, (_, i) => i + 1));
  focusable = computed(() => (this.value() >= 1 ? this.value() : 1));
  set(n) { if (!this.readonly() && n >= 1 && n <= this.max()) this.valueChange.emit(n); }
  key(e) {
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
    if (!step) return;
    e.preventDefault();
    const to = Math.max(1, Math.min(this.max(), (this.value() || 0) + step));
    this.set(to);
    const next = this.$el.querySelector(`button[data-n="${to}"]`);
    if (next) next.focus();
  }
}, {
  selector: 'ui-rating',
  template: `<span class="ui-rating" role="radiogroup" [attr.aria-label]="label()" [attr.aria-readonly]="readonly() ? 'true' : null" [attr.data-readonly]="readonly() ? 'true' : 'false'" (keydown)="key($event)">@for (n of stars(); track n)
    {<button type="button" role="radio" [attr.data-n]="n" [class.on]="n <= value()" [attr.aria-checked]="n === value() ? 'true' : 'false'" [attr.aria-label]="n + (n === 1 ? ' estrella' : ' estrellas')" [attr.tabindex]="n === focusable() ? 0 : -1" (click)="set(n)">★</button>}</span>`
});

export const Combobox = /* @__PURE__ */ component(class Combobox {
  label = input('');
  options = input([]);
  value = input('');
  placeholder = input('Buscar…');
  emptyText = input('Sin coincidencias');
  disabled = input(false);
  valueChange = output();
  id = nextId('combo');
  open = signal(false);
  query = signal('');
  typed = signal(false);
  active = signal(0);
  opts = computed(() => options(this.options()));
  selected = computed(() => this.opts().find(o => o.value === this.value()));
  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    return !this.typed() || !q ? this.opts() : this.opts().filter(o => o.label.toLowerCase().includes(q));
  });
  shown = computed(() => (this.typed() ? this.query() : this.selected() ? this.selected().label : ''));
  activeId = computed(() => (this.open() && this.filtered()[this.active()] ? `${this.id}-o${this.active()}` : null));
  stop = outsideClick(() => this.open(), () => this.$el, () => this.close());
  ngOnDestroy() { this.stop(); }
  close() { this.open.set(false); this.typed.set(false); }
  type(e) { this.query.set(e.target.value); this.typed.set(true); this.active.set(0); this.open.set(true); }
  choose(o) {
    if (!o || o.disabled) return;
    this.valueChange.emit(o.value);
    this.close();
  }
  key(e) {
    const n = this.filtered().length;
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!this.open()) this.open.set(true); else this.active.set((this.active() + 1) % Math.max(n, 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); this.active.set((this.active() - 1 + Math.max(n, 1)) % Math.max(n, 1)); }
    else if (e.key === 'Enter' && this.open()) { e.preventDefault(); this.choose(this.filtered()[this.active()]); }
    else if (e.key === 'Escape' && this.open()) { e.preventDefault(); this.close(); }
    else if (e.key === 'Home' && this.open()) { e.preventDefault(); this.active.set(0); }
    else if (e.key === 'End' && this.open()) { e.preventDefault(); this.active.set(Math.max(n - 1, 0)); }
  }
}, {
  selector: 'ui-combobox',
  template: `<div class="ui-field ui-combo">@if (label()) {<label class="lbl" [attr.for]="id">{{ label() }}</label>}
    <input [attr.id]="id" type="text" role="combobox" autocomplete="off" [value]="shown()" [placeholder]="placeholder()" [disabled]="disabled()" aria-autocomplete="list"
      [attr.aria-expanded]="open() ? 'true' : 'false'" [attr.aria-controls]="id + '-l'" [attr.aria-activedescendant]="activeId()" (input)="type($event)" (keydown)="key($event)" (focus)="open.set(true)">
    @if (open()) {<ul role="listbox" [attr.id]="id + '-l'">@for (o of filtered(); track o.value) {<li role="option" [attr.id]="id + '-o' + $index" [attr.aria-selected]="$index === active() ? 'true' : 'false'" [attr.data-current]="o.value === value() ? 'true' : 'false'"
        [attr.aria-disabled]="o.disabled ? 'true' : null" (click)="choose(o)">{{ o.label }}</li>} @empty {<li class="none" role="option" aria-disabled="true">{{ emptyText() }}</li>}</ul>}</div>`
});

/* ---------- navigation ---------- */

export const Tabs = /* @__PURE__ */ component(class Tabs {
  tabs = input([]);
  active = input('');
  label = input('');
  activeChange = output();
  id = nextId('tabs');
  go(id) { this.activeChange.emit(id); }
  key(e) {
    const list = this.tabs();
    const at = list.findIndex(t => t.id === this.active());
    let to = -1;
    if (e.key === 'ArrowRight') to = (at + 1) % list.length;
    else if (e.key === 'ArrowLeft') to = (at - 1 + list.length) % list.length;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = list.length - 1;
    if (to < 0) return;
    e.preventDefault();
    this.go(list[to].id);
    const buttons = this.$el.querySelectorAll('[role=tab]');
    if (buttons[to]) buttons[to].focus();
  }
}, {
  selector: 'ui-tabs',
  template: `<div class="ui-tabs" role="tablist" [attr.aria-label]="label() || null" (keydown)="key($event)">@for (t of tabs(); track t.id) {
    <button type="button" role="tab" [attr.id]="id + '-' + t.id" [class.active]="t.id === active()" [attr.aria-selected]="t.id === active() ? 'true' : 'false'" [attr.tabindex]="t.id === active() ? 0 : -1" (click)="go(t.id)">{{ t.label }}</button>}</div>`
});

export const Breadcrumb = /* @__PURE__ */ component(class Breadcrumb {
  items = input([]);
  separator = input('/');
  label = input('Ruta de navegación');
}, {
  selector: 'ui-breadcrumb',
  template: `<nav class="ui-crumbs" [attr.aria-label]="label()"><ol>@for (it of items(); track $index)
    {<li [attr.data-sep]="$first ? null : separator()">@if (it.href && !$last) {<a [href]="it.href">{{ it.label }}</a>} @else {<span [attr.aria-current]="$last ? 'page' : null">{{ it.label }}</span>}</li>}</ol></nav>`
});

export const Pagination = /* @__PURE__ */ component(class Pagination {
  total = input(0);
  pageSize = input(10);
  page = input(1);
  siblings = input(1);
  prevLabel = input('Anterior');
  nextLabel = input('Siguiente');
  label = input('Paginación');
  pageChange = output();
  count = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  items = computed(() => {
    const count = this.count(), page = Math.min(this.page(), count), s = this.siblings();
    const keep = new Set([1, count]);
    for (let p = page - s; p <= page + s; p++) if (p >= 1 && p <= count) keep.add(p);
    const out = [];
    let last = 0;
    for (const p of [...keep].sort((a, b) => a - b)) {
      if (p - last > 1) out.push({ gap: true, key: 'g' + p });
      out.push({ gap: false, n: p, key: p });
      last = p;
    }
    return out;
  });
  go(p) { if (p >= 1 && p <= this.count() && p !== this.page()) this.pageChange.emit(p); }
}, {
  selector: 'ui-pagination',
  template: `<nav class="ui-pager" [attr.aria-label]="label()"><button type="button" [attr.aria-label]="prevLabel()" [disabled]="page() <= 1" (click)="go(page() - 1)">‹</button>
    @for (it of items(); track it.key) {@if (it.gap) {<span class="gap" aria-hidden="true">…</span>} @else {<button type="button" [class.active]="it.n === page()" [attr.aria-current]="it.n === page() ? 'page' : null" [attr.aria-label]="'Página ' + it.n" (click)="go(it.n)">{{ it.n }}</button>}}
    <button type="button" [attr.aria-label]="nextLabel()" [disabled]="page() >= count()" (click)="go(page() + 1)">›</button></nav>`
});

export const Stepper = /* @__PURE__ */ component(class Stepper {
  steps = input([]);
  current = input(0);
  label = input('Progreso');
}, {
  selector: 'ui-stepper',
  template: `<ol class="ui-stepper" [attr.aria-label]="label()">@for (s of steps(); track $index) {
    @if ($index > 0) {<li class="bar" aria-hidden="true"></li>}
    <li class="st" [class.done]="$index < current()" [class.now]="$index === current()" [attr.aria-current]="$index === current() ? 'step' : null"><span class="dot">{{ $index < current() ? '✓' : $index + 1 }}</span>{{ s }}</li>}</ol>`
});

export const AccordionItem = /* @__PURE__ */ component(class AccordionItem {
  title = input('');
  open = input(false);
  toggled = output();
  state = signal(null);
  id = nextId('acc');
  isOpen = computed(() => (this.state() === null ? this.open() : this.state()));
  toggle() { const v = !this.isOpen(); this.state.set(v); this.toggled.emit(v); }
}, {
  selector: 'ui-accordion-item',
  template: `<div class="ui-acc"><button type="button" [attr.id]="id + '-h'" [attr.aria-expanded]="isOpen() ? 'true' : 'false'" [attr.aria-controls]="id + '-p'" (click)="toggle()"><span>{{ title() }}</span><span aria-hidden="true">{{ isOpen() ? '−' : '+' }}</span></button>
    @if (isOpen()) {<div class="body" role="region" [attr.id]="id + '-p'" [attr.aria-labelledby]="id + '-h'"><ng-content></ng-content></div>}</div>`
});

export const Dropdown = /* @__PURE__ */ component(class Dropdown {
  label = input('Menú');
  items = input([]);
  align = input('start');
  variant = input('default');
  picked = output();
  open = signal(false);
  id = nextId('menu');
  opts = computed(() => options(this.items()));
  stop = outsideClick(() => this.open(), () => this.$el, () => this.open.set(false));
  ngOnDestroy() { this.stop(); }
  toggle() { this.open.update(v => !v); if (this.open()) queueMicrotask(() => this.move(0)); }
  menuItems() { return [...this.$el.querySelectorAll('[role=menuitem]:not([aria-disabled=true])')]; }
  move(to) {
    const list = this.menuItems();
    if (list.length) list[(to + list.length) % list.length].focus();
  }
  pick(o) {
    if (o.disabled) return;
    this.open.set(false);
    this.picked.emit(o.value);
    const trigger = this.$el.querySelector('.ui-btn');
    if (trigger) trigger.focus();
  }
  key(e) {
    const list = this.menuItems(), at = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); if (!this.open()) this.toggle(); else this.move(at + 1); }
    else if (e.key === 'ArrowUp' && this.open()) { e.preventDefault(); this.move(at - 1); }
    else if (e.key === 'Home' && this.open()) { e.preventDefault(); this.move(0); }
    else if (e.key === 'End' && this.open()) { e.preventDefault(); this.move(-1); }
    else if (e.key === 'Escape' && this.open()) {
      e.preventDefault();
      this.open.set(false);
      const trigger = this.$el.querySelector('.ui-btn');
      if (trigger) trigger.focus();
    } else if (e.key === 'Tab') this.open.set(false);
  }
}, {
  selector: 'ui-dropdown',
  template: `<div class="ui-dd" [attr.data-align]="align()" (keydown)="key($event)"><button type="button" class="ui-btn" [attr.data-variant]="variant()" aria-haspopup="menu" [attr.aria-expanded]="open() ? 'true' : 'false'" [attr.aria-controls]="id" (click)="toggle()">{{ label() }} <span aria-hidden="true">▾</span></button>
    @if (open()) {<div class="menu" role="menu" [attr.id]="id">@for (o of opts(); track o.value) {<button type="button" role="menuitem" [attr.aria-disabled]="o.disabled ? 'true' : null" tabindex="-1" (click)="pick(o)">{{ o.label }}</button>}</div>}</div>`
});

/* ---------- overlays ---------- */

export const Modal = /* @__PURE__ */ component(class Modal {
  open = input(false);
  title = input('');
  size = input('md');
  closeOnBackdrop = input(true);
  closeLabel = input('Cerrar');
  closed = output();
  id = nextId('modal');
  release = overlay(this.open, () => this.$el.querySelector('.ui-modal'), () => this.close());
  ngOnDestroy() { this.release(); }
  close() { this.closed.emit(); }
  // events are delegated to the document, so currentTarget is not the element: test the target's class
  backdrop(e) { if (e.target.classList.contains('ui-backdrop') && this.closeOnBackdrop()) this.close(); }
}, {
  selector: 'ui-modal',
  template: `@if (open()) {<div class="ui-backdrop" (click)="backdrop($event)"><div class="ui-modal" role="dialog" aria-modal="true" tabindex="-1" [attr.data-size]="size()" [attr.aria-labelledby]="title() ? id + '-t' : null">
    <header><span [attr.id]="id + '-t'">{{ title() }}</span><button type="button" data-close [attr.aria-label]="closeLabel()" (click)="close()">×</button></header>
    <div class="body"><ng-content></ng-content></div></div></div>}`
});

export const Drawer = /* @__PURE__ */ component(class Drawer {
  open = input(false);
  title = input('');
  side = input('left');
  closeLabel = input('Cerrar');
  closed = output();
  id = nextId('drawer');
  release = overlay(this.open, () => this.$el.querySelector('.ui-drawer'), () => this.close());
  ngOnDestroy() { this.release(); }
  close() { this.closed.emit(); }
  backdrop(e) { if (e.target.classList.contains('ui-drawer-wrap')) this.close(); }
}, {
  selector: 'ui-drawer',
  template: `@if (open()) {<div class="ui-drawer-wrap" [attr.data-side]="side()" (click)="backdrop($event)"><div class="ui-drawer" role="dialog" aria-modal="true" tabindex="-1" [attr.aria-labelledby]="title() ? id + '-t' : null">
    <header><span [attr.id]="id + '-t'">{{ title() }}</span><button type="button" data-close [attr.aria-label]="closeLabel()" (click)="close()">×</button></header>
    <div class="body"><ng-content></ng-content></div></div></div>}`
});

export const Popover = /* @__PURE__ */ component(class Popover {
  label = input('Abrir');
  placement = input('bottom');
  align = input('start');
  variant = input('default');
  toggled = output();
  open = signal(false);
  id = nextId('pop');
  stop = outsideClick(() => this.open(), () => this.$el, () => this.set(false));
  ngOnDestroy() { this.stop(); }
  set(v) { if (this.open() !== v) { this.open.set(v); this.toggled.emit(v); } }
  key(e) {
    if (e.key === 'Escape' && this.open()) {
      this.set(false);
      const trigger = this.$el.querySelector('.ui-btn');
      if (trigger) trigger.focus();
    }
  }
}, {
  selector: 'ui-popover',
  template: `<div class="ui-pop" [attr.data-placement]="placement()" [attr.data-align]="align()" (keydown)="key($event)"><button type="button" class="ui-btn" [attr.data-variant]="variant()" [attr.aria-expanded]="open() ? 'true' : 'false'" [attr.aria-controls]="id" (click)="set(!open())">{{ label() }}</button>
    @if (open()) {<div class="panel" role="dialog" [attr.id]="id"><ng-content></ng-content></div>}</div>`
});

export const Tooltip = /* @__PURE__ */ component(class Tooltip {
  text = input('');
  placement = input('top');
  id = nextId('tip');
}, {
  selector: 'ui-tooltip',
  template: `<span class="ui-tip" tabindex="0" [attr.data-placement]="placement()" [attr.aria-describedby]="id"><ng-content></ng-content><span class="tip" role="tooltip" [attr.id]="id">{{ text() }}</span></span>`
});

/** Shared service: inject(ToastService).show('Saved', 'success'). `ms: 0` keeps the toast until it is dismissed. */
export class ToastService {
  items = signal([]);
  next = 1;
  timers = new Map();
  show(message, type = 'info', ms = 3500) {
    const id = this.next++;
    this.items.update(l => [...l, { id, message, type }]);
    if (ms > 0) this.timers.set(id, setTimeout(() => this.dismiss(id), ms));
    return id;
  }
  dismiss(id) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.items.update(l => l.filter(t => t.id !== id));
  }
  clear() { [...this.items()].forEach(t => this.dismiss(t.id)); }
}

export const Toasts = /* @__PURE__ */ component(class Toasts {
  toast = inject(ToastService);
  closeLabel = input('Cerrar');
}, {
  selector: 'ui-toasts',
  template: `<div class="ui-toasts" aria-live="polite" aria-atomic="false">@for (t of toast.items(); track t.id) {<div class="ui-toast" role="status" [attr.data-type]="t.type"><span class="m">{{ t.message }}</span>
    <button type="button" [attr.aria-label]="closeLabel()" (click)="toast.dismiss(t.id)">×</button></div>}</div>`
});

/* ---------- data display ---------- */

export const Table = /* @__PURE__ */ component(class Table {
  columns = input([]);
  rows = input([]);
  caption = input('');
  empty = input('Sin datos');
  dense = input(false);
  striped = input(false);
  rowKey = input('');
  sortKey = signal('');
  sortDir = signal(1);
  cols = computed(() => this.columns().map(c => ({ key: c.key, label: c.label ?? c.key, sortable: c.sortable !== false, align: c.align || 'left' })));
  sorted = computed(() => {
    const key = this.sortKey(), dir = this.sortDir(), rows = this.rows();
    if (!key) return rows;
    return [...rows].sort((a, b) => (a[key] > b[key] ? 1 : a[key] < b[key] ? -1 : 0) * dir);
  });
  sort(key) {
    if (this.sortKey() === key) this.sortDir.update(d => -d);
    else { this.sortKey.set(key); this.sortDir.set(1); }
  }
  ariaSort(key) { return this.sortKey() === key ? (this.sortDir() > 0 ? 'ascending' : 'descending') : 'none'; }
  keyOf(row, i) { return this.rowKey() ? row[this.rowKey()] : i; }
}, {
  selector: 'ui-table',
  template: `<div class="ui-table-wrap"><table class="ui-table" [attr.data-dense]="dense() ? 'true' : 'false'" [attr.data-striped]="striped() ? 'true' : 'false'">
    @if (caption()) {<caption>{{ caption() }}</caption>}
    <thead><tr>@for (c of cols(); track c.key) {<th scope="col" [style.text-align]="c.align" [attr.aria-sort]="c.sortable ? ariaSort(c.key) : null">
      @if (c.sortable) {<button type="button" class="ui-th" (click)="sort(c.key)">{{ c.label }}<span aria-hidden="true">{{ sortKey() === c.key ? (sortDir() > 0 ? '▲' : '▼') : '' }}</span></button>} @else {{{ c.label }}}</th>}</tr></thead>
    <tbody>@for (r of sorted(); track keyOf(r, $index)) {<tr>@for (c of cols(); track c.key) {<td [style.text-align]="c.align">{{ r[c.key] }}</td>}</tr>} @empty {<tr><td class="empty" [attr.colspan]="cols().length || 1">{{ empty() }}</td></tr>}</tbody></table></div>`
});

export const CodeBlock = /* @__PURE__ */ component(class CodeBlock {
  code = input('');
  language = input('');
  copyLabel = input('Copiar');
  copiedLabel = input('Copiado');
  copied = signal(false);
  timer = null;
  ngOnDestroy() { clearTimeout(this.timer); }
  async copy() {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(this.code());
      else {
        const area = document.createElement('textarea');
        area.value = this.code();
        document.body.append(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      this.copied.set(true);
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.copied.set(false), 1500);
    } catch (e) { this.copied.set(false); }
  }
}, {
  selector: 'ui-code-block',
  template: `<div class="ui-code"><div class="bar"><span>{{ language() }}</span><button type="button" (click)="copy()" aria-live="polite">{{ copied() ? copiedLabel() : copyLabel() }}</button></div><pre><code>{{ code() }}</code></pre></div>`
});

/** Every component, handy for `imports: UI.all`. */
export const all = [Button, Badge, Chip, Avatar, Divider, Card, Alert, Spinner, Progress, Skeleton, EmptyState,
  TextField, Textarea, Select, Checkbox, RadioGroup, Toggle, Slider, Rating, Combobox,
  Tabs, Breadcrumb, Pagination, Stepper, AccordionItem, Dropdown,
  Modal, Drawer, Popover, Tooltip, Toasts, Table, CodeBlock];

export { focusables };
