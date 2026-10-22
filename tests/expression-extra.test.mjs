import { test } from 'node:test';
import assert from 'node:assert/strict';

const { evaluate, safeEvaluate, interpolate, escapeHtml, compileExpression } = await import('../src/utils/expression.js');

const ctx = { a: 7, b: 2, s: 'str', n: null, u: undefined, arr: [1, 2, 3], o: { k: { z: 9 }, list: [{ v: 1 }], f() { return this.k.z; } }, fn: x => x * 2 };

const CASES = [
  // [expression, expected]
  ['1 + 2 * 3 - 4 / 2', 5], ['(1 + 2) * 3', 9], ['10 % 4', 2], ['2 * -3', -6], ['- -3', 3], ['+"5" + 1', 6],
  ['a > b', true], ['a >= 7', true], ['a < b', false], ['a <= 6', false], ['a == "7"', true], ['a === "7"', false], ['a != "7"', false], ['a !== "7"', true],
  ['!a', false], ['!!s', true], ['!n', true],
  ['a && b', 2], ['0 && b', 0], ['n || "d"', 'd'], ['a || "d"', 7], ['n ?? "d"', 'd'], ['0 ?? "d"', 0], ['u ?? n ?? "z"', 'z'],
  ['a > b ? "big" : "small"', 'big'], ['a < b ? 1 : a > 100 ? 2 : 3', 3],
  ['"a" + "b" + 1', 'ab1'], ["'it\\'s'", "it's"], ['"x\\\\y"', 'x\\y'],
  ['arr[0] + arr[2]', 4], ['arr[b]', 3], ['arr.length', 3], ['o.k.z', 9], ['o["k"].z', 9], ['o.list[0].v', 1],
  ['o.f()', 9], ['fn(a)', 14], ['fn(fn(2))', 8], ['arr.join("-")', '1-2-3'], ['arr.map(fn).join()', '2,4,6'],
  ['n.x', undefined], ['n.x.y', undefined], ['u?.x', undefined], ['n?.x.y', undefined], ['o?.k?.z', 9], ['nope.deep.er', undefined],
  ['[1, 2, a]', [1, 2, 7]], ['[]', []], ['[arr[0], [b]]', [1, [2]]],
  ['true && false', false], ['null', null], ['undefined', undefined], ['1.5 + .5', 2]
];

test('expression table: operators, precedence, literals, members, calls', () => {
  for (const [expr, expected] of CASES) {
    let actual;
    try { actual = evaluate(expr, ctx); } catch (e) { actual = `throws ${e.message}`; }
    assert.deepEqual(actual, expected, expr);
  }
});

test('calls: methods keep `this`; calling a non-function throws, calling a missing one does not', () => {
  assert.equal(evaluate('o.f()', ctx), 9);
  assert.throws(() => evaluate('a()', ctx), /not a function/);
  assert.equal(evaluate('nothing()', ctx), undefined);
  assert.equal(evaluate('n.method()', ctx), undefined);
});

test('security: prototype access is blocked at every position', () => {
  for (const expr of ['constructor', 'o.constructor', 'o["constructor"]', 'o.__proto__', 'arr["__proto__"]', 's.constructor.constructor', 'o.k.prototype', '__proto__.x']) {
    assert.equal(evaluate(expr, ctx), undefined, expr);
  }
  assert.equal(evaluate('o.constructor("return 1")()', ctx), undefined);
});

test('syntax errors are thrown with the offending source; safeEvaluate falls back', () => {
  for (const bad of ['', '1 +', '(1', '[1,', 'a b', 'a.', '@', 'a ? b', '"open', 'a..b', '1 2']) {
    assert.throws(() => evaluate(bad, ctx), SyntaxError, JSON.stringify(bad));
  }
  assert.equal(safeEvaluate('1 +', ctx, 'fallback'), 'fallback');
  assert.equal(safeEvaluate('a', ctx, 'fallback'), 7);
});

test('compileExpression caches and returns a function of the context', () => {
  const f = compileExpression('a + b');
  assert.equal(f({ a: 1, b: 2 }), 3);
  assert.equal(f({ a: 10, b: 20 }), 30);
  assert.equal(compileExpression('a + b'), f);
});

test('interpolate escapes every HTML-significant character and tolerates bad expressions', () => {
  assert.equal(escapeHtml(`<a href="x">'&'</a>`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;');
  assert.equal(interpolate('{{ s }}-{{ nope }}-{{ ( }}-{{ a }}', ctx), 'str---7');
  assert.equal(interpolate('{{ h }}', { h: '<script>alert(1)</script>' }), '&lt;script&gt;alert(1)&lt;/script&gt;');
});
