# Implementation Report — s2-12-dead-interactions

- **Branch:** `feature/261013-0-s2-12-dead-interactions`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-13 22:34 → 2026-10-13 22:35
- **Status:** `final`
- **Gerado em:** 2026-10-13 22:35

## Resumo

`LayersCore.deadInteractions`: lists the `interactions` selectors (`show`, `toggle`, `hide`, `on`, `click`, `class`) that match nothing in the mounted mock; an invalid selector counts as dead. The loader adds one warning with the first three and the surface item in the ⚡ Interagir menu shows "sem alvo". Hidden elements still count as targets.

## Mudanças

### Added (2)

- `changelog.d/feature-261013-0-s2-12-dead-interactions.md` (+10/-0, doc)
- `e2e/dead-interactions.spec.js` (+22/-0, src)

### Changed (7)

- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/layers-json.md` (+2/-0, doc)
- `docs/roadmap.data.json` (+4/-4, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+4/-1, other)
- `lib/layers-core.js` (+26/-0, src)
- `test/layers-core.test.js` (+46/-0, test)

### Changelog fragment

**Added:**
- `LayersCore.deadInteractions`: lists the `interactions` selectors (`show`, `toggle`, `hide`, `on`, `click`, `class`) that match nothing in the mounted mock; an invalid selector counts as dead. The loader adds one warning with the first three and the surface item in the ⚡ Interagir menu shows "sem alvo". Hidden elements still count as targets.
- `e2e/dead-interactions.spec.js`: Traval (whose manifest targets the real app) warns and marks the surface; plain-css stays quiet.

**Perf:**
- N/A — one `querySelectorAll` per interaction selector at load.

## Arquivos tocados

### src (2)

- [`e2e/dead-interactions.spec.js`](../../../e2e/dead-interactions.spec.js) — A (+22/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+26/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+46/-0)

### doc (5)

- [`changelog.d/feature-261013-0-s2-12-dead-interactions.md`](../../../changelog.d/feature-261013-0-s2-12-dead-interactions.md) — A (+10/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+2/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+4/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)

### other (1)

- [`index.html`](../../../index.html) — M (+4/-1)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** `LayersCore.deadInteractions`: lists the `interactions` selectors (`show`, `toggle`, `hide`, `on`, `click`, `class`) that match nothing in the mounted mock; an invalid selector counts as dead. The loader adds one warning with the first three and the surface item in the ⚡ Interagir menu shows "sem alvo". Hidden elements still count as targets.
  - [`b5abb0e`](https://github.com/brunomaida/Layers/commit/b5abb0e277c008723274fb6230e6c494235e0ce3) feat(core): deadInteractions lists interaction selectors with no target (S2.12)
  - [`3a6fdda`](https://github.com/brunomaida/Layers/commit/3a6fddae53df7d70a826fd0e954faccc21d0d9fc) feat(loader): warn on dead interactions and mark the surface in the menu (S2.12)
  - [`fbd2848`](https://github.com/brunomaida/Layers/commit/fbd284856fd59b9006b6eb31c65bd80675c63d26) test(e2e): dead interactions warn on traval and stay quiet on plain-css (S2.12)
- **Added:** `e2e/dead-interactions.spec.js`: Traval (whose manifest targets the real app) warns and marks the surface; plain-css stays quiet.
  - [`3a6fdda`](https://github.com/brunomaida/Layers/commit/3a6fddae53df7d70a826fd0e954faccc21d0d9fc) feat(loader): warn on dead interactions and mark the surface in the menu (S2.12)
  - [`fbd2848`](https://github.com/brunomaida/Layers/commit/fbd284856fd59b9006b6eb31c65bd80675c63d26) test(e2e): dead interactions warn on traval and stay quiet on plain-css (S2.12)
- **Perf:** N/A — one `querySelectorAll` per interaction selector at load.
  - [`b5abb0e`](https://github.com/brunomaida/Layers/commit/b5abb0e277c008723274fb6230e6c494235e0ce3) feat(core): deadInteractions lists interaction selectors with no target (S2.12)

### Todos os commits

- [`713b2ee`](https://github.com/brunomaida/Layers/commit/713b2ee52e9ca85a9749897ea8ebcd99cf27c0a8) docs(roadmap): mark S2.12 in-progress (S2.12)
- [`b5abb0e`](https://github.com/brunomaida/Layers/commit/b5abb0e277c008723274fb6230e6c494235e0ce3) feat(core): deadInteractions lists interaction selectors with no target (S2.12)
- [`3a6fdda`](https://github.com/brunomaida/Layers/commit/3a6fddae53df7d70a826fd0e954faccc21d0d9fc) feat(loader): warn on dead interactions and mark the surface in the menu (S2.12)
- [`fbd2848`](https://github.com/brunomaida/Layers/commit/fbd284856fd59b9006b6eb31c65bd80675c63d26) test(e2e): dead interactions warn on traval and stay quiet on plain-css (S2.12)
- [`2d14e03`](https://github.com/brunomaida/Layers/commit/2d14e03c72457c55daa0b6bac64a397369fee555) docs: close S2.12 with changelog fragment, checklist and layers-json note (S2.12)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `5b54a0ee` | 2026-10-13 21:25 | 1.16h | 740 | 295.8k | 84.90M | 656.8k |
| **Total (1)** | — | **1.16h** | **740** | **295.8k** | **84.90M** | **656.8k** |
