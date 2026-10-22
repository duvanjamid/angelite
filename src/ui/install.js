/**
 * Installs a stylesheet. Constructable stylesheets need no inline <style>, so they work under a strict
 * `style-src` CSP; otherwise it falls back to a <style> that carries the nonce from
 * <meta name="csp-nonce" content="...">. Installing twice is a no-op.
 */
export function installStyles(css) {
  if (typeof document === 'undefined' || document.getElementById('angelite-ui-css') || document.documentElement.hasAttribute('data-angelite-ui')) return;
  try {
    if ('adoptedStyleSheets' in document && typeof CSSStyleSheet !== 'undefined') {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(css);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
      document.documentElement.setAttribute('data-angelite-ui', '');
      return;
    }
  } catch (e) { /* fall back to <style> */ }
  const style = document.createElement('style');
  style.id = 'angelite-ui-css';
  const meta = document.querySelector('meta[name="csp-nonce"]');
  if (meta) style.setAttribute('nonce', meta.content);
  style.textContent = css;
  document.head.appendChild(style);
}
