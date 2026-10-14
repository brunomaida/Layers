---
adr: none
---

### Added
- `e2e/origin-sample.spec.js`: for up to 30 nodes per fixture (`ORIGIN_SAMPLE` overrides), the `file|selector|line` origin must resolve to a file in the fixture and the rule prelude must show the selector or a class of the node. 16 fixtures pass for loader-derived origins.

### Findings
- Traval carries only hand-written `data-src` in its mock: 31 of 199 nodes point to a line that no longer shows the selector, and 19 point into the real app's `.ts`, which the fixture does not vendor. The loader keeps an authored `data-src` over the derived one. Registered as S2.20; the spec reports it as an annotation and does not fail on it.

### Perf
- N/A — test-only change; no runtime code touched.
