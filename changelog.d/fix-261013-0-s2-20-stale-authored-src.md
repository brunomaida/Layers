---
adr: none
---

### Fixed
- A hand-written `data-src` in the mock always won over the derived one, so a rule that moved in its sheet made the patch target the wrong line (Traval: 31 of 199 nodes). The loader now keeps an authored `data-src` only while the loaded sheet shows the selector at that line (`LayersCore.checkOrigin`); otherwise the line is corrected from the AST index when the selector still exists in the same file, or the attribute is dropped and the derived rule applies. Files outside the loaded sheets (`.ts`) are left as they are. A warning reports how many were corrected and dropped (Traval: 10 and 21).
  Root-cause: #35 · Regression-test: test/layers-core.test.js (CheckOrigin), e2e/origin-sample.spec.js

### Changed
- `e2e/origin-sample.spec.js` now fails on a stale authored `data-src`; the Traval tree snapshot drops from 199 to 178 nodes with `src`.

### Perf
- N/A — one pass over the nodes that carry a `data-src` at load; sheet text is already in memory.
