// Runs the benchmark suite in headless Chromium and writes results.json
import { chromium } from 'playwright-core';
import http from 'node:http';
import { readFileSync, existsSync, writeFileSync, statSync } from 'node:fs';
import { join, extname, resolve } from 'node:path';
import os from 'node:os';

const root = resolve(import.meta.dirname);
const dist = join(root, 'dist');
// FW=lite-aot,preact runs a subset (quick mode, see compare.mjs); results then go to results.quick.json
const FW = process.env.FW ? process.env.FW.split(',') : ['lite-aot', 'lite', 'preact', 'vue', 'react', 'angular'];
const OUT = process.env.FW ? 'results.quick.json' : 'results.json';
const ROUNDS = Number(process.env.ROUNDS || 3);
const ITER = Number(process.env.ITER || 7);
const STARTUP_RUNS = process.env.ONLY ? 0 : Number(process.env.STARTUP_RUNS || 41);
const STARTUP_ONLY = process.env.STARTUP_ONLY === '1'; // re-measure startup only and merge into results.json
const sizes = JSON.parse(readFileSync(join(dist, 'sizes.json'), 'utf8'));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const file = join(dist, p.startsWith('/angular/') ? p.replace('/angular/', '/angular/browser/') : p);
  if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': types[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
  res.end(readFileSync(file));
});
await new Promise(r => server.listen(0, r));
const base = `http://localhost:${server.address().port}`;

const helpers = () => {
  const mc = new MessageChannel();
  window.__tick = () => new Promise(r => { mc.port1.onmessage = () => r(); mc.port2.postMessage(0); });
  window.__count = () => document.querySelectorAll('tbody tr').length;
  window.__idAt = i => document.querySelector(`tbody tr:nth-child(${i}) td.col-id`)?.textContent;
  window.__labelAt = i => document.querySelector(`tbody tr:nth-child(${i}) td.col-label`)?.textContent ?? '';
  window.__time = async (fn, cond, measure = true) => {
    const t0 = performance.now();
    fn();
    while (!cond()) {
      if (performance.now() - t0 > 20000) throw new Error('timeout waiting for DOM');
      await window.__tick();
    }
    document.body.getBoundingClientRect(); // force style + layout (paint excluded)
    return performance.now() - t0;
  };
};

// setup: untimed; fn/cond: timed. `cond` runs in the page.
const ALL_BENCHES = [
  { id: 'create1k', label: 'Crear 1.000 filas', iters: ITER,
    setup: 'bench.clear()', ready: '__count()===0', fn: 'bench.run(1000)', cond: '__count()===1000' },
  { id: 'replace1k', label: 'Reemplazar 1.000 filas', iters: ITER,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000', pre: 'window.__a=__idAt(1)',
    fn: 'bench.run(1000)', cond: '__count()===1000 && __idAt(1)!==window.__a' },
  { id: 'update10th', label: 'Actualizar 1 de cada 10', iters: ITER,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000',
    fn: 'bench.update()', cond: "__labelAt(1).endsWith('!!!') && __labelAt(991).endsWith('!!!')" },
  { id: 'select', label: 'Seleccionar fila', iters: ITER * 2,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000', pre: 'window.__sel=Number(__idAt(100+Math.floor(Math.random()*800)))',
    fn: 'bench.select(window.__sel)', cond: "document.querySelector('tr.danger td.col-id')?.textContent==String(window.__sel)" },
  { id: 'swap', label: 'Intercambiar 2 filas', iters: ITER * 2,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000', pre: 'window.__a=__idAt(2);window.__b=__idAt(999)',
    fn: 'bench.swap()', cond: '__idAt(2)===window.__b && __idAt(999)===window.__a' },
  { id: 'remove', label: 'Eliminar una fila', iters: ITER * 2,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000', pre: 'window.__rm=Number(__idAt(500))',
    fn: 'bench.remove(window.__rm)', cond: '__count()===999' },
  { id: 'append1k', label: 'Añadir 1.000 a 1.000', iters: ITER,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000',
    fn: 'bench.add(1000)', cond: '__count()===2000' },
  { id: 'clear1k', label: 'Vaciar 1.000 filas', iters: ITER,
    setup: 'bench.clear(); bench.run(1000)', ready: '__count()===1000',
    fn: 'bench.clear()', cond: '__count()===0' },
  { id: 'create10k', label: 'Crear 10.000 filas', iters: Math.max(4, ITER - 2),
    setup: 'bench.clear()', ready: '__count()===0', fn: 'bench.run(10000)', cond: '__count()===10000' }
];
// ONLY=update10th,select runs just those operations and prints them (results.json is not touched)
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const BENCHES = ONLY ? ALL_BENCHES.filter(b => ONLY.includes(b.id)) : ALL_BENCHES;

const median = a => { const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
  args: ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--disable-background-timer-throttling', '--disable-renderer-backgrounding']
});

async function newPage() {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
  const page = await ctx.newPage();
  await page.addInitScript(helpers);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  return { ctx, page, errors };
}

async function heapMB(page) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  await cdp.send('HeapProfiler.collectGarbage');
  const { usedSize } = await cdp.send('Runtime.getHeapUsage');
  await cdp.detach();
  return usedSize / 1048576;
}

const timed = (page, fn, cond) => page.evaluate(([f, c]) => window.__time(new Function(f), new Function('return (' + c + ')')), [fn, cond]);
const settle = (page, code, cond) => page.evaluate(([f, c]) => window.__time(new Function(f), new Function('return (' + c + ')')), [code, cond]);

const samples = Object.fromEntries(FW.map(f => [f, { ops: Object.fromEntries(BENCHES.map(b => [b.id, []])), startup: [], mem: { idle: [], k1: [], k10: [] } }]));

async function runSuite(fw, round) {
  const { ctx, page, errors } = await newPage();
  await page.goto(`${base}/${fw}/index.html`);
  await page.waitForFunction(() => window.__ready && window.bench);
  const s = samples[fw];
  s.mem.idle.push(await heapMB(page));
  for (const b of BENCHES) {
    for (let i = 0; i < b.iters + 2; i++) {
      await settle(page, b.setup, b.ready);
      await page.evaluate(() => new Promise(r => setTimeout(r, 30)));
      if (b.pre) await page.evaluate(b.pre);
      const t = await timed(page, b.fn, b.cond);
      if (i >= 2) s.ops[b.id].push(t); // first two are warm-up
    }
  }
  await settle(page, 'bench.clear(); bench.run(1000)', '__count()===1000');
  s.mem.k1.push(await heapMB(page));
  await settle(page, 'bench.clear(); bench.run(10000)', '__count()===10000');
  s.mem.k10.push(await heapMB(page));
  if (errors.length) console.warn(fw, 'page errors:', errors.slice(0, 2));
  await ctx.close();
  console.log(`round ${round + 1}/${ROUNDS} ${fw} done`);
}

for (let r = 0; r < (STARTUP_ONLY ? 0 : ROUNDS); r++) {
  const order = r % 2 ? [...FW].reverse() : FW;
  for (const fw of order) await runSuite(fw, r);
}

// Startup: loads are interleaved and shuffled each round, after one discarded warm-up load per framework, so
// no framework benefits from running last (or pays for browser warm-up by running first).
const loadOnce = async fw => {
  const { ctx, page } = await newPage();
  await page.goto(`${base}/${fw}/index.html`);
  await page.waitForFunction(() => window.__ready);
  const t = await page.evaluate(() => window.__ready);
  await ctx.close();
  return t;
};
const shuffle = a => { const c = [...a]; for (let i = c.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [c[i], c[j]] = [c[j], c[i]]; } return c; };
for (const fw of shuffle(FW)) await loadOnce(fw);
for (let i = 0; i < STARTUP_RUNS; i++) {
  for (const fw of shuffle(FW)) samples[fw].startup.push(await loadOnce(fw));
}
console.log('startup done');

if (ONLY) {
  console.table(Object.fromEntries(FW.map(f => [f, Object.fromEntries(BENCHES.map(b => [b.id, median(samples[f].ops[b.id]).toFixed(2)]))])));
  await browser.close();
  server.close();
  process.exit(0);
}

if (STARTUP_ONLY) {
  const prev = JSON.parse(readFileSync(join(root, 'results.json'), 'utf8'));
  for (const fw of FW) {
    const st = samples[fw].startup;
    prev.frameworks[fw].startup = { median: median(st), p25: pct(st, 0.25), p75: pct(st, 0.75), p90: pct(st, 0.9), n: st.length };
    prev.frameworks[fw].size = sizes[fw];
  }
  prev.env.startupRuns = STARTUP_RUNS;
  writeFileSync(join(root, 'results.json'), JSON.stringify(prev, null, 2));
  console.table(Object.fromEntries(FW.map(f => [f, { median: prev.frameworks[f].startup.median.toFixed(1), p25: prev.frameworks[f].startup.p25.toFixed(1), p75: prev.frameworks[f].startup.p75.toFixed(1), n: prev.frameworks[f].startup.n }])));
  await browser.close();
  server.close();
  process.exit(0);
}

const results = {
  generatedAt: new Date().toISOString(),
  env: { chromium: browser.version(), cpus: os.cpus().length, cpu: os.cpus()[0].model, node: process.version, rounds: ROUNDS, iterations: ITER },
  versions: Object.fromEntries(['react', 'preact', 'vue', '@angular/core'].filter(n => existsSync(join(root, 'node_modules', n, 'package.json'))).map(n => [n, JSON.parse(readFileSync(join(root, 'node_modules', n, 'package.json'), 'utf8')).version])),
  benches: BENCHES.map(({ id, label }) => ({ id, label })),
  frameworks: {}
};
for (const fw of FW) {
  const s = samples[fw];
  results.frameworks[fw] = {
    size: sizes[fw],
    startup: { median: median(s.startup), p25: pct(s.startup, 0.25), p75: pct(s.startup, 0.75), p90: pct(s.startup, 0.9), n: s.startup.length },
    memory: { idle: median(s.mem.idle), rows1k: median(s.mem.k1), rows10k: median(s.mem.k10) },
    ops: Object.fromEntries(BENCHES.map(b => [b.id, { median: median(s.ops[b.id]), p10: pct(s.ops[b.id], 0.1), p90: pct(s.ops[b.id], 0.9), n: s.ops[b.id].length }]))
  };
}
results.versions.lite = JSON.parse(readFileSync(join(root, '..', 'package.json'), 'utf8')).version;
writeFileSync(join(root, OUT), JSON.stringify(results, null, 2));
console.log(JSON.stringify(Object.fromEntries(FW.map(f => [f, Object.fromEntries(Object.entries(results.frameworks[f].ops).map(([k, v]) => [k, +v.median.toFixed(1)]))])), null, 1));
await browser.close();
server.close();
