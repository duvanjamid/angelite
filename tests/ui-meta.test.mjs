import { test } from 'node:test';
import assert from 'node:assert/strict';
import './setup.mjs';

const ui = await import('../src/ui/index.js');
const { meta, groups } = await import('../src/ui/meta.js');

test('the documentation metadata describes every component, and only real inputs and outputs', () => {
  assert.deepEqual(meta.map(m => m.tag).sort(), ui.all.map(c => c.$meta.selector).sort(), 'every component is described, none is invented');
  assert.equal(new Set(meta.map(m => m.id)).size, meta.length, 'ids are unique');
  for (const m of meta) {
    assert.ok(groups.includes(m.group), `${m.id}: group`);
    assert.ok(m.summary && m.a11y, `${m.id}: summary and accessibility note`);
    const Comp = ui.all.find(c => c.$meta.selector === m.tag);
    assert.equal(Comp.name, m.name, `${m.tag}: class name`);
    const instance = new Comp();
    assert.deepEqual(m.inputs.map(x => x.name).sort(), Object.keys(instance).filter(k => typeof instance[k] === 'function' && typeof instance[k].set === 'function' && typeof instance[k].peek === 'function' && !['open', 'state', 'sortKey', 'sortDir', 'query', 'typed', 'active', 'visible', 'copied'].includes(k) || (m.inputs.some(x => x.name === k) && typeof instance[k] === 'function')).sort(), `${m.tag}: inputs`);
    for (const out of m.outputs) assert.equal(typeof instance[out.name].emit, 'function', `${m.tag}.${out.name} is an output`);
    for (const inp of m.inputs) {
      assert.equal(typeof instance[inp.name].set, 'function', `${m.tag}.${inp.name} is an input`);
      assert.ok(inp.type && inp.desc && 'default' in inp, `${m.tag}.${inp.name}: documented`);
    }
  }
});

test('documented defaults match the real ones', () => {
  const parse = text => { try { return Function(`return (${text})`)(); } catch { return text; } };
  for (const m of meta) {
    const instance = new (ui.all.find(c => c.$meta.selector === m.tag))();
    for (const inp of m.inputs) assert.deepEqual(instance[inp.name].peek(), parse(inp.default), `${m.tag}.${inp.name} default`);
  }
});

test('named slots in the metadata exist in the templates', () => {
  for (const m of meta) {
    const Comp = ui.all.find(c => c.$meta.selector === m.tag);
    for (const slot of m.slots.filter(x => !x.name.startsWith('('))) assert.match(Comp.$meta.template, new RegExp(`select="${slot.name}"`), `${m.tag} slot ${slot.name}`);
    const hasDefault = /<ng-content><\/ng-content>/.test(Comp.$meta.template);
    assert.equal(m.slots.some(x => x.name.startsWith('(')), hasDefault, `${m.tag}: default slot documented iff the template has one`);
  }
});
