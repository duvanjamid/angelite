// The UI stylesheet must not need an inline <style> when constructable stylesheets exist, and must carry the
// CSP nonce when it has to fall back.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { document } from './setup.mjs';

const { installStyles } = await import('../src/ui/install.js');
const reset = () => {
  document.getElementById('angelite-ui-css')?.remove();
  document.documentElement.removeAttribute('data-angelite-ui');
  document.querySelectorAll('meta[name="csp-nonce"]').forEach(m => m.remove());
};

test('with constructable stylesheets no <style> element is created (works under a strict style-src)', () => {
  reset();
  const adopted = [];
  globalThis.CSSStyleSheet = class { replaceSync(css) { this.css = css; } };
  Object.defineProperty(document, 'adoptedStyleSheets', { get: () => adopted, set: v => { adopted.length = 0; adopted.push(...v); }, configurable: true });
  try {
    installStyles('.ui-btn{color:red}');
    installStyles('.ui-btn{color:red}');
    assert.equal(adopted.length, 1, 'installing twice adds nothing');
    assert.equal(adopted[0].css, '.ui-btn{color:red}');
    assert.equal(document.getElementById('angelite-ui-css'), null);
  } finally {
    delete document.adoptedStyleSheets;
    delete globalThis.CSSStyleSheet;
    reset();
  }
});

test('without constructable stylesheets the fallback <style> carries the CSP nonce', () => {
  reset();
  const meta = document.createElement('meta');
  meta.name = 'csp-nonce';
  meta.content = 'abc123';
  document.head.append(meta);
  installStyles('.ui-btn{color:blue}');
  installStyles('.ui-btn{color:blue}');
  const styles = document.querySelectorAll('#angelite-ui-css');
  assert.equal(styles.length, 1);
  assert.equal(styles[0].getAttribute('nonce'), 'abc123');
  assert.match(styles[0].textContent, /color:blue/);
  reset();
});

test('the fallback works without a nonce meta tag and survives a broken constructable stylesheet', () => {
  reset();
  globalThis.CSSStyleSheet = class { replaceSync() { throw new Error('unsupported'); } };
  Object.defineProperty(document, 'adoptedStyleSheets', { get: () => [], set() {}, configurable: true });
  try {
    installStyles('.x{}');
    const style = document.getElementById('angelite-ui-css');
    assert.ok(style);
    assert.equal(style.hasAttribute('nonce'), false);
  } finally {
    delete document.adoptedStyleSheets;
    delete globalThis.CSSStyleSheet;
    reset();
  }
});
