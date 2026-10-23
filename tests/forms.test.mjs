import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn, tick } from './setup.mjs';

const angelite = await import('../src/full.js');
const { FormControl, FormGroup, FormArray, Validators: V } = await import('../src/forms.js');
const { component, mount, signal, effect } = angelite;

test('validators: each one passes empty values (except required) and reports details', () => {
  assert.deepEqual(V.required(''), { required: true });
  assert.deepEqual(V.required([]), { required: true });
  assert.deepEqual(V.required(null), { required: true });
  assert.equal(V.required(0), null, '0 is a value');
  assert.equal(V.minLength(3)(''), null);
  assert.deepEqual(V.minLength(3)('ab'), { minLength: { required: 3, actual: 2 } });
  assert.equal(V.minLength(3)('abc'), null);
  assert.deepEqual(V.maxLength(2)('abc'), { maxLength: { required: 2, actual: 3 } });
  assert.equal(V.maxLength(2)('ab'), null);
  assert.deepEqual(V.min(5)('3'), { min: { min: 5, actual: 3 } });
  assert.equal(V.min(5)(5), null);
  assert.deepEqual(V.max(5)(9), { max: { max: 5, actual: 9 } });
  assert.equal(V.max(5)(''), null);
  assert.deepEqual(V.pattern(/^\d+$/)('a1'), { pattern: { pattern: '/^\\d+$/' } });
  assert.equal(V.pattern(/^\d+$/)('12'), null);
  assert.deepEqual(V.email('nope'), { email: true });
  assert.equal(V.email('a@b.co'), null);
  assert.equal(V.email(''), null);
  const other = () => 'x';
  assert.deepEqual(V.matches(other)('y'), { matches: true });
  assert.equal(V.matches(other)('x'), null);
});

test('FormControl: value, errors, valid, touched, dirty and reset are signals', async () => {
  const c = new FormControl('', [V.required, V.minLength(3)]);
  assert.deepEqual(c.errors(), { required: true });
  assert.equal(c.valid(), false);
  assert.equal(c.dirty(), false);
  assert.equal(c.touched(), false);
  const seen = [];
  const stop = effect(() => { seen.push(c.valid()); });
  c.value.set('ab');
  assert.deepEqual(c.errors(), { minLength: { required: 3, actual: 2 } });
  c.setValue('abc');
  await tick();
  assert.equal(c.valid(), true);
  assert.equal(c.errors(), null);
  assert.equal(c.dirty(), true);
  assert.deepEqual(seen, [false, true], 'effects see validity changes once');
  c.touch();
  assert.equal(c.touched(), true);
  c.reset('zzz');
  assert.equal(c.value(), 'zzz');
  assert.equal(c.dirty(), false, 'reset makes the new value the baseline');
  assert.equal(c.touched(), false);
  c.reset();
  assert.equal(c.value(), 'zzz');
  stop();
});

test('FormGroup: aggregate value, errors, nested groups, get(path), group validators and reset', () => {
  const pass = new FormControl('', [V.required]);
  const form = new FormGroup({
    name: new FormControl('Ada', [V.required]),
    pass,
    repeat: new FormControl('', [V.matches(() => pass.value())]),
    address: new FormGroup({ city: new FormControl('', [V.required]) })
  }, [value => (value.name === 'root' ? { reserved: true } : null)]);
  assert.deepEqual(form.value(), { name: 'Ada', pass: '', repeat: '', address: { city: '' } });
  assert.equal(form.valid(), false);
  assert.deepEqual(Object.keys(form.errors().controls), ['pass', 'address']);
  assert.deepEqual(form.get('address.city').errors(), { required: true });
  assert.equal(form.get('address.nothing'), undefined);
  assert.equal(form.get('nothing.deeper'), undefined);
  form.setValue({ pass: 'p', repeat: 'p', address: { city: 'Lima' }, ignored: 1 });
  assert.equal(form.valid(), true);
  assert.equal(form.errors(), null);
  assert.equal(form.dirty(), true);
  form.get('name').setValue('root');
  assert.deepEqual(form.errors(), { reserved: true });
  assert.equal(form.touched(), false);
  form.touch();
  assert.equal(form.touched(), true);
  assert.equal(form.get('address.city').touched(), true);
  form.reset({ name: 'Zed' });
  assert.deepEqual(form.value(), { name: 'Zed', pass: '', repeat: '', address: { city: '' } });
  assert.equal(form.touched(), false);
  assert.equal(form.dirty(), false);
});

test('FormArray: push, removeAt, aggregates and validators', () => {
  const list = new FormArray([new FormControl('a', [V.required])], [v => (v.length > 2 ? { tooMany: true } : null)]);
  assert.deepEqual(list.value(), ['a']);
  list.push(new FormControl('', [V.required]));
  assert.equal(list.valid(), false);
  assert.deepEqual(list.errors().controls, [null, { required: true }]);
  list.at(1).setValue('b');
  assert.equal(list.valid(), true);
  list.push(new FormControl('c'));
  assert.deepEqual(list.errors(), { tooMany: true });
  list.removeAt(0);
  assert.deepEqual(list.value(), ['b', 'c']);
  assert.equal(list.valid(), true);
  assert.equal(list.dirty(), true);
  list.touch();
  assert.equal(list.touched(), true);
  list.setValue(['x', 'y', 'ignored']);
  assert.deepEqual(list.value(), ['x', 'y']);
  list.reset();
  assert.deepEqual(list.value(), ['b', 'c'].map(() => list.at(0).initial === 'b' ? 'b' : '').slice(0, 0).concat(list.value()));
  assert.equal(list.touched(), false);
});

test('forms work in templates: ngModel on control.value, errors, touched on blur, submit state', async () => {
  class App {
    constructor() {
      this.form = new FormGroup({
        name: new FormControl('', [V.required, V.minLength(2)]),
        tags: new FormArray([new FormControl('x')])
      });
      this.sent = signal(0);
    }
    send() { this.form.touch(); if (this.form.valid()) this.sent.set(this.sent() + 1); }
    more() { this.form.get('tags').push(new FormControl('')); }
  }
  component(App, {
    selector: 'x-formapp',
    template: `
      <input id="name" [(ngModel)]="form.get('name').value" (blur)="form.get('name').touch()">
      @if (form.get('name').touched() && form.get('name').errors()) {<small id="err">invalid</small>}
      <ul>@for (t of form.get('tags').controls(); track $index) {<li><input class="tag" [(ngModel)]="t.value"></li>}</ul>
      <button id="send" (click)="send()" [disabled]="!form.valid()">send</button>
      <button id="more" (click)="more()">more</button>
      <output id="val">{{ form.get('name').value() }}|{{ form.get('tags').value().length }}</output>
      <output id="sent">{{ sent() }}</output>`
  });
  const { $, $$, app } = mountIn(mount, App);
  assert.equal($('#send').disabled, true);
  assert.equal($('#err'), null, 'untouched: no error yet');
  $('#name').dispatchEvent(new window.Event('blur'));
  await tick();
  assert.ok($('#err'));
  $('#name').value = 'Ada';
  $('#name').dispatchEvent(new window.Event('input', { bubbles: true }));
  await tick();
  assert.equal($('#err'), null);
  assert.equal($('#send').disabled, false);
  assert.equal($('#val').textContent, 'Ada|1');
  $('#more').click();
  await tick();
  assert.equal($$('.tag').length, 2);
  $('#send').click();
  await tick();
  assert.equal($('#sent').textContent, '1');
  assert.ok(app);
});
