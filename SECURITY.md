# Security policy

## Reporting a vulnerability

Please do **not** open a public issue. Use GitHub's private reporting instead:
**Security → Report a vulnerability** on the repository page
(<https://github.com/duvanjamid/angelite/security/advisories/new>).

Include the version, a minimal template or component that reproduces it, and the browser. You will get an
acknowledgement, and a fix is released before details are made public.

Only the latest release is supported.

## What AngeLite Lite protects you from

The trust model is simple: **templates are code you wrote; the data you render is untrusted.**
Lite is built so untrusted data cannot become markup, script or a dangerous URL by accident.

| Threat | What Lite does |
|---|---|
| Markup in text (`{{ value }}`) | Always inserted as text. |
| `javascript:` / `vbscript:` / `data:text/html` URLs in `href`, `src`, `action`, `formaction`, `data`, `xlink:href` (the attributes where a URL can run code) | Only `http`, `https`, `mailto`, `tel`, `sms`, `ftp` and relative URLs pass (and `data:image/*;base64` for `src`). Anything else becomes `unsafe:<url>` and a warning is logged. Wrap a value in `trustUrl()` to allow your own scheme. |
| HTML injection through `[innerHTML]` | `[innerHTML]` only renders markup wrapped in `trustHtml()`. Any other value is inserted as text. Sanitize first (for example with DOMPurify), then wrap. |
| Inline event handlers from data (`[onclick]`, `[attr.onclick]`, `onclick="{{ x }}"`) | Compile-time error. Use `(click)="..."`. |
| `[srcdoc]`, `[outerHTML]` | Compile-time error. |
| Bindings and interpolation on `<script>`, `<style>`, `<base>`, `<link>`, `<meta>` | Compile-time error. |
| Prototype access and DOM-writing methods in expressions (`constructor`, `__proto__`, `setAttribute`, `insertAdjacentHTML`, `write`...) | Blocked by name. |
| Reaching `window` or `document` from an expression (`$el.ownerDocument`, `$event.view`, `getRootNode()`, `composedPath()[n]`...) | Blocked by value: the global object and documents are never returned to a template, whichever way they were reached. |
| `eval` / `new Function` | Never used, in the browser build or the precompiled runtime. Works with a CSP that has no `unsafe-eval`. |
| Inline styles under a strict `style-src` | The UI package uses constructable stylesheets; if unavailable it falls back to a `<style>` that carries the nonce from `<meta name="csp-nonce" content="...">`. |
| Trusted Types | Templates and `trustHtml()` values go through one policy named `angelite`. |

### CSP / Trusted Types recipe

```
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self';
  require-trusted-types-for 'script'; trusted-types angelite
```

Add `style-src 'nonce-…'` and `<meta name="csp-nonce" content="…">` only if you use the UI package in a browser
without constructable stylesheets.

## What it does not protect you from

- **Untrusted templates.** The expression sandbox is defense in depth, not a security boundary. A template can still
  call methods of its own component and of DOM elements it can reach (`$el`, `$event.target`). Never compile a template
  that includes user input, as with every framework that has a runtime template compiler (Vue's guide says the
  same). Precompile templates with `tools/aot.mjs` in production: nothing is compiled in the browser.
- **Unsafe values you wrap yourself.** `trustHtml()` and `trustUrl()` are explicit escape hatches, like Angular's
  `bypassSecurityTrust*`. Do not wrap user input.
- **The legacy bundle** (`src/angelite.js` and the files under `src/core`, `src/directives`, `src/forms`,
  `src/router`...). It predates the hardening, builds markup with `innerHTML` and is deprecated. Use `lite`.
- **Your own code.** `(click)` handlers, services and anything you pass to `innerHTML` yourself.

## Verifying it

`tests/security.test.mjs` runs every attack above against the browser build and the precompiled runtime.
`benchmarks/security-probe.mjs` (`npm run probe:security` in `benchmarks/`) runs the same inputs against Preact, Vue
and React for comparison.
