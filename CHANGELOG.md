# Changelog

## Unreleased

### UI library v2 (`@duvanjamid/angelite/ui`)
- **33 components** (was 21), all accessible and keyboard-operable: Button, Badge, Chip, Avatar, Divider, Card, Alert, Spinner, Progress, Skeleton, EmptyState; TextField, Textarea, Select, Checkbox, RadioGroup, Toggle, Slider, Rating, Combobox; Tabs, Breadcrumb, Pagination, Stepper, AccordionItem, Dropdown; Modal, Drawer, Popover, Tooltip, Toasts; Table, CodeBlock.
- **Accessibility:** labels wired to controls (`for`/`id`, `aria-describedby`, `aria-invalid`), `role="switch"` toggle, radiogroup rating, combobox pattern, `aria-sort` tables, `aria-expanded`/`aria-controls` accordions, live regions for alerts and toasts; Modal and Drawer move focus in, trap Tab, close on Escape, lock page scroll and give focus back; Dropdown, Tabs, Rating and Combobox have full arrow-key support; `prefers-reduced-motion` slows animations.
- **Theming:** CSS variables (`--ui-*`), dark mode follows the system or `<html data-theme="light|dark">`; the default palette now comes from the logo (teal and orange). **Behaviour change:** `Toggle` is a `<button role="switch">`, `Table` headers sort through buttons, `Modal` no longer swallows clicks with `stopPropagation` and its backdrop is detected by class, `Tooltip` is a focusable span with a real `role="tooltip"`, `Rating` is a radiogroup, `Pagination` is windowed with ellipsis, and `Stepper` is an ordered list.
- New inputs on existing components (`type`, `block`, `disabled`, `readonly`, `required`, `hint`, `size`, `caption`, `dense`, `striped`, `rowKey`, `indeterminate`...) and `ToastService.show(message, type, ms)` with `ms: 0` for sticky toasts plus `clear()`.
- Each component is marked pure, so a bundler keeps only the ones imported (a Button-only app is ~7 KB gzip smaller than importing everything); the `dist/angelite-ui.min.js` bundle with all of them is ~11.8 KB gzip (budget raised on purpose from 5.5 KB).
- `src/ui/meta.js` (`@duvanjamid/angelite/ui/meta`): the documentation metadata (inputs, outputs, slots, accessibility notes) and `tests/ui-meta.test.mjs`, which fails if it drifts from the real components.
- Found by the new tests: with delegated events `event.currentTarget` is the document, so overlays must test `event.target`.

### Documentation moved
The documentation site (guide with live examples, component library, benchmarks page, feature comparison, gap analysis, performance and security guides) now lives in [`duvanjamid/angelite-docs`](https://github.com/duvanjamid/angelite-docs). `docs/` is gone from this repository; `npm run build:docs` only prints where to go. The docs repository's `scripts/sync.mjs` rebuilds the bundles from this repository and brings the benchmark results.

### Framework completeness, wave 2 (Lite)
All of it is optional: separate modules built against the lite bundle (`dist/angelite-<name>.esm.js`, or `angelite-addons.min.js` with the global `AngeLiteAddons` for a plain `<script>`), so there is one reactive core and an app pays only for what it imports.
- **Reactive forms** (`lite/forms`): `FormControl`, `FormGroup` (nested, `get('a.b')`, group validators), `FormArray`; `value`, `errors`, `valid`, `touched`, `dirty` are signals, and `value` binds with `[(ngModel)]`. Validators: `required`, `minLength`, `maxLength`, `min`, `max`, `pattern`, `email`, `matches`. No async validators yet.
- **HTTP** (`lite/http`): `createHttp({ baseUrl, headers, interceptors })` over `fetch` (JSON in and out, query params, `timeout`, `AbortSignal`, `HttpError`), `retry()` interceptor, and `resource(() => ...)`: `data`/`loading`/`error` signals that reload when the signals the loader reads change and ignore stale answers.
- **i18n** (`lite/i18n`): `createI18n()` with a locale signal, `{param}` interpolation, plurals through `Intl.PluralRules`, regional fallback, lazy `load()`, number/date/relative formatting, and the pipes `t`, `num`, `date`. Messages are always text.
- **Animations** (`animate.js`, in the full bundle): `animate.enter="cls"` and `animate.leave="cls"`; a leaving element stays in the DOM until its animation or transition ends (with a safety timeout) and `prefers-reduced-motion` is honoured.
- **Router:** `history` mode (`provideRouter(routes, { mode: 'history', base })`), `router.query()`, `resolve` functions with `router.data()`, `navigate(to, { replace })`. In history mode `//host` paths cannot leave the origin.
- **SSR** (`tools/ssr.mjs`): `renderToString`, `renderPage` (shell with `<!--app-->` and `<!--state-->`), `serializeState` (safe inside `<script>`); renders run in jsdom and are queued. **`hydrate()`** (`lite/hydrate`) replaces the server markup with the live app; it does not adopt the existing nodes.
- **DevTools** (`lite/devtools`): `enableDevtools({ panel })` exposes `window.__ANGELITE__` (`tree`, `inspect`, `state`, `set`) and an optional floating panel; component hosts now remember their instance (`$c`).
- **Tooling:** Vite plugin (`tools/vite.mjs`, reloads on template edits) and `angelite-check` (`tools/check.mjs`, `file:1: message` output) that reuse the AOT template checks.
- Core: element removal goes through a `detach` hook so animated elements can finish leaving (+28 B on the precompiled benchmark app).
- Size budgets now cover the add-ons (measured minified): forms 0.9 KB, http 1.3 KB, i18n 0.7 KB, devtools 0.9 KB, hydrate 0.1 KB, testing 0.7 KB gzip.

### Framework completeness, wave 1 (Lite)
Every optional piece lives in its own module, so an app that does not import it does not ship it (`@duvanjamid/angelite/lite` and `/lite/runtime-plus` include them; with a bundler import them from `src/lite/`).
- **Named slots:** `<ng-content select="x">` receives the children that carry `slot="x"`; the rest still goes to the default `<ng-content>`.
- **Portals** (`portal.js`): `<ng-portal to="#id">` renders its content inside another element (default `document.body`), in the component's scope, and cleans up with its block.
- **`@defer`** (`defer.js`): `@defer (on idle; on viewport; on interaction; on hover; on timer(2s); on immediate; when expr) { ... } @placeholder { ... }`.
- **Template references** (`refs.js`): `#name` + `viewChild('name')` (a signal with the element, or the component instance on a component tag; back to `null` when it leaves the DOM).
- **Error boundaries:** a component with `ngOnError(error, where)` receives the errors of its bindings and handlers and of the content projected into it; the nearest one up the tree wins; without any, errors are logged as before.
- **Scoped dependency injection:** `component(X, { providers: [Service, { provide, useClass | useValue | useFactory }] })` gives the component and its descendants their own instance; `inject()` outside any provider still returns the shared instance.
- **Router:** nested routes (`children` + a `<router-outlet>` in the parent, which is not rebuilt when only the child changes), `canActivate` guards (`true` / `false` / redirect path, sync or async, a newer navigation cancels an older one), `load: () => import(...)` code splitting, `redirectTo`. `provideRouter()` can be called again without stacking listeners.
- **TypeScript:** `.d.ts` for the whole public API (`types/`), checked with `tsc` in CI (`npm run typecheck`), including negative cases that must fail to compile.
- **Testing helpers** (`@duvanjamid/angelite/lite/testing`): `render(Comp, { props, provide })`, `click`, `type`, `fire`, `flush`, `unmount`, `cleanup`.
- **Development warnings** (`enableDevWarnings()`): unknown inputs on component tags, duplicate `@for` keys, unknown elements, and optional modules that a template needs but were not imported.
- **Template checks in the AOT compiler:** unknown elements, unknown pipes and, with `members` (or `members: 'auto'`), names the component does not have; `check: 'warn' | 'error' | false`; `checkTemplate()` and `discoverMembers()` are exported.
- `mount()` returns `{ instance, destroy }`; new `runtime-plus` and `testing` bundles.
- The features table in `docs/benchmarks.html` now says where each framework provides each feature (integrated, optional module, official package, third party) and counts what ships in the package itself.

**Cost:** the in-browser compiler build grew from 9.1 KB to 10.0 KB gzip and the precompiled app from 5.8 KB to 6.0 KB (the hooks and the component context are in the core). Budgets in `scripts/check-size.mjs` were raised on purpose and `benchmarks/size-lite.mjs` measures both AngeLite apps without rebuilding the other frameworks.

### Performance (Lite)
- First paint: the root host created by `mount()` now has `display: contents` (an inline host around block content made the browser split boxes: ~1.5 ms after mount). **Behaviour change:** style the element you mount into, or the component's own root, not the host.
- `@for` skips node placement entirely when a list update keeps the same keys in the same order; precompiled templates parse their HTML lazily.
- Benchmark runner: startup is measured with interleaved, shuffled loads and 41 samples (p25/p75 reported); `STARTUP_ONLY=1` and `ONLY=op1,op2` re-run part of the suite.

### Security hardening (Lite)
- URL attributes (`href`, `src`, `action`, `formaction`, `data`, `xlink:href`) only accept `http`, `https`, `mailto`, `tel`, `sms`, `ftp` and relative URLs; anything else becomes `unsafe:<url>` with a warning. `trustUrl()` allows your own scheme. **Behaviour change.**
- `[innerHTML]` only renders markup wrapped in `trustHtml()`; any other value is inserted as text. **Behaviour change.**
- Compile-time errors (browser compiler and AOT tool) for `[on*]`, `[attr.on*]`, `on*="{{ }}"`, `[srcdoc]`, `[outerHTML]`, and for bindings/interpolation on `<script>`, `<style>`, `<base>`, `<link>`, `<meta>`. **Behaviour change.**
- Expression sandbox: the global object and documents are never returned to a template (by value, whichever way they were reached) and DOM methods that turn strings into markup or attributes (`insertAdjacentHTML`, `setAttribute`, `write`...) are blocked.
- Trusted Types: templates and `trustHtml()` values go through one policy named `angelite`.
- UI package: constructable stylesheets instead of an inline `<style>`, with a nonce-aware fallback.
- `SECURITY.md`, CodeQL (security-extended), Dependabot and `npm audit` in CI. `tests/security.test.mjs` holds the attack matrix; it fails if a gap is reopened.

### Framework comparison
- `docs/gap-analysis.md`: what React, Preact, Vue and Angular have that AngeLite lacks (and the reverse), a security review, an architecture critique and a prioritised roadmap. Each claim says how it was verified.
- `docs/benchmarks.html` gains a 37-row feature comparison (security, speed, architecture, ecosystem) with the source of every datum.
- `tests/security.test.mjs`: enforced checks for what is already safe plus 6 `todo` tests for the known gaps (`javascript:` URLs, `[attr.on*]`, `[innerHTML]`, `[srcdoc]`, window reachable through `$el`); they turn into real failures once flipped.
- `benchmarks/security-probe.mjs` (`npm run probe:security`) runs the same attack inputs against Lite, Preact, Vue and React.

### AngeLite Lite — runtime split and ahead-of-time templates
- Lite is now split into a template-free **runtime** (`@duvanjamid/angelite/lite/runtime`, ~4.5 KB gzip), a backend-agnostic **compiler** and an **in-browser backend** (`jit.js`). `@duvanjamid/angelite/lite` still compiles templates in the browser, with no build step.
- `tools/aot.mjs` (CLI + esbuild plugin) compiles templates to JS at build time so apps ship only the runtime. A test asserts precompiled templates render exactly like in-browser ones.
- The expression parser is single-pass with a pluggable emitter (closures in the browser, JS source in the AOT tool) and is ~40% smaller.
- Built-in pipes are opt-in (`@duvanjamid/angelite/lite/pipes`; the full bundle includes them); the router is tree-shakable.
- `benchmarks/` gains the `lite-aot` app: the same table app with a precompiled template.

### AngeLite Lite (new, `@duvanjamid/angelite/lite`)
- New minimal core in `src/lite/` (~9 KB min+gzip vs ~16 KB for the full bundle): signals (`signal`, `computed`, `effect`), templates with `@if`/`@else`/`@for`/`@empty`, `[prop]`/`(event)`/`[(ngModel)]` bindings, components with `input()`/`output()`/`<ng-content>`, pipes, `inject()` and a hash router.
- Updates are batched per view and only write to the DOM when a value actually changed.
- Performance: templates compile once into a blueprint (flat op list), one lean effect per view, delegated events, plain-object `@for` rows. In `benchmarks/` Lite matches or beats Preact/Vue/React/Angular on most operations and uses the least memory at 10k rows.
- Interactive documentation with live examples in `docs/index.html` (`npm run build:docs` refreshes `docs/angelite-lite.min.js`).
- `src/ui` / `@duvanjamid/angelite/ui`: 21 components (button, modal, tabs, table, toast, …), ~5 KB gzip with CSS. Page: `docs/components.html`, itself an AngeLite app.
- `benchmarks/`: identical table app in Lite, Preact, Vue, React and Angular, run in headless Chromium. Results page: `docs/benchmarks.html`.
- Lite: `$el` and `ngAfterViewInit` on components; compiled expressions, template caches and LIS-based `@for` reordering; views are tracked by range so nested `@if`/`@for` move and remove cleanly.
- The existing full bundle is untouched.

### Security
- Interpolated values (`{{ }}`) are now HTML-escaped in `@for`, `*ngFor` and component templates. Use bound properties instead of interpolating raw HTML.

### Added
- `utils/expression.js`: a single safe expression evaluator (no `eval`) shared by all directives. Supports comparisons, logical operators, ternary, `?.`, `??`, indexing and method calls.
- `setDebug(true)` to enable debug logging; logs are silent by default.
- Test suite (`npm test`) and GitHub Actions CI.
- `exports` / `sideEffects` / `engines` in `package.json`.

### Fixed
- Components marked dirty during a change-detection cycle are re-scheduled instead of being dropped.
- `removeEventListener` works again after change detection patches `addEventListener`; patching is idempotent.
- `@for` / `*ngFor` accept expressions (`item of data.items`), not just plain property names.

### Changed
- Removed the duplicated `src/lagunlar.js`; all remaining "Lagunlar" references are now "AngeLite".
- Moved root demos into `examples/`.
