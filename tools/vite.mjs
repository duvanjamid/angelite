/**
 * Vite plugin: `import aot from './app.ng.html'` yields the precompiled template, with hot reload.
 *
 *   // vite.config.js
 *   import angelite from '@duvanjamid/angelite/tools/vite.mjs';
 *   export default { plugins: [angelite({ components: ['ui-button'], members: 'auto', check: 'error' })] };
 *
 * Options are those of the esbuild plugin (`aotPlugin`): `components`, `members`, `pipes`, `elements`, `check`.
 * Editing a template reloads the page.
 */

import { readFileSync } from 'node:fs';
import { compileTemplate, checkTemplate, discoverMembers } from './aot.mjs';

export default function angelite({ components = [], members, pipes, elements, check = 'warn' } = {}) {
  return {
    name: 'angelite',
    enforce: 'pre',
    load(id) {
      const file = id.split('?')[0];
      if (!file.endsWith('.ng.html')) return null;
      const source = readFileSync(file, 'utf8');
      const list = members === 'auto' ? discoverMembers(file) : members;
      const problems = checkTemplate(source, { components, members: list, pipes, elements });
      for (const problem of problems) {
        if (check === 'error') this.error(`${file}: ${problem}`);
        else if (check) this.warn(`${file}: ${problem}`);
      }
      return { code: compileTemplate(source, { components, members: list, pipes, elements, check: false }), map: null };
    },
    handleHotUpdate({ file, server }) {
      if (!file.endsWith('.ng.html')) return;
      server.ws.send({ type: 'full-reload' });
      return [];
    }
  };
}
