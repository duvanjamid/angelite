import { test } from 'node:test';
import assert from 'node:assert/strict';
import { window } from './setup.mjs';

const { markDirty, initChangeDetection } = await import('../src/core/change-detection.js');

const frame = () => new Promise(r => window.requestAnimationFrame(() => r()));

test('components marked during a cycle are re-scheduled, not lost', async () => {
  initChangeDetection();
  let updates = 0;
  const comp = {
    _updateView() {
      updates++;
      if (updates === 1) markDirty(comp); // dirty again while the cycle runs
    }
  };
  markDirty(comp);
  for (let i = 0; i < 6; i++) await frame();
  assert.equal(updates, 2);
});

test('removeEventListener works with the patched addEventListener', () => {
  initChangeDetection();
  const el = window.document.createElement('button');
  let calls = 0;
  const handler = () => { calls++; };
  el.addEventListener('click', handler);
  el.click();
  el.removeEventListener('click', handler);
  el.click();
  assert.equal(calls, 1);
});
