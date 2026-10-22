// What users actually ship: the benchmark table app bundled with esbuild (tree-shaken, minified), min + gzip.
// Unused optional modules must not appear here. Update the budgets deliberately, in the commit that grows them.
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { join, resolve } from 'node:path';
import { aotPlugin } from '../tools/aot.mjs';

const root = resolve(import.meta.dirname, '..', 'benchmarks', 'apps');
// precompiled: runtime only; in-browser: runtime + template compiler. Preact's same app is 6385 B (see docs/benchmarks.html).
const APPS = [
  { name: 'precompiled app (lite-aot)', entry: 'lite-aot/main.js', budget: 6300, plugins: [aotPlugin({ check: false })] },
  { name: 'in-browser compiler app (lite)', entry: 'lite/main.js', budget: 10500, plugins: [] }
];

let failed = false;
for (const { name, entry, budget, plugins } of APPS) {
  const { outputFiles } = await build({
    entryPoints: [join(root, entry)], bundle: true, minify: true, format: 'esm', target: 'es2022', legalComments: 'none',
    write: false, outfile: 'out.js', plugins, define: { 'process.env.NODE_ENV': '"production"' }
  });
  const size = gzipSync(Buffer.from(outputFiles[0].contents), { level: 9 }).length;
  const ok = size <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name.padEnd(34)} ${String(size).padStart(6)} B gzip  (budget ${budget}, ${(100 * size / budget).toFixed(0)}%)`);
}
process.exit(failed ? 1 : 0);
