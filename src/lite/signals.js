/**
 * Tiny signals runtime: signal / computed / effect.
 * Effects run once synchronously, then re-run in a microtask when a
 * dependency changes (updates are batched automatically).
 *
 * Kept deliberately lean: an Effect is one small object with a dependency
 * array, and signals only allocate a subscriber Set once someone reads them.
 */

let active = null;
const queue = [];
let pending = false;

function flush() {
  for (let i = 0; i < queue.length; i++) {
    const e = queue[i];
    e.queued = false;
    if (!e.dead) {
      try { e.run(); } catch (err) { console.error(err); }
    }
  }
  queue.length = 0;
  pending = false;
}

function clean(node) {
  const deps = node.deps;
  for (let i = 0; i < deps.length; i++) deps[i].delete(node);
  deps.length = 0;
}

/** Reactive computation. `fn` receives the Effect itself, so one shared function can serve many instances. */
export class Effect {
  constructor(fn) {
    this.fn = fn;
    this.deps = [];
    this.queued = false;
    this.dead = false;
    this.cleanup = undefined;
  }

  run() {
    if (this.dead) return;
    if (this.cleanup) { this.cleanup(); this.cleanup = undefined; }
    clean(this);
    const prev = active;
    active = this;
    try {
      const result = this.fn(this);
      if (typeof result === 'function') this.cleanup = result;
    } finally { active = prev; }
  }

  notify() {
    if (this.queued) return;
    this.queued = true;
    queue.push(this);
    if (!pending) {
      pending = true;
      queueMicrotask(flush);
    }
  }

  stop() {
    this.dead = true;
    clean(this);
    if (this.cleanup) { this.cleanup(); this.cleanup = undefined; }
  }
}

function track(subs) {
  if (!subs.has(active)) {
    subs.add(active);
    active.deps.push(subs);
  }
}

export function signal(value) {
  let subs = null;
  const read = () => {
    if (active) track(subs || (subs = new Set()));
    return value;
  };
  read.set = next => {
    if (Object.is(next, value)) return;
    value = next;
    if (subs) subs.forEach(n => n.notify());
  };
  read.update = fn => read.set(fn(value));
  read.peek = () => value;
  return read;
}

export function computed(fn) {
  let subs = null;
  let value;
  let dirty = true;
  const node = {
    deps: [],
    notify() {
      if (!dirty) {
        dirty = true;
        if (subs) subs.forEach(n => n.notify());
      }
    },
    run() {
      clean(node);
      const prev = active;
      active = node;
      try { value = fn(); } finally { active = prev; dirty = false; }
    }
  };
  const read = () => {
    if (active) track(subs || (subs = new Set()));
    if (dirty) node.run();
    return value;
  };
  read.peek = () => (dirty && node.run(), value);
  return read;
}

/** Runs `fn` now and whenever its signals change. Returns a stop function. */
export function effect(fn, owner) {
  const e = new Effect(fn);
  e.run();
  const stop = () => e.stop();
  if (owner) owner.push(stop);
  return stop;
}

/** Reads signals without subscribing the running effect. */
export function untracked(fn) {
  const prev = active;
  active = null;
  try { return fn(); } finally { active = prev; }
}
