/**
 * In-browser template compiler backend: expressions become closures, so templates can be written as
 * plain strings with no build step. Importing this module installs the compiler into the runtime.
 */

import { compileExpression } from './utils/expression.js';
import { A, P, setCompiler } from './runtime.js';
import { warn } from './warn.js';
import { templateToBlueprint } from './compiler.js';

const backend = components => ({
  parse: compileExpression,
  pipe: (h, name, args) => scope => P(name, h(scope), ...args.map(a => a(scope))),
  fn: h => h,
  interp: A.interp,
  stmts: A.stmts,
  pick: A.pick,
  modelGet: A.modelGet,
  modelRun: A.modelRun,
  comp: tag => components[tag],
  // dev.js turns these into console warnings: <app-typo> is rendered as an unknown element
  check: tag => { if (!components[tag] && !(typeof customElements !== 'undefined' && customElements.get(tag))) warn(`unknown element <${tag}> (not imported in "imports" and not a registered custom element)`); },
  A
});

setCompiler((source, components) => templateToBlueprint(source, components, backend(components)));
