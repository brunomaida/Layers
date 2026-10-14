---
adr: none
---

### Changed
- `lineDiff` moved from `index.html` to `LayersCore.lineDiff` (pure data: `{ no, text, kind }`); `index.html` only maps `kind` to the existing colors. Unblocks the `apply_patch` Node port (S8.4).

### Tests
- 6 cases in `test/layers-core.test.js` (3 lines of context, first/last line, no changes, new file, removed line). Differential check against the previous implementation: 3000 random inputs, 0 divergences.

### Perf
- N/A — same algorithm and complexity, only relocated; diff is built once per "Ver diff" open.
