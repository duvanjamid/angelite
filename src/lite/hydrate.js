/**
 * Client side of server rendering: replaces the markup the server sent with the live app.
 *
 *   hydrate(App, document.getElementById('app'));
 *
 * Both happen in the same task, so the page does not flash; the component is rendered again on the client (it does
 * not adopt the server nodes). Read `window.__STATE__` to start from the data the server used.
 */

import { mount } from './runtime.js';

export function hydrate(Comp, el) {
  el.textContent = '';
  return mount(Comp, el);
}
