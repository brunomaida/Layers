# Implementation Report — s9-1a-layouts-foco

- **Branch:** `feature/261018-87-s9-1a-layouts-foco`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-18 12:55 → 2026-10-18 16:08
- **Status:** `final`
- **Gerado em:** 2026-10-18 16:08

## Resumo

Vários layouts por projeto (`layers.json › layouts`, `id`/`name`/`mock`/`states?`) e a faixa LAYOUTS acima de Camadas (só com 2+ layouts): modo Foco, um layout montado por vez; trocar recarrega só o mock dele. Seleção, explosão, câmera e ajustes pendentes ficam por layout; o chip dos outros mostra um badge de pendentes.

## Mudanças

### Added (12)

- `changelog.d/feature-261018-87-s9-1a-layouts-foco.md` (+17/-0, doc)
- `docs/superpowers/plans/2026-10-18-s9-1a-layouts-modelo-seletor-e.md` (+222/-0, doc)
- `e2e/layouts.spec.js` (+857/-0, src)
- `fixtures/multi-layout/layers.json` (+1/-0, config)
- `fixtures/multi-layout/layers/config.css` (+1/-0, other)
- `fixtures/multi-layout/layers/config.html` (+3/-0, other)
- `fixtures/multi-layout/layers/main.css` (+1/-0, other)
- `fixtures/multi-layout/layers/main.filled.html` (+3/-0, other)
- `fixtures/multi-layout/layers/main.html` (+3/-0, other)
- `fixtures/multi-layout/layers/replay.css` (+1/-0, other)
- `fixtures/multi-layout/layers/replay.html` (+3/-0, other)
- `fixtures/multi-layout/layers/shared.css` (+1/-0, other)

### Changed (13)

- `README.md` (+5/-2, doc)
- `docs/ARCHITECTURE.md` (+69/-7, doc)
- `docs/RELEASE-CHECKLIST.md` (+5/-2, doc)
- `docs/_index.md` (+2/-2, doc)
- `docs/layers-json.md` (+30/-1, doc)
- `docs/roadmap.config.json` (+4/-1, doc)
- `docs/roadmap.data.json` (+85/-1, doc)
- `docs/roadmap.md` (+3/-0, doc)
- `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (+15/-0, test)
- `e2e/perf.spec.js` (+121/-0, src)
- `index.html` (+95/-33, other)
- `lib/layers-core.js` (+115/-3, src)
- `test/layers-core.test.js` (+308/-0, test)

### Changelog fragment

**Added:**
- Vários layouts por projeto (`layers.json › layouts`, `id`/`name`/`mock`/`states?`) e a faixa LAYOUTS acima de Camadas (só com 2+ layouts): modo Foco, um layout montado por vez; trocar recarrega só o mock dele. Seleção, explosão, câmera e ajustes pendentes ficam por layout; o chip dos outros mostra um badge de pendentes.
- Requisições com `layoutId`, `R<n>` único e exportação agrupada por layout; `interactions[].layout` filtra o menu Interagir; Reanalisar do 0 faz backup do mock de cada layout.
- Helpers puros em `LayersCore` (`projectLayouts`, `pickLayout`, `layoutPendingKey`, `stateMapKey`, `interactionsFor`, `mergeLayoutRequests`, `touchLayoutEntries`, `clearLayoutEntries`) e a fixture `multi-layout`.

**Changed:**
- Chaves por layout: `pending` e `stateMap` em `<projeto>|<layout>` (o `main` e o projeto sem `layouts` mantêm as de antes); `session` ganha `layouts` (com o mapa não vazio) e `viewLayout` (só com 2+ layouts). Zerar interface limpa `<projeto>|*`.

**Tests:**
- Vitest: helpers de layout. Playwright: `layouts` (faixa, chaves, vista, pendentes, requisições, backup) e `perf`.

**Perf:**
- measured — 1.501 nós, mediana de 3 execuções: trocar de layout 175,1 ms contra recarregar o mesmo mock 181,2 ms (razão 0,97; guarda relativo ≤ 1,5×); idas e voltas mantêm 1 shadow root, sem vazamento.

## Arquivos tocados

### src (3)

- [`e2e/layouts.spec.js`](../../../e2e/layouts.spec.js) — A (+857/-0)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+121/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+115/-3)

### test (2)

- [`docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`](../specs/2026-10-17-s3-5-s9-1-design-decisions.md) — M (+15/-0)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+308/-0)

### doc (10)

- [`README.md`](../../../README.md) — M (+5/-2)
- [`changelog.d/feature-261018-87-s9-1a-layouts-foco.md`](../../../changelog.d/feature-261018-87-s9-1a-layouts-foco.md) — A (+17/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+69/-7)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+5/-2)
- [`docs/_index.md`](../../_index.md) — M (+2/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+30/-1)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+4/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+85/-1)
- [`docs/roadmap.md`](../../roadmap.md) — M (+3/-0)
- [`docs/superpowers/plans/2026-10-18-s9-1a-layouts-modelo-seletor-e.md`](../plans/2026-10-18-s9-1a-layouts-modelo-seletor-e.md) — A (+222/-0)

### config (1)

- [`fixtures/multi-layout/layers.json`](../../../fixtures/multi-layout/layers.json) — A (+1/-0)

### other (9)

- [`fixtures/multi-layout/layers/config.css`](../../../fixtures/multi-layout/layers/config.css) — A (+1/-0)
- [`fixtures/multi-layout/layers/config.html`](../../../fixtures/multi-layout/layers/config.html) — A (+3/-0)
- [`fixtures/multi-layout/layers/main.css`](../../../fixtures/multi-layout/layers/main.css) — A (+1/-0)
- [`fixtures/multi-layout/layers/main.filled.html`](../../../fixtures/multi-layout/layers/main.filled.html) — A (+3/-0)
- [`fixtures/multi-layout/layers/main.html`](../../../fixtures/multi-layout/layers/main.html) — A (+3/-0)
- [`fixtures/multi-layout/layers/replay.css`](../../../fixtures/multi-layout/layers/replay.css) — A (+1/-0)
- [`fixtures/multi-layout/layers/replay.html`](../../../fixtures/multi-layout/layers/replay.html) — A (+3/-0)
- [`fixtures/multi-layout/layers/shared.css`](../../../fixtures/multi-layout/layers/shared.css) — A (+1/-0)
- [`index.html`](../../../index.html) — M (+95/-33)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Vários layouts por projeto (`layers.json › layouts`, `id`/`name`/`mock`/`states?`) e a faixa LAYOUTS acima de Camadas (só com 2+ layouts): modo Foco, um layout montado por vez; trocar recarrega só o mock dele. Seleção, explosão, câmera e ajustes pendentes ficam por layout; o chip dos outros mostra um badge de pendentes.
  - [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
  - [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
  - [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
  - [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
  - [`60ca602`](https://github.com/brunomaida/Layers/commit/60ca60216c3441d33aff77b2f6fdb7277a24ea58) feat(ui): add LAYOUTS strip with pending badges to the bottom bar (S9.1a Task 3)
  - [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
  - [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
  - [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
  - [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
  - [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
  - [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
  - [`2dd9862`](https://github.com/brunomaida/Layers/commit/2dd9862c9f6169d8b6b56b1f4f0418eff66d9e42) docs: document layouts, Foco keys, limits and perf budget (S9.1a Task 7b)
  - [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
  - [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
  - [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
  - [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write
  - [`91b5882`](https://github.com/brunomaida/Layers/commit/91b5882228824ceeb36d54d36044443199708f72) docs: update the layouts e2e count after the fix wave
- **Added:** Requisições com `layoutId`, `R<n>` único e exportação agrupada por layout; `interactions[].layout` filtra o menu Interagir; Reanalisar do 0 faz backup do mock de cada layout.
  - [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
  - [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
  - [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
  - [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
  - [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
  - [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
  - [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
  - [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
  - [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
  - [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
  - [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
  - [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
  - [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
  - [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write
  - [`14a68bd`](https://github.com/brunomaida/Layers/commit/14a68bdc8867294ca63b9cf0526e80dd6bd3eccd) test(e2e): cover view round trips, dead interactions, sibling touch, backup failures
- **Added:** Helpers puros em `LayersCore` (`projectLayouts`, `pickLayout`, `layoutPendingKey`, `stateMapKey`, `interactionsFor`, `mergeLayoutRequests`, `touchLayoutEntries`, `clearLayoutEntries`) e a fixture `multi-layout`.
  - [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
  - [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
  - [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
  - [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
  - [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
  - [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
  - [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
  - [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
  - [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
  - [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
  - [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
  - [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
  - [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
  - [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write
- **Changed:** Chaves por layout: `pending` e `stateMap` em `<projeto>|<layout>` (o `main` e o projeto sem `layouts` mantêm as de antes); `session` ganha `layouts` (com o mapa não vazio) e `viewLayout` (só com 2+ layouts). Zerar interface limpa `<projeto>|*`.
  - [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
  - [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
  - [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
  - [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
  - [`60ca602`](https://github.com/brunomaida/Layers/commit/60ca60216c3441d33aff77b2f6fdb7277a24ea58) feat(ui): add LAYOUTS strip with pending badges to the bottom bar (S9.1a Task 3)
  - [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
  - [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
  - [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
  - [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
  - [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
  - [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
  - [`2dd9862`](https://github.com/brunomaida/Layers/commit/2dd9862c9f6169d8b6b56b1f4f0418eff66d9e42) docs: document layouts, Foco keys, limits and perf budget (S9.1a Task 7b)
  - [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
  - [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
  - [`fc174c8`](https://github.com/brunomaida/Layers/commit/fc174c88944b857292537f2557907c78dfcaced6) fix(ui): keep saved pending entries when Zerar runs after an incomplete load
  - [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
  - [`782d88f`](https://github.com/brunomaida/Layers/commit/782d88f8759f11a75946a9fc601096e5e5a8c31a) docs: correct session key wording and the main-only legacy keys; describe the S9.1a fix wave
  - [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write
  - [`91b5882`](https://github.com/brunomaida/Layers/commit/91b5882228824ceeb36d54d36044443199708f72) docs: update the layouts e2e count after the fix wave
- **Tests:** Vitest: helpers de layout. Playwright: `layouts` (faixa, chaves, vista, pendentes, requisições, backup) e `perf`.
  - [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
  - [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
  - [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
  - [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
  - [`60ca602`](https://github.com/brunomaida/Layers/commit/60ca60216c3441d33aff77b2f6fdb7277a24ea58) feat(ui): add LAYOUTS strip with pending badges to the bottom bar (S9.1a Task 3)
  - [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
  - [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
  - [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
  - [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
  - [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
  - [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
  - [`2dd9862`](https://github.com/brunomaida/Layers/commit/2dd9862c9f6169d8b6b56b1f4f0418eff66d9e42) docs: document layouts, Foco keys, limits and perf budget (S9.1a Task 7b)
  - [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
  - [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
  - [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
  - [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write
  - [`14a68bd`](https://github.com/brunomaida/Layers/commit/14a68bdc8867294ca63b9cf0526e80dd6bd3eccd) test(e2e): cover view round trips, dead interactions, sibling touch, backup failures
  - [`91b5882`](https://github.com/brunomaida/Layers/commit/91b5882228824ceeb36d54d36044443199708f72) docs: update the layouts e2e count after the fix wave
- **Perf:** measured — 1.501 nós, mediana de 3 execuções: trocar de layout 175,1 ms contra recarregar o mesmo mock 181,2 ms (razão 0,97; guarda relativo ≤ 1,5×); idas e voltas mantêm 1 shadow root, sem vazamento.
  - [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
  - [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
  - [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
  - [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
  - [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
  - [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
  - [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
  - [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
  - [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
  - [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
  - [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
  - [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
  - [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
  - [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write

### Todos os commits

- [`7e63782`](https://github.com/brunomaida/Layers/commit/7e6378244d365ce87c07709e64faf7c79622ae59) docs: register S9.1a-c leaves and add the S9.1a plan
- [`430fb26`](https://github.com/brunomaida/Layers/commit/430fb26a480b8399673d7e76db53ecf9100fefee) feat(core): add multi-layout helpers (S9.1a Task 1)
- [`6e29a81`](https://github.com/brunomaida/Layers/commit/6e29a817b0738e94064b10ad4397817a2c4cecfa) fix(core): harden layout helpers after review (S9.1a Task 1)
- [`2d610bf`](https://github.com/brunomaida/Layers/commit/2d610bf682cf07d38bdb6bb303cb07ef90d20373) feat(ui): load one layout per project with per-layout keys (S9.1a Task 2)
- [`2104491`](https://github.com/brunomaida/Layers/commit/210449156c5e518e0b44f861546435d0c39cb33c) fix(ui): guard overlapping loads and unsaved changes on layout switch (S9.1a Task 2)
- [`60ca602`](https://github.com/brunomaida/Layers/commit/60ca60216c3441d33aff77b2f6fdb7277a24ea58) feat(ui): add LAYOUTS strip with pending badges to the bottom bar (S9.1a Task 3)
- [`5d2b697`](https://github.com/brunomaida/Layers/commit/5d2b697f4ed48e356b929dfbcb88fa159ec7140b) fix(ui): render the LAYOUTS strip as its own pill above the bar (S9.1a Task 3)
- [`dda5fa4`](https://github.com/brunomaida/Layers/commit/dda5fa49bf519bd939ef3d20a27796f92ead6e3d) feat(ui): keep view state per layout and renew sibling pending entries (S9.1a Task 4)
- [`207e218`](https://github.com/brunomaida/Layers/commit/207e2181abe833b4baac15758f008dc278478e0d) feat(ui): scope manual requests and Interagir items to the layout (S9.1a Task 5)
- [`341d8e3`](https://github.com/brunomaida/Layers/commit/341d8e33366e87eb58252c64b22f3013f70208f9) feat(ui): back up every layout mock on Reanalisar and close layout keys on reset (S9.1a Task 6)
- [`e7a7443`](https://github.com/brunomaida/Layers/commit/e7a7443e493db1fb224b6ec66933b5776ca5fdf0) fix(ui): scope reset to the current project and harden layout backup (S9.1a Task 6)
- [`506a2f3`](https://github.com/brunomaida/Layers/commit/506a2f3b7d86b169d4fbae0c167c83f0274185b2) test(perf): measure layout switch against a reload and guard leaks (S9.1a Task 7a)
- [`2dd9862`](https://github.com/brunomaida/Layers/commit/2dd9862c9f6169d8b6b56b1f4f0418eff66d9e42) docs: document layouts, Foco keys, limits and perf budget (S9.1a Task 7b)
- [`6ae87f2`](https://github.com/brunomaida/Layers/commit/6ae87f2653cabf3cea070cf90b4d1ba5de465386) fix(ui): confirm layout switch when adjustments cannot be stored (over cap or storage full)
- [`75cec92`](https://github.com/brunomaida/Layers/commit/75cec9287ecec08dbf25b69964f1cd725e5bace1) fix(core): surface a failed sibling touch and keep stored entries intact
- [`39524c0`](https://github.com/brunomaida/Layers/commit/39524c0fdd0bf8dc97a0d26fb19026df9562eaeb) fix(ui): drop a stale layout id at load so the session view restores next reload
- [`fc174c8`](https://github.com/brunomaida/Layers/commit/fc174c88944b857292537f2557907c78dfcaced6) fix(ui): keep saved pending entries when Zerar runs after an incomplete load
- [`33253ff`](https://github.com/brunomaida/Layers/commit/33253ffd97ae03232f46e6d8e1b4159963268221) fix(ui): use null-prototype maps for layout-id lookups
- [`782d88f`](https://github.com/brunomaida/Layers/commit/782d88f8759f11a75946a9fc601096e5e5a8c31a) docs: correct session key wording and the main-only legacy keys; describe the S9.1a fix wave
- [`075abed`](https://github.com/brunomaida/Layers/commit/075abed9ae4ec5adcc8c0a08f834e9bda8216a5b) fix(ui): recheck the connected folder before each extra layout mock backup write
- [`14a68bd`](https://github.com/brunomaida/Layers/commit/14a68bdc8867294ca63b9cf0526e80dd6bd3eccd) test(e2e): cover view round trips, dead interactions, sibling touch, backup failures
- [`91b5882`](https://github.com/brunomaida/Layers/commit/91b5882228824ceeb36d54d36044443199708f72) docs: update the layouts e2e count after the fix wave
- [`abb57f1`](https://github.com/brunomaida/Layers/commit/abb57f1afe2afdde41159c48603dad7427ab63f1) test(e2e): make the UseDir and overlapping-load tests assert on cached views and A's own promise
- [`a31eff1`](https://github.com/brunomaida/Layers/commit/a31eff117fe3bf3395d5d6635e5088ab112ea58b) docs: align layoutMap lifetime wording with the stale-id cleanup

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `724f45a2` | 2026-10-17 16:11 | 23.95h | 1.5k | 780.6k | 177.16M | 3.40M |
| `agent-ab` | 2026-10-18 12:55 | 7.9m | 84 | 1.9k | 2.64M | 129.4k |
| `agent-a3` | 2026-10-18 12:58 | 4.0m | 56 | 7.5k | 928.6k | 128.5k |
| `agent-ac` | 2026-10-18 13:03 | 49s | 20 | 354 | 188.4k | 61.2k |
| `agent-a6` | 2026-10-18 13:05 | 20.9m | 112 | 1.4k | 4.34M | 271.9k |
| `agent-a2` | 2026-10-18 13:14 | 5.3m | 90 | 3.2k | 2.09M | 188.9k |
| `agent-a3` | 2026-10-18 13:26 | 1.4m | 24 | 5.1k | 277.9k | 116.8k |
| `agent-ab` | 2026-10-18 13:28 | 19.8m | 108 | 3.1k | 3.74M | 321.8k |
| `agent-a8` | 2026-10-18 13:35 | 6.9m | 126 | 9.9k | 3.64M | 183.4k |
| `agent-a6` | 2026-10-18 13:48 | 5.3m | 76 | 1.5k | 1.24M | 115.5k |
| `agent-a5` | 2026-10-18 13:54 | 11.6m | 112 | 6.6k | 5.25M | 255.1k |
| `agent-a3` | 2026-10-18 14:06 | 4.1m | 50 | 2.0k | 1.11M | 165.7k |
| `agent-a0` | 2026-10-18 14:10 | 8.6m | 108 | 3.2k | 4.39M | 181.4k |
| `agent-a3` | 2026-10-18 14:19 | 7.1m | 106 | 6.7k | 3.00M | 177.6k |
| `agent-a5` | 2026-10-18 14:27 | 21.8m | 168 | 13.4k | 6.55M | 347.7k |
| `agent-aa` | 2026-10-18 14:36 | 7.1m | 60 | 1.3k | 1.16M | 139.3k |
| `agent-a4` | 2026-10-18 14:49 | 2.9m | 68 | 1.1k | 1.32M | 113.4k |
| `agent-a8` | 2026-10-18 14:52 | 5.1m | 64 | 4.4k | 2.51M | 158.1k |
| `agent-a1` | 2026-10-18 14:58 | 1.5m | 28 | 412 | 189.1k | 40.5k |
| `agent-a4` | 2026-10-18 15:00 | 5.0m | 124 | 3.8k | 7.73M | 280.0k |
| `agent-ae` | 2026-10-18 15:05 | 13.4m | 130 | 20.6k | 7.16M | 372.9k |
| `agent-a0` | 2026-10-18 15:20 | 44.5m | 360 | 6.8k | 23.06M | 707.4k |
| `agent-ad` | 2026-10-18 16:05 | 3.0m | 52 | 2.4k | 1.38M | 167.1k |
| **Total (23)** | — | **27.41h** | **3.7k** | **887.3k** | **261.06M** | **8.03M** |
