# Implementation Report — s3-5-context-menu

- **Branch:** `feature/261017-85-s3-5-context-menu`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-17 19:24 → 2026-10-17 23:52
- **Status:** `final`
- **Gerado em:** 2026-10-17 23:53

## Resumo

Menu de contexto no palco 3D (botão direito num plano ou numa linha da árvore): painel `Camadas do componente` com L0 a Ln e o selecionado destacado, e submenu `Ações do ramo` (Explodir daqui, Recolher até aqui, Requisição). Esc, clique fora e ação fecham; arrastar com o botão direito não abre no Windows (outros sistemas abrem no mousedown).

## Mudanças

### Added (5)

- `changelog.d/feature-261017-85-s3-5-context-menu.md` (+21/-0, doc)
- `docs/superpowers/plans/2026-10-17-s3-5-menu-de-contexto-explodir.md` (+223/-0, doc)
- `e2e/context-menu.spec.js` (+494/-0, src)
- `e2e/ctx-helpers.js` (+98/-0, src)
- `e2e/request.spec.js` (+492/-0, src)

### Changed (12)

- `docs/ARCHITECTURE.md` (+33/-5, doc)
- `docs/RELEASE-CHECKLIST.md` (+4/-1, doc)
- `docs/_index.md` (+2/-2, doc)
- `docs/roadmap.data.json` (+9/-3, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `docs/superpowers/specs/2026-10-14-s2-14-pending-persist-design.md` (+1/-1, test)
- `docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md` (+16/-2, test)
- `e2e/pending-persist.spec.js` (+52/-7, src)
- `e2e/perf.spec.js` (+60/-0, src)
- `index.html` (+317/-54, other)
- `lib/layers-core.js` (+141/-9, src)
- `test/layers-core.test.js` (+483/-2, test)

### Changelog fragment

**Added:**
- Menu de contexto no palco 3D (botão direito num plano ou numa linha da árvore): painel `Camadas do componente` com L0 a Ln e o selecionado destacado, e submenu `Ações do ramo` (Explodir daqui, Recolher até aqui, Requisição). Esc, clique fora e ação fecham; arrastar com o botão direito não abre no Windows (outros sistemas abrem no mousedown).
- Explodir ramo na vista plana: só a subárvore escolhida ganha profundidade (`explodeFrom`/`collapseAt`, `LayersCore.branchZ`/`branchOf`/`ctxMenuModel`); o ramo volta com a sessão, some em Reanalisar do 0, troca de projeto, Trocar de estado ou raiz inexistente, e leva o selo `▧ ramo`.
- Requisições manuais no painel Ajustes: chip de dado, texto livre "O QUE MUDAR", "Mostrar no palco" e rodapé "Requisições Manuais" (`LayersCore.requestsMarkdown`) para copiar ou gravar `layers-requests.md` na pasta conectada.
- Persistência em `layers/v1/pending › requests[]` (`LayersCore.validRequest`): a entrada sobrevive sem `changes`, tem teto de 200 e, se a fonte muda, mantém cada requisição "alvo a confirmar" (`confirm` por requisição); com fonte não lida o texto continua salvo.

**Changed:**
- `onContextMenu` do palco abre o menu de contexto; `session` ganha `explodeFrom`/`collapseAt` (não gravados no modo fixture).
- Recarregar, Trocar de estado e Reanalisar do 0 mantêm as requisições (só os `changes` caem); Zerar interface limpa tudo.
- `layoutId` fixo em `'main'` até a S9.1; versão do Markdown como travessão.

**Tests:**
- Vitest: ramo, menu, requisições e pending em `test/layers-core.test.js`.
- Playwright: `context-menu`, `request`, `pending-persist` e o guarda `Orbit_BranchExploded_CostsNoMoreThanFlat`.

**Perf:**
- measured — 1.500 tags, vista plana, mediana de 3 runs: controle sem ramo 22,26 ms/frame (44,9 fps); com o maior ramo explodido 19,63 ms/frame (50,9 fps), p95 18,3 ms; o ramo não acrescentou custo (guarda relativo ≤ 1,1× o controle). Vista 3D padrão (contexto) 20,11 ms.

## Arquivos tocados

### src (6)

- [`e2e/context-menu.spec.js`](../../../e2e/context-menu.spec.js) — A (+494/-0)
- [`e2e/ctx-helpers.js`](../../../e2e/ctx-helpers.js) — A (+98/-0)
- [`e2e/pending-persist.spec.js`](../../../e2e/pending-persist.spec.js) — M (+52/-7)
- [`e2e/perf.spec.js`](../../../e2e/perf.spec.js) — M (+60/-0)
- [`e2e/request.spec.js`](../../../e2e/request.spec.js) — A (+492/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+141/-9)

### test (3)

- [`docs/superpowers/specs/2026-10-14-s2-14-pending-persist-design.md`](../specs/2026-10-14-s2-14-pending-persist-design.md) — M (+1/-1)
- [`docs/superpowers/specs/2026-10-17-s3-5-s9-1-design-decisions.md`](../specs/2026-10-17-s3-5-s9-1-design-decisions.md) — M (+16/-2)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+483/-2)

### doc (7)

- [`changelog.d/feature-261017-85-s3-5-context-menu.md`](../../../changelog.d/feature-261017-85-s3-5-context-menu.md) — A (+21/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+33/-5)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+4/-1)
- [`docs/_index.md`](../../_index.md) — M (+2/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+9/-3)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-17-s3-5-menu-de-contexto-explodir.md`](../plans/2026-10-17-s3-5-menu-de-contexto-explodir.md) — A (+223/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+317/-54)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Menu de contexto no palco 3D (botão direito num plano ou numa linha da árvore): painel `Camadas do componente` com L0 a Ln e o selecionado destacado, e submenu `Ações do ramo` (Explodir daqui, Recolher até aqui, Requisição). Esc, clique fora e ação fecham; arrastar com o botão direito não abre no Windows (outros sistemas abrem no mousedown).
  - [`8607e7b`](https://github.com/brunomaida/Layers/commit/8607e7b5ca00fbdfb9c00dbd23d42584ff744a51) docs(plan): add the S3.5 context menu code plan and link issue #85 (S3.5 Task 0)
  - [`eda4aaf`](https://github.com/brunomaida/Layers/commit/eda4aaf716af0cef9b0544582bff629e706bca0c) feat(core): add context menu model and branch z (S3.5 Task 1)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`2f88a83`](https://github.com/brunomaida/Layers/commit/2f88a833a0ca9a0087c5fe20db6e709f7f58bd8e) fix(ui): harden the context menu and its tests (S3.5 Task 5)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
- **Added:** Explodir ramo na vista plana: só a subárvore escolhida ganha profundidade (`explodeFrom`/`collapseAt`, `LayersCore.branchZ`/`branchOf`/`ctxMenuModel`); o ramo volta com a sessão, some em Reanalisar do 0, troca de projeto, Trocar de estado ou raiz inexistente, e leva o selo `▧ ramo`.
  - [`8607e7b`](https://github.com/brunomaida/Layers/commit/8607e7b5ca00fbdfb9c00dbd23d42584ff744a51) docs(plan): add the S3.5 context menu code plan and link issue #85 (S3.5 Task 0)
  - [`eda4aaf`](https://github.com/brunomaida/Layers/commit/eda4aaf716af0cef9b0544582bff629e706bca0c) feat(core): add context menu model and branch z (S3.5 Task 1)
  - [`691c8fa`](https://github.com/brunomaida/Layers/commit/691c8faec670b592ee6cad88753fdf849c95d3af) fix(core): accept plain-object byId and assert inBranch (S3.5 Task 1)
  - [`8a328ca`](https://github.com/brunomaida/Layers/commit/8a328cad6ee3d5c04ee75de62d79f08a1a6d5a55) feat(core): persist manual requests in pending (S3.5 Task 2)
  - [`1bb2b1b`](https://github.com/brunomaida/Layers/commit/1bb2b1b23eeec69fa1aa5ff889ba16288ee67014) fix(core): copy nested texts in restorePlan requests (S3.5 Task 2)
  - [`1d9d74d`](https://github.com/brunomaida/Layers/commit/1d9d74ddc60e9be880c628cb44db953f58122248) feat(core): render manual requests as markdown (S3.5 Task 3)
  - [`bcbdd57`](https://github.com/brunomaida/Layers/commit/bcbdd57c12cfdd83ea1e75e007f0341082f1e1d1) fix(core): harden requestsMarkdown against invalid fields (S3.5 Task 3)
  - [`ff1635b`](https://github.com/brunomaida/Layers/commit/ff1635b76dd971e5c4e204870faf7ab12d4aa887) feat(ui): explode only a branch in flat view (S3.5 Task 4)
  - [`df6bf4c`](https://github.com/brunomaida/Layers/commit/df6bf4ccfb7a2579d9244f53a8392fdd538ac466) fix(ui): scope the branch to its project and harden tests (S3.5 Task 4)
  - [`c07363b`](https://github.com/brunomaida/Layers/commit/c07363b0f9a60d05a37c4e48b087a333b7c1333b) fix(ui): keep unmarked rail chips unchanged (S3.5 Task 4)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`2f88a83`](https://github.com/brunomaida/Layers/commit/2f88a833a0ca9a0087c5fe20db6e709f7f58bd8e) fix(ui): harden the context menu and its tests (S3.5 Task 5)
  - [`ecd7d97`](https://github.com/brunomaida/Layers/commit/ecd7d97861e51e849d883d575fc19c1e054ba42d) feat(ui): manual requests in the Ajustes panel (S3.5 Task 6)
  - [`d8f1fbf`](https://github.com/brunomaida/Layers/commit/d8f1fbf5821d72d558df66bab8530930086c1d1e) fix(ui): mark target-to-confirm per request and cover discard paths (S3.5 Task 6)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
  - [`15c329f`](https://github.com/brunomaida/Layers/commit/15c329f4168404bee7a8ec42674383ad32fa81e9) docs: record the S3.5 orbit measurement (S3.5 Task 7)
  - [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
  - [`fedc466`](https://github.com/brunomaida/Layers/commit/fedc466714650f44ca01387f910c074d44977a5b) docs: make the S3.5 perf claim an A/B and fix doc contradictions (S3.5 Task 7)
  - [`908d44a`](https://github.com/brunomaida/Layers/commit/908d44a90096433974b507c1641a75fbe65a53f0) fix(ui): guard the refreshPendingHash catch against a project switch (S3.5 Task 7)
- **Added:** Requisições manuais no painel Ajustes: chip de dado, texto livre "O QUE MUDAR", "Mostrar no palco" e rodapé "Requisições Manuais" (`LayersCore.requestsMarkdown`) para copiar ou gravar `layers-requests.md` na pasta conectada.
  - [`8a328ca`](https://github.com/brunomaida/Layers/commit/8a328cad6ee3d5c04ee75de62d79f08a1a6d5a55) feat(core): persist manual requests in pending (S3.5 Task 2)
  - [`1bb2b1b`](https://github.com/brunomaida/Layers/commit/1bb2b1b23eeec69fa1aa5ff889ba16288ee67014) fix(core): copy nested texts in restorePlan requests (S3.5 Task 2)
  - [`1d9d74d`](https://github.com/brunomaida/Layers/commit/1d9d74ddc60e9be880c628cb44db953f58122248) feat(core): render manual requests as markdown (S3.5 Task 3)
  - [`bcbdd57`](https://github.com/brunomaida/Layers/commit/bcbdd57c12cfdd83ea1e75e007f0341082f1e1d1) fix(core): harden requestsMarkdown against invalid fields (S3.5 Task 3)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`ecd7d97`](https://github.com/brunomaida/Layers/commit/ecd7d97861e51e849d883d575fc19c1e054ba42d) feat(ui): manual requests in the Ajustes panel (S3.5 Task 6)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
  - [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
- **Added:** Persistência em `layers/v1/pending › requests[]` (`LayersCore.validRequest`): a entrada sobrevive sem `changes`, tem teto de 200 e, se a fonte muda, mantém cada requisição "alvo a confirmar" (`confirm` por requisição); com fonte não lida o texto continua salvo.
  - [`8a328ca`](https://github.com/brunomaida/Layers/commit/8a328cad6ee3d5c04ee75de62d79f08a1a6d5a55) feat(core): persist manual requests in pending (S3.5 Task 2)
  - [`1bb2b1b`](https://github.com/brunomaida/Layers/commit/1bb2b1b23eeec69fa1aa5ff889ba16288ee67014) fix(core): copy nested texts in restorePlan requests (S3.5 Task 2)
  - [`1d9d74d`](https://github.com/brunomaida/Layers/commit/1d9d74ddc60e9be880c628cb44db953f58122248) feat(core): render manual requests as markdown (S3.5 Task 3)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`ecd7d97`](https://github.com/brunomaida/Layers/commit/ecd7d97861e51e849d883d575fc19c1e054ba42d) feat(ui): manual requests in the Ajustes panel (S3.5 Task 6)
  - [`d8f1fbf`](https://github.com/brunomaida/Layers/commit/d8f1fbf5821d72d558df66bab8530930086c1d1e) fix(ui): mark target-to-confirm per request and cover discard paths (S3.5 Task 6)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
  - [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
- **Changed:** `onContextMenu` do palco abre o menu de contexto; `session` ganha `explodeFrom`/`collapseAt` (não gravados no modo fixture).
  - [`8607e7b`](https://github.com/brunomaida/Layers/commit/8607e7b5ca00fbdfb9c00dbd23d42584ff744a51) docs(plan): add the S3.5 context menu code plan and link issue #85 (S3.5 Task 0)
  - [`eda4aaf`](https://github.com/brunomaida/Layers/commit/eda4aaf716af0cef9b0544582bff629e706bca0c) feat(core): add context menu model and branch z (S3.5 Task 1)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`2f88a83`](https://github.com/brunomaida/Layers/commit/2f88a833a0ca9a0087c5fe20db6e709f7f58bd8e) fix(ui): harden the context menu and its tests (S3.5 Task 5)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
- **Changed:** Recarregar, Trocar de estado e Reanalisar do 0 mantêm as requisições (só os `changes` caem); Zerar interface limpa tudo.
  - [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
- **Changed:** `layoutId` fixo em `'main'` até a S9.1; versão do Markdown como travessão.
  - [`1d9d74d`](https://github.com/brunomaida/Layers/commit/1d9d74ddc60e9be880c628cb44db953f58122248) feat(core): render manual requests as markdown (S3.5 Task 3)
- **Tests:** Vitest: ramo, menu, requisições e pending em `test/layers-core.test.js`.
  - [`8607e7b`](https://github.com/brunomaida/Layers/commit/8607e7b5ca00fbdfb9c00dbd23d42584ff744a51) docs(plan): add the S3.5 context menu code plan and link issue #85 (S3.5 Task 0)
  - [`eda4aaf`](https://github.com/brunomaida/Layers/commit/eda4aaf716af0cef9b0544582bff629e706bca0c) feat(core): add context menu model and branch z (S3.5 Task 1)
  - [`691c8fa`](https://github.com/brunomaida/Layers/commit/691c8faec670b592ee6cad88753fdf849c95d3af) fix(core): accept plain-object byId and assert inBranch (S3.5 Task 1)
  - [`8a328ca`](https://github.com/brunomaida/Layers/commit/8a328cad6ee3d5c04ee75de62d79f08a1a6d5a55) feat(core): persist manual requests in pending (S3.5 Task 2)
  - [`1bb2b1b`](https://github.com/brunomaida/Layers/commit/1bb2b1b23eeec69fa1aa5ff889ba16288ee67014) fix(core): copy nested texts in restorePlan requests (S3.5 Task 2)
  - [`1d9d74d`](https://github.com/brunomaida/Layers/commit/1d9d74ddc60e9be880c628cb44db953f58122248) feat(core): render manual requests as markdown (S3.5 Task 3)
  - [`bcbdd57`](https://github.com/brunomaida/Layers/commit/bcbdd57c12cfdd83ea1e75e007f0341082f1e1d1) fix(core): harden requestsMarkdown against invalid fields (S3.5 Task 3)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`2f88a83`](https://github.com/brunomaida/Layers/commit/2f88a833a0ca9a0087c5fe20db6e709f7f58bd8e) fix(ui): harden the context menu and its tests (S3.5 Task 5)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
  - [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
  - [`fedc466`](https://github.com/brunomaida/Layers/commit/fedc466714650f44ca01387f910c074d44977a5b) docs: make the S3.5 perf claim an A/B and fix doc contradictions (S3.5 Task 7)
- **Tests:** Playwright: `context-menu`, `request`, `pending-persist` e o guarda `Orbit_BranchExploded_CostsNoMoreThanFlat`.
  - [`8607e7b`](https://github.com/brunomaida/Layers/commit/8607e7b5ca00fbdfb9c00dbd23d42584ff744a51) docs(plan): add the S3.5 context menu code plan and link issue #85 (S3.5 Task 0)
  - [`eda4aaf`](https://github.com/brunomaida/Layers/commit/eda4aaf716af0cef9b0544582bff629e706bca0c) feat(core): add context menu model and branch z (S3.5 Task 1)
  - [`8a328ca`](https://github.com/brunomaida/Layers/commit/8a328cad6ee3d5c04ee75de62d79f08a1a6d5a55) feat(core): persist manual requests in pending (S3.5 Task 2)
  - [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
  - [`2f88a83`](https://github.com/brunomaida/Layers/commit/2f88a833a0ca9a0087c5fe20db6e709f7f58bd8e) fix(ui): harden the context menu and its tests (S3.5 Task 5)
  - [`d8f1fbf`](https://github.com/brunomaida/Layers/commit/d8f1fbf5821d72d558df66bab8530930086c1d1e) fix(ui): mark target-to-confirm per request and cover discard paths (S3.5 Task 6)
  - [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
  - [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
- **Perf:** measured — 1.500 tags, vista plana, mediana de 3 runs: controle sem ramo 22,26 ms/frame (44,9 fps); com o maior ramo explodido 19,63 ms/frame (50,9 fps), p95 18,3 ms; o ramo não acrescentou custo (guarda relativo ≤ 1,1× o controle). Vista 3D padrão (contexto) 20,11 ms.
  - [`fedc466`](https://github.com/brunomaida/Layers/commit/fedc466714650f44ca01387f910c074d44977a5b) docs: make the S3.5 perf claim an A/B and fix doc contradictions (S3.5 Task 7)

### Todos os commits

- [`8607e7b`](https://github.com/brunomaida/Layers/commit/8607e7b5ca00fbdfb9c00dbd23d42584ff744a51) docs(plan): add the S3.5 context menu code plan and link issue #85 (S3.5 Task 0)
- [`eda4aaf`](https://github.com/brunomaida/Layers/commit/eda4aaf716af0cef9b0544582bff629e706bca0c) feat(core): add context menu model and branch z (S3.5 Task 1)
- [`691c8fa`](https://github.com/brunomaida/Layers/commit/691c8faec670b592ee6cad88753fdf849c95d3af) fix(core): accept plain-object byId and assert inBranch (S3.5 Task 1)
- [`8a328ca`](https://github.com/brunomaida/Layers/commit/8a328cad6ee3d5c04ee75de62d79f08a1a6d5a55) feat(core): persist manual requests in pending (S3.5 Task 2)
- [`1bb2b1b`](https://github.com/brunomaida/Layers/commit/1bb2b1b23eeec69fa1aa5ff889ba16288ee67014) fix(core): copy nested texts in restorePlan requests (S3.5 Task 2)
- [`1d9d74d`](https://github.com/brunomaida/Layers/commit/1d9d74ddc60e9be880c628cb44db953f58122248) feat(core): render manual requests as markdown (S3.5 Task 3)
- [`bcbdd57`](https://github.com/brunomaida/Layers/commit/bcbdd57c12cfdd83ea1e75e007f0341082f1e1d1) fix(core): harden requestsMarkdown against invalid fields (S3.5 Task 3)
- [`ff1635b`](https://github.com/brunomaida/Layers/commit/ff1635b76dd971e5c4e204870faf7ab12d4aa887) feat(ui): explode only a branch in flat view (S3.5 Task 4)
- [`df6bf4c`](https://github.com/brunomaida/Layers/commit/df6bf4ccfb7a2579d9244f53a8392fdd538ac466) fix(ui): scope the branch to its project and harden tests (S3.5 Task 4)
- [`c07363b`](https://github.com/brunomaida/Layers/commit/c07363b0f9a60d05a37c4e48b087a333b7c1333b) fix(ui): keep unmarked rail chips unchanged (S3.5 Task 4)
- [`8b6e7fc`](https://github.com/brunomaida/Layers/commit/8b6e7fc4d9b7e4bf0827aeac0a6bd147380d7ec1) feat(ui): context menu with layers and branch actions (S3.5 Task 5)
- [`2f88a83`](https://github.com/brunomaida/Layers/commit/2f88a833a0ca9a0087c5fe20db6e709f7f58bd8e) fix(ui): harden the context menu and its tests (S3.5 Task 5)
- [`ecd7d97`](https://github.com/brunomaida/Layers/commit/ecd7d97861e51e849d883d575fc19c1e054ba42d) feat(ui): manual requests in the Ajustes panel (S3.5 Task 6)
- [`d8f1fbf`](https://github.com/brunomaida/Layers/commit/d8f1fbf5821d72d558df66bab8530930086c1d1e) fix(ui): mark target-to-confirm per request and cover discard paths (S3.5 Task 6)
- [`6ce5e5b`](https://github.com/brunomaida/Layers/commit/6ce5e5b07465b9c8ed48fefe3c563110395f9798) docs: document S3.5 context menu, requests and perf guard (S3.5 Task 7)
- [`15c329f`](https://github.com/brunomaida/Layers/commit/15c329f4168404bee7a8ec42674383ad32fa81e9) docs: record the S3.5 orbit measurement (S3.5 Task 7)
- [`5272a9b`](https://github.com/brunomaida/Layers/commit/5272a9b479e734b2d720468fee65c22987acabfc) fix(ui): persist requests on incomplete reads and harden pending parsing (S3.5 Task 7)
- [`fedc466`](https://github.com/brunomaida/Layers/commit/fedc466714650f44ca01387f910c074d44977a5b) docs: make the S3.5 perf claim an A/B and fix doc contradictions (S3.5 Task 7)
- [`908d44a`](https://github.com/brunomaida/Layers/commit/908d44a90096433974b507c1641a75fbe65a53f0) fix(ui): guard the refreshPendingHash catch against a project switch (S3.5 Task 7)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `724f45a2` | 2026-10-17 16:11 | 7.69h | 952 | 433.4k | 97.39M | 2.26M |
| `agent-a0` | 2026-10-17 19:25 | 19.0m | 64 | 1.1k | 1.52M | 280.0k |
| `agent-a1` | 2026-10-17 19:30 | 7.4m | 36 | 3.3k | 404.8k | 87.5k |
| `agent-af` | 2026-10-17 19:45 | 3.4m | 16 | 1.0k | 138.9k | 39.6k |
| `agent-a0` | 2026-10-17 19:49 | 13.6m | 56 | 5.7k | 1.55M | 134.8k |
| `agent-a6` | 2026-10-17 20:00 | 1.9m | 24 | 2.6k | 249.0k | 85.5k |
| `agent-a7` | 2026-10-17 20:03 | 1.4m | 24 | 1.7k | 237.2k | 39.4k |
| `agent-af` | 2026-10-17 20:05 | 3.8m | 70 | 2.1k | 2.03M | 139.3k |
| `agent-a5` | 2026-10-17 20:07 | 1.1m | 24 | 3.5k | 232.5k | 77.7k |
| `agent-a6` | 2026-10-17 20:09 | 56s | 22 | 2.5k | 193.3k | 42.9k |
| `agent-a9` | 2026-10-17 20:11 | 45.3m | 356 | 19.2k | 23.75M | 1.16M |
| `agent-ac` | 2026-10-17 20:26 | 8.9m | 84 | 7.6k | 2.51M | 177.7k |
| `agent-a4` | 2026-10-17 20:45 | 7.9m | 64 | 559 | 1.43M | 106.6k |
| `agent-a7` | 2026-10-17 20:57 | 3.3m | 48 | 3.1k | 738.0k | 58.7k |
| `agent-a3` | 2026-10-17 21:01 | 48.4m | 348 | 26.8k | 25.16M | 825.2k |
| `agent-a3` | 2026-10-17 21:34 | 7.8m | 92 | 24.9k | 3.05M | 262.7k |
| `agent-ac` | 2026-10-17 21:49 | 2.4m | 38 | 6.2k | 660.0k | 84.3k |
| `agent-ab` | 2026-10-17 21:53 | 55.7m | 454 | 37.3k | 43.92M | 1.09M |
| `agent-ae` | 2026-10-17 22:23 | 9.2m | 90 | 7.5k | 3.50M | 279.1k |
| `agent-a5` | 2026-10-17 22:49 | 4.6m | 70 | 11.1k | 1.96M | 100.1k |
| `agent-a4` | 2026-10-17 22:54 | 10.0m | 128 | 1.6k | 6.58M | 292.0k |
| `agent-a7` | 2026-10-17 23:00 | 2.7m | 12 | 40 | 43.8k | 27.0k |
| `agent-a8` | 2026-10-17 23:04 | 14.5m | 164 | 13.6k | 8.34M | 343.4k |
| `agent-ae` | 2026-10-17 23:20 | 21.9m | 248 | 5.3k | 14.71M | 349.9k |
| `agent-a1` | 2026-10-17 23:42 | 6.5m | 108 | 19.8k | 4.73M | 258.8k |
| `agent-a2` | 2026-10-17 23:49 | 3.1m | 38 | 154 | 977.0k | 134.9k |
| **Total (26)** | — | **12.77h** | **3.6k** | **641.6k** | **246.01M** | **8.74M** |
