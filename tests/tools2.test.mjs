import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

await import('./setup.mjs');
const { default: angelite } = await import('../tools/vite.mjs');
const { checkFolder } = await import('../tools/check.mjs');

const dir = mkdtempSync(join(tmpdir(), 'angelite-tools2-'));
const write = (name, text) => { mkdirSync(join(dir, name, '..'), { recursive: true }); writeFileSync(join(dir, name), text); return join(dir, name); };

test('vite plugin: compiles *.ng.html (with a query string), ignores other files, warns or fails on problems', () => {
  const file = write('page.ng.html', '<p>{{ title }} {{ missing }}</p><x-ghost></x-ghost>');
  write('page.js', 'export class Page {\n  title = 1;\n}\n');
  const warnings = [];
  const ctx = { warn: m => warnings.push(m), error: m => { throw new Error(m); } };
  const plugin = angelite({ members: 'auto' });
  assert.equal(plugin.name, 'angelite');
  assert.equal(plugin.enforce, 'pre');
  assert.equal(plugin.load.call(ctx, join(dir, 'x.js')), null);
  const out = plugin.load.call(ctx, file + '?import');
  assert.match(out.code, /export default/);
  assert.equal(warnings.length, 2);
  assert.match(warnings.join(), /"missing" is not a member/);
  assert.match(warnings.join(), /unknown element <x-ghost>/);
  assert.throws(() => angelite({ members: 'auto', check: 'error' }).load.call(ctx, file), /is not a member|unknown element/);
  warnings.length = 0;
  angelite({ check: false, components: ['x-ghost'] }).load.call(ctx, file);
  assert.equal(warnings.length, 0);

  const sent = [];
  assert.deepEqual(plugin.handleHotUpdate({ file, server: { ws: { send: m => sent.push(m) } } }), []);
  assert.deepEqual(sent, [{ type: 'full-reload' }]);
  assert.equal(plugin.handleHotUpdate({ file: 'a.js', server: { ws: { send: () => assert.fail() } } }), undefined);
  assert.equal(angelite().name, 'angelite');
});

test('check CLI: lists problems as file:line: message and exits 1; exits 0 when clean', () => {
  write('ok/fine.ng.html', '<p>{{ a }}</p>');
  write('ok/fine.js', 'export class Fine {\n  a = 1;\n}\n');
  write('bad/oops.ng.html', '<x-typo></x-typo><p>{{ nope }}</p>');
  write('bad/oops.js', 'export class Oops {\n  a = 1;\n}\n');
  write('node_modules/skipped.ng.html', '<x-never></x-never>');
  write('.hidden/skipped.ng.html', '<x-never></x-never>');
  const problems = checkFolder(join(dir, 'bad'), { members: 'auto' });
  assert.deepEqual(problems.map(p => p.message).sort(), ['"nope" is not a member of the component', 'unknown element <x-typo>: add it to "components" (or "elements" if it is a custom element)'].sort());
  assert.deepEqual(checkFolder(join(dir, 'ok'), { members: 'auto' }), []);
  assert.deepEqual(checkFolder(join(dir, 'bad'), { components: ['x-typo'] }).map(p => p.message), []);

  const cli = fileURLToPath(new URL('../tools/check.mjs', import.meta.url));
  const good = spawnSync('node', [cli, join(dir, 'ok'), '--members', 'auto'], { encoding: 'utf8' });
  assert.equal(good.status, 0);
  assert.match(good.stdout, /templates ok/);
  const bad = spawnSync('node', [cli, join(dir, 'bad'), '--members', 'auto'], { encoding: 'utf8' });
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /oops\.ng\.html:1: "nope" is not a member/);
  assert.match(bad.stdout, /2 problem\(s\)/);
  const withOpts = spawnSync('node', [cli, join(dir, 'bad'), '--components', 'x-typo', '--pipes', 'p', '--elements', 'e'], { encoding: 'utf8' });
  assert.equal(withOpts.status, 0, 'declared components are accepted');
  const noArgs = execFileSync('node', [cli, join(dir, 'ok')], { encoding: 'utf8' });
  assert.match(noArgs, /ok/);
});
