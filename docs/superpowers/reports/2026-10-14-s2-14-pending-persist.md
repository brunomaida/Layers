# Implementation Report — s2-14-pending-persist

- **Branch:** `feature/261014-0-s2-14-pending-persist`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 10:08 → 2026-10-14 11:38
- **Status:** `final`
- **Spec:** [docs\superpowers\specs\2026-10-14-s2-14-pending-persist-design.md](../specs/2026-10-14-s2-14-pending-persist-design.md)
- **Gerado em:** 2026-10-14 11:39

## Resumo

**Layers — persistência de ajustes pendentes (S2.14)**

title: "Layers — persistência de ajustes pendentes (S2.14)" type: spec solution: Layers status: draft created: 2026-10-14 O Layers registra ajustes de estilo ainda não gravados em `changes[]` (`{ key, id, ids, prop, from, to, fromInline, scope, decided, scopedSel, … }`) e escreve o valor em `el.style` para o preview ao vivo. A lista vive só em memória: `loadProject` a zera e um reload da página a descarta. A fatia 4 persistiu interface, histórico e sessão (`layers/v1/*`) e deixou o ajuste pendente de fora de propósito. O item vem do checklist B: "Persistência de `changes` pendentes entre reloa…

## Solicitação & Spec

### Spec definida

**Layers — persistência de ajustes pendentes (S2.14)**

title: "Layers — persistência de ajustes pendentes (S2.14)" type: spec solution: Layers status: draft created: 2026-10-14 O Layers registra ajustes de estilo ainda não gravados em `changes[]` (`{ key, id, ids, prop, from, to, fromInline, scope, decided, scopedSel, … }`) e escreve o valor em `el.style` para o preview ao vivo. A lista vive só em memória: `loadProject` a zera e um reload da página a descarta. A fatia 4 persistiu interface, histórico e sessão (`layers/v1/*`) e deixou o ajuste pendente de fora de propósito. O item vem do checklist B: "Persistência de `changes` pendentes entre reloa…

[Ver spec completa: `docs\superpowers\specs\2026-10-14-s2-14-pending-persist-design.md`](../specs/2026-10-14-s2-14-pending-persist-design.md)

## Mudanças

### Added (4)

- `changelog.d/feature-261014-0-s2-14-pending-persist.md` (+10/-0, doc)
- `docs/superpowers/plans/2026-10-14-s2-14-pending-persist.md` (+708/-0, doc)
- `docs/superpowers/specs/2026-10-14-s2-14-pending-persist-design.md` (+121/-0, test)
- `e2e/pending-persist.spec.js` (+81/-0, src)

### Changed (9)

- `docs/ARCHITECTURE.md` (+8/-2, doc)
- `docs/LOCAL-SETUP.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/_index.md` (+2/-0, doc)
- `docs/roadmap.data.json` (+29/-16, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+62/-6, other)
- `lib/layers-core.js` (+95/-2, src)
- `test/layers-core.test.js` (+126/-0, test)

### Changelog fragment

**Added:**
- Ajustes pendentes sobrevivem a recarregar a página ou reabrir o projeto: `changes[]` é gravado em `layers/v1/pending` (por projeto, teto de 200, expira em 30 dias) e volta ao preview com toast. A validade é tudo-ou-nada por hash de `layers.json`, mock, `.css` e `dcSource`; fonte diferente descarta com aviso, fonte que falhou na leitura preserva a entrada. `LayersCore.sourceHash`, `restorePlan`, `getPending` e `setPending` (puros, testados). Fora: pilha de undo/redo e rascunho de código.
- `e2e/pending-persist.spec.js`: restauração após reload, desfazer até vazio e fonte alterada.

**Perf:**
- N/A — um `JSON.stringify` de `changes[]` por rajada de 400 ms e um hash linear das fontes já lidas por carga; nada no caminho de câmera (estimado).

## Arquivos tocados

### src (2)

- [`e2e/pending-persist.spec.js`](../../../e2e/pending-persist.spec.js) — A (+81/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+95/-2)

### test (2)

- [`docs/superpowers/specs/2026-10-14-s2-14-pending-persist-design.md`](../specs/2026-10-14-s2-14-pending-persist-design.md) — A (+121/-0)
- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+126/-0)

### doc (8)

- [`changelog.d/feature-261014-0-s2-14-pending-persist.md`](../../../changelog.d/feature-261014-0-s2-14-pending-persist.md) — A (+10/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+8/-2)
- [`docs/LOCAL-SETUP.md`](../../LOCAL-SETUP.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+2/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+29/-16)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s2-14-pending-persist.md`](../plans/2026-10-14-s2-14-pending-persist.md) — A (+708/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+62/-6)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** Ajustes pendentes sobrevivem a recarregar a página ou reabrir o projeto: `changes[]` é gravado em `layers/v1/pending` (por projeto, teto de 200, expira em 30 dias) e volta ao preview com toast. A validade é tudo-ou-nada por hash de `layers.json`, mock, `.css` e `dcSource`; fonte diferente descarta com aviso, fonte que falhou na leitura preserva a entrada. `LayersCore.sourceHash`, `restorePlan`, `getPending` e `setPending` (puros, testados). Fora: pilha de undo/redo e rascunho de código.
  - [`c3e04ee`](https://github.com/brunomaida/Layers/commit/c3e04eebd8eda6553a82c990af0762018437d310) docs(spec): add S2.14 pending changes persistence design (S2.14)
  - [`14e7d35`](https://github.com/brunomaida/Layers/commit/14e7d358febe8399657dc3fd54d0e2cee83dde97) docs(spec): validate pending changes by source hash and fix review findings (S2.14)
  - [`8e8426d`](https://github.com/brunomaida/Layers/commit/8e8426d5bcef73d004d1dd4ef237f78f81eb539e) docs(spec): fold second review into S2.14 pending persistence (S2.14)
  - [`7c272f7`](https://github.com/brunomaida/Layers/commit/7c272f715e6ae0d1a60ac6152f200cb84ca4e833) docs(plan): add S2.14 pending persistence implementation plan and link it in the tracker (S2.14)
  - [`cd34ef8`](https://github.com/brunomaida/Layers/commit/cd34ef8c92b60c61f610b44d23cbe13b471967ad) feat(core): sourceHash, restorePlan and pending storage for persisted changes (S2.14 Task A)
  - [`e2a0ae4`](https://github.com/brunomaida/Layers/commit/e2a0ae494d05c6d1809bb79148d96ded573743cf) feat(editor): persist pending changes across reloads with source-hash validation (S2.14 Task B)
  - [`ad33479`](https://github.com/brunomaida/Layers/commit/ad33479ebc367d9216da400b1dc95d9dee5d7b87) test(e2e): pending changes survive reload, undo-to-empty and source change (S2.14 Task C)
  - [`4261e09`](https://github.com/brunomaida/Layers/commit/4261e0944a943e219a74f85acf6794e1322e8464) fix(editor): keep other tabs' pending entry on reload and hash only rewritten sources (S2.14)
  - [`fb6b5f6`](https://github.com/brunomaida/Layers/commit/fb6b5f6ff94187063e0a8e74451f3f744cb28189) fix(core): drop the stored pending entry when its rewrite fails (S2.14)
- **Added:** `e2e/pending-persist.spec.js`: restauração após reload, desfazer até vazio e fonte alterada.
  - [`c3e04ee`](https://github.com/brunomaida/Layers/commit/c3e04eebd8eda6553a82c990af0762018437d310) docs(spec): add S2.14 pending changes persistence design (S2.14)
  - [`14e7d35`](https://github.com/brunomaida/Layers/commit/14e7d358febe8399657dc3fd54d0e2cee83dde97) docs(spec): validate pending changes by source hash and fix review findings (S2.14)
  - [`8e8426d`](https://github.com/brunomaida/Layers/commit/8e8426d5bcef73d004d1dd4ef237f78f81eb539e) docs(spec): fold second review into S2.14 pending persistence (S2.14)
  - [`7c272f7`](https://github.com/brunomaida/Layers/commit/7c272f715e6ae0d1a60ac6152f200cb84ca4e833) docs(plan): add S2.14 pending persistence implementation plan and link it in the tracker (S2.14)
  - [`cd34ef8`](https://github.com/brunomaida/Layers/commit/cd34ef8c92b60c61f610b44d23cbe13b471967ad) feat(core): sourceHash, restorePlan and pending storage for persisted changes (S2.14 Task A)
  - [`e2a0ae4`](https://github.com/brunomaida/Layers/commit/e2a0ae494d05c6d1809bb79148d96ded573743cf) feat(editor): persist pending changes across reloads with source-hash validation (S2.14 Task B)
  - [`ad33479`](https://github.com/brunomaida/Layers/commit/ad33479ebc367d9216da400b1dc95d9dee5d7b87) test(e2e): pending changes survive reload, undo-to-empty and source change (S2.14 Task C)
  - [`4261e09`](https://github.com/brunomaida/Layers/commit/4261e0944a943e219a74f85acf6794e1322e8464) fix(editor): keep other tabs' pending entry on reload and hash only rewritten sources (S2.14)
  - [`fb6b5f6`](https://github.com/brunomaida/Layers/commit/fb6b5f6ff94187063e0a8e74451f3f744cb28189) fix(core): drop the stored pending entry when its rewrite fails (S2.14)
- **Perf:** N/A — um `JSON.stringify` de `changes[]` por rajada de 400 ms e um hash linear das fontes já lidas por carga; nada no caminho de câmera (estimado).
  - [`c3e04ee`](https://github.com/brunomaida/Layers/commit/c3e04eebd8eda6553a82c990af0762018437d310) docs(spec): add S2.14 pending changes persistence design (S2.14)
  - [`14e7d35`](https://github.com/brunomaida/Layers/commit/14e7d358febe8399657dc3fd54d0e2cee83dde97) docs(spec): validate pending changes by source hash and fix review findings (S2.14)
  - [`cd34ef8`](https://github.com/brunomaida/Layers/commit/cd34ef8c92b60c61f610b44d23cbe13b471967ad) feat(core): sourceHash, restorePlan and pending storage for persisted changes (S2.14 Task A)
  - [`e2a0ae4`](https://github.com/brunomaida/Layers/commit/e2a0ae494d05c6d1809bb79148d96ded573743cf) feat(editor): persist pending changes across reloads with source-hash validation (S2.14 Task B)
  - [`ad33479`](https://github.com/brunomaida/Layers/commit/ad33479ebc367d9216da400b1dc95d9dee5d7b87) test(e2e): pending changes survive reload, undo-to-empty and source change (S2.14 Task C)
  - [`4261e09`](https://github.com/brunomaida/Layers/commit/4261e0944a943e219a74f85acf6794e1322e8464) fix(editor): keep other tabs' pending entry on reload and hash only rewritten sources (S2.14)

### Todos os commits

- [`d31aa4c`](https://github.com/brunomaida/Layers/commit/d31aa4c47d477d833bb40c66e7c8c9a113bd36ae) docs(roadmap): mark S2.14 in-progress (S2.14)
- [`c3e04ee`](https://github.com/brunomaida/Layers/commit/c3e04eebd8eda6553a82c990af0762018437d310) docs(spec): add S2.14 pending changes persistence design (S2.14)
- [`14e7d35`](https://github.com/brunomaida/Layers/commit/14e7d358febe8399657dc3fd54d0e2cee83dde97) docs(spec): validate pending changes by source hash and fix review findings (S2.14)
- [`8e8426d`](https://github.com/brunomaida/Layers/commit/8e8426d5bcef73d004d1dd4ef237f78f81eb539e) docs(spec): fold second review into S2.14 pending persistence (S2.14)
- [`7c272f7`](https://github.com/brunomaida/Layers/commit/7c272f715e6ae0d1a60ac6152f200cb84ca4e833) docs(plan): add S2.14 pending persistence implementation plan and link it in the tracker (S2.14)
- [`cd34ef8`](https://github.com/brunomaida/Layers/commit/cd34ef8c92b60c61f610b44d23cbe13b471967ad) feat(core): sourceHash, restorePlan and pending storage for persisted changes (S2.14 Task A)
- [`e2a0ae4`](https://github.com/brunomaida/Layers/commit/e2a0ae494d05c6d1809bb79148d96ded573743cf) feat(editor): persist pending changes across reloads with source-hash validation (S2.14 Task B)
- [`ad33479`](https://github.com/brunomaida/Layers/commit/ad33479ebc367d9216da400b1dc95d9dee5d7b87) test(e2e): pending changes survive reload, undo-to-empty and source change (S2.14 Task C)
- [`9d32c8d`](https://github.com/brunomaida/Layers/commit/9d32c8d4b40675b1381bf4527ac8814e24c08cb9) docs: close S2.14 with changelog fragment, checklist and architecture (S2.14 Task D)
- [`4261e09`](https://github.com/brunomaida/Layers/commit/4261e0944a943e219a74f85acf6794e1322e8464) fix(editor): keep other tabs' pending entry on reload and hash only rewritten sources (S2.14)
- [`fb6b5f6`](https://github.com/brunomaida/Layers/commit/fb6b5f6ff94187063e0a8e74451f3f744cb28189) fix(core): drop the stored pending entry when its rewrite fails (S2.14)

## Custo (tokens + tempo)

| Sessão | Início | Duração | Input | Output | Cache read | Cache create |
|---|---|---:|---:|---:|---:|---:|
| `2f71ca1e` | 2026-10-14 09:56 | 1.71h | 438 | 356.9k | 39.22M | 738.2k |
| `agent-a0` | 2026-10-14 10:10 | 10.8m | 54 | 19.8k | 1.51M | 156.7k |
| `agent-a4` | 2026-10-14 10:27 | 11.9m | 64 | 33.0k | 1.79M | 226.3k |
| `agent-aa` | 2026-10-14 11:01 | 18.4m | 70 | 16.2k | 1.91M | 178.5k |
| `agent-ad` | 2026-10-14 11:21 | 16.5m | 104 | 18.7k | 3.92M | 201.9k |
| **Total (5)** | — | **2.67h** | **730** | **444.7k** | **48.34M** | **1.50M** |
