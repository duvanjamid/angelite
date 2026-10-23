// Builds every benchmark app into dist/<framework>/ and writes dist/sizes.json
import { build } from 'esbuild';
import { build as viteBuild } from 'vite';
import { aotPlugin } from '../tools/aot.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync, rmSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname);
const dist = join(root, 'dist');
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const page = fw => `<!doctype html>
<html><head><meta charset="utf-8"><title>${fw}</title>
<style>body{font-family:sans-serif;margin:0}td{padding:2px 8px}.danger{background:#fdd}a{cursor:pointer}</style></head>
<body><div id="app"></div><script type="module" src="main.js"></script></body></html>`;

const common = { bundle: true, minify: true, format: 'esm', target: 'es2022', legalComments: 'none', define: { 'process.env.NODE_ENV': '"production"' } };

async function esbuildApp(name, entry, extra = {}) {
  const out = join(dist, name);
  mkdirSync(out, { recursive: true });
  await build({ ...common, entryPoints: [join(root, 'apps', entry)], outfile: join(out, 'main.js'), ...extra });
  writeFileSync(join(out, 'index.html'), page(name));
}

// BUILD=lite-aot,lite,preact builds a subset (quick mode); by default everything is built
const want = name => !process.env.BUILD || process.env.BUILD.split(',').includes(name);
if (want('react')) await esbuildApp('react', 'react/main.jsx', { jsx: 'automatic' });
if (want('preact')) await esbuildApp('preact', 'preact/main.jsx', { jsx: 'automatic', jsxImportSource: 'preact' });
if (want('lite')) await esbuildApp('lite', 'lite/main.js');
if (want('lite-aot')) await esbuildApp('lite-aot', 'lite-aot/main.js', { plugins: [aotPlugin({ check: false })] });
if (want('vue')) await viteBuild({ configFile: join(root, 'apps/vue/vite.config.js'), logLevel: 'warn' });
if (want('angular')) execFileSync(join(root, 'node_modules/.bin/ng'), ['build'], { cwd: join(root, 'apps/angular'), stdio: 'inherit' });

// ---- sizes ----
const jsFiles = dir => readdirSync(dir, { recursive: true }).filter(f => f.endsWith('.js')).map(f => join(dir, f));
const dirs = { react: 'react', preact: 'preact', vue: 'vue', lite: 'lite', 'lite-aot': 'lite-aot', angular: 'angular/browser' };
const sizes = {};
for (const [name, d] of Object.entries(dirs).filter(([name]) => want(name))) {
  let raw = 0, gz = 0, br = 0;
  for (const f of jsFiles(join(dist, d)).filter(f => statSync(f).isFile())) {
    const buf = readFileSync(f);
    raw += buf.length;
    gz += gzipSync(buf, { level: 9 }).length;
    br += brotliCompressSync(buf).length;
  }
  sizes[name] = { raw, gzip: gz, brotli: br };
}
writeFileSync(join(dist, 'sizes.json'), JSON.stringify(sizes, null, 2));
console.table(sizes);
