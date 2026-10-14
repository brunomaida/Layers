# Implementation Report — s5-4-scope-all-equal

- **Branch:** `fix/261013-35-s5-4-scope-all-equal`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-13 22:08 → 2026-10-13 22:12
- **Status:** `final`
- **Gerado em:** 2026-10-13 22:13

## Resumo

Editing a property of an element whose rule is shared by siblings under the same parent threw `ReferenceError: compound is not defined` and the edit was dropped, so the "Todos iguais" scope could never be reached for repeated elements. The one-line `compound` helper was removed from `index.html` in the AST CSS engine commit (3f875b1) while `scopedSelector` still used it; restored.

## Mudanças

### Added (2)

- `changelog.d/fix-261013-35-s5-4-scope-all-equal.md` (+13/-0, doc)
- `e2e/scope-all-equal.spec.js` (+50/-0, src)

### Changed (4)

- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/roadmap.data.json` (+4/-4, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+1/-0, other)

### Changelog fragment

**Fixed:**
- Editing a property of an element whose rule is shared by siblings under the same parent threw `ReferenceError: compound is not defined` and the edit was dropped, so the "Todos iguais" scope could never be reached for repeated elements. The one-line `compound` helper was removed from `index.html` in the AST CSS engine commit (3f875b1) while `scopedSelector` still used it; restored.

**Added:**
- `e2e/scope-all-equal.spec.js`: through the UI on `axai`, scope "Todos iguais" reaches every use of `.sum-stat` (same `src`, tag and leaf-ness) and no other element; "Só este" reaches exactly one.

**Perf:**
- N/A — one constant arrow function restored; no hot path involved.

## Arquivos tocados

### src (1)

- [`e2e/scope-all-equal.spec.js`](../../../e2e/scope-all-equal.spec.js) — A (+50/-0)

### doc (4)

- [`changelog.d/fix-261013-35-s5-4-scope-all-equal.md`](../../../changelog.d/fix-261013-35-s5-4-scope-all-equal.md) — A (+13/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+4/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)

### other (1)

- [`index.html`](../../../index.html) — M (+1/-0)

## Testes

_Sem testes adicionados ou modificados no range._

## Commits ↔ changelog

- **Fixed:** Editing a property of an element whose rule is shared by siblings under the same parent threw `ReferenceError: compound is not defined` and the edit was dropped, so the "Todos iguais" scope could never be reached for repeated elements. The one-line `compound` helper was removed from `index.html` in the AST CSS engine commit (3f875b1) while `scopedSelector` still used it; restored.
  - [`9d9a833`](https://github.com/brunomaida/Layers/commit/9d9a833557d386dbf41511a0777f2c85171787bc) test(e2e): scope all-equal and one reach the right elements via the UI (S5.4, #35)
  - [`b143416`](https://github.com/brunomaida/Layers/commit/b1434167e505aa31c9550e81c009542ed5057b63) fix(editor): restore compound helper dropped by the AST engine commit (S5.4, #35)
- **Added:** `e2e/scope-all-equal.spec.js`: through the UI on `axai`, scope "Todos iguais" reaches every use of `.sum-stat` (same `src`, tag and leaf-ness) and no other element; "Só este" reaches exactly one.
  - [`9d9a833`](https://github.com/brunomaida/Layers/commit/9d9a833557d386dbf41511a0777f2c85171787bc) test(e2e): scope all-equal and one reach the right elements via the UI (S5.4, #35)
- **Perf:** N/A — one constant arrow function restored; no hot path involved.
  - [`9d9a833`](https://github.com/brunomaida/Layers/commit/9d9a833557d386dbf41511a0777f2c85171787bc) test(e2e): scope all-equal and one reach the right elements via the UI (S5.4, #35)

### Todos os commits

- [`02273b9`](https://github.com/brunomaida/Layers/commit/02273b9041e7b99fd8c95d53a537369d98c22da6) docs(roadmap): mark S5.4 in-progress (S5.4, #35)
- [`9d9a833`](https://github.com/brunomaida/Layers/commit/9d9a833557d386dbf41511a0777f2c85171787bc) test(e2e): scope all-equal and one reach the right elements via the UI (S5.4, #35)
- [`b143416`](https://github.com/brunomaida/Layers/commit/b1434167e505aa31c9550e81c009542ed5057b63) fix(editor): restore compound helper dropped by the AST engine commit (S5.4, #35)
- [`9282c57`](https://github.com/brunomaida/Layers/commit/9282c575ca647971aacbfb51dff6b7b3380bd98c) docs: close S5.4 with changelog fragment and checklist (S5.4, #35)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `5b54a0ee` | 2026-10-13 21:25 | 46.9m | 490 | 186.2k | 45.43M | 497.1k |
| **Total (1)** | — | **46.9m** | **490** | **186.2k** | **45.43M** | **497.1k** |
