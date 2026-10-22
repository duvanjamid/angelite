# Changelog

## Unreleased

### AngeLite Lite (new, `@duvanjamid/angelite/lite`)
- New minimal core in `src/lite/` (~6 KB min+gzip vs ~16 KB for the full bundle): signals (`signal`, `computed`, `effect`), templates with `@if`/`@else`/`@for`/`@empty`, `[prop]`/`(event)`/`[(ngModel)]` bindings, components with `input()`/`output()`/`<ng-content>`, pipes, `inject()` and a hash router.
- Fine-grained updates: only DOM nodes that depend on a changed signal are touched.
- Interactive documentation with live examples in `docs/index.html` (`npm run build:docs` refreshes `docs/angelite-lite.min.js`).
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
