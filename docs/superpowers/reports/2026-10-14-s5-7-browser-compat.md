# Implementation Report — s5-7-browser-compat

- **Branch:** `feature/261014-0-s5-7-browser-compat`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 20:35 → 2026-10-14 21:35
- **Status:** `final`
- **Gerado em:** 2026-10-14 21:36

## Resumo

Projetos Playwright `chrome`, `msedge`, `firefox` e `webkit` ao lado do `chromium` (que segue rodando toda a suíte): `e2e/browser-compat.spec.js` roda nos cinco — sondas de API em `e2e/__snapshots__/compat-probes.json`, árvore das fixtures igual à do Chromium, carga sem erro e sem requisição externa, edição com diff simulado, repositório GitHub simulado por `page.route` e capturas para revisão visual; `e2e/apply-flow.spec.js` também roda no Chrome e no Edge instalados.

## Mudanças

### Added (5)

- `changelog.d/feature-261014-0-s5-7-browser-compat.md` (+13/-0, doc)
- `docs/superpowers/plans/2026-10-14-s5-7-browser-compat.md` (+882/-0, doc)
- `docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md` (+157/-0, doc)
- `e2e/__snapshots__/compat-probes.json` (+122/-0, config)
- `e2e/browser-compat.spec.js` (+234/-0, src)

### Changed (7)

- `docs/LOCAL-SETUP.md` (+2/-0, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/_index.md` (+3/-3, doc)
- `docs/roadmap.data.json` (+29/-10, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+2/-1, other)
- `playwright.config.js` (+15/-3, src)

### Changelog fragment

**Added:**
- Projetos Playwright `chrome`, `msedge`, `firefox` e `webkit` ao lado do `chromium` (que segue rodando toda a suíte): `e2e/browser-compat.spec.js` roda nos cinco — sondas de API em `e2e/__snapshots__/compat-probes.json`, árvore das fixtures igual à do Chromium, carga sem erro e sem requisição externa, edição com diff simulado, repositório GitHub simulado por `page.route` e capturas para revisão visual; `e2e/apply-flow.spec.js` também roda no Chrome e no Edge instalados.
- `docs/LOCAL-SETUP.md`: navegadores exigidos pelo E2E e a trava `/tmp/layers-e2e.lock` que serializa as execuções na porta 5180 compartilhada.

**Fixed:**
- Sem File System Access (Firefox, Safari), a recusa de rascunho, aprovação e exportação dizia "Conecte a pasta local para gravar.", o que não é possível nesses navegadores; agora diz que o navegador não grava em disco e indica Chrome ou Edge.

**Perf:**
- N/A — o app só ganha uma escolha de texto por `window.showDirectoryPicker` num toast de recusa (caminho frio, um clique); o resto é teste E2E e configuração do Playwright.

## Arquivos tocados

### src (2)

- [`e2e/browser-compat.spec.js`](../../../e2e/browser-compat.spec.js) — A (+234/-0)
- [`playwright.config.js`](../../../playwright.config.js) — M (+15/-3)

### doc (8)

- [`changelog.d/feature-261014-0-s5-7-browser-compat.md`](../../../changelog.d/feature-261014-0-s5-7-browser-compat.md) — A (+13/-0)
- [`docs/LOCAL-SETUP.md`](../../LOCAL-SETUP.md) — M (+2/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+3/-3)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+29/-10)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s5-7-browser-compat.md`](../plans/2026-10-14-s5-7-browser-compat.md) — A (+882/-0)
- [`docs/superpowers/reports/2026-10-14-s5-7-compat-evidence.md`](2026-10-14-s5-7-compat-evidence.md) — A (+157/-0)

### config (1)

- [`e2e/__snapshots__/compat-probes.json`](../../../e2e/__snapshots__/compat-probes.json) — A (+122/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+2/-1)

## Testes

_Sem testes adicionados ou modificados no range._

## Commits ↔ changelog

- **Added:** Projetos Playwright `chrome`, `msedge`, `firefox` e `webkit` ao lado do `chromium` (que segue rodando toda a suíte): `e2e/browser-compat.spec.js` roda nos cinco — sondas de API em `e2e/__snapshots__/compat-probes.json`, árvore das fixtures igual à do Chromium, carga sem erro e sem requisição externa, edição com diff simulado, repositório GitHub simulado por `page.route` e capturas para revisão visual; `e2e/apply-flow.spec.js` também roda no Chrome e no Edge instalados.
  - [`a134f0e`](https://github.com/brunomaida/Layers/commit/a134f0ef03b4fdc69e033a4c7f17dbb89a74d0ea) docs: add S5.7 browser compatibility plan (S5.7)
  - [`4d07416`](https://github.com/brunomaida/Layers/commit/4d0741627d942d9c29206faf58c4e7d77f48eb42) docs: apply review edits to S5.7 plan (S5.7)
  - [`2a854fc`](https://github.com/brunomaida/Layers/commit/2a854fc270f3f0626e35064c5a59e5e1e3f35910) test(e2e): add chrome, msedge, firefox and webkit projects (S5.7 Task 1)
  - [`ead9127`](https://github.com/brunomaida/Layers/commit/ead912776591b10b35d1bb3ce81ce7c40f6e0323) test(e2e): cross-engine read, edit and probe matrix (S5.7 Task 2)
  - [`4f37a8f`](https://github.com/brunomaida/Layers/commit/4f37a8fe98be3593e7281a8f3a88e1c37e1a0a69) fix: read-only refusal names the browser when it cannot write (S5.7 Task 3)
  - [`30d6c47`](https://github.com/brunomaida/Layers/commit/30d6c472f8a6ac7d0f035390adeb86d0b97d5c0d) test(e2e): GitHub source read-only on every engine, mocked (S5.7 Task 4)
  - [`0781762`](https://github.com/brunomaida/Layers/commit/0781762971db531514ff466fe6e42d86affc8f0e) test(e2e): per-engine screenshots for the manual visual review (S5.7 Task 5)
  - [`75b7efc`](https://github.com/brunomaida/Layers/commit/75b7efc877b06df0e33fb0bae70c619dfec93309) docs: add S5.7 browser compatibility evidence (S5.7 Task 6)
  - [`3511b67`](https://github.com/brunomaida/Layers/commit/3511b675122d780539755c767cf99d9027b374b8) test(e2e): tighten browser-compat after review (S5.7 Task 2)
  - [`b18fecc`](https://github.com/brunomaida/Layers/commit/b18fecc6d6f8aea1592950d2cb7b0c9d80ce95e5) docs: correct compat evidence overclaims (S5.7 Task 6)
  - [`106cf15`](https://github.com/brunomaida/Layers/commit/106cf1539f3d840273323ccae5b0f0213496a7d5) docs: document E2E browsers, add S5.7 changelog fragment and refresh the docs index (S5.7 Task 7)
- **Added:** `docs/LOCAL-SETUP.md`: navegadores exigidos pelo E2E e a trava `/tmp/layers-e2e.lock` que serializa as execuções na porta 5180 compartilhada.
  - [`28af780`](https://github.com/brunomaida/Layers/commit/28af780b84c68814a25e289e53723fdf33883557) docs: start S5.7 in the tracker (S5.7)
  - [`a134f0e`](https://github.com/brunomaida/Layers/commit/a134f0ef03b4fdc69e033a4c7f17dbb89a74d0ea) docs: add S5.7 browser compatibility plan (S5.7)
  - [`4d07416`](https://github.com/brunomaida/Layers/commit/4d0741627d942d9c29206faf58c4e7d77f48eb42) docs: apply review edits to S5.7 plan (S5.7)
  - [`2a854fc`](https://github.com/brunomaida/Layers/commit/2a854fc270f3f0626e35064c5a59e5e1e3f35910) test(e2e): add chrome, msedge, firefox and webkit projects (S5.7 Task 1)
  - [`ead9127`](https://github.com/brunomaida/Layers/commit/ead912776591b10b35d1bb3ce81ce7c40f6e0323) test(e2e): cross-engine read, edit and probe matrix (S5.7 Task 2)
  - [`30d6c47`](https://github.com/brunomaida/Layers/commit/30d6c472f8a6ac7d0f035390adeb86d0b97d5c0d) test(e2e): GitHub source read-only on every engine, mocked (S5.7 Task 4)
  - [`0781762`](https://github.com/brunomaida/Layers/commit/0781762971db531514ff466fe6e42d86affc8f0e) test(e2e): per-engine screenshots for the manual visual review (S5.7 Task 5)
  - [`75b7efc`](https://github.com/brunomaida/Layers/commit/75b7efc877b06df0e33fb0bae70c619dfec93309) docs: add S5.7 browser compatibility evidence (S5.7 Task 6)
  - [`3511b67`](https://github.com/brunomaida/Layers/commit/3511b675122d780539755c767cf99d9027b374b8) test(e2e): tighten browser-compat after review (S5.7 Task 2)
  - [`b18fecc`](https://github.com/brunomaida/Layers/commit/b18fecc6d6f8aea1592950d2cb7b0c9d80ce95e5) docs: correct compat evidence overclaims (S5.7 Task 6)
  - [`106cf15`](https://github.com/brunomaida/Layers/commit/106cf1539f3d840273323ccae5b0f0213496a7d5) docs: document E2E browsers, add S5.7 changelog fragment and refresh the docs index (S5.7 Task 7)
  - [`48d122c`](https://github.com/brunomaida/Layers/commit/48d122ccced4941568a34536b4375ec68a5ad866) docs: rebuild the tracker data for S5.7 (S5.7)
  - [`bb2213f`](https://github.com/brunomaida/Layers/commit/bb2213f5313b6c026282ffbde496619351a2a5b2) docs: mark checklist E compatibility partial pending the manual M1/M2 checks (S5.7 Task 7)
- **Fixed:** Sem File System Access (Firefox, Safari), a recusa de rascunho, aprovação e exportação dizia "Conecte a pasta local para gravar.", o que não é possível nesses navegadores; agora diz que o navegador não grava em disco e indica Chrome ou Edge.
  - [`2a854fc`](https://github.com/brunomaida/Layers/commit/2a854fc270f3f0626e35064c5a59e5e1e3f35910) test(e2e): add chrome, msedge, firefox and webkit projects (S5.7 Task 1)
- **Perf:** N/A — o app só ganha uma escolha de texto por `window.showDirectoryPicker` num toast de recusa (caminho frio, um clique); o resto é teste E2E e configuração do Playwright.
  - [`2a854fc`](https://github.com/brunomaida/Layers/commit/2a854fc270f3f0626e35064c5a59e5e1e3f35910) test(e2e): add chrome, msedge, firefox and webkit projects (S5.7 Task 1)
  - [`ead9127`](https://github.com/brunomaida/Layers/commit/ead912776591b10b35d1bb3ce81ce7c40f6e0323) test(e2e): cross-engine read, edit and probe matrix (S5.7 Task 2)
  - [`30d6c47`](https://github.com/brunomaida/Layers/commit/30d6c472f8a6ac7d0f035390adeb86d0b97d5c0d) test(e2e): GitHub source read-only on every engine, mocked (S5.7 Task 4)
  - [`0781762`](https://github.com/brunomaida/Layers/commit/0781762971db531514ff466fe6e42d86affc8f0e) test(e2e): per-engine screenshots for the manual visual review (S5.7 Task 5)
  - [`3511b67`](https://github.com/brunomaida/Layers/commit/3511b675122d780539755c767cf99d9027b374b8) test(e2e): tighten browser-compat after review (S5.7 Task 2)
  - [`106cf15`](https://github.com/brunomaida/Layers/commit/106cf1539f3d840273323ccae5b0f0213496a7d5) docs: document E2E browsers, add S5.7 changelog fragment and refresh the docs index (S5.7 Task 7)

### Todos os commits

- [`28af780`](https://github.com/brunomaida/Layers/commit/28af780b84c68814a25e289e53723fdf33883557) docs: start S5.7 in the tracker (S5.7)
- [`a134f0e`](https://github.com/brunomaida/Layers/commit/a134f0ef03b4fdc69e033a4c7f17dbb89a74d0ea) docs: add S5.7 browser compatibility plan (S5.7)
- [`4d07416`](https://github.com/brunomaida/Layers/commit/4d0741627d942d9c29206faf58c4e7d77f48eb42) docs: apply review edits to S5.7 plan (S5.7)
- [`2a854fc`](https://github.com/brunomaida/Layers/commit/2a854fc270f3f0626e35064c5a59e5e1e3f35910) test(e2e): add chrome, msedge, firefox and webkit projects (S5.7 Task 1)
- [`ead9127`](https://github.com/brunomaida/Layers/commit/ead912776591b10b35d1bb3ce81ce7c40f6e0323) test(e2e): cross-engine read, edit and probe matrix (S5.7 Task 2)
- [`4f37a8f`](https://github.com/brunomaida/Layers/commit/4f37a8fe98be3593e7281a8f3a88e1c37e1a0a69) fix: read-only refusal names the browser when it cannot write (S5.7 Task 3)
- [`30d6c47`](https://github.com/brunomaida/Layers/commit/30d6c472f8a6ac7d0f035390adeb86d0b97d5c0d) test(e2e): GitHub source read-only on every engine, mocked (S5.7 Task 4)
- [`0781762`](https://github.com/brunomaida/Layers/commit/0781762971db531514ff466fe6e42d86affc8f0e) test(e2e): per-engine screenshots for the manual visual review (S5.7 Task 5)
- [`75b7efc`](https://github.com/brunomaida/Layers/commit/75b7efc877b06df0e33fb0bae70c619dfec93309) docs: add S5.7 browser compatibility evidence (S5.7 Task 6)
- [`3511b67`](https://github.com/brunomaida/Layers/commit/3511b675122d780539755c767cf99d9027b374b8) test(e2e): tighten browser-compat after review (S5.7 Task 2)
- [`b18fecc`](https://github.com/brunomaida/Layers/commit/b18fecc6d6f8aea1592950d2cb7b0c9d80ce95e5) docs: correct compat evidence overclaims (S5.7 Task 6)
- [`106cf15`](https://github.com/brunomaida/Layers/commit/106cf1539f3d840273323ccae5b0f0213496a7d5) docs: document E2E browsers, add S5.7 changelog fragment and refresh the docs index (S5.7 Task 7)
- [`48d122c`](https://github.com/brunomaida/Layers/commit/48d122ccced4941568a34536b4375ec68a5ad866) docs: rebuild the tracker data for S5.7 (S5.7)
- [`bb2213f`](https://github.com/brunomaida/Layers/commit/bb2213f5313b6c026282ffbde496619351a2a5b2) docs: mark checklist E compatibility partial pending the manual M1/M2 checks (S5.7 Task 7)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
