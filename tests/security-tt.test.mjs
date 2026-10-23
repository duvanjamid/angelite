// Trusted Types: runs in its own process so the mock policy exists before the library is first imported.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn, tick } from './setup.mjs';

const created = [], htmlCalls = [];
window.trustedTypes = {
  createPolicy(name, rules) {
    created.push(name);
    return { createHTML: s => { htmlCalls.push(s); return rules.createHTML(s); } };
  }
};

const { signal, component, mount, trustHtml } = await import('../src/index.js');

test('templates are parsed through one Trusted Types policy named "angelite"', () => {
  class C {}
  component(C, { selector: 'x-tt', template: '<b id="b">hi</b>' });
  const { $ } = mountIn(mount, C);
  assert.equal($('#b').textContent, 'hi');
  assert.deepEqual(created, ['angelite']);
  assert.ok(htmlCalls.some(h => h.includes('<b id="b">hi</b>')), 'the template went through createHTML');
});

test('trustHtml() values are written through the same policy (a single policy is created)', async () => {
  const h = signal(trustHtml('<i id="i">trusted</i>'));
  class C { h = h; }
  component(C, { selector: 'x-tt2', template: '<div [innerHTML]="h()"></div>' });
  const { $ } = mountIn(mount, C);
  assert.equal($('#i').textContent, 'trusted');
  assert.ok(htmlCalls.includes('<i id="i">trusted</i>'));
  assert.deepEqual(created, ['angelite']);
});

test('plain strings never go through the policy (they stay text)', () => {
  const before = htmlCalls.length;
  class C { h = signal('<u>text</u>'); }
  component(C, { selector: 'x-tt3', template: '<div id="d" [innerHTML]="h()"></div>' });
  const warn = console.warn; console.warn = () => {};
  try { const { $ } = mountIn(mount, C); assert.equal($('#d').textContent, '<u>text</u>'); } finally { console.warn = warn; }
  assert.equal(htmlCalls.slice(before).some(h => h === '<u>text</u>'), false);
});
