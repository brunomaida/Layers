# Implementation Report — s5-5-linediff-core

- **Branch:** `refactor/261013-35-s5-5-linediff-core`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-13 21:47 → 2026-10-13 21:50
- **Status:** `final`
- **Gerado em:** 2026-10-13 21:50

## Resumo

`lineDiff` moved from `index.html` to `LayersCore.lineDiff` (pure data: `{ no, text, kind }`); `index.html` only maps `kind` to the existing colors. Unblocks the `apply_patch` Node port (S8.4).

## Mudanças

### Added (1)

- `changelog.d/refactor-261013-35-s5-5-linediff-core.md` (+12/-0, doc)

### Changed (7)

- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/roadmap.data.json` (+4/-4, doc)
- `docs/roadmap.md` (+4/-4, doc)
- `index.html` (+2/-12, other)
- `lib/layers-core.js` (+15/-0, src)
- `test/layers-core.test.js` (+44/-0, test)

### Changelog fragment

**Changed:**
- `lineDiff` moved from `index.html` to `LayersCore.lineDiff` (pure data: `{ no, text, kind }`); `index.html` only maps `kind` to the existing colors. Unblocks the `apply_patch` Node port (S8.4).

**Tests:**
- 6 cases in `test/layers-core.test.js` (3 lines of context, first/last line, no changes, new file, removed line). Differential check against the previous implementation: 3000 random inputs, 0 divergences.

**Perf:**
- N/A — same algorithm and complexity, only relocated; diff is built once per "Ver diff" open.

## Arquivos tocados

### src (1)

- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+15/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+44/-0)

### doc (5)

- [`changelog.d/refactor-261013-35-s5-5-linediff-core.md`](../../../changelog.d/refactor-261013-35-s5-5-linediff-core.md) — A (+12/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+4/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+4/-4)

### other (1)

- [`index.html`](../../../index.html) — M (+2/-12)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Changed:** `lineDiff` moved from `index.html` to `LayersCore.lineDiff` (pure data: `{ no, text, kind }`); `index.html` only maps `kind` to the existing colors. Unblocks the `apply_patch` Node port (S8.4).
  - [`b30f937`](https://github.com/brunomaida/Layers/commit/b30f937dad6800a53278eab379f316548f480aff) refactor(core): extract lineDiff to LayersCore as pure data (S5.5, #35)
  - [`c25f37f`](https://github.com/brunomaida/Layers/commit/c25f37fd2ef3d5c0edaea089a6541549cf497236) test(core): cover lineDiff context, no-change and new-file cases (S5.5, #35)
- **Tests:** 6 cases in `test/layers-core.test.js` (3 lines of context, first/last line, no changes, new file, removed line). Differential check against the previous implementation: 3000 random inputs, 0 divergences.
  - [`b30f937`](https://github.com/brunomaida/Layers/commit/b30f937dad6800a53278eab379f316548f480aff) refactor(core): extract lineDiff to LayersCore as pure data (S5.5, #35)
  - [`c25f37f`](https://github.com/brunomaida/Layers/commit/c25f37fd2ef3d5c0edaea089a6541549cf497236) test(core): cover lineDiff context, no-change and new-file cases (S5.5, #35)
- **Perf:** N/A — same algorithm and complexity, only relocated; diff is built once per "Ver diff" open.
  - [`6cc933c`](https://github.com/brunomaida/Layers/commit/6cc933cf078c79c82c491fd31480322963374ad2) docs(roadmap): mark S5.5 in-progress, link wave 1 issue (S5.5, #35)
  - [`b30f937`](https://github.com/brunomaida/Layers/commit/b30f937dad6800a53278eab379f316548f480aff) refactor(core): extract lineDiff to LayersCore as pure data (S5.5, #35)
  - [`c25f37f`](https://github.com/brunomaida/Layers/commit/c25f37fd2ef3d5c0edaea089a6541549cf497236) test(core): cover lineDiff context, no-change and new-file cases (S5.5, #35)
  - [`d6ce694`](https://github.com/brunomaida/Layers/commit/d6ce694443833bd18bb78a88ef429f95e24e6a09) docs: close S5.5 with changelog fragment, checklist and architecture note (S5.5, #35)

### Todos os commits

- [`6cc933c`](https://github.com/brunomaida/Layers/commit/6cc933cf078c79c82c491fd31480322963374ad2) docs(roadmap): mark S5.5 in-progress, link wave 1 issue (S5.5, #35)
- [`b30f937`](https://github.com/brunomaida/Layers/commit/b30f937dad6800a53278eab379f316548f480aff) refactor(core): extract lineDiff to LayersCore as pure data (S5.5, #35)
- [`c25f37f`](https://github.com/brunomaida/Layers/commit/c25f37fd2ef3d5c0edaea089a6541549cf497236) test(core): cover lineDiff context, no-change and new-file cases (S5.5, #35)
- [`d6ce694`](https://github.com/brunomaida/Layers/commit/d6ce694443833bd18bb78a88ef429f95e24e6a09) docs: close S5.5 with changelog fragment, checklist and architecture note (S5.5, #35)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `5b54a0ee` | 2026-10-13 21:25 | 24.7m | 268 | 103.2k | 19.23M | 351.0k |
| **Total (1)** | — | **24.7m** | **268** | **103.2k** | **19.23M** | **351.0k** |
