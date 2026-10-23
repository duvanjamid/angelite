/**
 * Trusted Types support. With a CSP that enforces `require-trusted-types-for 'script'`, assigning a string to
 * innerHTML throws. Templates and values wrapped in trustHtml() go through one named policy, "angelite";
 * add `trusted-types angelite` to your CSP. Without Trusted Types this is a pass-through.
 */

let policy;

export const trusted = html => {
  if (policy === undefined) {
    policy = null;
    try {
      const tt = typeof window !== 'undefined' && window.trustedTypes;
      if (tt) policy = tt.createPolicy('angelite', { createHTML: s => s });
    } catch (e) { /* policy name not allowed by the CSP: strings will be rejected by the browser */ }
  }
  return policy ? policy.createHTML(html) : html;
};
