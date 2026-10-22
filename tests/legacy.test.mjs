// Smoke and logic tests for the original (full) AngeLite bundle: forms, validators, change detection.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window } from './setup.mjs';

const mod = await import('../src/angelite.js');

test('the legacy entry exposes its public API and the browser global', () => {
  for (const name of ['Component', 'bootstrap', 'FormControl', 'FormGroup', 'FormArray', 'Validators', 'Router', 'markDirty', 'EventEmitter']) {
    assert.ok(mod[name], `export ${name}`);
  }
  assert.ok(window.AngeLite && window.AngeLite.Component, 'window.AngeLite');
});

test('FormControl: value, validity and state flags', () => {
  const c = new mod.FormControl('', [mod.Validators.required(), mod.Validators.minLength(3)]);
  assert.equal(c.valid, false);
  assert.ok(c.errors.required);
  c.setValue('ab');
  assert.equal(c.valid, false);
  assert.ok(c.errors.minlength);
  c.setValue('abc');
  assert.equal(c.valid, true);
  assert.equal(c.errors, null);
});

test('FormGroup: exposes nested controls and aggregated values', () => {
  const g = new mod.FormGroup({
    name: new mod.FormControl('', [mod.Validators.required()]),
    email: new mod.FormControl('x@y.z', [mod.Validators.email()])
  });
  assert.equal(g.get('name').valid, false);
  g.get('name').setValue('Ana');
  assert.equal(g.get('name').valid, true);
  assert.deepEqual(g.value, { name: 'Ana', email: 'x@y.z' });
});

test('FormArray: add and remove controls', () => {
  const arr = new mod.FormArray([new mod.FormControl('a')]);
  arr.push(new mod.FormControl('b'));
  assert.deepEqual(arr.value, ['a', 'b']);
  arr.removeAt(0);
  assert.deepEqual(arr.value, ['b']);
});

test('Validators: min/max/pattern/maxLength', () => {
  const V = mod.Validators;
  assert.equal(V.maxLength(3)({ value: 'abcd' }).maxlength.requiredLength, 3);
  assert.equal(V.maxLength(3)({ value: 'abc' }), null);
  assert.equal(V.pattern(/^\d+$/)({ value: '12a' }) !== null, true);
  assert.equal(V.pattern(/^\d+$/)({ value: '123' }), null);
  assert.equal(V.min(5)({ value: 4 }) !== null, true);
  assert.equal(V.max(5)({ value: 6 }) !== null, true);
});
