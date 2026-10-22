import { test } from 'node:test';
import assert from 'node:assert/strict';
import { document } from './setup.mjs';

const { applyDirectives } = await import('../src/directives/directive-processor.js');
await import('../src/directives/built-in.js');
await import('../src/directives/modern-directives.js');

function mount(html, context) {
  const root = document.createElement('div');
  root.innerHTML = html;
  applyDirectives(root, context);
  return root;
}

test('@for renders items from an expression and escapes values', () => {
  const root = mount('<ul><li @for="item of data.items">{{ item }}</li></ul>', {
    data: { items: ['a', '<b>x</b>'] }
  });
  const lis = root.querySelectorAll('li');
  assert.equal(lis.length, 2);
  assert.equal(lis[0].textContent, 'a');
  assert.equal(lis[1].textContent, '<b>x</b>');
  assert.equal(root.querySelector('b'), null);
});

test('@if supports comparison expressions', () => {
  const root = mount('<p id="a" @if="count > 1">many</p>', { count: 3 });
  assert.ok(root.querySelector('#a'));
  const hidden = mount('<p id="a" @if="count > 1">many</p>', { count: 0 });
  assert.equal(hidden.querySelector('#a'), null);
});
