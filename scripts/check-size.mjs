// Fails the build when a bundle grows past its budget (min + gzip, in bytes).
// Update the budgets deliberately, in the same commit that makes a bundle bigger.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const BUDGETS = {
  'dist/angelite-lite.min.js': 9000,
  'dist/angelite-ui.min.js': 5500,
  'dist/angelite.min.js': 17500
};

let failed = false;
for (const [file, budget] of Object.entries(BUDGETS)) {
  if (!existsSync(file)) { console.error(`missing ${file} (run npm run build)`); failed = true; continue; }
  const size = gzipSync(readFileSync(file), { level: 9 }).length;
  const ok = size <= budget;
  failed ||= !ok;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${file.padEnd(30)} ${String(size).padStart(6)} B gzip  (budget ${budget}, ${(100 * size / budget).toFixed(0)}%)`);
}
process.exit(failed ? 1 : 0);
