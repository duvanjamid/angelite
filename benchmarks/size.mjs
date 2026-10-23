// Quick size check of the two AngeLite benchmark apps (no other framework is built): node size.mjs
import { build } from 'esbuild';
import { aotPlugin } from '../tools/aot.mjs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const common = { bundle: true, minify: true, format: 'esm', target: 'es2022', legalComments: 'none', write: false, define: { 'process.env.NODE_ENV': '"production"' } };
for (const [name, entry, extra] of [['angelite', 'angelite/main.js', {}], ['angelite-aot', 'angelite-aot/main.js', { plugins: [aotPlugin({ check: false })] }]]) {
  const { outputFiles } = await build({ ...common, entryPoints: [join(root, 'apps', entry)], outfile: 'out.js', ...extra });
  const buf = Buffer.from(outputFiles[0].contents);
  console.log(`${name.padEnd(9)} raw ${buf.length}  gzip ${gzipSync(buf, { level: 9 }).length}  brotli ${brotliCompressSync(buf).length}`);
}
