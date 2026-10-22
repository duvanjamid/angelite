/**
 * Template compiler (backend-agnostic).
 *
 * Turns a template (HTML + @if/@for blocks + bindings) into a blueprint: a cleaned DOM fragment plus a flat
 * list of instructions (`ops`) addressed by node position, and a list of bindings (`upd`).
 * Everything that depends on how expressions are represented goes through the backend `B`:
 *   B.parse(src)            -> handle for a plain expression
 *   B.pipe(h, name, args)   -> handle with a pipe applied
 *   B.fn(h) / B.interp(parts) / B.stmts(handles) / B.pick(tests) / B.modelRun(h) / B.modelGet(h, label)
 *   B.A                     -> apply-function factories (text, prop, attr, input, inputAttr, model, state)
 *   B.comp(tag)             -> reference to a component class
 * The in-browser backend lives in jit.js; tools/aot.mjs plugs in one that emits source code.
 */

/* ---------- expressions ---------- */

export function splitTop(src, ch) {
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

/** `a | pipe:arg | other` -> handle */
function pipeline(B, src) {
  const [base, ...rest] = splitTop(src, '|');
  return rest.reduce((h, p) => {
    const [name, ...args] = splitTop(p, ':');
    return B.pipe(h, name, args.map(a => B.parse(a)));
  }, B.parse(base));
}

const expr = (B, src) => B.fn(pipeline(B, src));

const interpolation = (B, text) => {
  const parts = text.split(/\{\{([\s\S]*?)\}\}/).map((p, i) => (i % 2 ? pipeline(B, p) : p));
  return B.interp(parts);
};

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

export function transform(src) {
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
export function trimWhitespace(root) {
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

/** Removes `from` and its following siblings up to and including `to`. */
function eat(from, to) {
  for (let n = from; n;) {
    const after = n.nextSibling;
    n.remove();
    if (n === to) break;
    n = after;
  }
}

/* ---------- blueprint compiler ---------- */

export function compile(content, components, B, forceMarker) {
  const A = B.A;
  const bp = { tpl: content, ops: [], upd: [], dynamic: !!forceMarker, n: 0 };
  const slot = (fn, apply) => bp.upd.push({ fn, apply }) - 1;

  function walkAttrs(el, ord, spec) {
    for (const attr of [...el.attributes]) {
      const { name, value } = attr;
      if (name.startsWith('(') && name.endsWith(')')) {
        el.removeAttribute(name);
        const evt = name.slice(1, -1), run = B.stmts(splitTop(value, ';').filter(Boolean).map(s => B.parse(s)));
        if (spec) spec.outputs.push({ evt, run });
        else bp.ops.push({ ord, type: 'ev', evt, run });
      } else if (name === '[(ngmodel)]' && !spec) {
        el.removeAttribute(name);
        const src = B.parse(value);
        const s = slot(B.modelGet(src, value), A.model);
        bp.ops.push({ ord, type: 'model', slot: s, run: B.modelRun(src), change: el.type === 'checkbox' || el.tagName === 'SELECT' });
      } else if (name.startsWith('[') && name.endsWith(']')) {
        el.removeAttribute(name);
        const prop = name.slice(1, -1), fn = expr(B, value);
        if (spec) spec.inputs.push({ key: prop, slot: slot(fn, A.input(prop)), fn });
        else bp.ops.push({ ord, type: 'ref', slot: slot(fn, A.prop(prop)) });
      } else if (name === 'routerlink') {
        el.setAttribute('href', '#' + (value.startsWith('/') ? value : '/' + value));
      } else if (value.includes('{{')) {
        const fn = interpolation(B, value);
        if (spec) spec.inputs.push({ key: name, slot: slot(fn, A.inputAttr(name)), fn });
        else bp.ops.push({ ord, type: 'ref', slot: slot(fn, A.attr(name)) });
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
          bp.ops.push({ ord, type: 'ref', slot: slot(interpolation(B, node.data), A.text) });
          node.data = ' '; // placeholder: keeps the node when the template is serialized
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
            return { test: src == null ? null : expr(B, src), bp: compile(t.content, components, B) };
          });
          const anchor = document.createComment('@if');
          node.replaceWith(anchor);
          if (chain.length > 1 || anchor.nextSibling !== next) eat(anchor.nextSibling, chain[chain.length - 1]);
          next = anchor.nextSibling;
          const s = slot(B.pick(branches.map(b => b.test)), A.state);
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
            track: node.hasAttribute('data-track') ? expr(B, node.getAttribute('data-track')) : null,
            ix: node.hasAttribute('data-ix'),
            bp: compile(node.content, components, B),
            empty: empty ? compile(empty.content, components, B) : null
          };
          const start = document.createComment('@for'), end = document.createComment('');
          node.replaceWith(start);
          start.after(end);
          if (empty) eat(end.nextSibling, empty);
          next = end.nextSibling;
          bp.n++; // the end marker is part of the tree walk
          forOp.slot = slot(expr(B, head[2]), A.state);
          bp.ops.push(forOp);
          if (top) bp.dynamic = true;
        } else if (tag === 'ng-content') {
          bp.ops.push({ ord, type: 'content' });
          if (top) bp.dynamic = true;
        } else if (tag === 'router-outlet') {
          bp.ops.push({ ord, type: 'outlet' });
        } else if (components[tag]) {
          const spec = { inputs: [], outputs: [], statics: [] };
          let childBp = null;
          if (node.firstChild) {
            const ct = document.createDocumentFragment();
            while (node.firstChild) ct.append(node.firstChild);
            childBp = compile(ct, components, B, true);
          }
          walkAttrs(node, ord, spec);
          bp.ops.push({ ord, type: 'comp', Comp: B.comp(tag), childBp, ...spec });
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

/** Parses template source into a blueprint using backend `B`. */
export function templateToBlueprint(source, components, B) {
  const t = document.createElement('template');
  t.innerHTML = transform(source || '');
  trimWhitespace(t.content);
  return compile(t.content, components, B);
}
