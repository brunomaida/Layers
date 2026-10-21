# Implementation Report — s9-1e-varredura-final

- **Branch:** `feature/261020-95-s9-1e-varredura-final`
- **Range:** `34e83efe27c6..HEAD`
- **Período:** 2026-10-20 15:10 → 2026-10-20 22:49
- **Status:** `final`
- **Gerado em:** 2026-10-20 22:49

## Resumo

Aprovar e Descartar só aparecem depois que o rascunho paralelo foi gravado, e agem só em rascunhos que a execução atual gravou; um rascunho editado à mão que a execução atual não gravou nunca é promovido nem apagado, e fechar e reabrir o modal no meio da gravação não deixa rascunho órfão.

## Mudanças

### Added (2)

- `changelog.d/feature-261020-95-s9-1e-varredura-final.md` (+18/-0, doc)
- `docs/superpowers/plans/2026-10-20-s9-1e-varredura-final-da-s9.md` (+130/-0, doc)

### Changed (18)

- `.gitignore` (+1/-0, other)
- `README.md` (+2/-2, doc)
- `docs/ARCHITECTURE.md` (+56/-14, doc)
- `docs/RELEASE-CHECKLIST.md` (+20/-5, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+45/-7, doc)
- `docs/roadmap.md` (+3/-2, doc)
- `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (+3/-3, test)
- `e2e/apply-flow.spec.js` (+323/-0, src)
- `e2e/autocreate.spec.js` (+15/-26, src)
- `e2e/coverage-modal.spec.js` (+52/-24, src)
- `e2e/coverage.spec.js` (+71/-25, src)
- `e2e/folder-helpers.js` (+38/-2, src)
- `e2e/scope-all-equal.spec.js` (+20/-0, src)
- `e2e/spread.spec.js` (+52/-0, src)
- `index.html` (+80/-40, other)
- `lib/layers-core.js` (+16/-1, src)
- `test/layers-core.test.js` (+51/-0, test)

### Changelog fragment

**Fixed:**
- Aprovar e Descartar só aparecem depois que o rascunho paralelo foi gravado, e agem só em rascunhos que a execução atual gravou; um rascunho editado à mão que a execução atual não gravou nunca é promovido nem apagado, e fechar e reabrir o modal no meio da gravação não deixa rascunho órfão.
- Cobertura: o 2º clique em Analisar cobertura não dispara outra varredura, o aviso `projeto ainda carregando` some quando a carga termina e, com o modal aberto, as teclas de câmera e `?` não agem por baixo. O prompt de escopo flutuante não prende mais o teclado.
- Projeto com 2+ layouts: o badge de Salvar, Ver diff e Exportar contam as pendências de todos os layouts, e os retratos LOD do Espalhar são relidos depois de Aplicar e Reverter.
- Um `/` inicial ou `..` no caminho do mock resolvem igual na Cobertura e no loader (`LayersCore.normalizePath`); um `\` no `base` do `layers.json` é normalizado só na Cobertura (limite 10 parcial).

**Changed:**
- Limites fechados ficam marcados Fechado no ARCHITECTURE; os aceitos do ciclo do rascunho entram numerados. Decisões abertas da S9.1 fechadas (regra 4 da Cobertura, chip ativo, aviso de varredura parcial).

**Tests:**
- Vitest: 694 testes (7 novos). Playwright, um spec por vez: `apply-flow` 108, `spread` 119, `layouts` 65, `coverage` 22, `coverage-modal` 19, `autocreate` 7, `scope-all-equal` 9, `undo-redo` 8, `dc-write` 4, `stale-banner` 4. Varredura manual em fixture: 17 ok, 0 bug, 7 pendentes de pasta conectada (RELEASE-CHECKLIST § C).

**Perf:**
- N/A — correções de fluxo e de teclas sem mudança na cena nem no orbit; `perf.spec` não rodou e o custo medido na S9.1d vale.

## Arquivos tocados

### src (8)

- [`e2e/apply-flow.spec.js`](../../../e2e/apply-flow.spec.js) — M (+323/-0)
- [`e2e/autocreate.spec.js`](../../../e2e/autocreate.spec.js) — M (+15/-26)
- [`e2e/coverage-modal.spec.js`](../../../e2e/coverage-modal.spec.js) — M (+52/-24)
- [`e2e/coverage.spec.js`](../../../e2e/coverage.spec.js) — M (+71/-25)
- [`e2e/folder-helpers.js`](../../../e2e/folder-helpers.js) — M (+38/-2)
- [`e2e/scope-all-equal.spec.js`](../../../e2e/scope-all-equal.spec.js) — M (+20/-0)
- [`e2e/spread.spec.js`](../../../e2e/spread.spec.js) — M (+52/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+16/-1)

### test (2)

- [`docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`](../specs/2026-10-17-s3-5-s9-1-design-decisions.md) — M (+3/-3)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+51/-0)

### doc (8)

- [`README.md`](../../../README.md) — M (+2/-2)
- [`changelog.d/feature-261020-95-s9-1e-varredura-final.md`](../../../changelog.d/feature-261020-95-s9-1e-varredura-final.md) — A (+18/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+56/-14)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+20/-5)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+45/-7)
- [`docs/roadmap.md`](../../roadmap.md) — M (+3/-2)
- [`docs/superpowers/plans/2026-10-20-s9-1e-varredura-final-da-s9.md`](../plans/2026-10-20-s9-1e-varredura-final-da-s9.md) — A (+130/-0)

### other (2)

- [`.gitignore`](../../../.gitignore) — M (+1/-0)
- [`index.html`](../../../index.html) — M (+80/-40)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Fixed:** Aprovar e Descartar só aparecem depois que o rascunho paralelo foi gravado, e agem só em rascunhos que a execução atual gravou; um rascunho editado à mão que a execução atual não gravou nunca é promovido nem apagado, e fechar e reabrir o modal no meio da gravação não deixa rascunho órfão.
  - [`bf3c1ee`](https://github.com/brunomaida/Layers/commit/bf3c1ee432a772ee49440d0cf57cbff411d7a92c) fix(ui): block approve while drafting and harden the coverage modal (S9.1e Task 2)
  - [`de3f221`](https://github.com/brunomaida/Layers/commit/de3f2216d84a84298edc71a9143ac66b89f8c3bd) fix(ui): close the drafting race gaps and keep keys under the scope prompt (S9.1e Task 2)
  - [`fd2c1ba`](https://github.com/brunomaida/Layers/commit/fd2c1ba12050bb1e298a20ab92c787074bf59107) test(e2e): reuse connectEntries in the three coverage specs (S9.1e Task 4)
- **Fixed:** Cobertura: o 2º clique em Analisar cobertura não dispara outra varredura, o aviso `projeto ainda carregando` some quando a carga termina e, com o modal aberto, as teclas de câmera e `?` não agem por baixo. O prompt de escopo flutuante não prende mais o teclado.
  - [`bf3c1ee`](https://github.com/brunomaida/Layers/commit/bf3c1ee432a772ee49440d0cf57cbff411d7a92c) fix(ui): block approve while drafting and harden the coverage modal (S9.1e Task 2)
  - [`de3f221`](https://github.com/brunomaida/Layers/commit/de3f2216d84a84298edc71a9143ac66b89f8c3bd) fix(ui): close the drafting race gaps and keep keys under the scope prompt (S9.1e Task 2)
  - [`fd2c1ba`](https://github.com/brunomaida/Layers/commit/fd2c1ba12050bb1e298a20ab92c787074bf59107) test(e2e): reuse connectEntries in the three coverage specs (S9.1e Task 4)
- **Fixed:** Projeto com 2+ layouts: o badge de Salvar, Ver diff e Exportar contam as pendências de todos os layouts, e os retratos LOD do Espalhar são relidos depois de Aplicar e Reverter.
  - [`312b27a`](https://github.com/brunomaida/Layers/commit/312b27ae65837df9ad95586e46a5fa37f274e718) feat(ui): count every layout in Salvar, diff and export and refresh LOD after writes (S9.1e Task 3)
  - [`7edb240`](https://github.com/brunomaida/Layers/commit/7edb2401ef0a496a4ea86691a7e686a11bd31a00) fix(ui): clear stale draft mtimes and tighten the merged diff/export paths (S9.1e Task 3)
  - [`23b3a38`](https://github.com/brunomaida/Layers/commit/23b3a3887fc136ca9471a920ece55d5998627287) docs: correct limits 10/16, keyboard, Exportar and draft notes after the branch review (S9.1e Task 7)
- **Fixed:** Um `/` inicial ou `..` no caminho do mock resolvem igual na Cobertura e no loader (`LayersCore.normalizePath`); um `\` no `base` do `layers.json` é normalizado só na Cobertura (limite 10 parcial).
  - [`027f58c`](https://github.com/brunomaida/Layers/commit/027f58c1598e3851562c4ca5c75347bd3f6f7827) fix(core): share one path normalizer between loader and coverage (S9.1e Task 4)
  - [`91bed2e`](https://github.com/brunomaida/Layers/commit/91bed2e0f35d4afb9b49ae5ad14f9b00593c379e) test(e2e): tighten backslash and zip base tests and fix limit 10/16 notes (S9.1e Task 4)
- **Changed:** Limites fechados ficam marcados Fechado no ARCHITECTURE; os aceitos do ciclo do rascunho entram numerados. Decisões abertas da S9.1 fechadas (regra 4 da Cobertura, chip ativo, aviso de varredura parcial).
  - [`807403f`](https://github.com/brunomaida/Layers/commit/807403f4fda9edf3317e522cfa370b0c43de19c4) chore(roadmap): start S9.1e (S9.1e Task 1)
  - [`bf3c1ee`](https://github.com/brunomaida/Layers/commit/bf3c1ee432a772ee49440d0cf57cbff411d7a92c) fix(ui): block approve while drafting and harden the coverage modal (S9.1e Task 2)
  - [`de3f221`](https://github.com/brunomaida/Layers/commit/de3f2216d84a84298edc71a9143ac66b89f8c3bd) fix(ui): close the drafting race gaps and keep keys under the scope prompt (S9.1e Task 2)
  - [`312b27a`](https://github.com/brunomaida/Layers/commit/312b27ae65837df9ad95586e46a5fa37f274e718) feat(ui): count every layout in Salvar, diff and export and refresh LOD after writes (S9.1e Task 3)
  - [`7edb240`](https://github.com/brunomaida/Layers/commit/7edb2401ef0a496a4ea86691a7e686a11bd31a00) fix(ui): clear stale draft mtimes and tighten the merged diff/export paths (S9.1e Task 3)
  - [`4557148`](https://github.com/brunomaida/Layers/commit/455714895ae73455b679b4d6b47c5ffe1461617d) fix(ui): never delete a non-empty draft the guard protects (S9.1e Task 3)
  - [`3fc489b`](https://github.com/brunomaida/Layers/commit/3fc489b3b9b4141e8fdb0e50ec2ac253e829c89d) fix(ui): gate approve and discard on drafts this run wrote (S9.1e Task 3)
  - [`027f58c`](https://github.com/brunomaida/Layers/commit/027f58c1598e3851562c4ca5c75347bd3f6f7827) fix(core): share one path normalizer between loader and coverage (S9.1e Task 4)
  - [`5b32ca7`](https://github.com/brunomaida/Layers/commit/5b32ca730408f4898e56bb7f3b02dcf7e056a92e) test(e2e): cover zip and script-cap coverage paths (S9.1e Task 4)
  - [`fd2c1ba`](https://github.com/brunomaida/Layers/commit/fd2c1ba12050bb1e298a20ab92c787074bf59107) test(e2e): reuse connectEntries in the three coverage specs (S9.1e Task 4)
  - [`91bed2e`](https://github.com/brunomaida/Layers/commit/91bed2e0f35d4afb9b49ae5ad14f9b00593c379e) test(e2e): tighten backslash and zip base tests and fix limit 10/16 notes (S9.1e Task 4)
  - [`03c2a57`](https://github.com/brunomaida/Layers/commit/03c2a57c19e46bfa7ccb47edc0c7d8191a14e0e2) docs: close S9.1 open decisions and refresh stale README and roadmap text (S9.1e Task 5)
  - [`449d32d`](https://github.com/brunomaida/Layers/commit/449d32d43cb9d04947fc97f8f3afaa2a515c3bd2) docs: rebuild roadmap tracker after the S9.1d row text (S9.1e Task 5)
  - [`2453f29`](https://github.com/brunomaida/Layers/commit/2453f29a94d71c75d15cea2a762a8a9ce85ee869) docs: close S9.1e limits and record the draft lifecycle and its accepted limits (S9.1e Task 7)
  - [`fcbf606`](https://github.com/brunomaida/Layers/commit/fcbf60622f2f93eeb190fd52d79216eab329f181) docs: update release checklist counts and manual steps and add the S9.1e changelog fragment (S9.1e Task 7)
  - [`9518d12`](https://github.com/brunomaida/Layers/commit/9518d12100455efa9db7bd7683d39083f011350b) docs: mark S9.1e and S9.1 done and rebuild the roadmap tracker (S9.1e Task 7)
  - [`23b3a38`](https://github.com/brunomaida/Layers/commit/23b3a3887fc136ca9471a920ece55d5998627287) docs: correct limits 10/16, keyboard, Exportar and draft notes after the branch review (S9.1e Task 7)
- **Tests:** Vitest: 694 testes (7 novos). Playwright, um spec por vez: `apply-flow` 108, `spread` 119, `layouts` 65, `coverage` 22, `coverage-modal` 19, `autocreate` 7, `scope-all-equal` 9, `undo-redo` 8, `dc-write` 4, `stale-banner` 4. Varredura manual em fixture: 17 ok, 0 bug, 7 pendentes de pasta conectada (RELEASE-CHECKLIST § C).
  - [`bf3c1ee`](https://github.com/brunomaida/Layers/commit/bf3c1ee432a772ee49440d0cf57cbff411d7a92c) fix(ui): block approve while drafting and harden the coverage modal (S9.1e Task 2)
  - [`de3f221`](https://github.com/brunomaida/Layers/commit/de3f2216d84a84298edc71a9143ac66b89f8c3bd) fix(ui): close the drafting race gaps and keep keys under the scope prompt (S9.1e Task 2)
  - [`312b27a`](https://github.com/brunomaida/Layers/commit/312b27ae65837df9ad95586e46a5fa37f274e718) feat(ui): count every layout in Salvar, diff and export and refresh LOD after writes (S9.1e Task 3)
  - [`7edb240`](https://github.com/brunomaida/Layers/commit/7edb2401ef0a496a4ea86691a7e686a11bd31a00) fix(ui): clear stale draft mtimes and tighten the merged diff/export paths (S9.1e Task 3)
  - [`4557148`](https://github.com/brunomaida/Layers/commit/455714895ae73455b679b4d6b47c5ffe1461617d) fix(ui): never delete a non-empty draft the guard protects (S9.1e Task 3)
  - [`027f58c`](https://github.com/brunomaida/Layers/commit/027f58c1598e3851562c4ca5c75347bd3f6f7827) fix(core): share one path normalizer between loader and coverage (S9.1e Task 4)
  - [`5b32ca7`](https://github.com/brunomaida/Layers/commit/5b32ca730408f4898e56bb7f3b02dcf7e056a92e) test(e2e): cover zip and script-cap coverage paths (S9.1e Task 4)
  - [`fd2c1ba`](https://github.com/brunomaida/Layers/commit/fd2c1ba12050bb1e298a20ab92c787074bf59107) test(e2e): reuse connectEntries in the three coverage specs (S9.1e Task 4)
  - [`03c2a57`](https://github.com/brunomaida/Layers/commit/03c2a57c19e46bfa7ccb47edc0c7d8191a14e0e2) docs: close S9.1 open decisions and refresh stale README and roadmap text (S9.1e Task 5)
  - [`fcbf606`](https://github.com/brunomaida/Layers/commit/fcbf60622f2f93eeb190fd52d79216eab329f181) docs: update release checklist counts and manual steps and add the S9.1e changelog fragment (S9.1e Task 7)
- **Perf:** N/A — correções de fluxo e de teclas sem mudança na cena nem no orbit; `perf.spec` não rodou e o custo medido na S9.1d vale.
  - [`807403f`](https://github.com/brunomaida/Layers/commit/807403f4fda9edf3317e522cfa370b0c43de19c4) chore(roadmap): start S9.1e (S9.1e Task 1)
  - [`bf3c1ee`](https://github.com/brunomaida/Layers/commit/bf3c1ee432a772ee49440d0cf57cbff411d7a92c) fix(ui): block approve while drafting and harden the coverage modal (S9.1e Task 2)
  - [`de3f221`](https://github.com/brunomaida/Layers/commit/de3f2216d84a84298edc71a9143ac66b89f8c3bd) fix(ui): close the drafting race gaps and keep keys under the scope prompt (S9.1e Task 2)
  - [`312b27a`](https://github.com/brunomaida/Layers/commit/312b27ae65837df9ad95586e46a5fa37f274e718) feat(ui): count every layout in Salvar, diff and export and refresh LOD after writes (S9.1e Task 3)
  - [`7edb240`](https://github.com/brunomaida/Layers/commit/7edb2401ef0a496a4ea86691a7e686a11bd31a00) fix(ui): clear stale draft mtimes and tighten the merged diff/export paths (S9.1e Task 3)
  - [`4557148`](https://github.com/brunomaida/Layers/commit/455714895ae73455b679b4d6b47c5ffe1461617d) fix(ui): never delete a non-empty draft the guard protects (S9.1e Task 3)
  - [`3fc489b`](https://github.com/brunomaida/Layers/commit/3fc489b3b9b4141e8fdb0e50ec2ac253e829c89d) fix(ui): gate approve and discard on drafts this run wrote (S9.1e Task 3)
  - [`027f58c`](https://github.com/brunomaida/Layers/commit/027f58c1598e3851562c4ca5c75347bd3f6f7827) fix(core): share one path normalizer between loader and coverage (S9.1e Task 4)
  - [`5b32ca7`](https://github.com/brunomaida/Layers/commit/5b32ca730408f4898e56bb7f3b02dcf7e056a92e) test(e2e): cover zip and script-cap coverage paths (S9.1e Task 4)
  - [`fd2c1ba`](https://github.com/brunomaida/Layers/commit/fd2c1ba12050bb1e298a20ab92c787074bf59107) test(e2e): reuse connectEntries in the three coverage specs (S9.1e Task 4)
  - [`91bed2e`](https://github.com/brunomaida/Layers/commit/91bed2e0f35d4afb9b49ae5ad14f9b00593c379e) test(e2e): tighten backslash and zip base tests and fix limit 10/16 notes (S9.1e Task 4)
  - [`03c2a57`](https://github.com/brunomaida/Layers/commit/03c2a57c19e46bfa7ccb47edc0c7d8191a14e0e2) docs: close S9.1 open decisions and refresh stale README and roadmap text (S9.1e Task 5)
  - [`449d32d`](https://github.com/brunomaida/Layers/commit/449d32d43cb9d04947fc97f8f3afaa2a515c3bd2) docs: rebuild roadmap tracker after the S9.1d row text (S9.1e Task 5)
  - [`2453f29`](https://github.com/brunomaida/Layers/commit/2453f29a94d71c75d15cea2a762a8a9ce85ee869) docs: close S9.1e limits and record the draft lifecycle and its accepted limits (S9.1e Task 7)
  - [`fcbf606`](https://github.com/brunomaida/Layers/commit/fcbf60622f2f93eeb190fd52d79216eab329f181) docs: update release checklist counts and manual steps and add the S9.1e changelog fragment (S9.1e Task 7)
  - [`9518d12`](https://github.com/brunomaida/Layers/commit/9518d12100455efa9db7bd7683d39083f011350b) docs: mark S9.1e and S9.1 done and rebuild the roadmap tracker (S9.1e Task 7)
  - [`23b3a38`](https://github.com/brunomaida/Layers/commit/23b3a3887fc136ca9471a920ece55d5998627287) docs: correct limits 10/16, keyboard, Exportar and draft notes after the branch review (S9.1e Task 7)

### Todos os commits

- [`807403f`](https://github.com/brunomaida/Layers/commit/807403f4fda9edf3317e522cfa370b0c43de19c4) chore(roadmap): start S9.1e (S9.1e Task 1)
- [`bf3c1ee`](https://github.com/brunomaida/Layers/commit/bf3c1ee432a772ee49440d0cf57cbff411d7a92c) fix(ui): block approve while drafting and harden the coverage modal (S9.1e Task 2)
- [`de3f221`](https://github.com/brunomaida/Layers/commit/de3f2216d84a84298edc71a9143ac66b89f8c3bd) fix(ui): close the drafting race gaps and keep keys under the scope prompt (S9.1e Task 2)
- [`312b27a`](https://github.com/brunomaida/Layers/commit/312b27ae65837df9ad95586e46a5fa37f274e718) feat(ui): count every layout in Salvar, diff and export and refresh LOD after writes (S9.1e Task 3)
- [`7edb240`](https://github.com/brunomaida/Layers/commit/7edb2401ef0a496a4ea86691a7e686a11bd31a00) fix(ui): clear stale draft mtimes and tighten the merged diff/export paths (S9.1e Task 3)
- [`4557148`](https://github.com/brunomaida/Layers/commit/455714895ae73455b679b4d6b47c5ffe1461617d) fix(ui): never delete a non-empty draft the guard protects (S9.1e Task 3)
- [`3fc489b`](https://github.com/brunomaida/Layers/commit/3fc489b3b9b4141e8fdb0e50ec2ac253e829c89d) fix(ui): gate approve and discard on drafts this run wrote (S9.1e Task 3)
- [`027f58c`](https://github.com/brunomaida/Layers/commit/027f58c1598e3851562c4ca5c75347bd3f6f7827) fix(core): share one path normalizer between loader and coverage (S9.1e Task 4)
- [`5b32ca7`](https://github.com/brunomaida/Layers/commit/5b32ca730408f4898e56bb7f3b02dcf7e056a92e) test(e2e): cover zip and script-cap coverage paths (S9.1e Task 4)
- [`fd2c1ba`](https://github.com/brunomaida/Layers/commit/fd2c1ba12050bb1e298a20ab92c787074bf59107) test(e2e): reuse connectEntries in the three coverage specs (S9.1e Task 4)
- [`91bed2e`](https://github.com/brunomaida/Layers/commit/91bed2e0f35d4afb9b49ae5ad14f9b00593c379e) test(e2e): tighten backslash and zip base tests and fix limit 10/16 notes (S9.1e Task 4)
- [`03c2a57`](https://github.com/brunomaida/Layers/commit/03c2a57c19e46bfa7ccb47edc0c7d8191a14e0e2) docs: close S9.1 open decisions and refresh stale README and roadmap text (S9.1e Task 5)
- [`449d32d`](https://github.com/brunomaida/Layers/commit/449d32d43cb9d04947fc97f8f3afaa2a515c3bd2) docs: rebuild roadmap tracker after the S9.1d row text (S9.1e Task 5)
- [`2453f29`](https://github.com/brunomaida/Layers/commit/2453f29a94d71c75d15cea2a762a8a9ce85ee869) docs: close S9.1e limits and record the draft lifecycle and its accepted limits (S9.1e Task 7)
- [`fcbf606`](https://github.com/brunomaida/Layers/commit/fcbf60622f2f93eeb190fd52d79216eab329f181) docs: update release checklist counts and manual steps and add the S9.1e changelog fragment (S9.1e Task 7)
- [`9518d12`](https://github.com/brunomaida/Layers/commit/9518d12100455efa9db7bd7683d39083f011350b) docs: mark S9.1e and S9.1 done and rebuild the roadmap tracker (S9.1e Task 7)
- [`23b3a38`](https://github.com/brunomaida/Layers/commit/23b3a3887fc136ca9471a920ece55d5998627287) docs: correct limits 10/16, keyboard, Exportar and draft notes after the branch review (S9.1e Task 7)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `35ac6cfd` | 2026-10-20 08:48 | 9.35h | 548 | 239.9k | 49.17M | 1.30M |
| `agent-ab` | 2026-10-20 15:11 | 22.4m | 184 | 3.0k | 8.40M | 436.9k |
| `agent-aa` | 2026-10-20 15:22 | 4s | 4 | 6 | 47.5k | 40.4k |
| `agent-a1` | 2026-10-20 15:33 | 4.7m | 148 | 4.6k | 4.22M | 151.0k |
| `agent-ac` | 2026-10-20 15:38 | 2.42h | 422 | 15.3k | 30.09M | 4.10M |
| `agent-a6` | 2026-10-20 16:37 | 9.0m | 118 | 13.7k | 4.30M | 256.3k |
| `agent-a2` | 2026-10-20 17:26 | 5.6m | 66 | 12.8k | 1.51M | 128.9k |
| `40f6758e` | 2026-10-20 20:30 | 2.32h | 212 | 93.7k | 13.46M | 339.5k |
| `agent-a8` | 2026-10-20 20:48 | 4.1m | 50 | 10.6k | 1.02M | 99.2k |
| `agent-ae` | 2026-10-20 20:53 | 36.3m | 156 | 13.5k | 6.32M | 705.4k |
| `agent-a6` | 2026-10-20 21:29 | 6.2m | 114 | 10.8k | 3.07M | 161.1k |
| `agent-a7` | 2026-10-20 21:36 | 29.5m | 250 | 12.0k | 14.03M | 596.0k |
| `agent-af` | 2026-10-20 22:05 | 5.6m | 106 | 12.1k | 2.84M | 196.0k |
| `agent-ac` | 2026-10-20 22:11 | 6.1m | 110 | 971 | 3.71M | 116.3k |
| `agent-aa` | 2026-10-20 22:25 | 9.2m | 346 | 11.5k | 21.47M | 605.2k |
| `agent-a9` | 2026-10-20 22:36 | 3.9m | 128 | 1.1k | 8.32M | 344.9k |
| `agent-aa` | 2026-10-20 22:40 | 8.3m | 114 | 13.7k | 5.40M | 265.4k |
| **Total (17)** | — | **16.61h** | **3.1k** | **469.2k** | **177.36M** | **9.85M** |
