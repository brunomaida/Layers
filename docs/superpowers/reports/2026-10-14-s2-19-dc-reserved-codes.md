# Implementation Report — s2-19-dc-reserved-codes

- **Branch:** `fix/261014-0-s2-19-dc-reserved-codes`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 13:38 → 2026-10-14 16:08
- **Status:** `final`
- **Gerado em:** 2026-10-14 16:36

## Resumo

`LayersCore.DC_CODES` perde `UTILITY_SHEET` e `READONLY_ORIGIN`, reservados desde o writer dc e nunca emitidos. As recusas de folha de utilitários e de origem somente leitura seguem pelos toasts de `utilityBlock` e `readOnlyBlock`, com o mesmo texto.

## Mudanças

### Added (2)

- `changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md` (+13/-0, doc)
- `docs/superpowers/plans/2026-10-14-s2-19-dc-reserved-codes.md` (+230/-0, doc)

### Changed (7)

- `docs/ARCHITECTURE.md` (+9/-6, doc)
- `docs/_index.md` (+1/-0, doc)
- `docs/roadmap.data.json` (+17/-10, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+1/-0, other)
- `lib/layers-core.js` (+1/-5, src)
- `test/layers-core.test.js` (+8/-7, test)

### Changelog fragment

**Removed:**
- `LayersCore.DC_CODES` perde `UTILITY_SHEET` e `READONLY_ORIGIN`, reservados desde o writer dc e nunca emitidos. As recusas de folha de utilitários e de origem somente leitura seguem pelos toasts de `utilityBlock` e `readOnlyBlock`, com o mesmo texto.
- `mapDcTemplate` não devolve mais `attrNames` por elemento; nenhum código o lia.

**Changed:**
- A ordem dos avisos de carga passa a ser documentada: os do hoist de `@font-face` vêm depois dos do build (folha de utilitários, mapa dc, `rules`), então um aviso que desabilita gravação ganha de uma fonte do projeto ausente pelo `warn[0]` do toast.

**Perf:**
- measured — `mapDcTemplate/dc-template/index`: 10895 → 9687 B/op (`bench/alloc.mjs`).

## Arquivos tocados

### src (1)

- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+1/-5)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+8/-7)

### doc (6)

- [`changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md`](../../../changelog.d/fix-261014-0-s2-19-dc-reserved-codes.md) — A (+13/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+9/-6)
- [`docs/_index.md`](../../_index.md) — M (+1/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+17/-10)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s2-19-dc-reserved-codes.md`](../plans/2026-10-14-s2-19-dc-reserved-codes.md) — A (+230/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+1/-0)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Removed:** `LayersCore.DC_CODES` perde `UTILITY_SHEET` e `READONLY_ORIGIN`, reservados desde o writer dc e nunca emitidos. As recusas de folha de utilitários e de origem somente leitura seguem pelos toasts de `utilityBlock` e `readOnlyBlock`, com o mesmo texto.
  - [`ed1dc07`](https://github.com/brunomaida/Layers/commit/ed1dc0781f9c7f26b982d192adc9273b432761f3) fix(core): drop unused UTILITY_SHEET and READONLY_ORIGIN from DC_CODES (S2.19 Task 1)
- **Removed:** `mapDcTemplate` não devolve mais `attrNames` por elemento; nenhum código o lia.
  - [`fac3a2b`](https://github.com/brunomaida/Layers/commit/fac3a2b54c96c2ca1a9d66085019d588a0375f05) refactor(core): stop building unused attrNames in mapDcTemplate (S2.19 Task 2)
- **Changed:** A ordem dos avisos de carga passa a ser documentada: os do hoist de `@font-face` vêm depois dos do build (folha de utilitários, mapa dc, `rules`), então um aviso que desabilita gravação ganha de uma fonte do projeto ausente pelo `warn[0]` do toast.
  - [`550b568`](https://github.com/brunomaida/Layers/commit/550b5684e1bc068393a7b23440e1f641f277472e) docs: start S2.19 in the tracker (S2.19)
  - [`8af05d6`](https://github.com/brunomaida/Layers/commit/8af05d6307436dd8122732044a14f26b27ea9ead) docs: add S2.19 implementation plan (S2.19)
  - [`c697975`](https://github.com/brunomaida/Layers/commit/c697975356a37e1af07264e385eb880d416ecba9) docs: apply plan review findings (S2.19)
  - [`ed1dc07`](https://github.com/brunomaida/Layers/commit/ed1dc0781f9c7f26b982d192adc9273b432761f3) fix(core): drop unused UTILITY_SHEET and READONLY_ORIGIN from DC_CODES (S2.19 Task 1)
  - [`fac3a2b`](https://github.com/brunomaida/Layers/commit/fac3a2b54c96c2ca1a9d66085019d588a0375f05) refactor(core): stop building unused attrNames in mapDcTemplate (S2.19 Task 2)
  - [`7e0327d`](https://github.com/brunomaida/Layers/commit/7e0327d9a9a58b1d52588f3ca11b5537e8e4a92e) docs(loader): state the intended hoistFaces warning order (S2.19 Task 3)
  - [`68148ef`](https://github.com/brunomaida/Layers/commit/68148ef56eb469e7f980e8883cae0819fcbdff7b) docs: close S2.19 with architecture note and changelog fragment (S2.19 Task 4)
  - [`10a93e5`](https://github.com/brunomaida/Layers/commit/10a93e56a274959098ed2765f12ace9117236af5) docs: fix wording found in pre-merge review (S2.19 Task 4 fix round 1)
- **Perf:** measured — `mapDcTemplate/dc-template/index`: 10895 → 9687 B/op (`bench/alloc.mjs`).
  - [`fac3a2b`](https://github.com/brunomaida/Layers/commit/fac3a2b54c96c2ca1a9d66085019d588a0375f05) refactor(core): stop building unused attrNames in mapDcTemplate (S2.19 Task 2)

### Todos os commits

- [`550b568`](https://github.com/brunomaida/Layers/commit/550b5684e1bc068393a7b23440e1f641f277472e) docs: start S2.19 in the tracker (S2.19)
- [`8af05d6`](https://github.com/brunomaida/Layers/commit/8af05d6307436dd8122732044a14f26b27ea9ead) docs: add S2.19 implementation plan (S2.19)
- [`c697975`](https://github.com/brunomaida/Layers/commit/c697975356a37e1af07264e385eb880d416ecba9) docs: apply plan review findings (S2.19)
- [`ed1dc07`](https://github.com/brunomaida/Layers/commit/ed1dc0781f9c7f26b982d192adc9273b432761f3) fix(core): drop unused UTILITY_SHEET and READONLY_ORIGIN from DC_CODES (S2.19 Task 1)
- [`fac3a2b`](https://github.com/brunomaida/Layers/commit/fac3a2b54c96c2ca1a9d66085019d588a0375f05) refactor(core): stop building unused attrNames in mapDcTemplate (S2.19 Task 2)
- [`7e0327d`](https://github.com/brunomaida/Layers/commit/7e0327d9a9a58b1d52588f3ca11b5537e8e4a92e) docs(loader): state the intended hoistFaces warning order (S2.19 Task 3)
- [`68148ef`](https://github.com/brunomaida/Layers/commit/68148ef56eb469e7f980e8883cae0819fcbdff7b) docs: close S2.19 with architecture note and changelog fragment (S2.19 Task 4)
- [`10a93e5`](https://github.com/brunomaida/Layers/commit/10a93e56a274959098ed2765f12ace9117236af5) docs: fix wording found in pre-merge review (S2.19 Task 4 fix round 1)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
