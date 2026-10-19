# Implementation Report — s9-1b-cobertura-layouts

- **Branch:** `feature/261018-89-s9-1b-cobertura-layouts`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-18 17:29 → 2026-10-19 10:54
- **Status:** `final`
- **Gerado em:** 2026-10-19 10:56

## Resumo

Projetos ▾ › Analisar cobertura: varre o repositório sem rodar o app e abre um modal com a cobertura de Monovisual, Monovisual + states e Múltiplos layouts (`cob_reg · cob_el`, planos), a regra de decisão, a tabela de regiões e, com o veredito Múltiplos layouts, o trecho `layouts` com Copiar. Só leitura: nada é gravado e a carga do projeto não varre.

## Mudanças

### Added (13)

- `changelog.d/feature-261018-89-s9-1b-cobertura-layouts.md` (+14/-0, doc)
- `docs/design/ui-mock/boards/S91CoberturaModal.dc.html` (+322/-0, doc)
- `docs/superpowers/plans/2026-10-18-s9-1b-cobertura-modelo-painel.md` (+259/-0, doc)
- `docs/superpowers/specs/2026-10-18-s9-1b-modelo-de-cobertura-mono-design.md` (+114/-0, test)
- `e2e/autocreate.spec.js` (+96/-0, src)
- `e2e/coverage-modal.spec.js` (+254/-0, src)
- `e2e/coverage.spec.js` (+266/-0, src)
- `fixtures/coverage-multi/config.html` (+10/-0, other)
- `fixtures/coverage-multi/docs/page.html` (+5/-0, doc)
- `fixtures/coverage-multi/layers.json` (+6/-0, config)
- `fixtures/coverage-multi/main.html` (+16/-0, other)
- `fixtures/coverage-multi/replay.html` (+10/-0, other)
- `fixtures/coverage-multi/style.css` (+3/-0, other)

### Changed (18)

- `.claude/skills/layers-ui-mock/SKILL.md` (+1/-1, doc)
- `README.md` (+3/-0, doc)
- `bench/core.bench.js` (+6/-0, src)
- `bench/workloads.js` (+20/-1, src)
- `docs/ARCHITECTURE.md` (+93/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+5/-2, doc)
- `docs/_index.md` (+3/-2, doc)
- `docs/design/ui-mock/README.md` (+2/-0, doc)
- `docs/design/ui-mock/canvas.json` (+1/-1, doc)
- `docs/layers-json.md` (+4/-0, doc)
- `docs/roadmap.data.json` (+22/-4, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (+14/-0, test)
- `e2e/folder-helpers.js` (+6/-1, src)
- `e2e/perf.spec.js` (+36/-0, src)
- `index.html` (+264/-35, other)
- `lib/layers-core.js` (+437/-1, src)
- `test/layers-core.test.js` (+648/-0, test)

### Changelog fragment

**Added:**
- Projetos ▾ › Analisar cobertura: varre o repositório sem rodar o app e abre um modal com a cobertura de Monovisual, Monovisual + states e Múltiplos layouts (`cob_reg · cob_el`, planos), a regra de decisão, a tabela de regiões e, com o veredito Múltiplos layouts, o trecho `layouts` com Copiar. Só leitura: nada é gravado e a carga do projeto não varre.
- Pasta local e `.zip` são varridos; GitHub e fixture HTTP não listam arquivos e dão cobertura parcial. `.ts/.js` entram por regex com selo de confiança baixa.
- Core puro em `LayersCore`: `COVERAGE`, `coverageScope`, `cssHiddenSelectors`, `htmlRegions`, `scanScriptMarkers`, `coverageModel`, `coverageVerdict`, `suggestLayouts`; `collectProjectFiles` extraído do `autoCreateLayersJson`; fixture `coverage-multi`.

**Tests:**
- Vitest: regiões, escopo, modelo, veredito e sugestão. Playwright: `coverage` e `coverage-modal` (32 testes) e o orçamento da análise em `perf`.

**Perf:**
- measured — 2026-10-19: em Node (`npm run bench`), `coverageModel` sobre 1 HTML de 1.500 tags 2,3 ms e sobre 200 HTMLs 15,6 ms; no Chromium (e2e), `analyzeCoverage` com 200 HTMLs e 1.500 tags, mediana 218 ms contra orçamento de 616 ms (`Coverage_Analyze_CostsUnderBudget`). Só roda sob demanda; o orçamento da carga não muda.

## Arquivos tocados

### src (8)

- [`bench/core.bench.js`](../../../bench/core.bench.js) — M (+6/-0)
- [`bench/workloads.js`](../../../bench/workloads.js) — M (+20/-1)
- [`e2e/autocreate.spec.js`](../../../e2e/autocreate.spec.js) — A (+96/-0)
- [`e2e/coverage-modal.spec.js`](../../../e2e/coverage-modal.spec.js) — A (+254/-0)
- [`e2e/coverage.spec.js`](../../../e2e/coverage.spec.js) — A (+266/-0)
- [`e2e/folder-helpers.js`](../../../e2e/folder-helpers.js) — M (+6/-1)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+36/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+437/-1)

### test (3)

- [`docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`](../specs/2026-10-17-s3-5-s9-1-design-decisions.md) — M (+14/-0)
- [`docs/superpowers/specs/2026-10-18-s9-1b-modelo-de-cobertura-mono-design.md`](../specs/2026-10-18-s9-1b-modelo-de-cobertura-mono-design.md) — A (+114/-0)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+648/-0)

### doc (14)

- [`.claude/skills/layers-ui-mock/SKILL.md`](../../../.claude/skills/layers-ui-mock/SKILL.md) — M (+1/-1)
- [`README.md`](../../../README.md) — M (+3/-0)
- [`changelog.d/feature-261018-89-s9-1b-cobertura-layouts.md`](../../../changelog.d/feature-261018-89-s9-1b-cobertura-layouts.md) — A (+14/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+93/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+5/-2)
- [`docs/_index.md`](../../_index.md) — M (+3/-2)
- [`docs/design/ui-mock/README.md`](../../design/ui-mock/README.md) — M (+2/-0)
- [`docs/design/ui-mock/boards/S91CoberturaModal.dc.html`](../../design/ui-mock/boards/S91CoberturaModal.dc.html) — A (+322/-0)
- [`docs/design/ui-mock/canvas.json`](../../design/ui-mock/canvas.json) — M (+1/-1)
- [`docs/layers-json.md`](../../layers-json.md) — M (+4/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+22/-4)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-18-s9-1b-cobertura-modelo-painel.md`](../plans/2026-10-18-s9-1b-cobertura-modelo-painel.md) — A (+259/-0)
- [`fixtures/coverage-multi/docs/page.html`](../../../fixtures/coverage-multi/docs/page.html) — A (+5/-0)

### config (1)

- [`fixtures/coverage-multi/layers.json`](../../../fixtures/coverage-multi/layers.json) — A (+6/-0)

### other (5)

- [`fixtures/coverage-multi/config.html`](../../../fixtures/coverage-multi/config.html) — A (+10/-0)
- [`fixtures/coverage-multi/main.html`](../../../fixtures/coverage-multi/main.html) — A (+16/-0)
- [`fixtures/coverage-multi/replay.html`](../../../fixtures/coverage-multi/replay.html) — A (+10/-0)
- [`fixtures/coverage-multi/style.css`](../../../fixtures/coverage-multi/style.css) — A (+3/-0)
- [`index.html`](../../../index.html) — M (+264/-35)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Projetos ▾ › Analisar cobertura: varre o repositório sem rodar o app e abre um modal com a cobertura de Monovisual, Monovisual + states e Múltiplos layouts (`cob_reg · cob_el`, planos), a regra de decisão, a tabela de regiões e, com o veredito Múltiplos layouts, o trecho `layouts` com Copiar. Só leitura: nada é gravado e a carga do projeto não varre.
  - [`4d690c8`](https://github.com/brunomaida/Layers/commit/4d690c81f8a372d93d6bde16e3531807b16b33be) docs: add S9.1b coverage modal board (S9.1b Task 1)
  - [`ec93005`](https://github.com/brunomaida/Layers/commit/ec93005a67b2314aee72596a63b041cd3b2c1079) feat(ui): add coverage modal to the Projetos menu (S9.1b Task 5)
  - [`b11e774`](https://github.com/brunomaida/Layers/commit/b11e7746bdd8ad95e96bd2249c68c22a73834d51) test(e2e): cover the coverage modal (S9.1b Task 5)
  - [`3751147`](https://github.com/brunomaida/Layers/commit/37511475edcf3de074f667c61d7027dd518a4597) test(e2e): cover coverage modal error, rules 0/2/4 and copy (S9.1b Task 6)
  - [`a8d008d`](https://github.com/brunomaida/Layers/commit/a8d008dd03031e96f5f59a7ea6c00e4714cbb64a) fix(ui): make the layouts snippet safe to paste and hide it when it adds nothing (S9.1b final review)
  - [`a1c28a8`](https://github.com/brunomaida/Layers/commit/a1c28a8b6a92b06d182aec7892addb0b0996580d) docs: describe the paste-safe layouts snippet (S9.1b final review)
  - [`701fc01`](https://github.com/brunomaida/Layers/commit/701fc01914fd3ecb6a9b68e72db9ca27eb4d704d) fix(core): emit implicit main for states-only manifests and reserve invalid declared ids (S9.1b final review)
- **Added:** Pasta local e `.zip` são varridos; GitHub e fixture HTTP não listam arquivos e dão cobertura parcial. `.ts/.js` entram por regex com selo de confiança baixa.
  - [`ec93005`](https://github.com/brunomaida/Layers/commit/ec93005a67b2314aee72596a63b041cd3b2c1079) feat(ui): add coverage modal to the Projetos menu (S9.1b Task 5)
  - [`5ac65ad`](https://github.com/brunomaida/Layers/commit/5ac65ad113956d02711ec52def02d8c0f7db96be) test(e2e): cover coverage analysis flows (S9.1b Task 6)
  - [`f33ee0e`](https://github.com/brunomaida/Layers/commit/f33ee0ee6d314e9c8b8cb0b95e40fe6034a01d5b) docs: sync coverage limits with F1 styles read, zip cap gap and quadratic/joinPath notes (S9.1b final review)
- **Added:** Core puro em `LayersCore`: `COVERAGE`, `coverageScope`, `cssHiddenSelectors`, `htmlRegions`, `scanScriptMarkers`, `coverageModel`, `coverageVerdict`, `suggestLayouts`; `collectProjectFiles` extraído do `autoCreateLayersJson`; fixture `coverage-multi`.
  - [`995cadd`](https://github.com/brunomaida/Layers/commit/995caddba6af6d5acea093d834364baadcd2582d) docs: add S9.1b coverage model design spec
  - [`07e1ac4`](https://github.com/brunomaida/Layers/commit/07e1ac4313d89afc185b55ce36f597d835b240a7) feat(core): add coverage region detection (S9.1b Task 2)
  - [`acbe7d7`](https://github.com/brunomaida/Layers/commit/acbe7d78408890a86e3ec767066b932818951962) fix(core): harden coverage region detection (S9.1b Task 2)
  - [`4d690c8`](https://github.com/brunomaida/Layers/commit/4d690c81f8a372d93d6bde16e3531807b16b33be) docs: add S9.1b coverage modal board (S9.1b Task 1)
  - [`64f823d`](https://github.com/brunomaida/Layers/commit/64f823d589709a003ec3ba1718361f4b958f2860) feat(core): add coverage model, verdict and layout suggestion (S9.1b Task 3)
  - [`0c76ba0`](https://github.com/brunomaida/Layers/commit/0c76ba0f70cce397278249246aba67043fa96e19) fix(core): correct suggestion ids, layout dedupe and tela merge (S9.1b Task 3)
  - [`05cf3c3`](https://github.com/brunomaida/Layers/commit/05cf3c305d8caaa2dc49f0ad98dcc2fa6efeb4e1) test(e2e): characterize autoCreateLayersJson (S9.1b Task 4)
  - [`22e150c`](https://github.com/brunomaida/Layers/commit/22e150c7adf26904038105a7772febd8bf1ee15a) fix(ui): normalize coverage base like the loader (S9.1b Task 4)
  - [`ec93005`](https://github.com/brunomaida/Layers/commit/ec93005a67b2314aee72596a63b041cd3b2c1079) feat(ui): add coverage modal to the Projetos menu (S9.1b Task 5)
  - [`b11e774`](https://github.com/brunomaida/Layers/commit/b11e7746bdd8ad95e96bd2249c68c22a73834d51) test(e2e): cover the coverage modal (S9.1b Task 5)
  - [`5094461`](https://github.com/brunomaida/Layers/commit/50944613288990ab5b90d2ab022a3a32f6e8b3eb) fix(ui): keep coverage verdict copy consistent with the strict rule (S9.1b Task 6)
  - [`3751147`](https://github.com/brunomaida/Layers/commit/37511475edcf3de074f667c61d7027dd518a4597) test(e2e): cover coverage modal error, rules 0/2/4 and copy (S9.1b Task 6)
  - [`5ac65ad`](https://github.com/brunomaida/Layers/commit/5ac65ad113956d02711ec52def02d8c0f7db96be) test(e2e): cover coverage analysis flows (S9.1b Task 6)
  - [`cfc727a`](https://github.com/brunomaida/Layers/commit/cfc727a94f88d902ce1df4c451d3652de590bedd) test(perf): add coverage analysis benches and budget test (S9.1b Task 7)
  - [`c7822fe`](https://github.com/brunomaida/Layers/commit/c7822fef0aea80d180bb0332a0abce5a8a378410) refactor(ui): stop allocating coverage template data on every render (S9.1b Task 7)
  - [`7d6ec22`](https://github.com/brunomaida/Layers/commit/7d6ec229187f1849d3550f0511d597ff31f620e1) test(e2e): tighten coverage spec assertions (S9.1b Task 7)
  - [`31fecdf`](https://github.com/brunomaida/Layers/commit/31fecdfffb024502c81e7492c12ca877d38917ca) test(perf): set coverage analysis budget and record measures (S9.1b Task 7)
  - [`81680e1`](https://github.com/brunomaida/Layers/commit/81680e18ac9a3725c84bda077eee93617496d416) docs: document coverage analysis and close S9.1b (S9.1b Task 8)
  - [`ff43e5a`](https://github.com/brunomaida/Layers/commit/ff43e5ad8071cda117caaf53f16e2bd893dd9bd8) fix(core): ignore unmatched closing tags in constant time (S9.1b final review)
  - [`29b9bf2`](https://github.com/brunomaida/Layers/commit/29b9bf2ef96a54d737f62410d47209f856bafaeb) fix(core): look up screens by path and token index in coverageModel (S9.1b final review)
  - [`1577648`](https://github.com/brunomaida/Layers/commit/1577648e291d2446802d12d44c6f144770639f17) fix(ui): flag the coverage scan as partial when a file exceeds its own cap (S9.1b final review)
  - [`9ced7f1`](https://github.com/brunomaida/Layers/commit/9ced7f1d9c7742410b1e8a97529fc0b392ed25c5) docs: name the per-file caps in coverage limit 7 (S9.1b final review)
  - [`39ffff2`](https://github.com/brunomaida/Layers/commit/39ffff2f6f34846ac5c564cdde797a80a7f4dbc0) docs: fix perf labels and recount coverage tests (S9.1b final review)
  - [`701fc01`](https://github.com/brunomaida/Layers/commit/701fc01914fd3ecb6a9b68e72db9ca27eb4d704d) fix(core): emit implicit main for states-only manifests and reserve invalid declared ids (S9.1b final review)
  - [`f33ee0e`](https://github.com/brunomaida/Layers/commit/f33ee0ee6d314e9c8b8cb0b95e40fe6034a01d5b) docs: sync coverage limits with F1 styles read, zip cap gap and quadratic/joinPath notes (S9.1b final review)
- **Tests:** Vitest: regiões, escopo, modelo, veredito e sugestão. Playwright: `coverage` e `coverage-modal` (32 testes) e o orçamento da análise em `perf`.
  - [`995cadd`](https://github.com/brunomaida/Layers/commit/995caddba6af6d5acea093d834364baadcd2582d) docs: add S9.1b coverage model design spec
  - [`07e1ac4`](https://github.com/brunomaida/Layers/commit/07e1ac4313d89afc185b55ce36f597d835b240a7) feat(core): add coverage region detection (S9.1b Task 2)
  - [`acbe7d7`](https://github.com/brunomaida/Layers/commit/acbe7d78408890a86e3ec767066b932818951962) fix(core): harden coverage region detection (S9.1b Task 2)
  - [`4d690c8`](https://github.com/brunomaida/Layers/commit/4d690c81f8a372d93d6bde16e3531807b16b33be) docs: add S9.1b coverage modal board (S9.1b Task 1)
  - [`64f823d`](https://github.com/brunomaida/Layers/commit/64f823d589709a003ec3ba1718361f4b958f2860) feat(core): add coverage model, verdict and layout suggestion (S9.1b Task 3)
  - [`22e150c`](https://github.com/brunomaida/Layers/commit/22e150c7adf26904038105a7772febd8bf1ee15a) fix(ui): normalize coverage base like the loader (S9.1b Task 4)
  - [`ec93005`](https://github.com/brunomaida/Layers/commit/ec93005a67b2314aee72596a63b041cd3b2c1079) feat(ui): add coverage modal to the Projetos menu (S9.1b Task 5)
  - [`b11e774`](https://github.com/brunomaida/Layers/commit/b11e7746bdd8ad95e96bd2249c68c22a73834d51) test(e2e): cover the coverage modal (S9.1b Task 5)
  - [`5094461`](https://github.com/brunomaida/Layers/commit/50944613288990ab5b90d2ab022a3a32f6e8b3eb) fix(ui): keep coverage verdict copy consistent with the strict rule (S9.1b Task 6)
  - [`3751147`](https://github.com/brunomaida/Layers/commit/37511475edcf3de074f667c61d7027dd518a4597) test(e2e): cover coverage modal error, rules 0/2/4 and copy (S9.1b Task 6)
  - [`5ac65ad`](https://github.com/brunomaida/Layers/commit/5ac65ad113956d02711ec52def02d8c0f7db96be) test(e2e): cover coverage analysis flows (S9.1b Task 6)
  - [`cfc727a`](https://github.com/brunomaida/Layers/commit/cfc727a94f88d902ce1df4c451d3652de590bedd) test(perf): add coverage analysis benches and budget test (S9.1b Task 7)
  - [`c7822fe`](https://github.com/brunomaida/Layers/commit/c7822fef0aea80d180bb0332a0abce5a8a378410) refactor(ui): stop allocating coverage template data on every render (S9.1b Task 7)
  - [`7d6ec22`](https://github.com/brunomaida/Layers/commit/7d6ec229187f1849d3550f0511d597ff31f620e1) test(e2e): tighten coverage spec assertions (S9.1b Task 7)
  - [`31fecdf`](https://github.com/brunomaida/Layers/commit/31fecdfffb024502c81e7492c12ca877d38917ca) test(perf): set coverage analysis budget and record measures (S9.1b Task 7)
  - [`81680e1`](https://github.com/brunomaida/Layers/commit/81680e18ac9a3725c84bda077eee93617496d416) docs: document coverage analysis and close S9.1b (S9.1b Task 8)
  - [`1577648`](https://github.com/brunomaida/Layers/commit/1577648e291d2446802d12d44c6f144770639f17) fix(ui): flag the coverage scan as partial when a file exceeds its own cap (S9.1b final review)
  - [`9ced7f1`](https://github.com/brunomaida/Layers/commit/9ced7f1d9c7742410b1e8a97529fc0b392ed25c5) docs: name the per-file caps in coverage limit 7 (S9.1b final review)
  - [`39ffff2`](https://github.com/brunomaida/Layers/commit/39ffff2f6f34846ac5c564cdde797a80a7f4dbc0) docs: fix perf labels and recount coverage tests (S9.1b final review)
  - [`f33ee0e`](https://github.com/brunomaida/Layers/commit/f33ee0ee6d314e9c8b8cb0b95e40fe6034a01d5b) docs: sync coverage limits with F1 styles read, zip cap gap and quadratic/joinPath notes (S9.1b final review)
- **Perf:** measured — 2026-10-19: em Node (`npm run bench`), `coverageModel` sobre 1 HTML de 1.500 tags 2,3 ms e sobre 200 HTMLs 15,6 ms; no Chromium (e2e), `analyzeCoverage` com 200 HTMLs e 1.500 tags, mediana 218 ms contra orçamento de 616 ms (`Coverage_Analyze_CostsUnderBudget`). Só roda sob demanda; o orçamento da carga não muda.
  - [`05cf3c3`](https://github.com/brunomaida/Layers/commit/05cf3c305d8caaa2dc49f0ad98dcc2fa6efeb4e1) test(e2e): characterize autoCreateLayersJson (S9.1b Task 4)
  - [`226dd19`](https://github.com/brunomaida/Layers/commit/226dd19377f0a2d5fcfe05b5c744bbe032db8ad7) feat(ui): add project file collection and analyzeCoverage (S9.1b Task 4)
  - [`e7168ec`](https://github.com/brunomaida/Layers/commit/e7168ec8e9ba92d3750d93770bbdcefbb6ea78c8) fix(ui): honor base, default mock and load guard in analyzeCoverage (S9.1b Task 4)
  - [`b11e774`](https://github.com/brunomaida/Layers/commit/b11e7746bdd8ad95e96bd2249c68c22a73834d51) test(e2e): cover the coverage modal (S9.1b Task 5)
  - [`3751147`](https://github.com/brunomaida/Layers/commit/37511475edcf3de074f667c61d7027dd518a4597) test(e2e): cover coverage modal error, rules 0/2/4 and copy (S9.1b Task 6)
  - [`5ac65ad`](https://github.com/brunomaida/Layers/commit/5ac65ad113956d02711ec52def02d8c0f7db96be) test(e2e): cover coverage analysis flows (S9.1b Task 6)
  - [`7d6ec22`](https://github.com/brunomaida/Layers/commit/7d6ec229187f1849d3550f0511d597ff31f620e1) test(e2e): tighten coverage spec assertions (S9.1b Task 7)
  - [`ff43e5a`](https://github.com/brunomaida/Layers/commit/ff43e5ad8071cda117caaf53f16e2bd893dd9bd8) fix(core): ignore unmatched closing tags in constant time (S9.1b final review)
  - [`29b9bf2`](https://github.com/brunomaida/Layers/commit/29b9bf2ef96a54d737f62410d47209f856bafaeb) fix(core): look up screens by path and token index in coverageModel (S9.1b final review)

### Todos os commits

- [`640bdde`](https://github.com/brunomaida/Layers/commit/640bddea18ba11902b6d87c7d49d265c10582c11) docs: open S9.1b leaf in the roadmap (#89)
- [`995cadd`](https://github.com/brunomaida/Layers/commit/995caddba6af6d5acea093d834364baadcd2582d) docs: add S9.1b coverage model design spec
- [`0f30f5c`](https://github.com/brunomaida/Layers/commit/0f30f5c414dcae92683a29e5c6413080c197a7d7) docs: add S9.1b implementation plan and link it in the roadmap
- [`07e1ac4`](https://github.com/brunomaida/Layers/commit/07e1ac4313d89afc185b55ce36f597d835b240a7) feat(core): add coverage region detection (S9.1b Task 2)
- [`acbe7d7`](https://github.com/brunomaida/Layers/commit/acbe7d78408890a86e3ec767066b932818951962) fix(core): harden coverage region detection (S9.1b Task 2)
- [`4d690c8`](https://github.com/brunomaida/Layers/commit/4d690c81f8a372d93d6bde16e3531807b16b33be) docs: add S9.1b coverage modal board (S9.1b Task 1)
- [`64f823d`](https://github.com/brunomaida/Layers/commit/64f823d589709a003ec3ba1718361f4b958f2860) feat(core): add coverage model, verdict and layout suggestion (S9.1b Task 3)
- [`0c76ba0`](https://github.com/brunomaida/Layers/commit/0c76ba0f70cce397278249246aba67043fa96e19) fix(core): correct suggestion ids, layout dedupe and tela merge (S9.1b Task 3)
- [`05cf3c3`](https://github.com/brunomaida/Layers/commit/05cf3c305d8caaa2dc49f0ad98dcc2fa6efeb4e1) test(e2e): characterize autoCreateLayersJson (S9.1b Task 4)
- [`226dd19`](https://github.com/brunomaida/Layers/commit/226dd19377f0a2d5fcfe05b5c744bbe032db8ad7) feat(ui): add project file collection and analyzeCoverage (S9.1b Task 4)
- [`e7168ec`](https://github.com/brunomaida/Layers/commit/e7168ec8e9ba92d3750d93770bbdcefbb6ea78c8) fix(ui): honor base, default mock and load guard in analyzeCoverage (S9.1b Task 4)
- [`22e150c`](https://github.com/brunomaida/Layers/commit/22e150c7adf26904038105a7772febd8bf1ee15a) fix(ui): normalize coverage base like the loader (S9.1b Task 4)
- [`ec93005`](https://github.com/brunomaida/Layers/commit/ec93005a67b2314aee72596a63b041cd3b2c1079) feat(ui): add coverage modal to the Projetos menu (S9.1b Task 5)
- [`b11e774`](https://github.com/brunomaida/Layers/commit/b11e7746bdd8ad95e96bd2249c68c22a73834d51) test(e2e): cover the coverage modal (S9.1b Task 5)
- [`5094461`](https://github.com/brunomaida/Layers/commit/50944613288990ab5b90d2ab022a3a32f6e8b3eb) fix(ui): keep coverage verdict copy consistent with the strict rule (S9.1b Task 6)
- [`3751147`](https://github.com/brunomaida/Layers/commit/37511475edcf3de074f667c61d7027dd518a4597) test(e2e): cover coverage modal error, rules 0/2/4 and copy (S9.1b Task 6)
- [`5ac65ad`](https://github.com/brunomaida/Layers/commit/5ac65ad113956d02711ec52def02d8c0f7db96be) test(e2e): cover coverage analysis flows (S9.1b Task 6)
- [`cfc727a`](https://github.com/brunomaida/Layers/commit/cfc727a94f88d902ce1df4c451d3652de590bedd) test(perf): add coverage analysis benches and budget test (S9.1b Task 7)
- [`c7822fe`](https://github.com/brunomaida/Layers/commit/c7822fef0aea80d180bb0332a0abce5a8a378410) refactor(ui): stop allocating coverage template data on every render (S9.1b Task 7)
- [`7d6ec22`](https://github.com/brunomaida/Layers/commit/7d6ec229187f1849d3550f0511d597ff31f620e1) test(e2e): tighten coverage spec assertions (S9.1b Task 7)
- [`64f9249`](https://github.com/brunomaida/Layers/commit/64f924988a474e01e3c899f4d587c7ad27555214) fix(ui): make the scan-cap warning accurate for every cap (S9.1b Task 7)
- [`31fecdf`](https://github.com/brunomaida/Layers/commit/31fecdfffb024502c81e7492c12ca877d38917ca) test(perf): set coverage analysis budget and record measures (S9.1b Task 7)
- [`81680e1`](https://github.com/brunomaida/Layers/commit/81680e18ac9a3725c84bda077eee93617496d416) docs: document coverage analysis and close S9.1b (S9.1b Task 8)
- [`58d683a`](https://github.com/brunomaida/Layers/commit/58d683a24f736dce95e1c0b571c94a252e28a26e) docs: mark S9.1b done and rebuild the roadmap (S9.1b Task 8)
- [`70f47ab`](https://github.com/brunomaida/Layers/commit/70f47aba37904757c5129e41352a950dd747ea3c) fix(ui): analyze the declared mocks when the project has no file listing (S9.1b final review)
- [`ff43e5a`](https://github.com/brunomaida/Layers/commit/ff43e5ad8071cda117caaf53f16e2bd893dd9bd8) fix(core): ignore unmatched closing tags in constant time (S9.1b final review)
- [`29b9bf2`](https://github.com/brunomaida/Layers/commit/29b9bf2ef96a54d737f62410d47209f856bafaeb) fix(core): look up screens by path and token index in coverageModel (S9.1b final review)
- [`a8d008d`](https://github.com/brunomaida/Layers/commit/a8d008dd03031e96f5f59a7ea6c00e4714cbb64a) fix(ui): make the layouts snippet safe to paste and hide it when it adds nothing (S9.1b final review)
- [`a1c28a8`](https://github.com/brunomaida/Layers/commit/a1c28a8b6a92b06d182aec7892addb0b0996580d) docs: describe the paste-safe layouts snippet (S9.1b final review)
- [`1577648`](https://github.com/brunomaida/Layers/commit/1577648e291d2446802d12d44c6f144770639f17) fix(ui): flag the coverage scan as partial when a file exceeds its own cap (S9.1b final review)
- [`9ced7f1`](https://github.com/brunomaida/Layers/commit/9ced7f1d9c7742410b1e8a97529fc0b392ed25c5) docs: name the per-file caps in coverage limit 7 (S9.1b final review)
- [`39ffff2`](https://github.com/brunomaida/Layers/commit/39ffff2f6f34846ac5c564cdde797a80a7f4dbc0) docs: fix perf labels and recount coverage tests (S9.1b final review)
- [`701fc01`](https://github.com/brunomaida/Layers/commit/701fc01914fd3ecb6a9b68e72db9ca27eb4d704d) fix(core): emit implicit main for states-only manifests and reserve invalid declared ids (S9.1b final review)
- [`f33ee0e`](https://github.com/brunomaida/Layers/commit/f33ee0ee6d314e9c8b8cb0b95e40fe6034a01d5b) docs: sync coverage limits with F1 styles read, zip cap gap and quadratic/joinPath notes (S9.1b final review)
- [`8528941`](https://github.com/brunomaida/Layers/commit/85289413eeccf7bf04cd2845597e02b1053a6793) docs: fix stale COVERAGE_BUDGET_MS comment (S9.1b final review)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `64344da4` | 2026-10-18 17:13 | 17.71h | 590 | 354.7k | 62.08M | 1.12M |
| `agent-ac` | 2026-10-18 17:32 | 1.4m | 10 | 7.0k | 209.8k | 92.7k |
| `agent-aa` | 2026-10-18 17:39 | 15.1m | 178 | 23.2k | 10.75M | 481.7k |
| `agent-a1` | 2026-10-18 17:39 | 13.4m | 92 | 6.0k | 2.83M | 379.3k |
| `agent-a0` | 2026-10-18 17:43 | 6.6m | 56 | 14.6k | 1.04M | 176.7k |
| `agent-a3` | 2026-10-18 17:53 | 2.7m | 24 | 548 | 309.6k | 45.1k |
| `agent-ae` | 2026-10-18 17:56 | 17.9m | 108 | 13.0k | 4.42M | 428.4k |
| `agent-a8` | 2026-10-18 18:04 | 8.4m | 80 | 10.6k | 1.89M | 198.0k |
| `agent-a0` | 2026-10-18 18:15 | 2.9m | 38 | 615 | 608.1k | 89.3k |
| `agent-ab` | 2026-10-18 18:18 | 28.6m | 184 | 8.6k | 8.00M | 540.8k |
| `agent-a1` | 2026-10-18 18:30 | 6.1m | 90 | 14.4k | 2.43M | 199.1k |
| `agent-a6` | 2026-10-18 18:40 | 3.9m | 58 | 428 | 984.8k | 82.6k |
| `agent-a8` | 2026-10-18 18:47 | 1.3m | 36 | 4.1k | 419.1k | 66.8k |
| `agent-ab` | 2026-10-19 08:57 | 18.6m | 168 | 21.4k | 10.49M | 382.6k |
| `agent-a7` | 2026-10-19 09:16 | 6.3m | 88 | 13.4k | 3.32M | 212.9k |
| `agent-a4` | 2026-10-19 09:22 | 10.7m | 106 | 8.0k | 4.51M | 278.4k |
| `agent-a7` | 2026-10-19 09:33 | 7.9m | 116 | 19.5k | 2.93M | 162.9k |
| `agent-a0` | 2026-10-19 09:41 | 10.9m | 194 | 9.7k | 9.62M | 352.8k |
| `agent-a8` | 2026-10-19 09:52 | 3.9m | 30 | 5.0k | 169.3k | 47.6k |
| `agent-a5` | 2026-10-19 10:00 | 7.2m | 132 | 3.5k | 8.67M | 462.3k |
| `agent-a0` | 2026-10-19 10:08 | 12.4m | 136 | 8.4k | 8.01M | 334.7k |
| `agent-a4` | 2026-10-19 10:21 | 21.9m | 222 | 4.1k | 13.00M | 366.3k |
| `agent-ab` | 2026-10-19 10:43 | 8.6m | 142 | 6.5k | 5.75M | 300.6k |
| `agent-af` | 2026-10-19 10:52 | 3.4m | 50 | 1.3k | 1.41M | 152.3k |
| **Total (24)** | — | **21.37h** | **2.9k** | **558.4k** | **163.86M** | **6.96M** |
