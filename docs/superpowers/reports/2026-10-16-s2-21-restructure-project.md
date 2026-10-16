# Implementation Report — s2-21-restructure-project

- **Branch:** `feature/261016-0-s2-21-restructure-project`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-16 10:08 → 2026-10-16 10:26
- **Status:** `final`
- **Gerado em:** 2026-10-16 10:26

## Resumo

Deriva do layout: depois de cada carga o Layers lê o mtime dos `.ts`/`.js` citados em `data-src` e em `root.src` e, quando algum é mais novo que o mock, mostra o banner "Mock mais antigo que a fonte" com o botão "Reanalisar do 0". As fontes citadas passam a ser vigiadas ao focar a janela (`LayersCore.citedSources`, `layoutDrift`, `staleKind`).

## Solicitação & Spec

### Solicitação original

---
title: "S2.21 — restructure project"
type: text-spec
solution: "Layers"
created: 2026-10-16
level: meso
---

### Text spec — S2.21 restructure project

#### Objetivo
- Permitir analizar do 0, um projeto previamente carregado na interface.

#### Escopo
- Sempre que um projeto for carregado, validar se houveram modificações recentes em seus arquivos visuais.
- Com alterações nos arquivos visuais, diferentes da interface atual, questionar o usuário se quer carregar / relear o novo projeto do 0 para absorver e mostrar as diferenças.
- permitir fazer backup de versões anteriores de layouts.
- usar C:\development\wave\src\ui\traval como fonte: UI mudou drasticamente, mas Layers não soube indentificar/reconehcer isso.

## Mudanças

### Added (5)

- `changelog.d/feature-261016-0-s2-21-restructure-project.md` (+13/-0, doc)
- `docs/superpowers/plans/2026-10-14-layers-plano-geral-da-onda-1.md` (+185/-0, doc)
- `docs/superpowers/plans/2026-10-16-s2-21-restructure-project.md` (+171/-0, doc)
- `docs/text-specs/2026-10-16-s2-21-restructure-project.md` (+18/-0, doc)
- `e2e/layout-drift.spec.js` (+156/-0, src)

### Changed (10)

- `docs/ARCHITECTURE.md` (+30/-3, doc)
- `docs/RELEASE-CHECKLIST.md` (+2/-1, doc)
- `docs/_index.md` (+6/-3, doc)
- `docs/layers-json.md` (+1/-1, doc)
- `docs/roadmap.config.json` (+2/-1, doc)
- `docs/roadmap.data.json` (+50/-18, doc)
- `docs/roadmap.md` (+1/-0, doc)
- `index.html` (+53/-6, other)
- `lib/layers-core.js` (+41/-0, src)
- `test/layers-core.test.js` (+88/-0, test)

### Changelog fragment

**Added:**
- Deriva do layout: depois de cada carga o Layers lê o mtime dos `.ts`/`.js` citados em `data-src` e em `root.src` e, quando algum é mais novo que o mock, mostra o banner "Mock mais antigo que a fonte" com o botão "Reanalisar do 0". As fontes citadas passam a ser vigiadas ao focar a janela (`LayersCore.citedSources`, `layoutDrift`, `staleKind`).
- "Reanalisar do 0" (banner e `Projetos ▾`): confirma, guarda o `layers.json` e o mock carregados em `.design-history/layout-<carimbo>/` e relê a pasta como projeto novo (sem seleção, câmera, undo nem ajustes salvos). Se o backup falha, nada é recarregado.

**Changed:**
- O banner de arquivos mudados troca "Recarregar" por "Reanalisar do 0" quando o arquivo mudado é o mock, o `layers.json` ou uma fonte citada; mudança só em folha CSS mantém "Recarregar".

**Perf:**
- estimated — no máximo 50 `getFile()` por carga (um por fonte citada), disparados sem `await` depois de a carga terminar; fora do caminho crítico da carga e do orbit.

## Arquivos tocados

### src (2)

- [`e2e/layout-drift.spec.js`](../../../e2e/layout-drift.spec.js) — A (+156/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+41/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+88/-0)

### doc (11)

- [`changelog.d/feature-261016-0-s2-21-restructure-project.md`](../../../changelog.d/feature-261016-0-s2-21-restructure-project.md) — A (+13/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+30/-3)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-1)
- [`docs/_index.md`](../../_index.md) — M (+6/-3)
- [`docs/layers-json.md`](../../layers-json.md) — M (+1/-1)
- [`docs/roadmap.config.json`](../../roadmap.config.json) — M (+2/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+50/-18)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-0)
- [`docs/superpowers/plans/2026-10-14-layers-plano-geral-da-onda-1.md`](../plans/2026-10-14-layers-plano-geral-da-onda-1.md) — A (+185/-0)
- [`docs/superpowers/plans/2026-10-16-s2-21-restructure-project.md`](../plans/2026-10-16-s2-21-restructure-project.md) — A (+171/-0)
- [`docs/text-specs/2026-10-16-s2-21-restructure-project.md`](../../text-specs/2026-10-16-s2-21-restructure-project.md) — A (+18/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+53/-6)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Deriva do layout: depois de cada carga o Layers lê o mtime dos `.ts`/`.js` citados em `data-src` e em `root.src` e, quando algum é mais novo que o mock, mostra o banner "Mock mais antigo que a fonte" com o botão "Reanalisar do 0". As fontes citadas passam a ser vigiadas ao focar a janela (`LayersCore.citedSources`, `layoutDrift`, `staleKind`).
  - [`69b5fd9`](https://github.com/brunomaida/Layers/commit/69b5fd904613c0175a6f1838839b82f77f15a631) feat: add layout drift helpers to the core (S2.21 Task A)
  - [`5fd842e`](https://github.com/brunomaida/Layers/commit/5fd842e44f3c7eba8706b57cdb32ef29d7c55b31) feat: detect layout drift and add Reanalisar do 0 with layout backup (S2.21 Task B, S2.21 Task C)
  - [`0b13554`](https://github.com/brunomaida/Layers/commit/0b135541b58dbde1ed683fee3fe3f8943e6701f2) docs: document layout drift and Reanalisar do 0, close S2.21 in the tracker (S2.21 Task E)
- **Added:** "Reanalisar do 0" (banner e `Projetos ▾`): confirma, guarda o `layers.json` e o mock carregados em `.design-history/layout-<carimbo>/` e relê a pasta como projeto novo (sem seleção, câmera, undo nem ajustes salvos). Se o backup falha, nada é recarregado.
  - [`69b5fd9`](https://github.com/brunomaida/Layers/commit/69b5fd904613c0175a6f1838839b82f77f15a631) feat: add layout drift helpers to the core (S2.21 Task A)
  - [`5fd842e`](https://github.com/brunomaida/Layers/commit/5fd842e44f3c7eba8706b57cdb32ef29d7c55b31) feat: detect layout drift and add Reanalisar do 0 with layout backup (S2.21 Task B, S2.21 Task C)
  - [`0b13554`](https://github.com/brunomaida/Layers/commit/0b135541b58dbde1ed683fee3fe3f8943e6701f2) docs: document layout drift and Reanalisar do 0, close S2.21 in the tracker (S2.21 Task E)
  - [`9c59ab9`](https://github.com/brunomaida/Layers/commit/9c59ab99f9e7fa0a5dc42d7b250810b2e8f93243) fix: discard saved adjustments on restructure, keep the backup folder-bound and atomic (S2.21 Task C)
- **Changed:** O banner de arquivos mudados troca "Recarregar" por "Reanalisar do 0" quando o arquivo mudado é o mock, o `layers.json` ou uma fonte citada; mudança só em folha CSS mantém "Recarregar".
  - [`5fd842e`](https://github.com/brunomaida/Layers/commit/5fd842e44f3c7eba8706b57cdb32ef29d7c55b31) feat: detect layout drift and add Reanalisar do 0 with layout backup (S2.21 Task B, S2.21 Task C)
  - [`0b13554`](https://github.com/brunomaida/Layers/commit/0b135541b58dbde1ed683fee3fe3f8943e6701f2) docs: document layout drift and Reanalisar do 0, close S2.21 in the tracker (S2.21 Task E)
- **Perf:** estimated — no máximo 50 `getFile()` por carga (um por fonte citada), disparados sem `await` depois de a carga terminar; fora do caminho crítico da carga e do orbit.
  - [`8b90621`](https://github.com/brunomaida/Layers/commit/8b9062194032dbaba6473f4350a8d7fbb9770c01) docs: register S2.21 leaf with spec and plan (S2.21 Task 0)
  - [`69b5fd9`](https://github.com/brunomaida/Layers/commit/69b5fd904613c0175a6f1838839b82f77f15a631) feat: add layout drift helpers to the core (S2.21 Task A)
  - [`5fd842e`](https://github.com/brunomaida/Layers/commit/5fd842e44f3c7eba8706b57cdb32ef29d7c55b31) feat: detect layout drift and add Reanalisar do 0 with layout backup (S2.21 Task B, S2.21 Task C)
  - [`0b13554`](https://github.com/brunomaida/Layers/commit/0b135541b58dbde1ed683fee3fe3f8943e6701f2) docs: document layout drift and Reanalisar do 0, close S2.21 in the tracker (S2.21 Task E)
  - [`9c59ab9`](https://github.com/brunomaida/Layers/commit/9c59ab99f9e7fa0a5dc42d7b250810b2e8f93243) fix: discard saved adjustments on restructure, keep the backup folder-bound and atomic (S2.21 Task C)

### Todos os commits

- [`8b90621`](https://github.com/brunomaida/Layers/commit/8b9062194032dbaba6473f4350a8d7fbb9770c01) docs: register S2.21 leaf with spec and plan (S2.21 Task 0)
- [`69b5fd9`](https://github.com/brunomaida/Layers/commit/69b5fd904613c0175a6f1838839b82f77f15a631) feat: add layout drift helpers to the core (S2.21 Task A)
- [`5fd842e`](https://github.com/brunomaida/Layers/commit/5fd842e44f3c7eba8706b57cdb32ef29d7c55b31) feat: detect layout drift and add Reanalisar do 0 with layout backup (S2.21 Task B, S2.21 Task C)
- [`0b13554`](https://github.com/brunomaida/Layers/commit/0b135541b58dbde1ed683fee3fe3f8943e6701f2) docs: document layout drift and Reanalisar do 0, close S2.21 in the tracker (S2.21 Task E)
- [`9c59ab9`](https://github.com/brunomaida/Layers/commit/9c59ab99f9e7fa0a5dc42d7b250810b2e8f93243) fix: discard saved adjustments on restructure, keep the backup folder-bound and atomic (S2.21 Task C)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `18d52daf` | 2026-10-16 09:48 | 37.7m | 314 | 185.8k | 23.49M | 532.8k |
| `agent-aa` | 2026-10-16 10:13 | 6.6m | 10 | 44 | 22.3k | 64.2k |
| `agent-a2` | 2026-10-16 10:20 | 3.6m | 80 | 11.2k | 1.93M | 176.4k |
| **Total (3)** | — | **47.9m** | **404** | **197.1k** | **25.45M** | **773.4k** |
