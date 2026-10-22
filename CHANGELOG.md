# Changelog

## Unreleased

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
- New minimal core in `src/lite/` (~8 KB min+gzip vs ~16 KB for the full bundle): signals (`signal`, `computed`, `effect`), templates with `@if`/`@else`/`@for`/`@empty`, `[prop]`/`(event)`/`[(ngModel)]` bindings, components with `input()`/`output()`/`<ng-content>`, pipes, `inject()` and a hash router.
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
