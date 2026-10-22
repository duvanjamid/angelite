import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, interpolate, escapeHtml } from '../src/utils/expression.js';

const ctx = {
  user: { name: 'Ana', tags: ['a', 'b'], address: null },
  n: 5,
  items: [1, 2, 3],
  greet(name) { return `${this.user.name} says hi to ${name}`; }
};

test('paths, indexes and optional chaining', () => {
  assert.equal(evaluate('user.name', ctx), 'Ana');
  assert.equal(evaluate('items[1]', ctx), 2);
  assert.equal(evaluate('user.address.street', ctx), undefined);
  assert.equal(evaluate('user.address?.street ?? "n/a"', ctx), 'n/a');
});

test('operators and precedence', () => {
  assert.equal(evaluate('1 + 2 * 3', ctx), 7);
  assert.equal(evaluate('(1 + 2) * 3', ctx), 9);
  assert.equal(evaluate('!n || n > 3 && n <= 5', ctx), true);
  assert.equal(evaluate('items.length === 3', ctx), true);
  assert.equal(evaluate('n > 10 ? "big" : "small"', ctx), 'small');
});

test('method calls keep their receiver', () => {
  assert.equal(evaluate('greet("Bob")', ctx), 'Ana says hi to Bob');
  assert.equal(evaluate('user.tags.join("-")', ctx), 'a-b');
});

test('blocks prototype access', () => {
  assert.equal(evaluate('user.constructor', ctx), undefined);
  assert.equal(evaluate('items["__proto__"]', ctx), undefined);
  assert.equal(evaluate('constructor', ctx), undefined);
});

test('does not execute arbitrary code', () => {
  assert.throws(() => evaluate('alert(1); x', ctx));
  assert.throws(() => evaluate('(function(){})()', ctx));
});

test('interpolate escapes HTML', () => {
  assert.equal(interpolate('<p>{{ user.name }}</p>', ctx), '<p>Ana</p>');
  assert.equal(
    interpolate('{{ x }}', { x: '<img src=x onerror=alert(1)>' }),
    '&lt;img src=x onerror=alert(1)&gt;'
  );
  assert.equal(escapeHtml(`"'&`), '&quot;&#39;&amp;');
});
