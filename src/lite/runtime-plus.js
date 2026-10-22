/** Runtime-only build plus the optional template features (portals, @defer, template refs, dev warnings). No template compiler. */

export * from './api.js';
export { viewChild } from './refs.js';
export { enableDevWarnings } from './dev.js';
import './portal.js';
import './defer.js';
