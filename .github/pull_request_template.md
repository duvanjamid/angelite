## Summary

<!-- What changes and why. -->

## Performance checklist (see https://github.com/duvanjamid/angelite-docs/blob/main/analysis/performance.md)

- [ ] New functionality is an optional module or is hooked through `ops` (an app that does not import it pays nothing)
- [ ] The hot paths (`instantiate`, `runView`, `ForState`, `removeView`) are untouched, or the budget below shows no change
- [ ] `npm test` passes, including `tests/perf-budget.test.mjs` (DOM calls and effect runs per scenario)
- [ ] `npm run size` and `npm run size:apps` pass; if a budget was raised, the reason is written here:
- [ ] If timing could be affected: `npm run perf` result pasted (ratios to Preact) or the `Performance` workflow linked

## Test plan

- [ ] `npm test` · `npm run typecheck` · `npm run test:coverage`
