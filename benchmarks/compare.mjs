// Timing regression check that cancels the speed of the machine: it compares how AngeLite performs RELATIVE TO
// PREACT in the same run with the same ratios stored in baseline.json.
//
//   FW=lite-aot,lite,preact BUILD=lite-aot,lite,preact node build.mjs     (build only the three apps)
//   FW=lite-aot,lite,preact ROUNDS=5 ITER=15 node run.mjs                 (writes results.quick.json)
//   node compare.mjs                                                       (exit 1 on a regression)
//   node compare.mjs --update results.json                                 (rewrite baseline.json from a full run, on purpose)
//
// A ratio above 1 means slower than Preact. An operation fails when its ratio got worse than the baseline's by more
// than TOLERANCE (default 20 %: runs on a shared machine move that much; a real regression in a hot path is larger and
// shows up in every run). The deterministic budget in tests/perf-budget.test.mjs catches smaller changes in work done.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const TOLERANCE = Number(process.env.TOLERANCE || 0.2);
const BASELINE = join(root, 'baseline.json');
const VARIANTS = ['lite-aot', 'lite'];

const ratios = results => {
  const out = {};
  for (const v of VARIANTS) {
    const me = results.frameworks[v], base = results.frameworks.preact;
    if (!me || !base) continue;
    out[v] = { gzip: me.size.gzip, startup: me.startup.median / base.startup.median, memory10k: me.memory.rows10k / base.memory.rows10k };
    for (const id of Object.keys(me.ops)) out[v][id] = me.ops[id].median / base.ops[id].median;
  }
  return out;
};

if (process.argv[2] === '--update') {
  const results = JSON.parse(readFileSync(resolve(process.argv[3] || join(root, 'results.json')), 'utf8'));
  const r = ratios(results);
  const note = 'Time and memory are ratios to Preact measured in the same run (1.0 = same as Preact); gzip is bytes. Regenerate with: node compare.mjs --update results.json';
  writeFileSync(BASELINE, JSON.stringify({ note, generatedAt: results.generatedAt, ratios: r }, null, 2) + '\n');
  console.log('baseline.json updated');
  process.exit(0);
}

const file = join(root, 'results.quick.json');
if (!existsSync(file) || !existsSync(BASELINE)) {
  console.error('needs results.quick.json (run.mjs with FW=lite-aot,lite,preact) and baseline.json');
  process.exit(2);
}
const now = ratios(JSON.parse(readFileSync(file, 'utf8')));
const base = JSON.parse(readFileSync(BASELINE, 'utf8')).ratios;

let failed = false;
for (const v of VARIANTS) {
  console.log(`\n${v}  (ratio to Preact; > 1 is slower; tolerance +${Math.round(TOLERANCE * 100)} %)`);
  for (const key of Object.keys(base[v])) {
    const was = base[v][key], is = now[v][key];
    const isBytes = key === 'gzip';
    const limit = isBytes ? was * 1.03 : was * (1 + TOLERANCE);
    const bad = is > limit;
    failed ||= bad;
    const fmt = x => (isBytes ? `${x} B` : x.toFixed(2));
    console.log(`${bad ? 'FAIL' : 'ok  '} ${key.padEnd(11)} baseline ${fmt(was).padStart(8)}  now ${fmt(is).padStart(8)}  ${isBytes ? '' : `(${(((is / was) - 1) * 100).toFixed(0)}%)`}`);
  }
}
console.log(failed ? '\nPerformance regression: see FAIL rows. If it is intended, say why in the PR and run --update.' : '\nNo regression against the baseline.');
process.exit(failed ? 1 : 0);
