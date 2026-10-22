/**
 * Tiny signals runtime: signal / computed / effect.
 * Effects run once synchronously, then re-run in a microtask when a
 * dependency changes (updates are batched automatically).
 */

let active = null;
const queue = new Set();
let pending = false;

function flush() {
  pending = false;
  const batch = [...queue];
  queue.clear();
  for (const node of batch) node.run();
}

function schedule(node) {
  queue.add(node);
  if (!pending) {
    pending = true;
    queueMicrotask(flush);
  }
}

function track(subs) {
  if (active) {
    subs.add(active);
    active.deps.add(subs);
  }
}

function clean(node) {
  node.deps.forEach(subs => subs.delete(node));
  node.deps.clear();
}

export function signal(value) {
  const subs = new Set();
  const read = () => (track(subs), value);
  read.set = next => {
    if (Object.is(next, value)) return;
    value = next;
    [...subs].forEach(n => n.notify());
  };
  read.update = fn => read.set(fn(value));
  read.peek = () => value;
  return read;
}

export function computed(fn) {
  const subs = new Set();
  let value;
  let dirty = true;
  const node = {
    deps: new Set(),
    notify() {
      if (!dirty) {
        dirty = true;
        [...subs].forEach(n => n.notify());
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
    track(subs);
    if (dirty) node.run();
    return value;
  };
  read.peek = () => (dirty && node.run(), value);
  return read;
}

/** Runs `fn` now and whenever its signals change. Returns a stop function. */
export function effect(fn, owner) {
  let cleanup;
  let dead = false;
  const node = {
    deps: new Set(),
    notify() { schedule(node); },
    run() {
      if (dead) return;
      if (cleanup) cleanup();
      clean(node);
      const prev = active;
      active = node;
      try {
        const result = fn();
        cleanup = typeof result === 'function' ? result : undefined;
      } finally { active = prev; }
    }
  };
  node.run();
  const stop = () => {
    dead = true;
    clean(node);
    if (cleanup) cleanup();
  };
  if (owner) owner.push(stop);
  return stop;
}

/** Reads signals without subscribing the running effect. */
export function untracked(fn) {
  const prev = active;
  active = null;
  try { return fn(); } finally { active = prev; }
}
