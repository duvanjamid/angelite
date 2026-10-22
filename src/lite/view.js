/**
 * Template compiler, component runtime and mount().
 *
 * Templates are parsed once into a <template> element, then cloned and bound
 * per instance. Every binding is an effect, so only the exact text nodes,
 * attributes and blocks that depend on a changed signal are updated.
 */

import { evaluate } from '../utils/expression.js';
import { effect, untracked, signal } from './signals.js';
import { pipes } from './pipes.js';

const hooks = { outlet: null };
export const setOutletBinder = fn => { hooks.outlet = fn; };

const dispose = own => { own.splice(0).reverse().forEach(fn => fn()); };

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

function compileExpr(src) {
  const [base, ...rest] = splitTop(src, '|');
  const steps = rest.map(p => {
    const [name, ...args] = splitTop(p, ':');
    return { name, args };
  });
  if (!steps.length) return scope => evaluate(base, scope);
  return scope => steps.reduce((value, { name, args }) => {
    if (!pipes[name]) throw new Error(`Unknown pipe "${name}"`);
    return pipes[name](value, ...args.map(a => evaluate(a, scope)));
  }, evaluate(base, scope));
}

function compileStatements(src) {
  const list = splitTop(src, ';').filter(Boolean);
  return scope => list.forEach(s => evaluate(s, scope));
}

/* ---------- control-flow syntax: @if / @else if / @else / @for / @empty ---------- */

const esc = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

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
    const body = transform(src.slice(pos + 1, end));
    if (kind === 'if') out += `<template data-if="${esc(head)}">${body}</template>`;
    else if (kind === 'else if') out += `<template data-elseif="${esc(head)}">${body}</template>`;
    else if (kind === 'else') out += `<template data-else>${body}</template>`;
    else if (kind === 'empty') out += `<template data-empty>${body}</template>`;
    else {
      const [each, ...opts] = splitTop(head, ';');
      const track = opts.map(o => /^track\s+([\s\S]+)$/.exec(o)).find(Boolean);
      out += `<template data-for="${esc(each)}"${track ? ` data-track="${esc(track[1])}"` : ''}>${body}</template>`;
    }
    i = end + 1;
  }
  return out + src.slice(i);
}

/* ---------- DOM helpers ---------- */

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

function setBinding(el, name, value) {
  if (name.startsWith('class.')) el.classList.toggle(name.slice(6), !!value);
  else if (name.startsWith('style.')) {
    const [prop, unit = ''] = name.slice(6).split('.');
    if (value == null || value === false) el.style.removeProperty(prop);
    else el.style.setProperty(prop, value + unit);
  } else if (name.startsWith('attr.')) {
    const attr = name.slice(5);
    if (value == null || value === false) el.removeAttribute(attr);
    else el.setAttribute(attr, value === true ? '' : value);
  } else el[resolveProp(el, name)] = value;
}

const textOf = v => (v == null ? '' : String(v));

function interpolation(text) {
  const parts = text.split(/\{\{([\s\S]*?)\}\}/);
  const compiled = parts.map((p, i) => (i % 2 ? compileExpr(p) : p));
  return scope => compiled.map((p, i) => (i % 2 ? textOf(p(scope)) : p)).join('');
}

/* ---------- binding ---------- */

function bindChildren(parent, scope, env, own) {
  let node = parent.firstChild;
  while (node) {
    let next = node.nextSibling;
    if (node.nodeType === 3) {
      if (node.data.includes('{{')) {
        const text = node, fn = interpolation(text.data);
        effect(() => { text.data = fn(scope); }, own);
      }
    } else if (node.nodeType === 1) {
      if (node.tagName === 'TEMPLATE' && node.hasAttribute('data-if')) {
        const chain = [node];
        let probe = next;
        while (probe) {
          if (probe.nodeType === 3 && !probe.data.trim()) { probe = probe.nextSibling; continue; }
          if (probe.nodeType === 1 && probe.tagName === 'TEMPLATE' &&
              (probe.hasAttribute('data-elseif') || probe.hasAttribute('data-else'))) {
            chain.push(probe);
            next = probe = probe.nextSibling;
            continue;
          }
          break;
        }
        bindIf(chain, scope, env, own);
      } else if (node.tagName === 'TEMPLATE' && node.hasAttribute('data-for')) {
        let probe = next;
        while (probe && probe.nodeType === 3 && !probe.data.trim()) probe = probe.nextSibling;
        let empty = null;
        if (probe && probe.nodeType === 1 && probe.hasAttribute('data-empty')) {
          empty = probe;
          next = probe.nextSibling;
        }
        bindFor(node, empty, scope, env, own);
      } else bindElement(node, scope, env, own);
    }
    node = next;
  }
}

function render(content, scope, env) {
  const frag = content.cloneNode(true);
  const own = [];
  bindChildren(frag, scope, env, own);
  return { own, nodes: [...frag.childNodes], frag };
}

function bindIf(chain, scope, env, own) {
  const anchor = document.createComment('@if');
  chain[0].replaceWith(anchor);
  chain.slice(1).forEach(n => n.remove());
  const branches = chain.map(t => {
    const src = t.getAttribute('data-if') ?? t.getAttribute('data-elseif');
    return { test: src == null ? null : compileExpr(src), content: t.content };
  });
  let current = -1, view = null;
  const clear = () => {
    if (!view) return;
    dispose(view.own);
    view.nodes.forEach(n => n.remove());
    view = null;
  };
  own.push(clear);
  effect(() => {
    const idx = branches.findIndex(b => !b.test || b.test(scope));
    if (idx === current) return;
    untracked(() => {
      clear();
      current = idx;
      if (idx >= 0) {
        view = render(branches[idx].content, scope, env);
        anchor.after(view.frag);
      }
    });
  }, own);
}

function itemScope(parent, name, item, index, count) {
  const s = Object.create(parent);
  const def = (key, get) => Object.defineProperty(s, key, { get, enumerable: true });
  def(name, item);
  def('$index', index);
  def('$count', count);
  def('$first', () => index() === 0);
  def('$last', () => index() === count() - 1);
  def('$even', () => index() % 2 === 0);
  def('$odd', () => index() % 2 === 1);
  return s;
}

function bindFor(tpl, emptyTpl, scope, env, own) {
  const head = /^\s*(\w+)\s+of\s+([\s\S]+)$/.exec(tpl.getAttribute('data-for'));
  if (!head) throw new SyntaxError(`Invalid @for: "${tpl.getAttribute('data-for')}"`);
  const [, name, listSrc] = head;
  const list = compileExpr(listSrc);
  const trackSrc = tpl.getAttribute('data-track');
  const track = trackSrc ? compileExpr(trackSrc) : null;
  const anchor = document.createComment('@for');
  tpl.replaceWith(anchor);
  if (emptyTpl) emptyTpl.remove();

  let entries = new Map();
  let emptyView = null;
  const clearEmpty = () => {
    if (!emptyView) return;
    dispose(emptyView.own);
    emptyView.nodes.forEach(n => n.remove());
    emptyView = null;
  };
  const drop = e => { dispose(e.own); e.nodes.forEach(n => n.remove()); };
  own.push(() => { entries.forEach(drop); entries.clear(); clearEmpty(); });

  effect(() => {
    const items = Array.from(list(scope) || []);
    untracked(() => {
      const next = new Map();
      items.forEach((item, i) => {
        const probe = itemScope(scope, name, () => item, () => i, () => items.length);
        let key = track ? track(probe) : item;
        if (next.has(key)) key = Symbol('dup');
        let entry = entries.get(key);
        if (entry) {
          entry.item.set(item);
          entry.index.set(i);
          entry.count.set(items.length);
        } else {
          entry = { item: signal(item), index: signal(i), count: signal(items.length) };
          const view = render(tpl.content, itemScope(scope, name, entry.item, entry.index, entry.count), env);
          entry.own = view.own;
          entry.nodes = view.nodes;
        }
        next.set(key, entry);
      });
      entries.forEach((e, key) => { if (!next.has(key)) drop(e); });
      entries = next;
      let cursor = anchor;
      entries.forEach(e => e.nodes.forEach(n => {
        if (cursor.nextSibling !== n) cursor.after(n);
        cursor = n;
      }));
      if (!items.length && emptyTpl) {
        if (!emptyView) {
          emptyView = render(emptyTpl.content, scope, env);
          anchor.after(emptyView.frag);
        }
      } else clearEmpty();
    });
  }, own);
}

function bindElement(el, scope, env, own) {
  const tag = el.tagName.toLowerCase();
  if (tag === 'ng-content') { el.replaceWith(...(env.projected || [])); return; }
  if (tag === 'router-outlet' && hooks.outlet) { hooks.outlet(el, own, mount); return; }
  const Comp = env.components[tag];
  if (Comp) { mountChild(Comp, el, scope, env, own); return; }
  bindAttrs(el, scope, own, null);
  bindChildren(el, scope, env, own);
}

function bindAttrs(el, scope, own, instance) {
  const keys = {};
  if (instance) for (const k of Object.keys(instance)) keys[k.toLowerCase()] = k;
  const slot = name => (instance && keys[name] && instance[keys[name]]) || null;

  for (const attr of [...el.attributes]) {
    const { name, value } = attr;
    if (name.startsWith('(') && name.endsWith(')')) {
      el.removeAttribute(name);
      const evt = name.slice(1, -1);
      const run = compileStatements(value);
      const out = slot(evt);
      const call = payload => {
        const s = Object.create(scope);
        s.$event = payload;
        try { run(s); } catch (e) { console.error(`Error in (${evt})="${value}":`, e); }
      };
      if (out && out.subscribe) own.push(out.subscribe(call));
      else {
        el.addEventListener(evt, call);
        own.push(() => el.removeEventListener(evt, call));
      }
    } else if (name === '[(ngmodel)]') {
      el.removeAttribute(name);
      const sig = evaluate(value, scope);
      if (typeof sig !== 'function' || !sig.set) throw new Error(`[(ngModel)]="${value}" needs a writable signal`);
      const isBox = el.type === 'checkbox';
      effect(() => { el[isBox ? 'checked' : 'value'] = sig() ?? (isBox ? false : ''); }, own);
      const evt = isBox || el.tagName === 'SELECT' ? 'change' : 'input';
      const onInput = () => sig.set(isBox ? el.checked : el.type === 'number' ? el.valueAsNumber : el.value);
      el.addEventListener(evt, onInput);
      own.push(() => el.removeEventListener(evt, onInput));
    } else if (name.startsWith('[') && name.endsWith(']')) {
      el.removeAttribute(name);
      const prop = name.slice(1, -1);
      const fn = compileExpr(value);
      const input = slot(prop);
      if (input && input.set) effect(() => input.set(fn(scope)), own);
      else effect(() => setBinding(el, prop, fn(scope)), own);
    } else if (name === 'routerlink') {
      el.setAttribute('href', '#' + (value.startsWith('/') ? value : '/' + value));
    } else if (value.includes('{{')) {
      const fn = interpolation(value);
      const input = slot(name);
      if (input && input.set) effect(() => input.set(fn(scope)), own);
      else effect(() => el.setAttribute(name, fn(scope)), own);
    } else {
      const input = slot(name);
      if (input && input.set) input.set(value);
    }
  }
}

/* ---------- components ---------- */

const templates = new WeakMap();

function getTemplate(Comp) {
  let t = templates.get(Comp);
  if (!t) {
    t = document.createElement('template');
    t.innerHTML = transform(Comp.$meta.template || '');
    templates.set(Comp, t);
  }
  return t;
}

function envFor(Comp, projected) {
  const components = {};
  for (const C of Comp.$meta.imports || []) components[C.$meta.selector.toLowerCase()] = C;
  return { components, projected };
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

function mountChild(Comp, host, scope, env, own) {
  const instance = createInstance(Comp);
  const own2 = [];
  own.push(() => dispose(own2));

  // Content between the tags is bound in the parent scope, then projected.
  bindChildren(host, scope, env, own2);
  const projected = [...host.childNodes];
  host.textContent = '';

  bindAttrs(host, scope, own2, instance);
  if (instance.ngOnInit) instance.ngOnInit();

  const frag = getTemplate(Comp).content.cloneNode(true);
  bindChildren(frag, instance, envFor(Comp, projected), own2);
  host.append(frag);
  if (instance.ngOnDestroy) own2.push(() => instance.ngOnDestroy());
  return instance;
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
  const own = [];
  const host = document.createElement(Comp.$meta.selector);
  el.appendChild(host);
  mountChild(Comp, host, {}, { components: {} }, own);
  return { destroy() { dispose(own); host.remove(); } };
}
