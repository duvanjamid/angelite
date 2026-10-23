// If the CSP does not allow the "angelite" policy, creating it throws: the library must not crash on load,
// and the browser (not us) rejects the string sinks.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window, mountIn } from './setup.mjs';

window.trustedTypes = { createPolicy() { throw new TypeError('Policy "angelite" disallowed by CSP'); } };

const { component, mount } = await import('../src/index.js');

test('a CSP that forbids the policy does not break rendering in environments that accept strings', () => {
  class C {}
  component(C, { selector: 'x-tt-blocked', template: '<b id="b">ok</b>' });
  assert.equal(mountIn(mount, C).$('#b').textContent, 'ok');
});
