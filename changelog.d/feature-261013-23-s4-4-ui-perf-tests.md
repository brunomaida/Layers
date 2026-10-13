### Added
- `playwright.config.js` and `e2e/perf.spec.js`: load, 1,500-tag scan (< 300 ms), orbit (> 50 fps, currently a tracked known gap, real CDP mouse input) and explode timing against real fixtures; results ingested as `*.bench.json` into the bench history.

### Perf
- measured — scan of a replicated 1,712-tag Traval mock about 56 ms (budget 300 ms); orbit about 42 fps with real input on the Traval mock (budget 50 fps not met, tracked as a known gap); `index.html` untouched.
