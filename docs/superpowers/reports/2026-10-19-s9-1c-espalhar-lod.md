# Implementation Report — s9-1c-espalhar-lod

- **Branch:** `feature/261019-91-s9-1c-espalhar-lod`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-19 11:26 → 2026-10-19 18:25
- **Status:** `final`
- **Spec:** [docs\superpowers\specs\2026-10-19-s9-1c-espalhar-lod-design.md](../specs/2026-10-19-s9-1c-espalhar-lod-design.md)
- **Gerado em:** 2026-10-19 18:25

## Resumo

**S9.1c — Espalhar layouts no palco 3D com LOD — design**

title: "S9.1c — Espalhar layouts no palco 3D com LOD — design" type: spec solution: Layers status: draft created: 2026-10-19 Fatia da [S9.1 layouts newlogic](../../text-specs/2026-10-17-s9-1-layouts-newlogic.md). Parte do fluxo **V3 Híbrido** decidido em [](2026-10-17-s3-5-s9-1-design-decisions.md) (board `S91Fluxos`). Plano de implementação: [](../plans/2026-10-19-s9-1c-espalhar-layouts-no-palco.md). Issue #91. Um projeto com várias telas (S9.1a) só mostra uma por vez (Foco). O Espalhar mostra várias lado a lado no mesmo palco 3D, sem montar todas por inteiro, para o usuário comparar e navega…

## Solicitação & Spec

### Spec definida

**S9.1c — Espalhar layouts no palco 3D com LOD — design**

title: "S9.1c — Espalhar layouts no palco 3D com LOD — design" type: spec solution: Layers status: draft created: 2026-10-19 Fatia da [S9.1 layouts newlogic](../../text-specs/2026-10-17-s9-1-layouts-newlogic.md). Parte do fluxo **V3 Híbrido** decidido em [](2026-10-17-s3-5-s9-1-design-decisions.md) (board `S91Fluxos`). Plano de implementação: [](../plans/2026-10-19-s9-1c-espalhar-layouts-no-palco.md). Issue #91. Um projeto com várias telas (S9.1a) só mostra uma por vez (Foco). O Espalhar mostra várias lado a lado no mesmo palco 3D, sem montar todas por inteiro, para o usuário comparar e navega…

[Ver spec completa: `docs\superpowers\specs\2026-10-19-s9-1c-espalhar-lod-design.md`](../specs/2026-10-19-s9-1c-espalhar-lod-design.md)

## Mudanças

### Added (4)

- `changelog.d/feature-261019-91-s9-1c-espalhar-lod.md` (+15/-0, doc)
- `docs/superpowers/plans/2026-10-19-s9-1c-espalhar-layouts-no-palco.md` (+232/-0, doc)
- `docs/superpowers/specs/2026-10-19-s9-1c-espalhar-lod-design.md` (+68/-0, test)
- `e2e/spread.spec.js` (+1712/-0, src)

### Changed (16)

- `README.md` (+3/-0, doc)
- `bench/core.bench.js` (+6/-0, src)
- `bench/workloads.js` (+7/-1, src)
- `docs/ARCHITECTURE.md` (+111/-8, doc)
- `docs/RELEASE-CHECKLIST.md` (+4/-1, doc)
- `docs/_index.md` (+3/-2, doc)
- `docs/layers-json.md` (+4/-0, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+46/-2, doc)
- `docs/roadmap.md` (+2/-1, doc)
- `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (+20/-0, test)
- `e2e/layouts.spec.js` (+1/-1, src)
- `e2e/perf.spec.js` (+183/-0, src)
- `index.html` (+273/-51, other)
- `lib/layers-core.js` (+95/-3, src)
- `test/layers-core.test.js` (+280/-0, test)

### Changelog fragment

**Added:**
- Espalhar layouts: `⊞ ESPALHAR ▾` (faixa LAYOUTS, 2+ layouts) mostra os layouts lado a lado no palco 3D, o ativo completo e os demais como retratos congelados em LOD (varredura rasa, borda tracejada). Popover Foco | Todos | 1–N com distância; clicar num plano LOD ativa o layout e seleciona o mesmo nó; aviso, sem bloquear, acima de 1.500 planos.
- Câmera de visão geral que enquadra todas as páginas (o zoom não aproxima o olho); a câmera normal é guardada e volta ao desligar. Seleção, distância e câmera persistem em `session › spread`.
- Core puro: `spreadPicked`, `spreadOffsets`, `lodNodes`, `spreadPlaneTotal`, `spreadSessionEntry`, `overviewFit`; `viewCuller` aceita `zs`. `loadProject` dividido em `buildMockDom`/`mountMockDom`/`scanRoot`; `readText(path, quiet)`.
- Só o ativo edita; edição, undo e watch entre layouts ficam na S9.1d.

**Tests:**
- Vitest: 644 testes (44 novos). Playwright: `spread` (106 testes) e os orçamentos do Espalhar em `perf`.

**Perf:**
- measured — 2026-10-19: em Node (`npm run bench`), `overviewFit` de 8 páginas 1,6 µs e `lodNodes` de 1.500 nós 3,7 µs; no Chromium (e2e), ligar com 3 layouts 373 ms (orçamento 746), órbita de 3 páginas 17,6 ms (36), pior caso de 3.303 planos 99 ms, ~10 fps (198), órbita em `main` pesado ligado 19,5 contra 20,8 ms desligado (a visão geral desenha menor; `scene()` custa 1,05 ms desligado e 0,89 ms ligado por chamada). Desligado, nada muda.

## Arquivos tocados

### src (6)

- [`bench/core.bench.js`](../../../bench/core.bench.js) — M (+6/-0)
- [`bench/workloads.js`](../../../bench/workloads.js) — M (+7/-1)
- [`e2e/layouts.spec.js`](../../../e2e/layouts.spec.js) — M (+1/-1)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+183/-0)
- [`e2e/spread.spec.js`](../../../e2e/spread.spec.js) — A (+1712/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+95/-3)

### test (3)

- [`docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`](../specs/2026-10-17-s3-5-s9-1-design-decisions.md) — M (+20/-0)
- [`docs/superpowers/specs/2026-10-19-s9-1c-espalhar-lod-design.md`](../specs/2026-10-19-s9-1c-espalhar-lod-design.md) — A (+68/-0)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+280/-0)

### doc (10)

- [`README.md`](../../../README.md) — M (+3/-0)
- [`changelog.d/feature-261019-91-s9-1c-espalhar-lod.md`](../../../changelog.d/feature-261019-91-s9-1c-espalhar-lod.md) — A (+15/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+111/-8)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+4/-1)
- [`docs/_index.md`](../../_index.md) — M (+3/-2)
- [`docs/layers-json.md`](../../layers-json.md) — M (+4/-0)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+46/-2)
- [`docs/roadmap.md`](../../roadmap.md) — M (+2/-1)
- [`docs/superpowers/plans/2026-10-19-s9-1c-espalhar-layouts-no-palco.md`](../plans/2026-10-19-s9-1c-espalhar-layouts-no-palco.md) — A (+232/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+273/-51)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Espalhar layouts: `⊞ ESPALHAR ▾` (faixa LAYOUTS, 2+ layouts) mostra os layouts lado a lado no palco 3D, o ativo completo e os demais como retratos congelados em LOD (varredura rasa, borda tracejada). Popover Foco | Todos | 1–N com distância; clicar num plano LOD ativa o layout e seleciona o mesmo nó; aviso, sem bloquear, acima de 1.500 planos.
  - [`fff2ce3`](https://github.com/brunomaida/Layers/commit/fff2ce3a2b6b813db25e4e31540eb360d7ff2fd4) docs: add S9.1c Espalhar design spec
  - [`d68b58f`](https://github.com/brunomaida/Layers/commit/d68b58f605f4c04fcd069e4c1ca2f9dd5d3d4e53) feat(core): add spread layout helpers (S9.1c Task 1)
  - [`3ca6d01`](https://github.com/brunomaida/Layers/commit/3ca6d010b7798b912f7d90e2bf02c931024211e3) feat(ui): freeze other layouts as LOD snapshots for Espalhar (S9.1c Task 3)
  - [`103da9a`](https://github.com/brunomaida/Layers/commit/103da9a7f40faf31d8b7fb3983f200be63e5ab0e) test(e2e): harden Espalhar freeze and race tests (S9.1c Task 3)
  - [`0c03a4d`](https://github.com/brunomaida/Layers/commit/0c03a4d9a2a06f5ef6df3d9b02dfcc1aebec376f) feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)
  - [`cd07034`](https://github.com/brunomaida/Layers/commit/cd0703441c39c68f9e764bf06da097fe26051883) test(perf): add Espalhar orbit measurement (S9.1c Task 4)
  - [`0d6d987`](https://github.com/brunomaida/Layers/commit/0d6d9876a0ec891160c080b9d114090f4b7a2fd9) fix(ui): fit the Espalhar overview camera under perspective (S9.1c Task 4)
  - [`b8aed41`](https://github.com/brunomaida/Layers/commit/b8aed4131c1bd3c8cb9675d1a78055f84364ee41) test(e2e): cover overview fit at real page sizes and minors (S9.1c Task 4)
  - [`29f10b6`](https://github.com/brunomaida/Layers/commit/29f10b65a48abc19c8ed5b34613589d934aa1ca9) test(e2e): cover overview zoom on every page (S9.1c Task 4)
  - [`56b8d6b`](https://github.com/brunomaida/Layers/commit/56b8d6b60b33304992cb93e39b2163b3b5ffc136) feat(ui): add Espalhar button and popover with plane warning (S9.1c Task 5)
  - [`1f5d521`](https://github.com/brunomaida/Layers/commit/1f5d521610802647ab8a7944e9264728c0e772cd) test(e2e): cover the Espalhar popover (S9.1c Task 5)
  - [`4fc0bfc`](https://github.com/brunomaida/Layers/commit/4fc0bfc795248dca055bc3799aae6a4e1f1d8a56) feat(ui): activate layouts from LOD planes (S9.1c Task 6)
  - [`0c0e202`](https://github.com/brunomaida/Layers/commit/0c0e20206d8172faba52ebe9bf922fda37ca6621) test(e2e): cover activation from LOD planes (S9.1c Task 6)
  - [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
  - [`aafd1a7`](https://github.com/brunomaida/Layers/commit/aafd1a7222a016aeda7b383bbca5babdf086ddca) test(e2e): cover the Espalhar camera and session (S9.1c Task 6)
  - [`e36bd74`](https://github.com/brunomaida/Layers/commit/e36bd744b297fd833515167ca780727603f28bcd) fix(ui): polish the Espalhar popover (S9.1c Task 6)
  - [`bd24c83`](https://github.com/brunomaida/Layers/commit/bd24c83e3790c4107e8dd0eb2a388faec2970c43) test(e2e): cover the Espalhar popover polish (S9.1c Task 6)
  - [`255a14f`](https://github.com/brunomaida/Layers/commit/255a14f9cca8d8e180df853f43f6f8a9f6ff21d4) fix(ui): keep the layout left behind on the stage after a 1-N LOD click (S9.1c Task 6)
  - [`a6bc707`](https://github.com/brunomaida/Layers/commit/a6bc707ee48438bfbbf8e0a8c0f64a12a2ebece7) test(e2e): cover 1-N LOD activation and hover cleanup (S9.1c Task 6)
  - [`2348cab`](https://github.com/brunomaida/Layers/commit/2348cab3722a6aa6efa6be461ad642ef006f9e49) fix(ui): keep the stage when switching layouts in 1-N mode (S9.1c Task 6)
  - [`12656ec`](https://github.com/brunomaida/Layers/commit/12656ecf24689b4ace8bb0e7a5213dd093704008) fix(ui): keep per-layout cameras when toggling Espalhar (S9.1c Task 6)
  - [`a0d111d`](https://github.com/brunomaida/Layers/commit/a0d111d59ca034f91dafca280def7d8fe200d443) fix(ui): prefer active planes over LOD planes under the pointer (S9.1c Task 6)
  - [`772140f`](https://github.com/brunomaida/Layers/commit/772140f2c73bc16b201330ec790c99948f0c80f5) test(e2e): cover the Espalhar fix round (S9.1c Task 6)
  - [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
  - [`f1733bc`](https://github.com/brunomaida/Layers/commit/f1733bc5340c911fb6d55fc7aecd860b74dee14a) test(perf): fix Espalhar budgets and record measures (S9.1c Task 7)
  - [`54dabb6`](https://github.com/brunomaida/Layers/commit/54dabb69df7c4ca4882ee59e3dd7b2930c9a6685) docs: document Espalhar and close S9.1c (S9.1c Task 8)
  - [`32decf1`](https://github.com/brunomaida/Layers/commit/32decf1b857fd405c412b59d3e2576ca570eddce) fix(ui): drop an Espalhar toggle made during another project's load (S9.1c final review)
  - [`1c58393`](https://github.com/brunomaida/Layers/commit/1c58393725dabaacdb8bb9077df956385eeacaa1) fix(ui): restore the right camera when leaving Espalhar on another layout (S9.1c final review)
  - [`6f0881d`](https://github.com/brunomaida/Layers/commit/6f0881d3e94ffb141da0c248cd5bb9ce58b347ab) fix(ui): keep fixture sessions free of Espalhar and clamp the overview pivot in state (S9.1c final review)
  - [`aced259`](https://github.com/brunomaida/Layers/commit/aced25964e053c0db878158e87ad55d93e35a099) fix(ui): skip LOD hover when an active plane is in front (S9.1c final review)
  - [`20f8d9a`](https://github.com/brunomaida/Layers/commit/20f8d9ab13d59a709105a06b84bd1340a5236e3b) test(perf): state what the Espalhar drag comparison measures (S9.1c final review)
  - [`6c645be`](https://github.com/brunomaida/Layers/commit/6c645be272827a32e69a94a665978149b1eb4e4f) docs: fix residual Espalhar camera and sceneMs wording (S9.1c final review)
- **Added:** Câmera de visão geral que enquadra todas as páginas (o zoom não aproxima o olho); a câmera normal é guardada e volta ao desligar. Seleção, distância e câmera persistem em `session › spread`.
  - [`d68b58f`](https://github.com/brunomaida/Layers/commit/d68b58f605f4c04fcd069e4c1ca2f9dd5d3d4e53) feat(core): add spread layout helpers (S9.1c Task 1)
  - [`bc8dba2`](https://github.com/brunomaida/Layers/commit/bc8dba2b9f2420af5f785d727c67d6c9a9a64f82) fix(core): keep spread cam in session entry and guard offsets (S9.1c Task 1)
  - [`60803cc`](https://github.com/brunomaida/Layers/commit/60803cc80ad648631a69c5077df41ac4037d5957) fix(ui): clear frozen snapshots on every project entry and reset spread per project (S9.1c Task 3)
  - [`0c03a4d`](https://github.com/brunomaida/Layers/commit/0c03a4d9a2a06f5ef6df3d9b02dfcc1aebec376f) feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)
  - [`b8aed41`](https://github.com/brunomaida/Layers/commit/b8aed4131c1bd3c8cb9675d1a78055f84364ee41) test(e2e): cover overview fit at real page sizes and minors (S9.1c Task 4)
  - [`9e2d0ec`](https://github.com/brunomaida/Layers/commit/9e2d0ecd64489306fd23c437044188310482adc0) fix(ui): keep overview zoom 2D so far pages never cross the eye plane (S9.1c Task 4)
  - [`29f10b6`](https://github.com/brunomaida/Layers/commit/29f10b65a48abc19c8ed5b34613589d934aa1ca9) test(e2e): cover overview zoom on every page (S9.1c Task 4)
  - [`4fc0bfc`](https://github.com/brunomaida/Layers/commit/4fc0bfc795248dca055bc3799aae6a4e1f1d8a56) feat(ui): activate layouts from LOD planes (S9.1c Task 6)
  - [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
  - [`aafd1a7`](https://github.com/brunomaida/Layers/commit/aafd1a7222a016aeda7b383bbca5babdf086ddca) test(e2e): cover the Espalhar camera and session (S9.1c Task 6)
  - [`12656ec`](https://github.com/brunomaida/Layers/commit/12656ecf24689b4ace8bb0e7a5213dd093704008) fix(ui): keep per-layout cameras when toggling Espalhar (S9.1c Task 6)
  - [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
- **Added:** Core puro: `spreadPicked`, `spreadOffsets`, `lodNodes`, `spreadPlaneTotal`, `spreadSessionEntry`, `overviewFit`; `viewCuller` aceita `zs`. `loadProject` dividido em `buildMockDom`/`mountMockDom`/`scanRoot`; `readText(path, quiet)`.
  - [`d68b58f`](https://github.com/brunomaida/Layers/commit/d68b58f605f4c04fcd069e4c1ca2f9dd5d3d4e53) feat(core): add spread layout helpers (S9.1c Task 1)
  - [`bc8dba2`](https://github.com/brunomaida/Layers/commit/bc8dba2b9f2420af5f785d727c67d6c9a9a64f82) fix(core): keep spread cam in session entry and guard offsets (S9.1c Task 1)
  - [`74a5e9d`](https://github.com/brunomaida/Layers/commit/74a5e9d858fd2983432735ce1f284b56467aa40f) refactor(ui): extract buildMockDom and scanRoot from loadProject (S9.1c Task 2)
  - [`c01430d`](https://github.com/brunomaida/Layers/commit/c01430dbcb051377b459882af84eb19300756374) test(e2e): cover shallow scanRoot ids (S9.1c Task 2)
  - [`6a24e2a`](https://github.com/brunomaida/Layers/commit/6a24e2aed02519ec6678100f22a631571a2888b7) fix(ui): keep loader mount and singleton writes in one tick (S9.1c Task 2)
  - [`a708593`](https://github.com/brunomaida/Layers/commit/a70859363a2c01bed70bf1d6dd4af67ed5972759) test(e2e): tighten scanRoot and buildMockDom assertions (S9.1c Task 3)
  - [`0d6d987`](https://github.com/brunomaida/Layers/commit/0d6d9876a0ec891160c080b9d114090f4b7a2fd9) fix(ui): fit the Espalhar overview camera under perspective (S9.1c Task 4)
  - [`9e2d0ec`](https://github.com/brunomaida/Layers/commit/9e2d0ecd64489306fd23c437044188310482adc0) fix(ui): keep overview zoom 2D so far pages never cross the eye plane (S9.1c Task 4)
  - [`81fbc25`](https://github.com/brunomaida/Layers/commit/81fbc25f9f9c99ce12b9880be41f038badc15c9e) fix(core): solve the overview fit vertical shift (S9.1c Task 4)
  - [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
  - [`a7d7778`](https://github.com/brunomaida/Layers/commit/a7d777829e7cf1c0901f373df0ebebc0c28e4ea5) test(e2e): cover the chip path in 1-N mode (S9.1c Task 6)
  - [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
- **Added:** Só o ativo edita; edição, undo e watch entre layouts ficam na S9.1d.
  - [`3ca6d01`](https://github.com/brunomaida/Layers/commit/3ca6d010b7798b912f7d90e2bf02c931024211e3) feat(ui): freeze other layouts as LOD snapshots for Espalhar (S9.1c Task 3)
  - [`0c03a4d`](https://github.com/brunomaida/Layers/commit/0c03a4d9a2a06f5ef6df3d9b02dfcc1aebec376f) feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)
  - [`4fc0bfc`](https://github.com/brunomaida/Layers/commit/4fc0bfc795248dca055bc3799aae6a4e1f1d8a56) feat(ui): activate layouts from LOD planes (S9.1c Task 6)
  - [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
  - [`e36bd74`](https://github.com/brunomaida/Layers/commit/e36bd744b297fd833515167ca780727603f28bcd) fix(ui): polish the Espalhar popover (S9.1c Task 6)
  - [`2348cab`](https://github.com/brunomaida/Layers/commit/2348cab3722a6aa6efa6be461ad642ef006f9e49) fix(ui): keep the stage when switching layouts in 1-N mode (S9.1c Task 6)
  - [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
- **Tests:** Vitest: 644 testes (44 novos). Playwright: `spread` (106 testes) e os orçamentos do Espalhar em `perf`.
  - [`fff2ce3`](https://github.com/brunomaida/Layers/commit/fff2ce3a2b6b813db25e4e31540eb360d7ff2fd4) docs: add S9.1c Espalhar design spec
  - [`d68b58f`](https://github.com/brunomaida/Layers/commit/d68b58f605f4c04fcd069e4c1ca2f9dd5d3d4e53) feat(core): add spread layout helpers (S9.1c Task 1)
  - [`bc8dba2`](https://github.com/brunomaida/Layers/commit/bc8dba2b9f2420af5f785d727c67d6c9a9a64f82) fix(core): keep spread cam in session entry and guard offsets (S9.1c Task 1)
  - [`3ca6d01`](https://github.com/brunomaida/Layers/commit/3ca6d010b7798b912f7d90e2bf02c931024211e3) feat(ui): freeze other layouts as LOD snapshots for Espalhar (S9.1c Task 3)
  - [`60803cc`](https://github.com/brunomaida/Layers/commit/60803cc80ad648631a69c5077df41ac4037d5957) fix(ui): clear frozen snapshots on every project entry and reset spread per project (S9.1c Task 3)
  - [`103da9a`](https://github.com/brunomaida/Layers/commit/103da9a7f40faf31d8b7fb3983f200be63e5ab0e) test(e2e): harden Espalhar freeze and race tests (S9.1c Task 3)
  - [`0c03a4d`](https://github.com/brunomaida/Layers/commit/0c03a4d9a2a06f5ef6df3d9b02dfcc1aebec376f) feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)
  - [`cd07034`](https://github.com/brunomaida/Layers/commit/cd0703441c39c68f9e764bf06da097fe26051883) test(perf): add Espalhar orbit measurement (S9.1c Task 4)
  - [`0d6d987`](https://github.com/brunomaida/Layers/commit/0d6d9876a0ec891160c080b9d114090f4b7a2fd9) fix(ui): fit the Espalhar overview camera under perspective (S9.1c Task 4)
  - [`56b8d6b`](https://github.com/brunomaida/Layers/commit/56b8d6b60b33304992cb93e39b2163b3b5ffc136) feat(ui): add Espalhar button and popover with plane warning (S9.1c Task 5)
  - [`1f5d521`](https://github.com/brunomaida/Layers/commit/1f5d521610802647ab8a7944e9264728c0e772cd) test(e2e): cover the Espalhar popover (S9.1c Task 5)
  - [`4fc0bfc`](https://github.com/brunomaida/Layers/commit/4fc0bfc795248dca055bc3799aae6a4e1f1d8a56) feat(ui): activate layouts from LOD planes (S9.1c Task 6)
  - [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
  - [`aafd1a7`](https://github.com/brunomaida/Layers/commit/aafd1a7222a016aeda7b383bbca5babdf086ddca) test(e2e): cover the Espalhar camera and session (S9.1c Task 6)
  - [`e36bd74`](https://github.com/brunomaida/Layers/commit/e36bd744b297fd833515167ca780727603f28bcd) fix(ui): polish the Espalhar popover (S9.1c Task 6)
  - [`bd24c83`](https://github.com/brunomaida/Layers/commit/bd24c83e3790c4107e8dd0eb2a388faec2970c43) test(e2e): cover the Espalhar popover polish (S9.1c Task 6)
  - [`12656ec`](https://github.com/brunomaida/Layers/commit/12656ecf24689b4ace8bb0e7a5213dd093704008) fix(ui): keep per-layout cameras when toggling Espalhar (S9.1c Task 6)
  - [`772140f`](https://github.com/brunomaida/Layers/commit/772140f2c73bc16b201330ec790c99948f0c80f5) test(e2e): cover the Espalhar fix round (S9.1c Task 6)
  - [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
  - [`f1733bc`](https://github.com/brunomaida/Layers/commit/f1733bc5340c911fb6d55fc7aecd860b74dee14a) test(perf): fix Espalhar budgets and record measures (S9.1c Task 7)
  - [`54dabb6`](https://github.com/brunomaida/Layers/commit/54dabb69df7c4ca4882ee59e3dd7b2930c9a6685) docs: document Espalhar and close S9.1c (S9.1c Task 8)
  - [`32decf1`](https://github.com/brunomaida/Layers/commit/32decf1b857fd405c412b59d3e2576ca570eddce) fix(ui): drop an Espalhar toggle made during another project's load (S9.1c final review)
  - [`1c58393`](https://github.com/brunomaida/Layers/commit/1c58393725dabaacdb8bb9077df956385eeacaa1) fix(ui): restore the right camera when leaving Espalhar on another layout (S9.1c final review)
  - [`6f0881d`](https://github.com/brunomaida/Layers/commit/6f0881d3e94ffb141da0c248cd5bb9ce58b347ab) fix(ui): keep fixture sessions free of Espalhar and clamp the overview pivot in state (S9.1c final review)
  - [`20f8d9a`](https://github.com/brunomaida/Layers/commit/20f8d9ab13d59a709105a06b84bd1340a5236e3b) test(perf): state what the Espalhar drag comparison measures (S9.1c final review)
  - [`8ee4aec`](https://github.com/brunomaida/Layers/commit/8ee4aec0b7cc40d32f0967c97df633b4de8f0759) docs: record the S9.1c final review fixes and the S9.1d perf follow-up (S9.1c final review)
  - [`6c645be`](https://github.com/brunomaida/Layers/commit/6c645be272827a32e69a94a665978149b1eb4e4f) docs: fix residual Espalhar camera and sceneMs wording (S9.1c final review)
- **Perf:** measured — 2026-10-19: em Node (`npm run bench`), `overviewFit` de 8 páginas 1,6 µs e `lodNodes` de 1.500 nós 3,7 µs; no Chromium (e2e), ligar com 3 layouts 373 ms (orçamento 746), órbita de 3 páginas 17,6 ms (36), pior caso de 3.303 planos 99 ms, ~10 fps (198), órbita em `main` pesado ligado 19,5 contra 20,8 ms desligado (a visão geral desenha menor; `scene()` custa 1,05 ms desligado e 0,89 ms ligado por chamada). Desligado, nada muda.
  - [`c01430d`](https://github.com/brunomaida/Layers/commit/c01430dbcb051377b459882af84eb19300756374) test(e2e): cover shallow scanRoot ids (S9.1c Task 2)
  - [`a708593`](https://github.com/brunomaida/Layers/commit/a70859363a2c01bed70bf1d6dd4af67ed5972759) test(e2e): tighten scanRoot and buildMockDom assertions (S9.1c Task 3)
  - [`3ca6d01`](https://github.com/brunomaida/Layers/commit/3ca6d010b7798b912f7d90e2bf02c931024211e3) feat(ui): freeze other layouts as LOD snapshots for Espalhar (S9.1c Task 3)
  - [`103da9a`](https://github.com/brunomaida/Layers/commit/103da9a7f40faf31d8b7fb3983f200be63e5ab0e) test(e2e): harden Espalhar freeze and race tests (S9.1c Task 3)
  - [`0c03a4d`](https://github.com/brunomaida/Layers/commit/0c03a4d9a2a06f5ef6df3d9b02dfcc1aebec376f) feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)
  - [`0d6d987`](https://github.com/brunomaida/Layers/commit/0d6d9876a0ec891160c080b9d114090f4b7a2fd9) fix(ui): fit the Espalhar overview camera under perspective (S9.1c Task 4)
  - [`b8aed41`](https://github.com/brunomaida/Layers/commit/b8aed4131c1bd3c8cb9675d1a78055f84364ee41) test(e2e): cover overview fit at real page sizes and minors (S9.1c Task 4)
  - [`9e2d0ec`](https://github.com/brunomaida/Layers/commit/9e2d0ecd64489306fd23c437044188310482adc0) fix(ui): keep overview zoom 2D so far pages never cross the eye plane (S9.1c Task 4)
  - [`81fbc25`](https://github.com/brunomaida/Layers/commit/81fbc25f9f9c99ce12b9880be41f038badc15c9e) fix(core): solve the overview fit vertical shift (S9.1c Task 4)
  - [`29f10b6`](https://github.com/brunomaida/Layers/commit/29f10b65a48abc19c8ed5b34613589d934aa1ca9) test(e2e): cover overview zoom on every page (S9.1c Task 4)
  - [`1f5d521`](https://github.com/brunomaida/Layers/commit/1f5d521610802647ab8a7944e9264728c0e772cd) test(e2e): cover the Espalhar popover (S9.1c Task 5)
  - [`4fc0bfc`](https://github.com/brunomaida/Layers/commit/4fc0bfc795248dca055bc3799aae6a4e1f1d8a56) feat(ui): activate layouts from LOD planes (S9.1c Task 6)
  - [`0c0e202`](https://github.com/brunomaida/Layers/commit/0c0e20206d8172faba52ebe9bf922fda37ca6621) test(e2e): cover activation from LOD planes (S9.1c Task 6)
  - [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
  - [`aafd1a7`](https://github.com/brunomaida/Layers/commit/aafd1a7222a016aeda7b383bbca5babdf086ddca) test(e2e): cover the Espalhar camera and session (S9.1c Task 6)
  - [`e36bd74`](https://github.com/brunomaida/Layers/commit/e36bd744b297fd833515167ca780727603f28bcd) fix(ui): polish the Espalhar popover (S9.1c Task 6)
  - [`bd24c83`](https://github.com/brunomaida/Layers/commit/bd24c83e3790c4107e8dd0eb2a388faec2970c43) test(e2e): cover the Espalhar popover polish (S9.1c Task 6)
  - [`a6bc707`](https://github.com/brunomaida/Layers/commit/a6bc707ee48438bfbbf8e0a8c0f64a12a2ebece7) test(e2e): cover 1-N LOD activation and hover cleanup (S9.1c Task 6)
  - [`2348cab`](https://github.com/brunomaida/Layers/commit/2348cab3722a6aa6efa6be461ad642ef006f9e49) fix(ui): keep the stage when switching layouts in 1-N mode (S9.1c Task 6)
  - [`a7d7778`](https://github.com/brunomaida/Layers/commit/a7d777829e7cf1c0901f373df0ebebc0c28e4ea5) test(e2e): cover the chip path in 1-N mode (S9.1c Task 6)
  - [`772140f`](https://github.com/brunomaida/Layers/commit/772140f2c73bc16b201330ec790c99948f0c80f5) test(e2e): cover the Espalhar fix round (S9.1c Task 6)
  - [`37dece9`](https://github.com/brunomaida/Layers/commit/37dece9a11a7c0af45fe5bbc5075bccca5ead1fc) test(e2e): cover the overview camera on a first two-page switch (S9.1c Task 6)
  - [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
  - [`803f989`](https://github.com/brunomaida/Layers/commit/803f989518ecd251e033d659b0278c76a80815ea) test(e2e): cover the S9.1c final review fixes (S9.1c final review)

### Todos os commits

- [`4ca9f84`](https://github.com/brunomaida/Layers/commit/4ca9f8481bbc14c0fba2c5482fb4b6efc47b7a14) docs: register S9.1c leaf in the roadmap
- [`fff2ce3`](https://github.com/brunomaida/Layers/commit/fff2ce3a2b6b813db25e4e31540eb360d7ff2fd4) docs: add S9.1c Espalhar design spec
- [`2e8b083`](https://github.com/brunomaida/Layers/commit/2e8b08362f9507ea4f043b4b7a4d40074f3fad1f) docs: add S9.1c implementation plan and link it in the roadmap
- [`0b9709c`](https://github.com/brunomaida/Layers/commit/0b9709cdb0126089d1ceb9199121decd798d1658) docs: rebuild roadmap data and index for the S9.1c plan
- [`d68b58f`](https://github.com/brunomaida/Layers/commit/d68b58f605f4c04fcd069e4c1ca2f9dd5d3d4e53) feat(core): add spread layout helpers (S9.1c Task 1)
- [`3580e9e`](https://github.com/brunomaida/Layers/commit/3580e9e29662109c2ffc409fd437bf1226c99c9e) docs: register S9.1d leaf in the roadmap (S9.1c Task 1)
- [`bc8dba2`](https://github.com/brunomaida/Layers/commit/bc8dba2b9f2420af5f785d727c67d6c9a9a64f82) fix(core): keep spread cam in session entry and guard offsets (S9.1c Task 1)
- [`74a5e9d`](https://github.com/brunomaida/Layers/commit/74a5e9d858fd2983432735ce1f284b56467aa40f) refactor(ui): extract buildMockDom and scanRoot from loadProject (S9.1c Task 2)
- [`c01430d`](https://github.com/brunomaida/Layers/commit/c01430dbcb051377b459882af84eb19300756374) test(e2e): cover shallow scanRoot ids (S9.1c Task 2)
- [`6a24e2a`](https://github.com/brunomaida/Layers/commit/6a24e2aed02519ec6678100f22a631571a2888b7) fix(ui): keep loader mount and singleton writes in one tick (S9.1c Task 2)
- [`a708593`](https://github.com/brunomaida/Layers/commit/a70859363a2c01bed70bf1d6dd4af67ed5972759) test(e2e): tighten scanRoot and buildMockDom assertions (S9.1c Task 3)
- [`3ca6d01`](https://github.com/brunomaida/Layers/commit/3ca6d010b7798b912f7d90e2bf02c931024211e3) feat(ui): freeze other layouts as LOD snapshots for Espalhar (S9.1c Task 3)
- [`60803cc`](https://github.com/brunomaida/Layers/commit/60803cc80ad648631a69c5077df41ac4037d5957) fix(ui): clear frozen snapshots on every project entry and reset spread per project (S9.1c Task 3)
- [`103da9a`](https://github.com/brunomaida/Layers/commit/103da9a7f40faf31d8b7fb3983f200be63e5ab0e) test(e2e): harden Espalhar freeze and race tests (S9.1c Task 3)
- [`0c03a4d`](https://github.com/brunomaida/Layers/commit/0c03a4d9a2a06f5ef6df3d9b02dfcc1aebec376f) feat(ui): render spread layouts with LOD planes and overview camera (S9.1c Task 4)
- [`cd07034`](https://github.com/brunomaida/Layers/commit/cd0703441c39c68f9e764bf06da097fe26051883) test(perf): add Espalhar orbit measurement (S9.1c Task 4)
- [`0d6d987`](https://github.com/brunomaida/Layers/commit/0d6d9876a0ec891160c080b9d114090f4b7a2fd9) fix(ui): fit the Espalhar overview camera under perspective (S9.1c Task 4)
- [`b8aed41`](https://github.com/brunomaida/Layers/commit/b8aed4131c1bd3c8cb9675d1a78055f84364ee41) test(e2e): cover overview fit at real page sizes and minors (S9.1c Task 4)
- [`9e2d0ec`](https://github.com/brunomaida/Layers/commit/9e2d0ecd64489306fd23c437044188310482adc0) fix(ui): keep overview zoom 2D so far pages never cross the eye plane (S9.1c Task 4)
- [`81fbc25`](https://github.com/brunomaida/Layers/commit/81fbc25f9f9c99ce12b9880be41f038badc15c9e) fix(core): solve the overview fit vertical shift (S9.1c Task 4)
- [`29f10b6`](https://github.com/brunomaida/Layers/commit/29f10b65a48abc19c8ed5b34613589d934aa1ca9) test(e2e): cover overview zoom on every page (S9.1c Task 4)
- [`56b8d6b`](https://github.com/brunomaida/Layers/commit/56b8d6b60b33304992cb93e39b2163b3b5ffc136) feat(ui): add Espalhar button and popover with plane warning (S9.1c Task 5)
- [`1f5d521`](https://github.com/brunomaida/Layers/commit/1f5d521610802647ab8a7944e9264728c0e772cd) test(e2e): cover the Espalhar popover (S9.1c Task 5)
- [`4fc0bfc`](https://github.com/brunomaida/Layers/commit/4fc0bfc795248dca055bc3799aae6a4e1f1d8a56) feat(ui): activate layouts from LOD planes (S9.1c Task 6)
- [`0c0e202`](https://github.com/brunomaida/Layers/commit/0c0e20206d8172faba52ebe9bf922fda37ca6621) test(e2e): cover activation from LOD planes (S9.1c Task 6)
- [`ea9f1fc`](https://github.com/brunomaida/Layers/commit/ea9f1fcca7476792f125b9689425e53f0b564587) feat(ui): persist the Espalhar session and keep the normal camera (S9.1c Task 6)
- [`aafd1a7`](https://github.com/brunomaida/Layers/commit/aafd1a7222a016aeda7b383bbca5babdf086ddca) test(e2e): cover the Espalhar camera and session (S9.1c Task 6)
- [`e36bd74`](https://github.com/brunomaida/Layers/commit/e36bd744b297fd833515167ca780727603f28bcd) fix(ui): polish the Espalhar popover (S9.1c Task 6)
- [`bd24c83`](https://github.com/brunomaida/Layers/commit/bd24c83e3790c4107e8dd0eb2a388faec2970c43) test(e2e): cover the Espalhar popover polish (S9.1c Task 6)
- [`255a14f`](https://github.com/brunomaida/Layers/commit/255a14f9cca8d8e180df853f43f6f8a9f6ff21d4) fix(ui): keep the layout left behind on the stage after a 1-N LOD click (S9.1c Task 6)
- [`a6bc707`](https://github.com/brunomaida/Layers/commit/a6bc707ee48438bfbbf8e0a8c0f64a12a2ebece7) test(e2e): cover 1-N LOD activation and hover cleanup (S9.1c Task 6)
- [`2348cab`](https://github.com/brunomaida/Layers/commit/2348cab3722a6aa6efa6be461ad642ef006f9e49) fix(ui): keep the stage when switching layouts in 1-N mode (S9.1c Task 6)
- [`a7d7778`](https://github.com/brunomaida/Layers/commit/a7d777829e7cf1c0901f373df0ebebc0c28e4ea5) test(e2e): cover the chip path in 1-N mode (S9.1c Task 6)
- [`12656ec`](https://github.com/brunomaida/Layers/commit/12656ecf24689b4ace8bb0e7a5213dd093704008) fix(ui): keep per-layout cameras when toggling Espalhar (S9.1c Task 6)
- [`a0d111d`](https://github.com/brunomaida/Layers/commit/a0d111d59ca034f91dafca280def7d8fe200d443) fix(ui): prefer active planes over LOD planes under the pointer (S9.1c Task 6)
- [`772140f`](https://github.com/brunomaida/Layers/commit/772140f2c73bc16b201330ec790c99948f0c80f5) test(e2e): cover the Espalhar fix round (S9.1c Task 6)
- [`1773f6a`](https://github.com/brunomaida/Layers/commit/1773f6ab6267b0eb8691701dedf44f15f570231f) fix(ui): take the overview camera when a switch first draws two pages (S9.1c Task 6)
- [`37dece9`](https://github.com/brunomaida/Layers/commit/37dece9a11a7c0af45fe5bbc5075bccca5ead1fc) test(e2e): cover the overview camera on a first two-page switch (S9.1c Task 6)
- [`b771f1d`](https://github.com/brunomaida/Layers/commit/b771f1d9d387f96987657e7c4d8267207d7571d1) test(perf): measure Espalhar cost (S9.1c Task 7)
- [`f1733bc`](https://github.com/brunomaida/Layers/commit/f1733bc5340c911fb6d55fc7aecd860b74dee14a) test(perf): fix Espalhar budgets and record measures (S9.1c Task 7)
- [`54dabb6`](https://github.com/brunomaida/Layers/commit/54dabb69df7c4ca4882ee59e3dd7b2930c9a6685) docs: document Espalhar and close S9.1c (S9.1c Task 8)
- [`fe24231`](https://github.com/brunomaida/Layers/commit/fe2423102a375bf956a1caed8b9124a6c74d4a68) docs: mark S9.1c done and rebuild the roadmap (S9.1c Task 8)
- [`32decf1`](https://github.com/brunomaida/Layers/commit/32decf1b857fd405c412b59d3e2576ca570eddce) fix(ui): drop an Espalhar toggle made during another project's load (S9.1c final review)
- [`1c58393`](https://github.com/brunomaida/Layers/commit/1c58393725dabaacdb8bb9077df956385eeacaa1) fix(ui): restore the right camera when leaving Espalhar on another layout (S9.1c final review)
- [`6f0881d`](https://github.com/brunomaida/Layers/commit/6f0881d3e94ffb141da0c248cd5bb9ce58b347ab) fix(ui): keep fixture sessions free of Espalhar and clamp the overview pivot in state (S9.1c final review)
- [`aced259`](https://github.com/brunomaida/Layers/commit/aced25964e053c0db878158e87ad55d93e35a099) fix(ui): skip LOD hover when an active plane is in front (S9.1c final review)
- [`803f989`](https://github.com/brunomaida/Layers/commit/803f989518ecd251e033d659b0278c76a80815ea) test(e2e): cover the S9.1c final review fixes (S9.1c final review)
- [`20f8d9a`](https://github.com/brunomaida/Layers/commit/20f8d9ab13d59a709105a06b84bd1340a5236e3b) test(perf): state what the Espalhar drag comparison measures (S9.1c final review)
- [`8ee4aec`](https://github.com/brunomaida/Layers/commit/8ee4aec0b7cc40d32f0967c97df633b4de8f0759) docs: record the S9.1c final review fixes and the S9.1d perf follow-up (S9.1c final review)
- [`6c645be`](https://github.com/brunomaida/Layers/commit/6c645be272827a32e69a94a665978149b1eb4e4f) docs: fix residual Espalhar camera and sceneMs wording (S9.1c final review)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `64344da4` | 2026-10-18 17:13 | 25.19h | 1.0k | 571.3k | 127.63M | 1.75M |
| `agent-a6` | 2026-10-19 11:28 | 2.7m | 54 | 1.5k | 1.47M | 153.1k |
| `agent-ac` | 2026-10-19 11:31 | 2.9m | 32 | 103 | 505.6k | 64.5k |
| `agent-a7` | 2026-10-19 11:34 | 2.4m | 36 | 4.2k | 901.2k | 75.7k |
| `agent-a6` | 2026-10-19 11:38 | 16.5m | 116 | 10.2k | 4.75M | 197.4k |
| `agent-a2` | 2026-10-19 11:54 | 8.2m | 56 | 3.3k | 1.38M | 112.8k |
| `agent-a7` | 2026-10-19 12:03 | 6.8m | 54 | 394 | 1.84M | 170.1k |
| `agent-a5` | 2026-10-19 12:10 | 5.2m | 60 | 2.7k | 1.05M | 93.6k |
| `agent-ae` | 2026-10-19 12:16 | 17.2m | 126 | 3.3k | 6.95M | 217.5k |
| `agent-a9` | 2026-10-19 12:34 | 7.0m | 118 | 18.3k | 3.84M | 265.1k |
| `agent-a9` | 2026-10-19 12:41 | 17.0m | 96 | 4.0k | 4.16M | 161.4k |
| `agent-a4` | 2026-10-19 12:58 | 29.6m | 216 | 11.3k | 14.40M | 758.6k |
| `agent-a4` | 2026-10-19 13:28 | 13.1m | 98 | 1.5k | 3.34M | 214.4k |
| `agent-a7` | 2026-10-19 13:42 | 19.6m | 188 | 5.4k | 11.19M | 295.7k |
| `agent-a5` | 2026-10-19 14:02 | 10.7m | 120 | 8.1k | 4.30M | 189.8k |
| `agent-a8` | 2026-10-19 14:13 | 18.5m | 156 | 564 | 7.76M | 537.6k |
| `agent-ac` | 2026-10-19 14:32 | 28.6m | 204 | 4.3k | 12.63M | 621.7k |
| `agent-a1` | 2026-10-19 15:01 | 10.4m | 116 | 16.7k | 4.40M | 236.7k |
| `agent-a8` | 2026-10-19 15:13 | 49.2m | 292 | 5.5k | 27.05M | 1.25M |
| `agent-af` | 2026-10-19 16:02 | 17.2m | 152 | 30.0k | 7.91M | 301.2k |
| `agent-ac` | 2026-10-19 16:20 | 35.2m | 272 | 7.2k | 16.59M | 1.02M |
| `agent-a6` | 2026-10-19 16:56 | 4.7m | 94 | 3.6k | 4.43M | 223.6k |
| `agent-ab` | 2026-10-19 17:00 | 4.4m | 24 | 86 | 139.0k | 33.1k |
| `agent-a9` | 2026-10-19 17:09 | 14.8m | 226 | 4.6k | 19.40M | 429.2k |
| `agent-af` | 2026-10-19 17:24 | 24.1m | 194 | 24.1k | 10.82M | 385.2k |
| `agent-a7` | 2026-10-19 17:49 | 23.9m | 158 | 2.1k | 7.98M | 550.1k |
| `agent-a7` | 2026-10-19 18:13 | 9.6m | 146 | 16.1k | 6.43M | 245.6k |
| **Total (27)** | — | **31.85h** | **4.4k** | **760.3k** | **313.22M** | **10.55M** |
