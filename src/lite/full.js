/** Everything: Lite + in-browser compiler + built-in pipes + portals, @defer, template refs. This is what the dist bundles are built from. */

export * from './index.js';
export { viewChild } from './refs.js';
export { enableDevWarnings } from './dev.js';
import './pipes.js';
import './portal.js';
import './defer.js';
