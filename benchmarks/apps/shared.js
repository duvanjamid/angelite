// Deterministic row data shared by every implementation.
const A = ['pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome', 'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful', 'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive', 'cheap', 'expensive', 'fancy'];
const C = ['red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown', 'white', 'black', 'orange'];
const N = ['table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie', 'sandwich', 'burger', 'pizza', 'mouse', 'keyboard'];

let seed = 42;
const rnd = max => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed % max;
};

let nextId = 1;
export const buildRows = count => {
  const rows = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = { id: nextId++, label: `${A[rnd(A.length)]} ${C[rnd(C.length)]} ${N[rnd(N.length)]}` };
  }
  return rows;
};

export const updateEveryTenth = rows => rows.map((r, i) => (i % 10 === 0 ? { ...r, label: r.label + ' !!!' } : r));

export const swapRows = rows => {
  if (rows.length < 999) return rows;
  const copy = rows.slice();
  const t = copy[1];
  copy[1] = copy[998];
  copy[998] = t;
  return copy;
};

export const removeRow = (rows, id) => rows.filter(r => r.id !== id);
