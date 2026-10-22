/**
 * AngeLite Lite public API (runtime only). Use this entry with precompiled templates (tools/aot.mjs);
 * `index.js` adds the in-browser template compiler.
 */

export { signal, computed, effect, untracked } from './signals.js';
export { component, Component, mount, registerPipe, trustHtml, trustUrl, sanitizeUrl, inject, provide } from './runtime.js';
export { provideRouter, router } from './router.js';

import { signal } from './signals.js';

/** Writable signal that parents can bind with [name]="expr". */
export const input = initial => signal(initial);

/** Event emitter that parents can bind with (name)="handler($event)". */
export function output() {
  const subs = new Set();
  return {
    emit: value => subs.forEach(fn => fn(value)),
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); }
  };
}
