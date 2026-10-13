### Added
- `playwright.config.js` and `e2e/perf.spec.js`: load, 1,500-tag scan (< 300 ms), orbit (> 50 fps, currently a tracked known gap) and explode timing against real fixtures; results ingested as `*.bench.json` into the bench history.

### Perf
- measured — scan of a replicated ~1,500-tag Traval mock about 44 ms; orbit about 13 fps on the 433-tag mock, JS-bound (budget not met, see checklist D); `index.html` untouched.
