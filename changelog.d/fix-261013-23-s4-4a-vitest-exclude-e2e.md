### Fixed
- `npm test` exited 1 because Vitest collected `e2e/perf.spec.js` (a Playwright spec); `vite.config.js` now restricts Vitest to `test/**/*.test.js`, restoring the commit gate.

### Perf
- N/A — test configuration only, no runtime change.
