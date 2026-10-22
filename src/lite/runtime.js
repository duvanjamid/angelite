/**
 * AngeLite Lite runtime: views, blocks, components, events. No template parser in here:
 * blueprints come either from the in-browser compiler (jit.js) or precompiled (tools/aot.mjs).
 *
 * A view is created by cloning a blueprint's fragment and walking it once applying the ops; one lean
 * effect per view re-evaluates its bindings and writes to the DOM only when a value changed.
 * Events are delegated to `document` and stored as properties on the elements, so views carry no
 * per-element listeners or closures.
 */

import { Effect, untracked } from './signals.js';
import { prop as p, guard } from '../utils/expression.js';
import { trusted } from './tt.js';

const hooks = { outlet: null };
export const setOutletBinder = fn => { hooks.outlet = fn; };

let compiler = null;
/** Installs the in-browser template compiler: (templateSource, componentsByTag) => blueprint. */
export const setCompiler = fn => { compiler = fn; };

const NONE = Symbol('none');
const logError = (e, what) => console.error(`[AngeLite] ${what}:`, e);
const ownOf = view => view.own || (view.own = []);
const textOf = v => (v == null ? '' : String(v));

/* ---------- pipes ---------- */

export const pipes = {};
export const registerPipe = (name, fn) => { pipes[name] = fn; };
export const P = (name, v, ...args) => {
  if (!pipes[name]) throw new Error(`Unknown pipe "${name}"`);
  return pipes[name](v, ...args);
};

/* ---------- DOM bindings ---------- */

const propCache = new Map();
function resolveProp(el, lower) {
  if (lower in el) return lower;
  const proto = Object.getPrototypeOf(el);
  let map = propCache.get(proto);
  if (!map) {
    map = {};
    for (const k in el) map[k.toLowerCase()] = k;
    propCache.set(proto, map);
  }
  return map[lower] || lower;
}

/* ---------- security: URLs and HTML ---------- */

/** Opt out of sanitizing on purpose: trustHtml(markup) for [innerHTML], trustUrl(url) for URL attributes. */
class Trusted {
  constructor(kind, value) { this.kind = kind; this.value = value; }
}
export const trustHtml = html => new Trusted('html', html);
export const trustUrl = url => new Trusted('url', url);

// attributes where a "javascript:" URL can run code
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction', 'data', 'xlink:href']);
const SAFE_URL = /^(?:(?:https?|mailto|tel|sms|ftp):|[^&:/?#]*(?:[/?#]|$))/i;
const SAFE_IMAGE = /^data:image\/(?:png|gif|jpe?g|webp|avif);base64,[a-z0-9+/=]+$/i;
// characters browsers ignore inside a URL scheme ("java\tscript:", " javascript:")
const URL_NOISE = /[\u0000-\u0020\u00a0\u1680\u2000-\u200b\u2028\u2029\u202f\u205f\u3000\ufeff]/g;

/** Returns the URL if it is safe for `attr`, otherwise "unsafe:<url>" (inert, and easy to spot). */
export function sanitizeUrl(value, attr) {
  if (value instanceof Trusted && value.kind === 'url') return value.value;
  const url = value == null ? '' : String(value);
  const flat = url.replace(URL_NOISE, '');
  if (SAFE_URL.test(flat) || (attr === 'src' && SAFE_IMAGE.test(flat))) return url;
  console.warn(`[AngeLite] unsafe URL blocked in "${attr}": ${url.slice(0, 50)} (use trustUrl() to allow it)`);
  return 'unsafe:' + url;
}

function setHtml(el, v) {
  if (v instanceof Trusted && v.kind === 'html') el.innerHTML = trusted(v.value);
  else {
    if (v) console.warn('[AngeLite] [innerHTML] needs trustHtml(); inserted as text');
    el.textContent = v == null ? '' : String(v);
  }
}

/** Returns `(element, value) => void` for a binding name like `value`, `class.x`, `style.width.px`, `attr.x`. */
function makeApply(name) {
  if (name.startsWith('class.')) {
    const cls = name.slice(6);
    return (el, v) => el.classList.toggle(cls, !!v);
  }
  if (name.startsWith('style.')) {
    const [prop, unit = ''] = name.slice(6).split('.');
    return (el, v) => (v == null || v === false ? el.style.removeProperty(prop) : el.style.setProperty(prop, v + unit));
  }
  if (name.startsWith('attr.')) {
    const attr = name.slice(5), lower = attr.toLowerCase();
    if (URL_ATTRS.has(lower)) return (el, v) => (v == null || v === false ? el.removeAttribute(attr) : el.setAttribute(attr, sanitizeUrl(v, lower)));
    return (el, v) => (v == null || v === false ? el.removeAttribute(attr) : el.setAttribute(attr, v === true ? '' : v));
  }
  const lower = name.toLowerCase();
  if (lower === 'innerhtml') return setHtml;
  if (URL_ATTRS.has(lower)) return (el, v) => { el[resolveProp(el, name)] = sanitizeUrl(v, lower); };
  return (el, v) => { el[resolveProp(el, name)] = v; };
}

/** Apply-function factories shared by the in-browser compiler and precompiled templates. */
export const A = {
  text: (node, v) => { node.data = v; },
  prop: makeApply,
  attr: name => {
    const lower = name.toLowerCase();
    return URL_ATTRS.has(lower) ? (el, v) => el.setAttribute(name, sanitizeUrl(v, lower)) : (el, v) => el.setAttribute(name, v);
  },
  input: name => {
    const dom = makeApply(name);
    return (ref, v) => (ref.set ? ref.set(v) : dom(ref, v));
  },
  inputAttr: name => {
    const set = A.attr(name);
    return (ref, v) => (ref.set ? ref.set(v) : set(ref, v));
  },
  model: (node, v) => {
    if (node.type === 'checkbox') node.checked = !!v;
    else node.value = v == null ? '' : v;
  },
  state: (state, v) => state.update(v),
  pick: tests => scope => {
    for (let i = 0; i < tests.length; i++) if (!tests[i] || tests[i](scope)) return i;
    return -1;
  },
  stmts: fns => scope => { for (let i = 0; i < fns.length; i++) fns[i](scope); },
  interp: parts => {
    if (parts.length === 3 && !parts[0] && !parts[2]) return scope => textOf(parts[1](scope));
    return scope => {
      let out = '';
      for (let i = 0; i < parts.length; i++) out += i % 2 ? textOf(parts[i](scope)) : parts[i];
      return out;
    };
  },
  modelGet: (src, label) => scope => {
    const sig = src(scope);
    if (typeof sig !== 'function' || !sig.set) throw new Error(`[(ngModel)]="${label}" needs a writable signal`);
    return sig();
  },
  modelRun: src => (scope, e, node) => {
    src(scope).set(node.type === 'checkbox' ? node.checked : node.type === 'number' ? node.valueAsNumber : node.value);
  }
};

/** Builds a blueprint from serialized HTML; the template is only parsed the first time a view needs it. */
const mk = (html, ops, upd, dynamic) => ({
  get tpl() {
    const t = document.createElement('template');
    t.innerHTML = trusted(html);
    Object.defineProperty(this, 'tpl', { value: t.content });
    return t.content;
  },
  ops, upd, dynamic
});

const callFn = (fn, recv, args) => {
  if (typeof fn === 'function') return guard(fn.apply(recv, args));
  if (fn != null) throw new TypeError('Expression is not a function');
};

/** What precompiled templates receive: `aot(components, kit)`. M/F are method and function calls. */
const kit = {
  A, P, p, mk,
  M: (o, k, ...args) => callFn(p(o, k), o, args),
  F: (fn, self, ...args) => callFn(fn, self, args)
};

/* events: delegated to document for bubbling types; handlers live on the elements */

const DELEGATED = new Set(['click', 'dblclick', 'input', 'change', 'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
  'mouseover', 'mouseout', 'pointerdown', 'pointerup', 'submit', 'contextmenu', 'touchstart', 'touchend']);
const delegated = new Set();

function delegate(type) {
  if (delegated.has(type)) return;
  delegated.add(type);
  const prop = '$' + type;
  document.addEventListener(type, e => {
    for (let n = e.target; n && n !== document; n = n.parentNode) {
      const run = n[prop];
      if (run) {
        const scope = Object.create(n.$s);
        scope.$event = e;
        try { run(scope, e, n); } catch (err) { logError(err, `(${type})`); }
        if (e.cancelBubble) break;
      }
    }
  });
}

function onEvent(el, type, run, scope) {
  el.$s = scope;
  if (DELEGATED.has(type)) {
    el['$' + type] = run;
    delegate(type);
  } else {
    el.addEventListener(type, e => {
      const s = Object.create(scope);
      s.$event = e;
      try { run(s, e, el); } catch (err) { logError(err, `(${type})`); }
    });
  }
}

/* ---------- views ---------- */

class View extends Effect {
  constructor(bp, scope, ctx) {
    super(runView);
    this.bp = bp;
    this.scope = scope;
    this.ctx = ctx;
    this.st = null;
    this.own = null;
    this.first = null;
    this.last = null;
    this.frag = null;
    this.pos = -1;
    this.key = null;
    this.dep = null; // nested blocks / projected views that read this view's scope
  }
}

function runView(view) {
  const upd = view.bp.upd, st = view.st, n = upd.length, scope = view.scope;
  for (let i = 0; i < n; i++) {
    const d = upd[i];
    let v;
    try { v = d.fn(scope); } catch (e) { logError(e, 'template expression'); continue; }
    if (v !== st[n + i]) {
      st[n + i] = v;
      try { d.apply(st[i], v); } catch (e) { logError(e, 'template binding'); }
    }
  }
}

function nextPre(n, root) {
  if (n.firstChild) return n.firstChild;
  while (n) {
    if (n.nextSibling) return n.nextSibling;
    n = n.parentNode;
    if (n === root) return null;
  }
  return null;
}

function instantiate(bp, scope, ctx) {
  const view = new View(bp, scope, ctx);
  const frag = bp.tpl.cloneNode(true);
  const ops = bp.ops, n = bp.upd.length;
  const st = view.st = n ? new Array(2 * n) : null;
  for (let i = n; i < 2 * n; i++) st[i] = NONE;

  let node = frag.firstChild, i = 0, oi = 0;
  while (oi < ops.length && node) {
    const next = nextPre(node, frag); // before ops may replace `node`
    if (ops[oi].ord === i) {
      do { applyOp(ops[oi++], node, view, scope, ctx, st, n); } while (oi < ops.length && ops[oi].ord === i);
    }
    node = next;
    i++;
  }

  view.first = frag.firstChild;
  if (bp.dynamic || !view.first) {
    const end = document.createComment('');
    frag.append(end);
    view.last = end;
    if (!view.first) view.first = end;
  } else view.last = frag.lastChild;
  view.frag = frag;
  if (n) view.run();
  return view;
}

function applyOp(op, node, view, scope, ctx, st, n) {
  switch (op.type) {
    case 'ref':
      st[op.slot] = node;
      break;
    case 'ev':
      onEvent(node, op.evt, op.run, scope);
      break;
    case 'model':
      st[op.slot] = node;
      onEvent(node, op.change ? 'change' : 'input', op.run, scope);
      break;
    case 'if':
      st[op.slot] = new IfState(node, op.branches, scope, ctx, view);
      break;
    case 'for':
      st[op.slot] = new ForState(node, node.nextSibling, op, scope, ctx, view);
      break;
    case 'content': {
      const pv = ctx && ctx.projected;
      if (pv) node.replaceWith(...rangeOf(pv)); else node.remove();
      break;
    }
    case 'outlet':
      if (hooks.outlet) hooks.outlet(node, ownOf(view), mount);
      break;
    case 'comp':
      applyComp(op, node, view, scope, ctx, st, n);
      break;
  }
}

function rangeOf(view) {
  const nodes = [];
  for (let n = view.first; n; n = n.nextSibling) {
    nodes.push(n);
    if (n === view.last) break;
  }
  return nodes;
}

/**
 * Re-runs a view and everything nested in it. Needed when a scope variable (a @for item or index) was
 * replaced in place: nested blocks read it through the scope chain, not through a signal.
 */
function refresh(view) {
  if (view.st) view.run();
  const dep = view.dep;
  if (dep) for (let i = 0; i < dep.length; i++) dep[i].refresh();
}

function destroyView(view) {
  view.stop();
  const own = view.own;
  if (own) {
    view.own = null;
    for (let i = own.length - 1; i >= 0; i--) own[i]();
  }
}

function removeView(view) {
  destroyView(view);
  if (view.first === view.last) view.first.remove();
  else rangeOf(view).forEach(n => n.remove());
}

/* ---------- @if ---------- */

class IfState {
  constructor(anchor, branches, scope, ctx, view) {
    this.anchor = anchor;
    this.branches = branches;
    this.scope = scope;
    this.ctx = ctx;
    this.cur = -1;
    this.v = null;
    ownOf(view).push(() => { if (this.v) destroyView(this.v); });
    (view.dep || (view.dep = [])).push(this);
  }

  refresh() { if (this.v) refresh(this.v); }

  update(idx) {
    if (idx === this.cur) return;
    untracked(() => {
      if (this.v) removeView(this.v);
      this.v = null;
      this.cur = idx;
      if (idx >= 0) {
        const v = this.v = instantiate(this.branches[idx].bp, this.scope, this.ctx);
        this.anchor.after(v.frag);
        v.frag = null;
      }
    });
  }
}

/* ---------- @for ---------- */

/** Indexes (into `seq`) that form a longest increasing subsequence: those nodes need no DOM move. */
function lis(seq) {
  const tails = [], prev = new Array(seq.length);
  for (let i = 0; i < seq.length; i++) {
    let lo = 0, hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (seq[tails[mid]] < seq[i]) lo = mid + 1; else hi = mid;
    }
    prev[i] = lo ? tails[lo - 1] : -1;
    tails[lo] = i;
  }
  const out = new Set();
  for (let i = tails.length ? tails[tails.length - 1] : -1; i >= 0; i = prev[i]) out.add(i);
  return out;
}

class ForState {
  constructor(start, end, op, scope, ctx, view) {
    this.start = start;
    this.end = end;
    this.op = op;
    this.scope = scope;
    this.ctx = ctx;
    this.entries = new Map();
    this.list = null; // entries in DOM order, for the "nothing moved" fast path
    this.empty = null;
    this.probe = Object.create(scope); // only used to compute track keys
    (view.dep || (view.dep = [])).push(this);
    ownOf(view).push(() => {
      this.entries.forEach(destroyView);
      this.entries.clear();
      if (this.empty) destroyView(this.empty);
    });
  }

  refresh() {
    this.entries.forEach(refresh);
    if (this.empty) refresh(this.empty);
  }

  update(list) {
    untracked(() => this.reconcile(Array.isArray(list) ? list : Array.from(list || [])));
  }

  reconcile(items) {
    const { op, probe, entries } = this;
    const name = op.name, track = op.track, ix = op.ix;
    const n = items.length;

    // 1. keys
    const keys = new Array(n);
    const prev = this.list;
    let same = !!prev && prev.length === n && n > 0;
    for (let i = 0; i < n; i++) {
      let key = items[i];
      if (track) { probe[name] = key; probe.$index = i; key = track(probe); }
      keys[i] = key;
      if (same && prev[i].key !== key) same = false;
    }

    // Fast path: same keys in the same order (the common "update some rows" case): refresh the changed rows only.
    if (same) {
      for (let i = 0; i < n; i++) {
        const e = prev[i], item = items[i];
        if (e.scope[name] !== item) { e.scope[name] = item; refresh(e); }
      }
      return;
    }

    const next = new Map();
    let reused = 0;
    for (let i = 0; i < n; i++) {
      let key = keys[i];
      if (next.has(key)) keys[i] = key = Symbol('dup');
      next.set(key, null);
      if (entries.has(key)) reused++;
    }

    // 2. nothing survives: wipe the whole region in one go when it is isolated
    const parent = this.start.parentNode;
    if (!reused && entries.size) {
      entries.forEach(destroyView);
      entries.clear();
      if (this.empty) { destroyView(this.empty); this.empty = null; }
      if (parent && !this.start.previousSibling && !this.end.nextSibling) {
        parent.textContent = '';
        parent.append(this.start, this.end);
      } else {
        for (let node = this.start.nextSibling; node && node !== this.end;) {
          const after = node.nextSibling;
          node.remove();
          node = after;
        }
      }
    }

    // 3. reuse / create
    const fresh = entries.size === 0;
    const order = new Array(n);
    const seq = [], seqAt = [];
    if (!fresh) { let p = 0; entries.forEach(e => { e.pos = p++; }); }
    for (let i = 0; i < n; i++) {
      const item = items[i];
      let e = entries.get(keys[i]);
      if (e) {
        const sc = e.scope;
        let changed = false;
        if (sc[name] !== item) { sc[name] = item; changed = true; }
        if (ix && (sc.$index !== i || sc.$count !== n)) { setIndex(sc, i, n); changed = true; }
        if (changed) refresh(e);
        seq.push(e.pos);
        seqAt.push(i);
      } else {
        const sc = Object.create(this.scope);
        sc[name] = item;
        if (ix) setIndex(sc, i, n);
        e = instantiate(op.bp, sc, this.ctx);
      }
      e.key = keys[i];
      order[i] = e;
      next.set(keys[i], e);
    }
    this.list = order;

    // 4. drop stale entries
    if (!fresh) entries.forEach((e, key) => { if (!next.has(key) || next.get(key) !== e) removeView(e); });
    this.entries = next;

    // 5. place nodes
    if (fresh) {
      const frag = document.createDocumentFragment();
      for (let i = 0; i < n; i++) { frag.append(order[i].frag); order[i].frag = null; }
      this.end.before(frag);
    } else {
      const stay = new Set();
      lis(seq).forEach(k => stay.add(seqAt[k]));
      let cursor = this.start;
      for (let i = 0; i < n; i++) {
        const e = order[i];
        if (e.frag) { cursor.after(e.frag); e.frag = null; }
        else if (!stay.has(i)) {
          if (e.first === e.last) cursor.after(e.first); else cursor.after(...rangeOf(e));
        }
        cursor = e.last;
      }
    }

    // 6. @empty
    if (!n && op.empty) {
      if (!this.empty) {
        this.empty = instantiate(op.empty, this.scope, this.ctx);
        this.end.before(this.empty.frag);
        this.empty.frag = null;
      }
    } else if (this.empty) { removeView(this.empty); this.empty = null; }
  }
}

function setIndex(sc, i, n) {
  sc.$index = i;
  sc.$count = n;
  sc.$first = i === 0;
  sc.$last = i === n - 1;
  sc.$even = i % 2 === 0;
  sc.$odd = i % 2 === 1;
}

/* ---------- components ---------- */

const envFor = Comp => {
  const components = {};
  for (const C of Comp.$meta.imports || []) components[C.$meta.selector.toLowerCase()] = C;
  return components;
};

function getBlueprint(Comp) {
  if (!Comp.$bp) {
    const meta = Comp.$meta, components = envFor(Comp);
    if (meta.aot) Comp.$bp = meta.aot(components, kit);
    else if (compiler) Comp.$bp = compiler(meta.template, components);
    else throw new Error('AngeLite: this build has no template compiler. Precompile the template or use the full build.');
  }
  return Comp.$bp;
}

function createInstance(Comp) {
  const instance = new Comp();
  let proto = Comp.prototype;
  while (proto && proto !== Object.prototype) {
    for (const key of Object.getOwnPropertyNames(proto)) {
      if (key !== 'constructor' && typeof instance[key] === 'function' && !Object.prototype.hasOwnProperty.call(instance, key)) {
        instance[key] = instance[key].bind(instance);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }
  return instance;
}

function keyMap(Comp, instance) {
  if (!Comp.$keys) {
    Comp.$keys = {};
    for (const k of Object.keys(instance)) Comp.$keys[k.toLowerCase()] = k;
  }
  return Comp.$keys;
}

function attach(Comp, instance, host, projected, owner) {
  if (instance.ngOnInit) instance.ngOnInit();
  const cv = instantiate(getBlueprint(Comp), instance, { projected });
  host.append(cv.frag);
  cv.frag = null;
  if (instance.ngAfterViewInit) instance.ngAfterViewInit();
  owner.push(() => {
    destroyView(cv);
    if (instance.ngOnDestroy) instance.ngOnDestroy();
    if (projected) destroyView(projected);
  });
}

function applyComp(op, host, view, scope, ctx, st, n) {
  const instance = createInstance(op.Comp);
  instance.$el = host;
  const keys = keyMap(op.Comp, instance);
  const own = ownOf(view);

  // Content between the tags is rendered in the parent scope, then projected.
  const projected = op.childBp ? instantiate(op.childBp, scope, ctx) : null;
  if (projected) (view.dep || (view.dep = [])).push({ refresh: () => refresh(projected) });

  for (const inp of op.inputs) {
    const k = keys[inp.key.toLowerCase()];
    const target = k && instance[k] && instance[k].set ? instance[k] : host;
    st[inp.slot] = target;
    let v;
    try { v = untracked(() => inp.fn(scope)); } catch (e) { logError(e, `[${inp.key}]`); continue; }
    st[n + inp.slot] = v;
    if (target === host) A.prop(inp.key)(host, v); else target.set(v);
  }
  for (const s of op.statics) {
    const k = keys[s.key.toLowerCase()];
    if (k && instance[k] && instance[k].set) instance[k].set(s.value);
  }
  for (const o of op.outputs) {
    const k = keys[o.evt.toLowerCase()];
    const out = k && instance[k];
    if (out && out.subscribe) {
      own.push(out.subscribe(payload => {
        const sc = Object.create(scope);
        sc.$event = payload;
        try { o.run(sc); } catch (e) { logError(e, `(${o.evt})`); }
      }));
    } else onEvent(host, o.evt, o.run, scope);
  }

  attach(op.Comp, instance, host, projected, own);
}

/** Defines a component: `component(MyClass, { selector, template, imports })`. */
export function component(Class, meta) {
  if (!meta || !(meta.template || meta.aot)) throw new Error('component() needs a template');
  Class.$meta = { selector: 'app-root', ...meta };
  return Class;
}

/** Decorator form for toolchains that support it: `@Component({...}) class X {}` */
export const Component = meta => Class => component(Class, meta);

/** Mounts a component into an element. Returns { destroy() }. */
export function mount(Comp, el) {
  const host = document.createElement(Comp.$meta.selector);
  // The root host makes no layout box of its own. An inline host around block content forces the browser to split
  // boxes, which measurably slows the first paint. Style the element you mount into, or the component's own root.
  host.style.display = 'contents';
  el.appendChild(host);
  const instance = createInstance(Comp);
  instance.$el = host;
  const owner = [];
  attach(Comp, instance, host, null, owner);
  return {
    destroy() {
      for (let i = owner.length - 1; i >= 0; i--) owner[i]();
      owner.length = 0;
      host.remove();
    }
  };
}
