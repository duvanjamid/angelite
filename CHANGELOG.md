# Changelog

## Unreleased

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
