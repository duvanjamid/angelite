# Contributing to AngeLite

Thanks for your interest in contributing to AngeLite! This document explains how to work on the project.

## Code of conduct

By taking part in this project you agree to keep the space respectful and collaborative. Be kind, patient and welcoming to everyone.

## Performance

Every new feature must arrive without hurting the performance of the core. There is a size budget, a deterministic work budget (`tests/perf-budget.test.mjs`) and a timing comparison against Preact. The rules and commands are in [`analysis/performance.md`](https://github.com/duvanjamid/angelite-docs/blob/main/analysis/performance.md) of the documentation repository; the pull request template carries the checklist.

## Ways to contribute

1. **Report bugs**: open an issue describing the problem, how to reproduce it and the expected behavior.
2. **Suggest improvements**: propose new features or changes to existing ones.
3. **Send code**: implement features or fix bugs.
4. **Improve the documentation**: help keep it current and clear (it lives in [angelite-docs](https://github.com/duvanjamid/angelite-docs), in English and Spanish).
5. **Share examples**: show what AngeLite can do.

## Development

### Setup

```bash
git clone git@github.com:duvanjamid/angelite.git
cd angelite
npm install
npm test
```

### Git workflow

1. Create a branch: `git checkout -b feature/your-feature` or `git checkout -b fix/the-bug`.
2. Make your changes following the code conventions.
3. Make sure the checks pass: `npm test`, `npm run typecheck`, `npm run size`.
4. Commit with a descriptive message, for example `git commit -m "feat: add the @defer block"`.
5. Push the branch and open a pull request on GitHub.

## Code conventions

### Style

- Two spaces for indentation.
- Semicolons at the end of every statement.
- Follow the existing code style.
- Use descriptive names for variables, functions and classes.

### Commits

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat`: a new feature
- `fix`: a bug fix
- `docs`: documentation changes
- `style`: changes that do not affect the meaning of the code (whitespace, formatting…)
- `refactor`: code changes that neither fix a bug nor add a feature
- `perf`: changes that improve performance
- `test`: adding or fixing tests
- `chore`: changes to the build process or tooling

Example: `feat(router): add support for nested routes`.

### Documentation

- Document every public API.
- Include usage examples where it helps.
- Keep the documentation up to date when you change the code.

## Tests

- Write tests for every new feature or bug fix.
- Make sure all tests pass before opening a pull request.
- Cover both the success and the error cases.

## Code review

- Every pull request is reviewed by at least one maintainer.
- Address all review comments and suggestions.
- Be respectful and constructive.

## Project structure

```
angelite/
├── src/                  # Core (signals, runtime, compiler, router) and optional modules (forms, http, i18n…)
│   ├── ui/               # Component library
│   └── utils/            # Expression evaluator
├── tools/                # AOT, SSR, the Vite plugin and angelite-check
├── types/                # TypeScript definitions
├── tests/                # Tests (including the performance and security budgets)
├── benchmarks/           # Benchmark against Preact, Vue, React and Angular
├── scripts/              # Size budgets
├── (the documentation lives in the angelite-docs repository)
└── dist/                 # Built files (generated)
```

## Color palette

For visual components or examples, use the official AngeLite palette:

- **Pink (primary)**: `#d6336c` (`#ff6b9a` in dark mode)
- **Soft pink**: `#fbd3e0`
- **Slate (text and dark backgrounds)**: `#1d2330` and `#14161d`

## License

By contributing you agree that your contributions are released under the project's license (MIT).
