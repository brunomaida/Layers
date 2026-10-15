# Implementation Report — s7-3-support-matrix

- **Branch:** `docs/261014-0-s7-3-support-matrix`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 22:36 → 2026-10-14 22:49
- **Status:** `final`
- **Gerado em:** 2026-10-14 22:49

## Resumo

Nova `docs/support-matrix.md`: navegadores × funcionalidades (carga, leitura por origem, edição, diff simulado, gravação, exportação, configuração, visual), versões testadas, sistema operacional e ambiente de desenvolvimento; cada célula cita um teste E2E ou fica "não verificado" com o passo manual pendente (M1-M5) ou a lacuna (L1-L3).

## Mudanças

### Added (4)

- `changelog.d/docs-261014-0-s7-3-support-matrix.md` (+16/-0, doc)
- `docs/superpowers/plans/2026-10-14-s7-3-support-matrix.md` (+738/-0, doc)
- `docs/support-matrix.md` (+127/-0, doc)
- `test/support-matrix.test.js` (+65/-0, test)

### Changed (6)

- `README.md` (+2/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/TOPOLOGY.md` (+1/-1, doc)
- `docs/_index.md` (+3/-2, doc)
- `docs/roadmap.data.json` (+19/-12, doc)
- `docs/roadmap.md` (+1/-1, doc)

### Changelog fragment

**Docs:**
- Nova `docs/support-matrix.md`: navegadores × funcionalidades (carga, leitura por origem, edição, diff simulado, gravação, exportação, configuração, visual), versões testadas, sistema operacional e ambiente de desenvolvimento; cada célula cita um teste E2E ou fica "não verificado" com o passo manual pendente (M1-M5) ou a lacuna (L1-L3).
- README (Requisitos, Estrutura) e docs/TOPOLOGY.md (fronteira App → disco) apontam para a matriz; checklist G "Matriz de suporte" fechado.

**Tests:**
- `test/support-matrix.test.js`: `npm test` falha se a matriz divergir de `e2e/__snapshots__/compat-probes.json`, citar teste inexistente em `e2e/`, citar mensagem ausente do `index.html` ou ainda citar M1/M2 com a compatibilidade do checklist E fechada.

**Perf:**
- N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.

## Arquivos tocados

### test (1)

- [`test/support-matrix.test.js`](../../../test/support-matrix.test.js) — A (+65/-0)

### doc (9)

- [`README.md`](../../../README.md) — M (+2/-1)
- [`changelog.d/docs-261014-0-s7-3-support-matrix.md`](../../../changelog.d/docs-261014-0-s7-3-support-matrix.md) — A (+16/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/TOPOLOGY.md`](../../TOPOLOGY.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+3/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+19/-12)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s7-3-support-matrix.md`](../plans/2026-10-14-s7-3-support-matrix.md) — A (+738/-0)
- [`docs/support-matrix.md`](../../support-matrix.md) — A (+127/-0)

## Arquitetura impactada

**`docs/TOPOLOGY.md` diff:**

```diff
diff --git a/docs/TOPOLOGY.md b/docs/TOPOLOGY.md
index 728ef67..f3ca21f 100644
--- a/docs/TOPOLOGY.md
+++ b/docs/TOPOLOGY.md
@@ -96,7 +96,7 @@ verifica a ordem das tags.
 
 | Fronteira | Como atravessa | Estado |
 |---|---|---|
-| App → disco | File System Access API (`showDirectoryPicker`, `writeInto`/`writeText`) | Chrome/Edge apenas |
+| App → disco | File System Access API (`showDirectoryPicker`, `writeInto`/`writeText`) | Chrome/Edge apenas ([matriz de suporte](support-matrix.md)) |
 | App → app alvo | DOM sanitizado num shadow root fora da tela; nenhum script do projeto roda na origem do editor | Definitivo. Iframe descartado (ADR 2026-09-18); o snapshot headless de apps JS é um processo separado, ainda não implementado |
 | App → rede | Nenhuma | Verificado: 12/12 requisições em `localhost` |
```

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/support-matrix.test.js`](../../../test/support-matrix.test.js)

## Commits ↔ changelog

- **Docs:** Nova `docs/support-matrix.md`: navegadores × funcionalidades (carga, leitura por origem, edição, diff simulado, gravação, exportação, configuração, visual), versões testadas, sistema operacional e ambiente de desenvolvimento; cada célula cita um teste E2E ou fica "não verificado" com o passo manual pendente (M1-M5) ou a lacuna (L1-L3).
  - [`523c8e0`](https://github.com/brunomaida/Layers/commit/523c8e025cc8cf63e0d17350b99f11e90fe2c1cd) docs: start S7.3 in the tracker (S7.3)
  - [`b37c875`](https://github.com/brunomaida/Layers/commit/b37c87594f12e2b51f0d47458423f1de975e8f5a) docs: add S7.3 support matrix plan (S7.3)
  - [`2206b92`](https://github.com/brunomaida/Layers/commit/2206b923b6893a4d450b4208c0e341df50ea920b) docs: apply review edits to S7.3 plan (S7.3)
  - [`0a8c9d4`](https://github.com/brunomaida/Layers/commit/0a8c9d4783d5de7c9d9018b79db2c01088b2e351) docs: add the browser support matrix (S7.3 Task 2)
  - [`c36e10e`](https://github.com/brunomaida/Layers/commit/c36e10edb212ffb40dd423f2d5d1cd2dc25a3b8d) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`be25cf3`](https://github.com/brunomaida/Layers/commit/be25cf3c0f768c75e49c427d313633b7159975f2) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`ef0e398`](https://github.com/brunomaida/Layers/commit/ef0e398771cc5e6eb2386d7dd12b0ed66409ee66) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
- **Docs:** README (Requisitos, Estrutura) e docs/TOPOLOGY.md (fronteira App → disco) apontam para a matriz; checklist G "Matriz de suporte" fechado.
  - [`523c8e0`](https://github.com/brunomaida/Layers/commit/523c8e025cc8cf63e0d17350b99f11e90fe2c1cd) docs: start S7.3 in the tracker (S7.3)
  - [`b37c875`](https://github.com/brunomaida/Layers/commit/b37c87594f12e2b51f0d47458423f1de975e8f5a) docs: add S7.3 support matrix plan (S7.3)
  - [`2206b92`](https://github.com/brunomaida/Layers/commit/2206b923b6893a4d450b4208c0e341df50ea920b) docs: apply review edits to S7.3 plan (S7.3)
  - [`0a8c9d4`](https://github.com/brunomaida/Layers/commit/0a8c9d4783d5de7c9d9018b79db2c01088b2e351) docs: add the browser support matrix (S7.3 Task 2)
  - [`c36e10e`](https://github.com/brunomaida/Layers/commit/c36e10edb212ffb40dd423f2d5d1cd2dc25a3b8d) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`be25cf3`](https://github.com/brunomaida/Layers/commit/be25cf3c0f768c75e49c427d313633b7159975f2) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`ef0e398`](https://github.com/brunomaida/Layers/commit/ef0e398771cc5e6eb2386d7dd12b0ed66409ee66) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
- **Tests:** `test/support-matrix.test.js`: `npm test` falha se a matriz divergir de `e2e/__snapshots__/compat-probes.json`, citar teste inexistente em `e2e/`, citar mensagem ausente do `index.html` ou ainda citar M1/M2 com a compatibilidade do checklist E fechada.
  - [`b37c875`](https://github.com/brunomaida/Layers/commit/b37c87594f12e2b51f0d47458423f1de975e8f5a) docs: add S7.3 support matrix plan (S7.3)
  - [`0a8c9d4`](https://github.com/brunomaida/Layers/commit/0a8c9d4783d5de7c9d9018b79db2c01088b2e351) docs: add the browser support matrix (S7.3 Task 2)
  - [`c36e10e`](https://github.com/brunomaida/Layers/commit/c36e10edb212ffb40dd423f2d5d1cd2dc25a3b8d) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`be25cf3`](https://github.com/brunomaida/Layers/commit/be25cf3c0f768c75e49c427d313633b7159975f2) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`ef0e398`](https://github.com/brunomaida/Layers/commit/ef0e398771cc5e6eb2386d7dd12b0ed66409ee66) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
- **Perf:** N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
  - [`523c8e0`](https://github.com/brunomaida/Layers/commit/523c8e025cc8cf63e0d17350b99f11e90fe2c1cd) docs: start S7.3 in the tracker (S7.3)
  - [`b37c875`](https://github.com/brunomaida/Layers/commit/b37c87594f12e2b51f0d47458423f1de975e8f5a) docs: add S7.3 support matrix plan (S7.3)
  - [`2206b92`](https://github.com/brunomaida/Layers/commit/2206b923b6893a4d450b4208c0e341df50ea920b) docs: apply review edits to S7.3 plan (S7.3)
  - [`0a8c9d4`](https://github.com/brunomaida/Layers/commit/0a8c9d4783d5de7c9d9018b79db2c01088b2e351) docs: add the browser support matrix (S7.3 Task 2)
  - [`c36e10e`](https://github.com/brunomaida/Layers/commit/c36e10edb212ffb40dd423f2d5d1cd2dc25a3b8d) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`be25cf3`](https://github.com/brunomaida/Layers/commit/be25cf3c0f768c75e49c427d313633b7159975f2) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`ef0e398`](https://github.com/brunomaida/Layers/commit/ef0e398771cc5e6eb2386d7dd12b0ed66409ee66) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)

### Todos os commits

- [`523c8e0`](https://github.com/brunomaida/Layers/commit/523c8e025cc8cf63e0d17350b99f11e90fe2c1cd) docs: start S7.3 in the tracker (S7.3)
- [`b37c875`](https://github.com/brunomaida/Layers/commit/b37c87594f12e2b51f0d47458423f1de975e8f5a) docs: add S7.3 support matrix plan (S7.3)
- [`2206b92`](https://github.com/brunomaida/Layers/commit/2206b923b6893a4d450b4208c0e341df50ea920b) docs: apply review edits to S7.3 plan (S7.3)
- [`0a8c9d4`](https://github.com/brunomaida/Layers/commit/0a8c9d4783d5de7c9d9018b79db2c01088b2e351) docs: add the browser support matrix (S7.3 Task 2)
- [`c36e10e`](https://github.com/brunomaida/Layers/commit/c36e10edb212ffb40dd423f2d5d1cd2dc25a3b8d) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
- [`be25cf3`](https://github.com/brunomaida/Layers/commit/be25cf3c0f768c75e49c427d313633b7159975f2) docs: link the support matrix from README and topology (S7.3 Task 4)
- [`ef0e398`](https://github.com/brunomaida/Layers/commit/ef0e398771cc5e6eb2386d7dd12b0ed66409ee66) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
