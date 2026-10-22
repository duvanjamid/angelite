/**
 * Reactive forms on signals. Every control exposes its state as signals, so templates and effects react to it:
 *
 *   form = new FormGroup({
 *     name:  new FormControl('', [Validators.required, Validators.minLength(2)]),
 *     email: new FormControl('', [Validators.required, Validators.email])
 *   });
 *
 *   <input [(ngModel)]="form.get('name').value" (blur)="form.get('name').touch()">
 *   @if (form.get('name').touched() && form.get('name').errors()) { ... }
 *   <button [disabled]="!form.valid()">Send</button>
 *
 * A validator is `(value) => null | { errorKey: details }`.
 */

import { signal, computed } from './signals.js';

const blank = v => v == null || v === '' || (Array.isArray(v) && !v.length);

export const Validators = {
  required: v => (blank(v) ? { required: true } : null),
  minLength: n => v => (blank(v) || String(v).length >= n ? null : { minLength: { required: n, actual: String(v).length } }),
  maxLength: n => v => (blank(v) || String(v).length <= n ? null : { maxLength: { required: n, actual: String(v).length } }),
  min: n => v => (blank(v) || +v >= n ? null : { min: { min: n, actual: +v } }),
  max: n => v => (blank(v) || +v <= n ? null : { max: { max: n, actual: +v } }),
  pattern: re => v => (blank(v) || re.test(String(v)) ? null : { pattern: { pattern: String(re) } }),
  email: v => (blank(v) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : { email: true }),
  /** The value must equal what `other()` returns (for "repeat password"). */
  matches: other => v => (v === other() ? null : { matches: true })
};

/** Merges the errors of several validators; null when there are none. */
const run = (validators, value) => {
  let out = null;
  for (const validate of validators) {
    const e = validate(value);
    if (e) out = { ...out, ...e };
  }
  return out;
};

export class FormControl {
  constructor(initial = '', validators = []) {
    this.initial = initial;
    this.value = signal(initial);
    this.touched = signal(false);
    this.errors = computed(() => run(validators, this.value()));
    this.valid = computed(() => !this.errors());
    this.dirty = computed(() => !Object.is(this.value(), this.initial));
  }

  touch() { this.touched.set(true); }
  setValue(v) { this.value.set(v); }
  reset(v = this.initial) {
    this.initial = v;
    this.value.set(v);
    this.touched.set(false);
  }
}

/** Reads a form value without subscribing; used by the group aggregates. */
const sum = (controls, pick) => computed(() => controls().some(c => pick(c)()));

export class FormGroup {
  /** `controls`: { name: FormControl | FormGroup | FormArray }. `validators` run on the group's value. */
  constructor(controls, validators = []) {
    this.controls = controls;
    const list = () => Object.values(controls);
    this.value = computed(() => Object.fromEntries(Object.entries(controls).map(([k, c]) => [k, c.value()])));
    const own = computed(() => run(validators, this.value()));
    this.errors = computed(() => {
      const own_ = own();
      const nested = Object.fromEntries(Object.entries(controls).filter(([, c]) => c.errors()).map(([k, c]) => [k, c.errors()]));
      return own_ || Object.keys(nested).length ? { ...own_, ...(Object.keys(nested).length ? { controls: nested } : null) } : null;
    });
    this.valid = computed(() => !this.errors());
    this.touched = sum(list, c => c.touched);
    this.dirty = sum(list, c => c.dirty);
  }

  /** `get('address.street')` walks nested groups. */
  get(path) {
    return String(path).split('.').reduce((c, key) => (c ? (c.controls || {})[key] : undefined), this);
  }

  touch() { Object.values(this.controls).forEach(c => c.touch()); }
  setValue(v) { for (const k in v) if (this.controls[k]) this.controls[k].setValue(v[k]); }
  reset(v = {}) { for (const k in this.controls) this.controls[k].reset(v[k]); }
}

export class FormArray {
  constructor(controls = [], validators = []) {
    this.list = signal(controls);
    this.controls = this.list; // call it: array.controls() is the current list (for @for)
    this.value = computed(() => this.list().map(c => c.value()));
    const own = computed(() => run(validators, this.value()));
    this.errors = computed(() => {
      const nested = this.list().map(c => c.errors());
      return own() || nested.some(Boolean) ? { ...own(), ...(nested.some(Boolean) ? { controls: nested } : null) } : null;
    });
    this.valid = computed(() => !this.errors());
    this.touched = sum(this.list, c => c.touched);
    this.dirty = sum(this.list, c => c.dirty);
  }

  at(i) { return this.list.peek()[i]; }
  push(control) { this.list.update(l => [...l, control]); }
  removeAt(i) { this.list.update(l => l.filter((_, k) => k !== i)); }
  touch() { this.list.peek().forEach(c => c.touch()); }
  setValue(values) { values.forEach((v, i) => this.at(i) && this.at(i).setValue(v)); }
  reset() { this.list.peek().forEach(c => c.reset()); }
}
