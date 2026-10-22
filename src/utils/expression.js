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

/** Returns { value, thisArg } so calls keep their receiver. */
function run(node, ctx) {
  switch (node.k) {
    case 'lit': return { value: node.v };
    case 'arr': return { value: node.items.map(n => run(n, ctx).value) };
    case 'id': {
      if (BLOCKED.has(node.name)) return { value: undefined };
      return { value: ctx == null ? undefined : ctx[node.name], thisArg: ctx };
    }
    case 'mem': {
      const obj = run(node.obj, ctx).value;
      if (obj == null) {
        if (node.opt || node.obj.k === 'mem' || node.obj.k === 'call') return { value: undefined };
        return { value: undefined };
      }
      return { value: member(obj, run(node.prop, ctx).value), thisArg: obj };
    }
    case 'call': {
      const { value: fn, thisArg } = run(node.fn, ctx);
      if (typeof fn !== 'function') {
        if (node.opt || fn == null) return { value: undefined };
        throw new TypeError('Expression is not a function');
      }
      return { value: fn.apply(thisArg, node.args.map(a => run(a, ctx).value)) };
    }
    case 'un': {
      const v = run(node.arg, ctx).value;
      return { value: node.op === '!' ? !v : node.op === '-' ? -v : +v };
    }
    case 'cond':
      return run(run(node.test, ctx).value ? node.a : node.b, ctx);
    case 'bin': {
      const l = run(node.l, ctx).value;
      if (node.op === '&&') return l ? run(node.r, ctx) : { value: l };
      if (node.op === '||') return l ? { value: l } : run(node.r, ctx);
      if (node.op === '??') return l != null ? { value: l } : run(node.r, ctx);
      const r = run(node.r, ctx).value;
      switch (node.op) {
        case '+': return { value: l + r };
        case '-': return { value: l - r };
        case '*': return { value: l * r };
        case '/': return { value: l / r };
        case '%': return { value: l % r };
        case '<': return { value: l < r };
        case '>': return { value: l > r };
        case '<=': return { value: l <= r };
        case '>=': return { value: l >= r };
        case '==': return { value: l == r }; // eslint-disable-line eqeqeq
        case '!=': return { value: l != r }; // eslint-disable-line eqeqeq
        case '===': return { value: l === r };
        default: return { value: l !== r };
      }
    }
    default:
      throw new Error(`Unknown node ${node.k}`);
  }
}

/**
 * Evaluate an expression against a context object.
 * Parse errors throw; use `safeEvaluate` for a fallback value.
 */
export function evaluate(expr, context) {
  let ast = cache.get(expr);
  if (!ast) {
    ast = parse(expr);
    cache.set(expr, ast);
  }
  return run(ast, context).value;
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
