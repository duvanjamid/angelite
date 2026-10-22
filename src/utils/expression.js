/**
 * Safe template expression compiler (no eval / new Function).
 * One parser, pluggable backend: the default turns expressions into closures
 * `(context) => value`; the AOT tool plugs in a backend that emits JS source.
 * Supports literals, identifiers, member access (. ?. []), calls, unary and
 * binary operators, ternary, array literals and parentheses.
 */

const BLOCKED = ['__proto__', 'constructor', 'prototype'];
const cache = new Map();
const LIT = new Map([['true', true], ['false', false], ['null', null], ['undefined', undefined]]);

export const prop = (o, k) => (o == null || BLOCKED.includes(k) ? undefined : o[k]);

/** Default backend: turns expressions into closures `(context) => value`. */
const call = (fn, recv, args, c) => {
  if (typeof fn === 'function') return fn.apply(recv, args.map(a => a(c)));
  if (fn != null) throw new TypeError('Expression is not a function');
};
export const closures = {
  lit: v => () => v,
  id: name => c => prop(c, name),
  arr: items => c => items.map(f => f(c)),
  mem: (o, k) => c => prop(o(c), k(c)),
  callm: (o, k, args) => c => { const r = o(c); return call(prop(r, k(c)), r, args, c); },
  calli: (fn, args, self) => c => call(fn(c), self ? c : undefined, args, c),
  un: (u, a) => c => UNARY[u](a(c)),
  bin: (op, a, r) => op === '&&' ? c => a(c) && r(c)
    : op === '||' ? c => a(c) || r(c)
      : op === '??' ? c => a(c) ?? r(c)
        : c => OPS[op][1](a(c), r(c)),
  cond: (q, a, b) => c => (q(c) ? a(c) : b(c))
};

// [precedence, implementation]; && || ?? short-circuit and are handled in binary()
export const OPS = {
  '??': [1], '||': [2], '&&': [3],
  '==': [4, (a, b) => a == b], '!=': [4, (a, b) => a != b], // eslint-disable-line eqeqeq
  '===': [4, (a, b) => a === b], '!==': [4, (a, b) => a !== b],
  '<': [5, (a, b) => a < b], '>': [5, (a, b) => a > b], '<=': [5, (a, b) => a <= b], '>=': [5, (a, b) => a >= b],
  '+': [6, (a, b) => a + b], '-': [6, (a, b) => a - b],
  '*': [7, (a, b) => a * b], '/': [7, (a, b) => a / b], '%': [7, (a, b) => a % b]
};
export const UNARY = { '!': a => !a, '-': a => -a, '+': a => +a };

// number | string | identifier | operator
const TOKEN = /\s*(?:(\d+\.?\d*|\.\d+)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|([A-Za-z_$][\w$]*)|(===|!==|==|!=|<=|>=|&&|\|\||\?\?|\?\.|[-+*/%<>!?:.,()[\]]))/y;

function tokenize(src) {
  const out = [];
  TOKEN.lastIndex = 0;
  while (TOKEN.lastIndex < src.length) {
    const m = TOKEN.exec(src);
    if (!m) throw new SyntaxError(`Unexpected "${src[TOKEN.lastIndex]}" in "${src}"`);
    out.push(m[1] ? [0, +m[1]] : m[2] ? [1, m[2].slice(1, -1).replace(/\\(.)/g, '$1')] : m[3] ? [2, m[3]] : [3, m[4]]);
  }
  return out;
}

export function parse(src, E = closures) {
  const t = tokenize(src.trim());
  let i = 0;
  const op = v => t[i] && t[i][0] === 3 && t[i][1] === v;
  const eat = v => op(v) && ++i;
  const need = v => { if (!eat(v)) throw new SyntaxError(`Expected "${v}" in "${src}"`); };
  const list = close => {
    const out = [];
    while (!eat(close)) { out.push(ternary()); if (!op(close)) need(','); }
    return out;
  };

  const primary = () => {
    const tok = t[i++];
    if (!tok) throw new SyntaxError(`Unexpected end of "${src}"`);
    const [kind, v] = tok;
    if (kind < 2) return E.lit(v);
    if (kind === 2) return LIT.has(v) ? E.lit(LIT.get(v)) : E.id(v);
    if (v === '(') { const e = ternary(); need(')'); return e; }
    if (v === '[') return E.arr(list(']'));
    throw new SyntaxError(`Unexpected "${v}" in "${src}"`);
  };

  const postfix = () => {
    const first = t[i];
    let f = primary();
    // `o`/`k`: object and key of the last member access, so method calls keep their receiver
    let o = 0, k = 0, ident = first[0] === 2 && !LIT.has(first[1]);
    for (;;) {
      if (eat('.') || eat('?.')) {
        if (op('(') || op('[')) continue;
        const name = t[i++];
        if (!name || name[0] !== 2) throw new SyntaxError(`Expected property name in "${src}"`);
        const key = name[1];
        o = f; k = E.lit(key); f = E.mem(o, k); ident = false;
      } else if (eat('[')) {
        o = f; k = ternary(); need(']'); f = E.mem(o, k); ident = false;
      } else if (eat('(')) {
        const args = list(')');
        f = o ? E.callm(o, k, args) : E.calli(f, args, ident);
        o = k = 0; ident = false;
      } else return f;
    }
  };

  const unary = () => {
    const u = Object.keys(UNARY).find(eat);
    if (!u) return postfix();
    return E.un(u, unary());
  };

  const binary = min => {
    let l = unary();
    for (;;) {
      const tok = t[i], e = tok && tok[0] === 3 && OPS[tok[1]];
      if (!e || e[0] < min) return l;
      i++;
      l = E.bin(tok[1], l, binary(e[0] + 1));
    }
  };

  const ternary = () => {
    const q = binary(1);
    if (!eat('?')) return q;
    const a = ternary();
    need(':');
    return E.cond(q, a, ternary());
  };

  const fn = ternary();
  if (i < t.length) throw new SyntaxError(`Unexpected "${t[i][1]}" in "${src}"`);
  return fn;
}

/** Compiles (and caches) an expression into `(context) => value`. Throws on syntax errors. */
export function compileExpression(expr) {
  let fn = cache.get(expr);
  if (!fn) cache.set(expr, fn = parse(expr));
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
