# Implementation Report — s9-1d-edicao-entre-layouts

- **Branch:** `feature/261019-93-s9-1d-edicao-entre-layouts`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-19 20:46 → 2026-10-20 14:46
- **Status:** `final`
- **Gerado em:** 2026-10-20 14:46

## Resumo

Edição entre layouts (2+ layouts): o undo é uma pilha única com `layoutId` (Ctrl+Z num passo de outro layout troca para ele e desfaz); Salvar junta as pendências de todos os layouts num plano, com uma escrita por `arquivo|seletor|prop` (o ativo vence, conflito vira aviso); Todos iguais mostra `também afeta Config (3 usos)`; o watch vigia o mock de cada layout e o banner nomeia o layout.

## Mudanças

### Added (2)

- `changelog.d/feature-261019-93-s9-1d-edicao-entre-layouts.md` (+18/-0, doc)
- `docs/superpowers/plans/2026-10-19-s9-1d-edicao-entre-layouts.md` (+248/-0, doc)

### Changed (17)

- `bench/core.bench.js` (+3/-0, src)
- `bench/workloads.js` (+13/-0, src)
- `docs/ARCHITECTURE.md` (+71/-8, doc)
- `docs/RELEASE-CHECKLIST.md` (+10/-6, doc)
- `docs/roadmap.data.json` (+16/-4, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (+20/-1, test)
- `e2e/apply-flow.spec.js` (+331/-0, src)
- `e2e/layouts.spec.js` (+390/-1, src)
- `e2e/perf.spec.js` (+101/-2, src)
- `e2e/scope-all-equal.spec.js` (+116/-0, src)
- `e2e/spread.spec.js` (+205/-2, src)
- `e2e/stale-banner.spec.js` (+57/-0, src)
- `e2e/undo-redo.spec.js` (+14/-0, src)
- `index.html` (+263/-56, other)
- `lib/layers-core.js` (+92/-1, src)
- `test/layers-core.test.js` (+288/-0, test)

### Changelog fragment

**Added:**
- Edição entre layouts (2+ layouts): o undo é uma pilha única com `layoutId` (Ctrl+Z num passo de outro layout troca para ele e desfaz); Salvar junta as pendências de todos os layouts num plano, com uma escrita por `arquivo|seletor|prop` (o ativo vence, conflito vira aviso); Todos iguais mostra `também afeta Config (3 usos)`; o watch vigia o mock de cada layout e o banner nomeia o layout.
- Sonda dos outros layouts: leitura quieta, em cache e só sob demanda. Core puro: `mergeLayoutChanges`, `countUses`, `useKey`, `undoStepApplies`, `staleLayouts`, `spreadDrawPlan`.

**Changed:**
- Acima de 1.500 planos a cheia congelada é desenhada como LOD; no arrasto os `LodPlane` são cortados e agrupados por `z`.
- Uma gravação que falha mantém a mudança cujo arquivo não foi gravado.
- Limite conhecido: 700 + 700 planos (1.407) orbita a ~47 fps, sem aviso (medido, não resolvido).

**Tests:**
- Vitest: 687 testes (43 novos). Playwright: `layouts` 65, `undo-redo` 8, `apply-flow` 18, `scope-all-equal` 8, `stale-banner` 4, `spread` 117, `perf` 43.

**Perf:**
- measured — 2026-10-20, Chromium: órbita do pior caso do Espalhar (3.303 planos) 99 → ~22,6 ms/quadro (≈10 → ≈44 fps); na borda do aviso, 700 + 700 planos 21,2 ms (47 fps) e 800 + 800 18,9 ms (53 fps); em Node, `spreadDrawPlan` com 1.500 entradas 54,5 µs e `mergeLayoutChanges` 64,9 µs. Espalhar desligado e projeto de 1 layout: nada muda.

## Arquivos tocados

### src (10)

- [`bench/core.bench.js`](../../../bench/core.bench.js) — M (+3/-0)
- [`bench/workloads.js`](../../../bench/workloads.js) — M (+13/-0)
- [`e2e/apply-flow.spec.js`](../../../e2e/apply-flow.spec.js) — M (+331/-0)
- [`e2e/layouts.spec.js`](../../../e2e/layouts.spec.js) — M (+390/-1)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+101/-2)
- [`e2e/scope-all-equal.spec.js`](../../../e2e/scope-all-equal.spec.js) — M (+116/-0)
- [`e2e/spread.spec.js`](../../../e2e/spread.spec.js) — M (+205/-2)
- [`e2e/stale-banner.spec.js`](../../../e2e/stale-banner.spec.js) — M (+57/-0)
- [`e2e/undo-redo.spec.js`](../../../e2e/undo-redo.spec.js) — M (+14/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+92/-1)

### test (2)

- [`docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`](../specs/2026-10-17-s3-5-s9-1-design-decisions.md) — M (+20/-1)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+288/-0)

### doc (6)

- [`changelog.d/feature-261019-93-s9-1d-edicao-entre-layouts.md`](../../../changelog.d/feature-261019-93-s9-1d-edicao-entre-layouts.md) — A (+18/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+71/-8)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+10/-6)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+16/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-19-s9-1d-edicao-entre-layouts.md`](../plans/2026-10-19-s9-1d-edicao-entre-layouts.md) — A (+248/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+263/-56)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Edição entre layouts (2+ layouts): o undo é uma pilha única com `layoutId` (Ctrl+Z num passo de outro layout troca para ele e desfaz); Salvar junta as pendências de todos os layouts num plano, com uma escrita por `arquivo|seletor|prop` (o ativo vence, conflito vira aviso); Todos iguais mostra `também afeta Config (3 usos)`; o watch vigia o mock de cada layout e o banner nomeia o layout.
  - [`2081844`](https://github.com/brunomaida/Layers/commit/208184422842247f55481173727c2fb9e7fc593b) feat(core): add cross-layout edit helpers (S9.1d Task 1)
  - [`ae32799`](https://github.com/brunomaida/Layers/commit/ae3279986dc50d7d2e85b06d921bcb5fec4aac85) fix(core): tighten cross-layout merge helpers (S9.1d Task 1)
  - [`a8b0d9d`](https://github.com/brunomaida/Layers/commit/a8b0d9d210b0364dbff16cb556f001d7858040d2) fix(core): compare merge conflicts per origin layout (S9.1d Task 1)
  - [`491716c`](https://github.com/brunomaida/Layers/commit/491716c240d7d9deb87ea6d621b538a6b3a5d86e) feat(ui): share one undo stack across layouts (S9.1d Task 2)
  - [`43baa25`](https://github.com/brunomaida/Layers/commit/43baa2509e6654070a38e8001f1433ea59815757) fix(ui): close undo race, drift and test gaps across layouts (S9.1d Task 2)
  - [`47a6bc9`](https://github.com/brunomaida/Layers/commit/47a6bc92be4df36d079ba813d37b5814bba750b0) fix(ui): keep undo hash fresh after apply and incomplete loads (S9.1d Task 2)
  - [`f9c2acd`](https://github.com/brunomaida/Layers/commit/f9c2acdb9b9af4fb33dfc1381d24209c8c8af8a7) feat(ui): probe other layouts and watch them (S9.1d Task 3)
  - [`8fa740b`](https://github.com/brunomaida/Layers/commit/8fa740b1f3d5c1ebb70adf651cfe5cca93b6a870) fix(ui): invalidate layout probes on manifest and shared file changes (S9.1d Task 3)
  - [`89ae5c9`](https://github.com/brunomaida/Layers/commit/89ae5c954cc48517c91e682853a6a70fd2479fc8) feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)
  - [`f5f0721`](https://github.com/brunomaida/Layers/commit/f5f07216433074de060049b0d23e572314b34d5e) fix(ui): keep undo steps and state discard wording on apply (S9.1d Task 4)
  - [`d61a6f6`](https://github.com/brunomaida/Layers/commit/d61a6f653cc6bd073814f6b80429e7673c0dabe8) fix(ui): close cross-layout gaps found in the S9.1d branch review (S9.1d Task 4)
- **Added:** Sonda dos outros layouts: leitura quieta, em cache e só sob demanda. Core puro: `mergeLayoutChanges`, `countUses`, `useKey`, `undoStepApplies`, `staleLayouts`, `spreadDrawPlan`.
  - [`2081844`](https://github.com/brunomaida/Layers/commit/208184422842247f55481173727c2fb9e7fc593b) feat(core): add cross-layout edit helpers (S9.1d Task 1)
  - [`ae32799`](https://github.com/brunomaida/Layers/commit/ae3279986dc50d7d2e85b06d921bcb5fec4aac85) fix(core): tighten cross-layout merge helpers (S9.1d Task 1)
  - [`a8b0d9d`](https://github.com/brunomaida/Layers/commit/a8b0d9d210b0364dbff16cb556f001d7858040d2) fix(core): compare merge conflicts per origin layout (S9.1d Task 1)
  - [`491716c`](https://github.com/brunomaida/Layers/commit/491716c240d7d9deb87ea6d621b538a6b3a5d86e) feat(ui): share one undo stack across layouts (S9.1d Task 2)
  - [`43baa25`](https://github.com/brunomaida/Layers/commit/43baa2509e6654070a38e8001f1433ea59815757) fix(ui): close undo race, drift and test gaps across layouts (S9.1d Task 2)
  - [`f9c2acd`](https://github.com/brunomaida/Layers/commit/f9c2acdb9b9af4fb33dfc1381d24209c8c8af8a7) feat(ui): probe other layouts and watch them (S9.1d Task 3)
- **Changed:** Acima de 1.500 planos a cheia congelada é desenhada como LOD; no arrasto os `LodPlane` são cortados e agrupados por `z`.
  - [`bcd7849`](https://github.com/brunomaida/Layers/commit/bcd7849a59ceb4ae02aa98ca46132502e44a5ce0) perf(ui): demote full frozen and group LOD planes on drag (S9.1d Task 5)
- **Changed:** Uma gravação que falha mantém a mudança cujo arquivo não foi gravado.
  - [`48b5c9d`](https://github.com/brunomaida/Layers/commit/48b5c9d3c79b8345690c937b371ccaca499d78e1) chore(roadmap): start S9.1d (S9.1d Task 1)
  - [`2081844`](https://github.com/brunomaida/Layers/commit/208184422842247f55481173727c2fb9e7fc593b) feat(core): add cross-layout edit helpers (S9.1d Task 1)
  - [`ae32799`](https://github.com/brunomaida/Layers/commit/ae3279986dc50d7d2e85b06d921bcb5fec4aac85) fix(core): tighten cross-layout merge helpers (S9.1d Task 1)
  - [`a8b0d9d`](https://github.com/brunomaida/Layers/commit/a8b0d9d210b0364dbff16cb556f001d7858040d2) fix(core): compare merge conflicts per origin layout (S9.1d Task 1)
  - [`491716c`](https://github.com/brunomaida/Layers/commit/491716c240d7d9deb87ea6d621b538a6b3a5d86e) feat(ui): share one undo stack across layouts (S9.1d Task 2)
  - [`43baa25`](https://github.com/brunomaida/Layers/commit/43baa2509e6654070a38e8001f1433ea59815757) fix(ui): close undo race, drift and test gaps across layouts (S9.1d Task 2)
  - [`47a6bc9`](https://github.com/brunomaida/Layers/commit/47a6bc92be4df36d079ba813d37b5814bba750b0) fix(ui): keep undo hash fresh after apply and incomplete loads (S9.1d Task 2)
  - [`f9c2acd`](https://github.com/brunomaida/Layers/commit/f9c2acdb9b9af4fb33dfc1381d24209c8c8af8a7) feat(ui): probe other layouts and watch them (S9.1d Task 3)
  - [`8fa740b`](https://github.com/brunomaida/Layers/commit/8fa740b1f3d5c1ebb70adf651cfe5cca93b6a870) fix(ui): invalidate layout probes on manifest and shared file changes (S9.1d Task 3)
  - [`89ae5c9`](https://github.com/brunomaida/Layers/commit/89ae5c954cc48517c91e682853a6a70fd2479fc8) feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)
  - [`33696ef`](https://github.com/brunomaida/Layers/commit/33696efa8b27a30810d9fd7b3e18cc7f3cb0d887) fix(ui): honest kept-pending warnings and rollback fidelity (S9.1d Task 4)
  - [`f5f0721`](https://github.com/brunomaida/Layers/commit/f5f07216433074de060049b0d23e572314b34d5e) fix(ui): keep undo steps and state discard wording on apply (S9.1d Task 4)
  - [`bcd7849`](https://github.com/brunomaida/Layers/commit/bcd7849a59ceb4ae02aa98ca46132502e44a5ce0) perf(ui): demote full frozen and group LOD planes on drag (S9.1d Task 5)
  - [`683ee7d`](https://github.com/brunomaida/Layers/commit/683ee7d71569bdbe9e8a0c91fad677f1e747a7a8) fix(ui): keep written files in the rollback entry when draft cleanup fails (S9.1d Task 5)
  - [`d2ff282`](https://github.com/brunomaida/Layers/commit/d2ff282171ae7db9ddec9c190e41dd3926bb4150) test(perf): measure 1,400 and 1,600 plane spread cases (S9.1d Task 6)
  - [`1b7c841`](https://github.com/brunomaida/Layers/commit/1b7c841f4ea030d43d44fa51fd5a697f17f0d072) fix(perf): state the silent 1,400 case and harden perf asserts (S9.1d Task 6)
  - [`bc1bfb3`](https://github.com/brunomaida/Layers/commit/bc1bfb33217137b083591934b58152e52fe9b9dc) docs: record S9.1d (S9.1d Task 7)
  - [`d61a6f6`](https://github.com/brunomaida/Layers/commit/d61a6f653cc6bd073814f6b80429e7673c0dabe8) fix(ui): close cross-layout gaps found in the S9.1d branch review (S9.1d Task 4)
  - [`0ac595e`](https://github.com/brunomaida/Layers/commit/0ac595e98fea1af0a646f973752b13b9aaee9a6a) test(ui): harden draft polling and probe guards (S9.1d Task 4)
- **Changed:** Limite conhecido: 700 + 700 planos (1.407) orbita a ~47 fps, sem aviso (medido, não resolvido).
  - [`48b5c9d`](https://github.com/brunomaida/Layers/commit/48b5c9d3c79b8345690c937b371ccaca499d78e1) chore(roadmap): start S9.1d (S9.1d Task 1)
  - [`2081844`](https://github.com/brunomaida/Layers/commit/208184422842247f55481173727c2fb9e7fc593b) feat(core): add cross-layout edit helpers (S9.1d Task 1)
  - [`ae32799`](https://github.com/brunomaida/Layers/commit/ae3279986dc50d7d2e85b06d921bcb5fec4aac85) fix(core): tighten cross-layout merge helpers (S9.1d Task 1)
  - [`a8b0d9d`](https://github.com/brunomaida/Layers/commit/a8b0d9d210b0364dbff16cb556f001d7858040d2) fix(core): compare merge conflicts per origin layout (S9.1d Task 1)
  - [`491716c`](https://github.com/brunomaida/Layers/commit/491716c240d7d9deb87ea6d621b538a6b3a5d86e) feat(ui): share one undo stack across layouts (S9.1d Task 2)
  - [`43baa25`](https://github.com/brunomaida/Layers/commit/43baa2509e6654070a38e8001f1433ea59815757) fix(ui): close undo race, drift and test gaps across layouts (S9.1d Task 2)
  - [`47a6bc9`](https://github.com/brunomaida/Layers/commit/47a6bc92be4df36d079ba813d37b5814bba750b0) fix(ui): keep undo hash fresh after apply and incomplete loads (S9.1d Task 2)
  - [`f9c2acd`](https://github.com/brunomaida/Layers/commit/f9c2acdb9b9af4fb33dfc1381d24209c8c8af8a7) feat(ui): probe other layouts and watch them (S9.1d Task 3)
  - [`8fa740b`](https://github.com/brunomaida/Layers/commit/8fa740b1f3d5c1ebb70adf651cfe5cca93b6a870) fix(ui): invalidate layout probes on manifest and shared file changes (S9.1d Task 3)
  - [`89ae5c9`](https://github.com/brunomaida/Layers/commit/89ae5c954cc48517c91e682853a6a70fd2479fc8) feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)
  - [`33696ef`](https://github.com/brunomaida/Layers/commit/33696efa8b27a30810d9fd7b3e18cc7f3cb0d887) fix(ui): honest kept-pending warnings and rollback fidelity (S9.1d Task 4)
  - [`f5f0721`](https://github.com/brunomaida/Layers/commit/f5f07216433074de060049b0d23e572314b34d5e) fix(ui): keep undo steps and state discard wording on apply (S9.1d Task 4)
  - [`bcd7849`](https://github.com/brunomaida/Layers/commit/bcd7849a59ceb4ae02aa98ca46132502e44a5ce0) perf(ui): demote full frozen and group LOD planes on drag (S9.1d Task 5)
  - [`683ee7d`](https://github.com/brunomaida/Layers/commit/683ee7d71569bdbe9e8a0c91fad677f1e747a7a8) fix(ui): keep written files in the rollback entry when draft cleanup fails (S9.1d Task 5)
  - [`d2ff282`](https://github.com/brunomaida/Layers/commit/d2ff282171ae7db9ddec9c190e41dd3926bb4150) test(perf): measure 1,400 and 1,600 plane spread cases (S9.1d Task 6)
  - [`1b7c841`](https://github.com/brunomaida/Layers/commit/1b7c841f4ea030d43d44fa51fd5a697f17f0d072) fix(perf): state the silent 1,400 case and harden perf asserts (S9.1d Task 6)
  - [`bc1bfb3`](https://github.com/brunomaida/Layers/commit/bc1bfb33217137b083591934b58152e52fe9b9dc) docs: record S9.1d (S9.1d Task 7)
  - [`d61a6f6`](https://github.com/brunomaida/Layers/commit/d61a6f653cc6bd073814f6b80429e7673c0dabe8) fix(ui): close cross-layout gaps found in the S9.1d branch review (S9.1d Task 4)
  - [`0ac595e`](https://github.com/brunomaida/Layers/commit/0ac595e98fea1af0a646f973752b13b9aaee9a6a) test(ui): harden draft polling and probe guards (S9.1d Task 4)
- **Tests:** Vitest: 687 testes (43 novos). Playwright: `layouts` 65, `undo-redo` 8, `apply-flow` 18, `scope-all-equal` 8, `stale-banner` 4, `spread` 117, `perf` 43.
  - [`491716c`](https://github.com/brunomaida/Layers/commit/491716c240d7d9deb87ea6d621b538a6b3a5d86e) feat(ui): share one undo stack across layouts (S9.1d Task 2)
  - [`43baa25`](https://github.com/brunomaida/Layers/commit/43baa2509e6654070a38e8001f1433ea59815757) fix(ui): close undo race, drift and test gaps across layouts (S9.1d Task 2)
  - [`47a6bc9`](https://github.com/brunomaida/Layers/commit/47a6bc92be4df36d079ba813d37b5814bba750b0) fix(ui): keep undo hash fresh after apply and incomplete loads (S9.1d Task 2)
  - [`f9c2acd`](https://github.com/brunomaida/Layers/commit/f9c2acdb9b9af4fb33dfc1381d24209c8c8af8a7) feat(ui): probe other layouts and watch them (S9.1d Task 3)
  - [`89ae5c9`](https://github.com/brunomaida/Layers/commit/89ae5c954cc48517c91e682853a6a70fd2479fc8) feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)
  - [`f5f0721`](https://github.com/brunomaida/Layers/commit/f5f07216433074de060049b0d23e572314b34d5e) fix(ui): keep undo steps and state discard wording on apply (S9.1d Task 4)
  - [`bcd7849`](https://github.com/brunomaida/Layers/commit/bcd7849a59ceb4ae02aa98ca46132502e44a5ce0) perf(ui): demote full frozen and group LOD planes on drag (S9.1d Task 5)
  - [`d2ff282`](https://github.com/brunomaida/Layers/commit/d2ff282171ae7db9ddec9c190e41dd3926bb4150) test(perf): measure 1,400 and 1,600 plane spread cases (S9.1d Task 6)
  - [`1b7c841`](https://github.com/brunomaida/Layers/commit/1b7c841f4ea030d43d44fa51fd5a697f17f0d072) fix(perf): state the silent 1,400 case and harden perf asserts (S9.1d Task 6)
- **Perf:** measured — 2026-10-20, Chromium: órbita do pior caso do Espalhar (3.303 planos) 99 → ~22,6 ms/quadro (≈10 → ≈44 fps); na borda do aviso, 700 + 700 planos 21,2 ms (47 fps) e 800 + 800 18,9 ms (53 fps); em Node, `spreadDrawPlan` com 1.500 entradas 54,5 µs e `mergeLayoutChanges` 64,9 µs. Espalhar desligado e projeto de 1 layout: nada muda.
  - [`2081844`](https://github.com/brunomaida/Layers/commit/208184422842247f55481173727c2fb9e7fc593b) feat(core): add cross-layout edit helpers (S9.1d Task 1)
  - [`ae32799`](https://github.com/brunomaida/Layers/commit/ae3279986dc50d7d2e85b06d921bcb5fec4aac85) fix(core): tighten cross-layout merge helpers (S9.1d Task 1)
  - [`a8b0d9d`](https://github.com/brunomaida/Layers/commit/a8b0d9d210b0364dbff16cb556f001d7858040d2) fix(core): compare merge conflicts per origin layout (S9.1d Task 1)
  - [`8fa740b`](https://github.com/brunomaida/Layers/commit/8fa740b1f3d5c1ebb70adf651cfe5cca93b6a870) fix(ui): invalidate layout probes on manifest and shared file changes (S9.1d Task 3)
  - [`89ae5c9`](https://github.com/brunomaida/Layers/commit/89ae5c954cc48517c91e682853a6a70fd2479fc8) feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)
  - [`d61a6f6`](https://github.com/brunomaida/Layers/commit/d61a6f653cc6bd073814f6b80429e7673c0dabe8) fix(ui): close cross-layout gaps found in the S9.1d branch review (S9.1d Task 4)

### Todos os commits

- [`48b5c9d`](https://github.com/brunomaida/Layers/commit/48b5c9d3c79b8345690c937b371ccaca499d78e1) chore(roadmap): start S9.1d (S9.1d Task 1)
- [`2081844`](https://github.com/brunomaida/Layers/commit/208184422842247f55481173727c2fb9e7fc593b) feat(core): add cross-layout edit helpers (S9.1d Task 1)
- [`ae32799`](https://github.com/brunomaida/Layers/commit/ae3279986dc50d7d2e85b06d921bcb5fec4aac85) fix(core): tighten cross-layout merge helpers (S9.1d Task 1)
- [`a8b0d9d`](https://github.com/brunomaida/Layers/commit/a8b0d9d210b0364dbff16cb556f001d7858040d2) fix(core): compare merge conflicts per origin layout (S9.1d Task 1)
- [`491716c`](https://github.com/brunomaida/Layers/commit/491716c240d7d9deb87ea6d621b538a6b3a5d86e) feat(ui): share one undo stack across layouts (S9.1d Task 2)
- [`43baa25`](https://github.com/brunomaida/Layers/commit/43baa2509e6654070a38e8001f1433ea59815757) fix(ui): close undo race, drift and test gaps across layouts (S9.1d Task 2)
- [`47a6bc9`](https://github.com/brunomaida/Layers/commit/47a6bc92be4df36d079ba813d37b5814bba750b0) fix(ui): keep undo hash fresh after apply and incomplete loads (S9.1d Task 2)
- [`f9c2acd`](https://github.com/brunomaida/Layers/commit/f9c2acdb9b9af4fb33dfc1381d24209c8c8af8a7) feat(ui): probe other layouts and watch them (S9.1d Task 3)
- [`8fa740b`](https://github.com/brunomaida/Layers/commit/8fa740b1f3d5c1ebb70adf651cfe5cca93b6a870) fix(ui): invalidate layout probes on manifest and shared file changes (S9.1d Task 3)
- [`89ae5c9`](https://github.com/brunomaida/Layers/commit/89ae5c954cc48517c91e682853a6a70fd2479fc8) feat(ui): apply pending of every layout and warn on shared use (S9.1d Task 4)
- [`33696ef`](https://github.com/brunomaida/Layers/commit/33696efa8b27a30810d9fd7b3e18cc7f3cb0d887) fix(ui): honest kept-pending warnings and rollback fidelity (S9.1d Task 4)
- [`f5f0721`](https://github.com/brunomaida/Layers/commit/f5f07216433074de060049b0d23e572314b34d5e) fix(ui): keep undo steps and state discard wording on apply (S9.1d Task 4)
- [`bcd7849`](https://github.com/brunomaida/Layers/commit/bcd7849a59ceb4ae02aa98ca46132502e44a5ce0) perf(ui): demote full frozen and group LOD planes on drag (S9.1d Task 5)
- [`683ee7d`](https://github.com/brunomaida/Layers/commit/683ee7d71569bdbe9e8a0c91fad677f1e747a7a8) fix(ui): keep written files in the rollback entry when draft cleanup fails (S9.1d Task 5)
- [`d2ff282`](https://github.com/brunomaida/Layers/commit/d2ff282171ae7db9ddec9c190e41dd3926bb4150) test(perf): measure 1,400 and 1,600 plane spread cases (S9.1d Task 6)
- [`1b7c841`](https://github.com/brunomaida/Layers/commit/1b7c841f4ea030d43d44fa51fd5a697f17f0d072) fix(perf): state the silent 1,400 case and harden perf asserts (S9.1d Task 6)
- [`bc1bfb3`](https://github.com/brunomaida/Layers/commit/bc1bfb33217137b083591934b58152e52fe9b9dc) docs: record S9.1d (S9.1d Task 7)
- [`d61a6f6`](https://github.com/brunomaida/Layers/commit/d61a6f653cc6bd073814f6b80429e7673c0dabe8) fix(ui): close cross-layout gaps found in the S9.1d branch review (S9.1d Task 4)
- [`0ac595e`](https://github.com/brunomaida/Layers/commit/0ac595e98fea1af0a646f973752b13b9aaee9a6a) test(ui): harden draft polling and probe guards (S9.1d Task 4)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `64344da4` | 2026-10-18 17:13 | 30.19h | 1.4k | 736.3k | 160.07M | 2.25M |
| `agent-a4` | 2026-10-19 20:47 | 15.0m | 108 | 7.9k | 3.45M | 227.9k |
| `agent-a1` | 2026-10-19 20:49 | 3.6m | 42 | 3.1k | 627.1k | 134.0k |
| `agent-ac` | 2026-10-19 20:56 | 3.4m | 44 | 3.9k | 720.4k | 75.5k |
| `agent-ac` | 2026-10-19 21:02 | 2.0m | 20 | 342 | 191.6k | 31.8k |
| `agent-a2` | 2026-10-19 21:05 | 1.11h | 270 | 5.7k | 15.55M | 608.2k |
| `agent-aa` | 2026-10-19 21:21 | 12.4m | 98 | 2.0k | 3.08M | 203.0k |
| `agent-ab` | 2026-10-19 21:47 | 10.0m | 88 | 8.4k | 2.27M | 145.3k |
| `agent-a3` | 2026-10-19 22:13 | 4.2m | 40 | 557 | 552.8k | 75.0k |
| `agent-ac` | 2026-10-19 22:18 | 55.1m | 236 | 5.3k | 15.81M | 682.5k |
| `agent-af` | 2026-10-19 22:37 | 15.4m | 108 | 3.7k | 5.01M | 242.0k |
| `agent-a2` | 2026-10-19 23:13 | 9.9m | 88 | 2.4k | 2.20M | 111.8k |
| `agent-a7` | 2026-10-19 23:25 | 6.9m | 100 | 6.2k | 4.27M | 214.4k |
| `35ac6cfd` | 2026-10-20 08:48 | 5.97h | 194 | 98.2k | 12.39M | 827.1k |
| `agent-a3` | 2026-10-20 08:50 | 5.92h | 582 | 7.9k | 64.66M | 2.15M |
| `agent-a9` | 2026-10-20 10:01 | 15.8m | 134 | 4.9k | 6.05M | 221.8k |
| `agent-a3` | 2026-10-20 10:37 | 4.2m | 32 | 4.4k | 592.4k | 94.0k |
| `agent-aa` | 2026-10-20 10:42 | 1.56h | 390 | 10.1k | 31.97M | 809.7k |
| `agent-a8` | 2026-10-20 11:52 | 9.4m | 114 | 18.5k | 3.37M | 164.1k |
| `agent-a3` | 2026-10-20 12:16 | 11.0m | 66 | 6.8k | 1.22M | 76.9k |
| `agent-ac` | 2026-10-20 12:17 | 23.5m | 90 | 1.2k | 4.26M | 168.3k |
| `agent-a6` | 2026-10-20 12:41 | 9.3m | 62 | 6.8k | 1.24M | 105.2k |
| `agent-a0` | 2026-10-20 12:52 | 33.6m | 180 | 2.7k | 11.76M | 373.0k |
| `agent-a2` | 2026-10-20 13:26 | 22.2m | 208 | 27.8k | 12.63M | 313.1k |
| `agent-a6` | 2026-10-20 14:13 | 5.2m | 134 | 12.5k | 4.12M | 167.4k |
| **Total (25)** | — | **49.28h** | **4.8k** | **987.6k** | **368.06M** | **10.48M** |
