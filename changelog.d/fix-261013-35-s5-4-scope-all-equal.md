---
adr: none
---

### Fixed
- Editing a property of an element whose rule is shared by siblings under the same parent threw `ReferenceError: compound is not defined` and the edit was dropped, so the "Todos iguais" scope could never be reached for repeated elements. The one-line `compound` helper was removed from `index.html` in the AST CSS engine commit (3f875b1) while `scopedSelector` still used it; restored.
  Root-cause: #35 · Regression-test: e2e/scope-all-equal.spec.js

### Added
- `e2e/scope-all-equal.spec.js`: through the UI on `axai`, scope "Todos iguais" reaches every use of `.sum-stat` (same `src`, tag and leaf-ness) and no other element; "Só este" reaches exactly one.

### Perf
- N/A — one constant arrow function restored; no hot path involved.
