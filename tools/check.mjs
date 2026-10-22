#!/usr/bin/env node
/**
 * Checks every `*.ng.html` template under a folder: unknown elements, unknown pipes and, with --members auto,
 * names the component does not have. Prints `file:1: message` (the format editors turn into problems) and exits
 * with 1 if anything is found.
 *
 *   node tools/check.mjs src --components ui-button,ui-card --members auto
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkTemplate, discoverMembers } from './aot.mjs';

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (name.endsWith('.ng.html')) yield path;
  }
}

export function checkFolder(dir, { components = [], pipes = [], elements = [], members } = {}) {
  const problems = [];
  for (const file of walk(dir)) {
    const list = members === 'auto' ? discoverMembers(file) : undefined;
    for (const message of checkTemplate(readFileSync(file, 'utf8'), { components, pipes, elements, members: list })) problems.push({ file, message });
  }
  return problems;
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const args = process.argv.slice(2);
  const opt = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  const dir = args.find(a => !a.startsWith('--') && !Object.values({ c: opt('--components'), p: opt('--pipes'), e: opt('--elements'), m: opt('--members') }).includes(a)) || '.';
  const list = v => (v ? v.split(',') : []);
  const problems = checkFolder(dir, { components: list(opt('--components')), pipes: list(opt('--pipes')), elements: list(opt('--elements')), members: opt('--members') });
  for (const { file, message } of problems) console.log(`${file}:1: ${message}`);
  console.log(problems.length ? `${problems.length} problem(s)` : 'templates ok');
  process.exit(problems.length ? 1 : 0);
}
