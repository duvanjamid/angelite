import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tick, captureErrors } from './setup.mjs';

const { signal, computed, effect, untracked } = await import('../src/signals.js');

test('signal: get, set, update, peek and equality short-circuit', async () => {
  const s = signal(1);
  let runs = 0;
  effect(() => { s(); runs++; });
  assert.equal(s(), 1);
  s.set(2);
  s.update(v => v + 1);
  assert.equal(s.peek(), 3);
  await tick();
  assert.equal(runs, 2, 'two sets in one tick = one re-run');
  s.set(3);
  await tick();
  assert.equal(runs, 2, 'setting an equal value does not notify');
  s.set(NaN); s.set(NaN);
  await tick();
  assert.equal(runs, 3, 'NaN is equal to itself (Object.is)');
});

test('effect: runs synchronously first, then batches updates in a microtask', async () => {
  const s = signal(0);
  const seen = [];
  effect(() => { seen.push(s()); });
  assert.deepEqual(seen, [0]);
  s.set(1); s.set(2); s.set(3);
  assert.deepEqual(seen, [0], 'not yet');
  await tick();
  assert.deepEqual(seen, [0, 3]);
});

test('effect: cleanup runs before each re-run and on stop', async () => {
  const s = signal(0);
  const log = [];
  const stop = effect(() => { const v = s(); log.push('run' + v); return () => log.push('clean' + v); });
  s.set(1); await tick();
  stop();
  assert.deepEqual(log, ['run0', 'clean0', 'run1', 'clean1']);
  s.set(2); await tick();
  assert.deepEqual(log, ['run0', 'clean0', 'run1', 'clean1'], 'stopped effects stay stopped');
});

test('effect: dependencies are re-tracked on every run (conditional reads)', async () => {
  const flag = signal(true), a = signal('a'), b = signal('b');
  const seen = [];
  effect(() => { seen.push(flag() ? a() : b()); });
  b.set('b2'); await tick();
  assert.deepEqual(seen, ['a'], 'b is not a dependency yet');
  flag.set(false); await tick();
  a.set('a2'); await tick();
  assert.deepEqual(seen, ['a', 'b2'], 'a stopped being a dependency');
  b.set('b3'); await tick();
  assert.deepEqual(seen, ['a', 'b2', 'b3']);
});

test('effect: an error in one effect does not stop the others', async () => {
  const s = signal(0);
  let ok = 0;
  effect(() => { if (s() > 0) throw new Error('boom'); });
  effect(() => { s(); ok++; });
  const errors = await captureErrors(async () => { s.set(1); await tick(); });
  assert.equal(ok, 2);
  assert.match(errors.join(), /boom/);
});

test('computed: lazy, cached, and glitch-free in a diamond', async () => {
  const base = signal(1);
  let evals = 0;
  const double = computed(() => { evals++; return base() * 2; });
  const triple = computed(() => base() * 3);
  const sum = computed(() => double() + triple());
  assert.equal(evals, 0, 'nothing computed until read');
  assert.equal(sum(), 5);
  assert.equal(sum(), 5);
  assert.equal(evals, 1, 'cached between reads');
  const seen = [];
  effect(() => { seen.push(sum()); });
  base.set(2); await tick();
  assert.deepEqual(seen, [5, 10], 'the effect never sees a half-updated diamond');
});

test('computed: chains and dynamic dependencies', async () => {
  const useA = signal(true), a = signal(1), b = signal(10);
  const pick = computed(() => (useA() ? a() : b()));
  const plus = computed(() => pick() + 1);
  assert.equal(plus(), 2);
  useA.set(false);
  assert.equal(plus(), 11);
  a.set(100);
  assert.equal(plus(), 11, 'a is no longer read');
  b.set(20);
  assert.equal(plus(), 21);
});

test('untracked: reads without subscribing', async () => {
  const tracked = signal(0), hidden = signal(0);
  let runs = 0;
  effect(() => { tracked(); untracked(() => hidden()); runs++; });
  hidden.set(1); await tick();
  assert.equal(runs, 1);
  tracked.set(1); await tick();
  assert.equal(runs, 2);
});

test('effect: many subscribers and many updates stay consistent', async () => {
  const s = signal(0);
  const totals = new Array(200).fill(0);
  totals.forEach((_, i) => effect(() => { totals[i] += s(); }));
  for (let v = 1; v <= 5; v++) { s.set(v); await tick(); }
  assert.ok(totals.every(t => t === 1 + 2 + 3 + 4 + 5));
});
