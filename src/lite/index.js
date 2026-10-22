/**
 * AngeLite Lite — an Angular-flavoured UI library in a few KB.
 * Signals, templates with @if/@for, components, pipes, DI and a tiny router.
 */

export { signal, computed, effect, untracked } from './signals.js';
export { component, Component, mount } from './view.js';
export { registerPipe } from './pipes.js';
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

const services = new Map();

/** Returns a shared instance of `Token` (created on first use). */
export function inject(Token) {
  if (!services.has(Token)) services.set(Token, new Token());
  return services.get(Token);
}

/** Overrides the instance returned by inject(Token) — handy for tests. */
export function provide(Token, value) {
  services.set(Token, value);
}
