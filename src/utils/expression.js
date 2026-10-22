/**
 * Safe template expression evaluator (no eval / new Function).
 * Supports literals, identifiers, member access (. ?. []), calls, unary and
 * binary operators, ternary, array/object-free literals and parentheses.
 */

const BLOCKED = new Set(['__proto__', 'constructor', 'prototype']);
const cache = new Map();

const BINARY = {
  '??': 1, '||': 2, '&&': 3,
  '==': 4, '!=': 4, '===': 4, '!==': 4,
  '<': 5, '>': 5, '<=': 5, '>=': 5,
  '+': 6, '-': 6, '*': 7, '/': 7, '%': 7
};

const OPS = ['===', '!==', '==', '!=', '<=', '>=', '&&', '||', '??', '?.',
  '+', '-', '*', '/', '%', '<', '>', '!', '?', ':', '.', ',', '(', ')', '[', ']'];

function tokenize(src) {
  const tokens = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      const m = /^(\d+\.?\d*|\.\d+)/.exec(src.slice(i));
      tokens.push({ t: 'num', v: parseFloat(m[0]) });
      i += m[0].length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let j = i + 1, out = '';
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') j++;
        out += src[j++];
      }
      if (j >= src.length) throw new SyntaxError(`Unterminated string in "${src}"`);
      tokens.push({ t: 'str', v: out });
      i = j + 1;
      continue;
    }
    const id = /^[A-Za-z_$][\w$]*/.exec(src.slice(i));
    if (id) { tokens.push({ t: 'id', v: id[0] }); i += id[0].length; continue; }
    const op = OPS.find(o => src.startsWith(o, i));
    if (!op) throw new SyntaxError(`Unexpected "${ch}" in "${src}"`);
    tokens.push({ t: 'op', v: op });
    i += op.length;
  }
  return tokens;
}

const LITERALS = { true: true, false: false, null: null, undefined: undefined };

function parse(src) {
  const tokens = tokenize(src);
  let pos = 0;
  const peek = () => tokens[pos];
  const isOp = v => peek() && peek().t === 'op' && peek().v === v;
  const expect = v => {
    if (!isOp(v)) throw new SyntaxError(`Expected "${v}" in "${src}"`);
    pos++;
  };

  function primary() {
    const tok = tokens[pos++];
    if (!tok) throw new SyntaxError(`Unexpected end of "${src}"`);
    if (tok.t === 'num' || tok.t === 'str') return { k: 'lit', v: tok.v };
    if (tok.t === 'id') {
      return Object.prototype.hasOwnProperty.call(LITERALS, tok.v) ? { k: 'lit', v: LITERALS[tok.v] } : { k: 'id', name: tok.v };
    }
    if (tok.v === '(') { const e = ternary(); expect(')'); return e; }
    if (tok.v === '[') {
      const items = [];
      while (!isOp(']')) { items.push(ternary()); if (!isOp(']')) expect(','); }
      expect(']');
      return { k: 'arr', items };
    }
    throw new SyntaxError(`Unexpected "${tok.v}" in "${src}"`);
  }

  function postfix() {
    let node = primary();
    for (;;) {
      if (isOp('.') || isOp('?.')) {
        const optional = tokens[pos++].v === '?.';
        if (optional && (isOp('(') || isOp('['))) {
          // a?.(args) / a?.[x]
          if (isOp('[')) { pos++; const p = ternary(); expect(']'); node = { k: 'mem', obj: node, prop: p, opt: true }; }
          else { pos++; node = { k: 'call', fn: node, args: args(), opt: true }; }
          continue;
        }
        const name = tokens[pos++];
        if (!name || name.t !== 'id') throw new SyntaxError(`Expected property name in "${src}"`);
        node = { k: 'mem', obj: node, prop: { k: 'lit', v: name.v }, opt: optional };
      } else if (isOp('[')) {
        pos++; const p = ternary(); expect(']');
        node = { k: 'mem', obj: node, prop: p };
      } else if (isOp('(')) {
        pos++; node = { k: 'call', fn: node, args: args() };
      } else return node;
    }
  }

  function args() {
    const list = [];
    while (!isOp(')')) { list.push(ternary()); if (!isOp(')')) expect(','); }
    expect(')');
    return list;
  }

  function unary() {
    if (isOp('!') || isOp('-') || isOp('+')) {
      const op = tokens[pos++].v;
      return { k: 'un', op, arg: unary() };
    }
    return postfix();
  }

  function binary(min) {
    let left = unary();
    for (;;) {
      const tok = peek();
      const prec = tok && tok.t === 'op' ? BINARY[tok.v] : undefined;
      if (!prec || prec < min) return left;
      pos++;
      left = { k: 'bin', op: tok.v, l: left, r: binary(prec + 1) };
    }
  }

  function ternary() {
    const test = binary(1);
    if (!isOp('?')) return test;
    pos++;
    const a = ternary();
    expect(':');
    return { k: 'cond', test, a, b: ternary() };
  }

  const ast = ternary();
  if (pos < tokens.length) throw new SyntaxError(`Unexpected "${tokens[pos].v}" in "${src}"`);
  return ast;
}

function member(obj, key) {
  if (BLOCKED.has(key)) return undefined;
  return obj[key];
}

const notFn = node => {
  if (node.opt) return undefined;
  throw new TypeError('Expression is not a function');
};

/** Turns an AST into a closure `(context) => value` (no per-eval allocation). */
function compile(node) {
  switch (node.k) {
    case 'lit': { const v = node.v; return () => v; }
    case 'arr': { const items = node.items.map(compile); return c => items.map(f => f(c)); }
    case 'id': {
      const name = node.name;
      if (BLOCKED.has(name)) return () => undefined;
      return c => (c == null ? undefined : c[name]);
    }
    case 'mem': {
      const obj = compile(node.obj);
      const lit = node.prop.k === 'lit';
      const key = lit ? node.prop.v : null;
      const prop = lit ? null : compile(node.prop);
      return c => {
        const o = obj(c);
        return o == null ? undefined : member(o, lit ? key : prop(c));
      };
    }
    case 'call': {
      const args = node.args.map(compile);
      const callee = node.fn;
      const argv = c => args.map(a => a(c));
      if (callee.k === 'mem') {
        const obj = compile(callee.obj);
        const lit = callee.prop.k === 'lit';
        const key = lit ? callee.prop.v : null;
        const prop = lit ? null : compile(callee.prop);
        return c => {
          const o = obj(c);
          if (o == null) return undefined;
          const fn = member(o, lit ? key : prop(c));
          if (typeof fn !== 'function') return fn == null ? undefined : notFn(node);
          return fn.apply(o, argv(c));
        };
      }
      const f = compile(callee);
      const self = callee.k === 'id';
      return c => {
        const fn = f(c);
        if (typeof fn !== 'function') return fn == null ? undefined : notFn(node);
        return fn.apply(self ? c : undefined, argv(c));
      };
    }
    case 'un': {
      const arg = compile(node.arg);
      if (node.op === '!') return c => !arg(c);
      if (node.op === '-') return c => -arg(c);
      return c => +arg(c);
    }
    case 'cond': {
      const t = compile(node.test), a = compile(node.a), b = compile(node.b);
      return c => (t(c) ? a(c) : b(c));
    }
    case 'bin': {
      const l = compile(node.l), r = compile(node.r);
      switch (node.op) {
        case '&&': return c => { const v = l(c); return v ? r(c) : v; };
        case '||': return c => { const v = l(c); return v ? v : r(c); };
        case '??': return c => { const v = l(c); return v != null ? v : r(c); };
        case '+': return c => l(c) + r(c);
        case '-': return c => l(c) - r(c);
        case '*': return c => l(c) * r(c);
        case '/': return c => l(c) / r(c);
        case '%': return c => l(c) % r(c);
        case '<': return c => l(c) < r(c);
        case '>': return c => l(c) > r(c);
        case '<=': return c => l(c) <= r(c);
        case '>=': return c => l(c) >= r(c);
        case '==': return c => l(c) == r(c); // eslint-disable-line eqeqeq
        case '!=': return c => l(c) != r(c); // eslint-disable-line eqeqeq
        case '===': return c => l(c) === r(c);
        default: return c => l(c) !== r(c);
      }
    }
    default:
      throw new Error(`Unknown node ${node.k}`);
  }
}

/** Compiles (and caches) an expression into `(context) => value`. Throws on syntax errors. */
export function compileExpression(expr) {
  let fn = cache.get(expr);
  if (!fn) {
    fn = compile(parse(expr));
    cache.set(expr, fn);
  }
  return fn;
}

/**
 * Evaluate an expression against a context object.
 * Parse errors throw; use `safeEvaluate` for a fallback value.
 */
export function evaluate(expr, context) {
  return compileExpression(expr)(context);
}

export function safeEvaluate(expr, context, fallback) {
  try {
    return evaluate(expr, context);
  } catch (e) {
    return fallback;
  }
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ESCAPES[c]);
}

/**
 * Replace {{ expr }} occurrences. Values are HTML-escaped; objects are not
 * stringified specially (use the json pipe).
 */
export function interpolate(template, context) {
  return template.replace(/\{\{\s*([^}]+?)\s*\}\}/g, (match, expr) => {
    const value = safeEvaluate(expr, context, undefined);
    return value == null ? '' : escapeHtml(value);
  });
}
