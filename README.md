<p align="center">
  <img src="./assets/images/angelite-logo.svg" alt="AngeLite" width="160">
</p>

<h1 align="center">AngeLite</h1>

<p align="center">
  A signals framework with Angular-style templates: small, fast and secure.
</p>

<p align="center">
  <a href="https://duvanjamid.github.io/angelite-docs/">Documentation</a> ·
  <a href="https://duvanjamid.github.io/angelite-docs/ui.html">Components</a> ·
  <a href="https://duvanjamid.github.io/angelite-docs/benchmarks.html">Benchmark</a>
</p>

## Why AngeLite

- **Small:** the core is about 6 KB gzip with precompiled templates (Preact: 6.2 KB).
- **Fast:** it updates only what changes, with no Zone.js and no virtual DOM. A performance budget in CI keeps new features from hurting it.
- **Secure by default:** interpolation is always text, URLs are filtered, it uses no `eval` or `new Function`, and it works with Trusted Types.
- **Complete, but à la carte:** forms, HTTP, i18n, animations, router, SSR, DevTools and 33 accessible components are optional modules; you only pay for what you import.

## Getting started

```bash
npm install @duvanjamid/angelite
```

```js
import { signal, component, mount } from '@duvanjamid/angelite';

class Counter {
  count = signal(0);
  inc() { this.count.update(n => n + 1); }
}

component(Counter, {
  selector: 'app-counter',
  template: `<button (click)="inc()">Clicks: {{ count() }}</button>`
});

mount(Counter, document.body);
```

Without a bundler, with a `<script>` tag:

```html
<script src="https://unpkg.com/@duvanjamid/angelite/dist/angelite.min.js"></script>
<script>
  const { signal, component, mount } = AngeLite;
</script>
```

## Modules

| Import | For |
|---|---|
| `@duvanjamid/angelite` | signals, templates (`@if`, `@for`, `@defer`), components, DI, pipes and router |
| `@duvanjamid/angelite/runtime` | the runtime only, for precompiled templates |
| `@duvanjamid/angelite/forms` | reactive forms |
| `@duvanjamid/angelite/http` | HTTP client, interceptors and `resource()` |
| `@duvanjamid/angelite/i18n` | languages, plurals and formats |
| `@duvanjamid/angelite/ui` | library of 33 accessible components |
| `@duvanjamid/angelite/testing` | testing utilities |
| `@duvanjamid/angelite/devtools` | component and signal inspector |
| `@duvanjamid/angelite/hydrate` | hydration of server-rendered HTML |
| `@duvanjamid/angelite/tools/aot.mjs` | template compiler for the build |
| `@duvanjamid/angelite/tools/ssr.mjs` | server-side rendering |
| `@duvanjamid/angelite/tools/vite.mjs` | Vite plugin |

The full guide, with runnable examples, is at <https://duvanjamid.github.io/angelite-docs/>
(repository: [`angelite-docs`](https://github.com/duvanjamid/angelite-docs)).

## Development

```bash
npm ci
npm run build       # builds dist/
npm test            # unit and security tests
npm run typecheck   # the package types
npm run size        # size budget
npm run perf        # quick benchmark against Preact
```

Read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR and [SECURITY.md](./SECURITY.md) for the security model.

## License

MIT
