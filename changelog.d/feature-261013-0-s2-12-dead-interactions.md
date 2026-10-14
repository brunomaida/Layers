---
adr: none
---

### Added
- `LayersCore.deadInteractions`: lists the `interactions` selectors (`show`, `toggle`, `hide`, `on`, `click`, `class`) that match nothing in the mounted mock; an invalid selector counts as dead. The loader adds one warning with the first three and the surface item in the ⚡ Interagir menu shows "sem alvo". Hidden elements still count as targets.
- `e2e/dead-interactions.spec.js`: Traval (whose manifest targets the real app) warns and marks the surface; plain-css stays quiet.

### Perf
- N/A — one `querySelectorAll` per interaction selector at load.
