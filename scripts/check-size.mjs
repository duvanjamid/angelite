// Fails the build when a bundle grows past its budget (min + gzip, in bytes).
// Update the budgets deliberately, in the same commit that makes a bundle bigger.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { minify } from 'terser';

const BUDGETS = {
  'dist/angelite.min.js': 13000,
  'dist/angelite-runtime.min.js': 7100,
  'dist/angelite-runtime-plus.min.js': 8550,
  'dist/angelite-ui.min.js': 12000
};

// optional modules ship as readable ESM; their budget is measured after minifying (what a bundler produces)
const MODULES = {
  'dist/angelite-forms.esm.js': 1200,
  'dist/angelite-http.esm.js': 1400,
  'dist/angelite-i18n.esm.js': 900,
  'dist/angelite-devtools.esm.js': 1000,
  'dist/angelite-hydrate.esm.js': 200,
  'dist/angelite-testing.esm.js': 900
};

let failed = false;
for (const [file, budget] of [...Object.entries(BUDGETS), ...Object.entries(MODULES)]) {
  if (!existsSync(file)) { console.error(`missing ${file} (run npm run build)`); failed = true; continue; }
  const raw = file in MODULES ? Buffer.from((await minify(readFileSync(file, 'utf8'), { module: true, compress: true, mangle: true })).code) : readFileSync(file);
  const size = gzipSync(raw, { level: 9 }).length;
  const ok = size <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${file.padEnd(30)} ${String(size).padStart(6)} B gzip  (budget ${budget}, ${(100 * size / budget).toFixed(0)}%)`);
}
process.exit(failed ? 1 : 0);
