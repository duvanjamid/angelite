/**
 * Template compiler, component runtime and mount().
 *
 * Each template is compiled ONCE into a blueprint: a cleaned DOM fragment plus a flat list of
 * instructions (ops) addressed by node position. Creating a view is then: clone the fragment,
 * walk it once applying the ops, and create a single effect that re-evaluates the view's
 * bindings (writing to the DOM only when a value actually changed).
 *
 * Events are delegated to `document` and stored as properties on the elements, so views carry
 * no per-element listeners or closures.
 */

import { compileExpression } from '../utils/expression.js';
import { Effect, untracked } from './signals.js';
import { pipes } from './pipes.js';

const hooks = { outlet: null };
export const setOutletBinder = fn => { hooks.outlet = fn; };

const NONE = Symbol('none');
const logError = (e, what) => console.error(`[AngeLite] ${what}:`, e);
const ownOf = view => view.own || (view.own = []);

/** Removes `from` and its following siblings up to and including `to`. */
function eat(from, to) {
  for (let n = from; n;) {
    const after = n.nextSibling;
    n.remove();
    if (n === to) break;
    n = after;
  }
}

/* ---------- expressions ---------- */

function splitTop(src, ch) {
  const out = [];
  let depth = 0, quote = null, cur = '';
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      cur += c;
      if (c === '\\') cur += src[++i] || '';
      else if (c === quote) quote = null;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; cur += c; continue; }
    if ('([{'.includes(c)) depth++;
    else if (')]}'.includes(c)) depth--;
    const isOr = ch === '|' && (src[i + 1] === '|' || src[i - 1] === '|');
    if (c === ch && depth === 0 && !isOr) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out.map(s => s.trim());
}

const memo = (cache, key, make) => {
  let v = cache.get(key);
  if (!v) cache.set(key, v = make());
  return v;
};
const exprCache = new Map(), textCache = new Map(), stmtCache = new Map();

const compileExpr = src => memo(exprCache, src, () => {
  const [base, ...rest] = splitTop(src, '|');
  const baseFn = compileExpression(base);
  if (!rest.length) return baseFn;
  const steps = rest.map(p => {
    const [name, ...args] = splitTop(p, ':');
    return { name, args: args.map(compileExpression) };
  });
  return scope => steps.reduce((value, { name, args }) => {
    if (!pipes[name]) throw new Error(`Unknown pipe "${name}"`);
    return pipes[name](value, ...args.map(a => a(scope)));
  }, baseFn(scope));
});

const compileStatements = src => memo(stmtCache, src, () => {
  const list = splitTop(src, ';').filter(Boolean).map(compileExpression);
  return scope => { for (let i = 0; i < list.length; i++) list[i](scope); };
});

const textOf = v => (v == null ? '' : String(v));

const interpolation = text => memo(textCache, text, () => {
  const parts = text.split(/\{\{([\s\S]*?)\}\}/);
  const compiled = parts.map((p, i) => (i % 2 ? compileExpr(p) : p));
  if (parts.length === 3 && !parts[0] && !parts[2]) {
    const only = compiled[1];
    return scope => textOf(only(scope));
  }
  return scope => {
    let out = '';
    for (let i = 0; i < compiled.length; i++) out += i % 2 ? textOf(compiled[i](scope)) : compiled[i];
    return out;
  };
});

/* ---------- control-flow syntax: @if / @else if / @else / @for / @empty ---------- */

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const USES_INDEX = /\$(?:index|count|first|last|even|odd)\b/;

function matchClose(src, start, open, close, skipQuotes) {
  let depth = 0, quote = null;
  for (let i = start; i < src.length; i++) {
    const c = src[i];
    if (skipQuotes && quote) { if (c === quote) quote = null; continue; }
    if (skipQuotes && (c === '"' || c === "'")) { quote = c; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) return i;
  }
  throw new SyntaxError(`Unclosed "${open}" in template`);
}

function transform(src) {
  let out = '', i = 0;
  while (i < src.length) {
    const at = src.indexOf('@', i);
    if (at < 0) break;
    const m = /^@(else\s+if|if|for|else|empty)\s*/.exec(src.slice(at));
    if (!m) { out += src.slice(i, at + 1); i = at + 1; continue; }
    out += src.slice(i, at);
    const kind = m[1].replace(/\s+/, ' ');
    let pos = at + m[0].length, head = '';
    if (kind !== 'else' && kind !== 'empty') {
      if (src[pos] !== '(') throw new SyntaxError(`Expected "(" after @${kind}`);
      const end = matchClose(src, pos, '(', ')', true);
      head = src.slice(pos + 1, end).trim();
      pos = end + 1;
      while (/\s/.test(src[pos])) pos++;
    }
    if (src[pos] !== '{') throw new SyntaxError(`Expected "{" after @${kind}`);
    const end = matchClose(src, pos, '{', '}', false);
    const raw = src.slice(pos + 1, end);
    const body = transform(raw);
    if (kind === 'if') out += `<template data-if="${esc(head)}">${body}</template>`;
    else if (kind === 'else if') out += `<template data-elseif="${esc(head)}">${body}</template>`;
    else if (kind === 'else') out += `<template data-else>${body}</template>`;
    else if (kind === 'empty') out += `<template data-empty>${body}</template>`;
    else {
      const [each, ...opts] = splitTop(head, ';');
      const track = opts.map(o => /^track\s+([\s\S]+)$/.exec(o)).find(Boolean);
      const ix = USES_INDEX.test(raw) ? ' data-ix' : '';
      out += `<template data-for="${esc(each)}"${track ? ` data-track="${esc(track[1])}"` : ''}${ix}>${body}</template>`;
    }
    i = end + 1;
  }
  return out + src.slice(i);
}

const NO_TEXT = /^(?:TABLE|THEAD|TBODY|TFOOT|TR|COLGROUP|SELECT|OPTGROUP)$/;

/**
 * Whitespace-only text nodes containing a newline (template indentation) are removed at the edges and
 * inside table-like parents, and collapsed to a single space between siblings, like Angular's default.
 */
function trimWhitespace(root) {
  for (let n = root.firstChild; n;) {
    const next = n.nextSibling;
    if (n.nodeType === 3) {
      if (!n.data.trim() && n.data.includes('\n')) {
        if (!n.previousSibling || !next || NO_TEXT.test(root.nodeName)) n.remove(); else n.data = ' ';
      }
    } else if (n.nodeType === 1) trimWhitespace(n.tagName === 'TEMPLATE' ? n.content : n);
    n = next;
  }
}

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
    const attr = name.slice(5);
    return (el, v) => (v == null || v === false ? el.removeAttribute(attr) : el.setAttribute(attr, v === true ? '' : v));
  }
  return (el, v) => { el[resolveProp(el, name)] = v; };
}

const applyText = (node, v) => { node.data = v; };

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

/* ---------- blueprint compiler ---------- */

const envFor = Comp => {
  const components = {};
  for (const C of Comp.$meta.imports || []) components[C.$meta.selector.toLowerCase()] = C;
  return components;
};

function compile(content, components, forceMarker) {
  const bp = { tpl: content, ops: [], upd: [], dynamic: !!forceMarker, n: 0 };

  const slot = (fn, apply) => bp.upd.push({ fn, apply }) - 1;

  function walkAttrs(el, ord, spec) {
    for (const attr of [...el.attributes]) {
      const { name, value } = attr;
      if (name.startsWith('(') && name.endsWith(')')) {
        el.removeAttribute(name);
        const evt = name.slice(1, -1), run = compileStatements(value);
        if (spec) spec.outputs.push({ evt, run });
        else bp.ops.push({ ord, type: 'ev', evt, run });
      } else if (name === '[(ngmodel)]' && !spec) {
        el.removeAttribute(name);
        const src = compileExpression(value);
        const s = slot(scope => {
          const sig = src(scope);
          if (typeof sig !== 'function' || !sig.set) throw new Error(`[(ngModel)]="${value}" needs a writable signal`);
          return sig();
        }, (node, v) => {
          if (node.type === 'checkbox') node.checked = !!v;
          else node.value = v == null ? '' : v;
        });
        const handler = (scope, e, node) => {
          src(scope).set(node.type === 'checkbox' ? node.checked : node.type === 'number' ? node.valueAsNumber : node.value);
        };
        bp.ops.push({ ord, type: 'model', slot: s, handler, change: el.type === 'checkbox' || el.tagName === 'SELECT' });
      } else if (name.startsWith('[') && name.endsWith(']')) {
        el.removeAttribute(name);
        const prop = name.slice(1, -1), fn = compileExpr(value), dom = makeApply(prop);
        if (spec) {
          const s = slot(fn, (ref, v) => (ref.set ? ref.set(v) : dom(ref, v)));
          spec.inputs.push({ key: prop, slot: s, fn });
        } else bp.ops.push({ ord, type: 'ref', slot: slot(fn, dom) });
      } else if (name === 'routerlink') {
        el.setAttribute('href', '#' + (value.startsWith('/') ? value : '/' + value));
      } else if (value.includes('{{')) {
        const fn = interpolation(value);
        if (spec) {
          const s = slot(fn, (ref, v) => (ref.set ? ref.set(v) : ref.setAttribute(name, v)));
          spec.inputs.push({ key: name, slot: s, fn });
        } else bp.ops.push({ ord, type: 'ref', slot: slot(fn, (node, v) => node.setAttribute(name, v)) });
      } else if (spec) spec.statics.push({ key: name, value });
    }
  }

  function walk(parent, top) {
    let node = parent.firstChild;
    while (node) {
      let next = node.nextSibling;
      const ord = bp.n++;

      if (node.nodeType === 3) {
        if (node.data.includes('{{')) {
          bp.ops.push({ ord, type: 'ref', slot: slot(interpolation(node.data), applyText) });
          node.data = '';
        }
      } else if (node.nodeType === 1) {
        const tag = node.localName;
        if (tag === 'template' && node.hasAttribute('data-if')) {
          const chain = [node];
          for (let probe = next; probe;) {
            if (probe.nodeType === 3 && !probe.data.trim()) { probe = probe.nextSibling; continue; }
            if (probe.nodeType === 1 && probe.localName === 'template' &&
                (probe.hasAttribute('data-elseif') || probe.hasAttribute('data-else'))) {
              chain.push(probe);
              probe = probe.nextSibling;
              continue;
            }
            break;
          }
          const branches = chain.map(t => {
            const src = t.getAttribute('data-if') ?? t.getAttribute('data-elseif');
            return { test: src == null ? null : compileExpr(src), bp: compile(t.content, components) };
          });
          const anchor = document.createComment('@if');
          node.replaceWith(anchor);
          if (chain.length > 1 || anchor.nextSibling !== next) eat(anchor.nextSibling, chain[chain.length - 1]);
          next = anchor.nextSibling;
          const s = slot(scope => {
            for (let i = 0; i < branches.length; i++) if (!branches[i].test || branches[i].test(scope)) return i;
            return -1;
          }, (state, idx) => state.update(idx));
          bp.ops.push({ ord, type: 'if', slot: s, branches });
          if (top) bp.dynamic = true;
        } else if (tag === 'template' && node.hasAttribute('data-for')) {
          const head = /^\s*(\w+)\s+of\s+([\s\S]+)$/.exec(node.getAttribute('data-for'));
          if (!head) throw new SyntaxError(`Invalid @for: "${node.getAttribute('data-for')}"`);
          let empty = null;
          for (let probe = node.nextSibling; probe;) {
            if (probe.nodeType === 3 && !probe.data.trim()) { probe = probe.nextSibling; continue; }
            if (probe.nodeType === 1 && probe.hasAttribute('data-empty')) empty = probe;
            break;
          }
          const forOp = {
            ord, type: 'for', name: head[1],
            track: node.hasAttribute('data-track') ? compileExpr(node.getAttribute('data-track')) : null,
            ix: node.hasAttribute('data-ix'),
            bp: compile(node.content, components),
            empty: empty ? compile(empty.content, components) : null
          };
          const start = document.createComment('@for'), end = document.createComment('');
          node.replaceWith(start);
          start.after(end);
          if (empty) eat(end.nextSibling, empty);
          next = end.nextSibling;
          bp.n++; // the end marker is part of the tree walk
          forOp.slot = slot(compileExpr(head[2]), (state, list) => state.update(list));
          bp.ops.push(forOp);
          if (top) bp.dynamic = true;
        } else if (tag === 'ng-content') {
          bp.ops.push({ ord, type: 'content' });
          if (top) bp.dynamic = true;
        } else if (tag === 'router-outlet' && hooks.outlet) {
          bp.ops.push({ ord, type: 'outlet' });
        } else if (components[tag]) {
          const spec = { inputs: [], outputs: [], statics: [] };
          let childBp = null;
          if (node.firstChild) {
            const ct = document.createDocumentFragment();
            while (node.firstChild) ct.append(node.firstChild);
            childBp = compile(ct, components, true);
          }
          walkAttrs(node, ord, spec);
          bp.ops.push({ ord, type: 'comp', Comp: components[tag], childBp, ...spec });
        } else {
          walkAttrs(node, ord, null);
          walk(node, false);
        }
      }
      node = next;
    }
  }

  walk(content, true);
  return bp;
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
      onEvent(node, op.change ? 'change' : 'input', op.handler, scope);
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
      hooks.outlet(node, ownOf(view), mount);
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
  }

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
    this.empty = null;
    // Only used to compute track keys. Own writable props so enclosing @for scopes can't block assignment.
    this.probe = Object.create(scope);
    for (const key of [op.name, '$index']) Object.defineProperty(this.probe, key, { value: undefined, writable: true });
    ownOf(view).push(() => {
      this.entries.forEach(destroyView);
      this.entries.clear();
      if (this.empty) destroyView(this.empty);
    });
  }

  update(list) {
    untracked(() => this.reconcile(Array.isArray(list) ? list : Array.from(list || [])));
  }

  reconcile(items) {
    const { op, probe, entries } = this;
    const name = op.name, track = op.track, ix = op.ix;
    const n = items.length;

    // 1. keys
    const next = new Map();
    const keys = new Array(n);
    let reused = 0;
    for (let i = 0; i < n; i++) {
      let key = items[i];
      if (track) { probe[name] = key; probe.$index = i; key = track(probe); }
      if (next.has(key)) key = Symbol('dup');
      next.set(key, null);
      keys[i] = key;
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
        if (changed && e.st) e.run();
        seq.push(e.pos);
        seqAt.push(i);
      } else {
        const sc = Object.create(this.scope);
        sc[name] = item;
        if (ix) setIndex(sc, i, n);
        e = instantiate(op.bp, sc, this.ctx);
      }
      order[i] = e;
      next.set(keys[i], e);
    }

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

function getBlueprint(Comp) {
  if (!Comp.$bp) {
    const t = document.createElement('template');
    t.innerHTML = transform(Comp.$meta.template || '');
    trimWhitespace(t.content);
    Comp.$bp = compile(t.content, envFor(Comp));
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

  for (const inp of op.inputs) {
    const k = keys[inp.key.toLowerCase()];
    const target = k && instance[k] && instance[k].set ? instance[k] : host;
    st[inp.slot] = target;
    let v;
    try { v = untracked(() => inp.fn(scope)); } catch (e) { logError(e, `[${inp.key}]`); continue; }
    st[n + inp.slot] = v;
    if (target === host) makeApply(inp.key)(host, v); else target.set(v);
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
  if (!meta || !meta.template) throw new Error('component() needs a template');
  Class.$meta = { selector: 'app-root', ...meta };
  return Class;
}

/** Decorator form for toolchains that support it: `@Component({...}) class X {}` */
export const Component = meta => Class => component(Class, meta);

/** Mounts a component into an element. Returns { destroy() }. */
export function mount(Comp, el) {
  const host = document.createElement(Comp.$meta.selector);
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
