---
adr: none
---

### Added
- `e2e/tree-snapshot.spec.js` + `e2e/tree-helpers.js`: per-fixture snapshot of the mounted tree (nodes, max depth, nodes with `data-src`, source files, root box) for 16 fixtures, compared with `e2e/__snapshots__/tree.json`. Regenerate with `UPDATE_SNAPSHOT=1`.
- Counts agree with the earlier loader fingerprints (traval 428+1, plain-css 6+1, todomvc-react 40+1, dc-template 5+1; the +1 is the mount wrapper). `results` is excluded: it mounts empty until its snapshot exists.

### Perf
- N/A — test-only change; no runtime code touched. Each fixture settles in about 1.2 s under Playwright.
