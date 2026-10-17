# Implementation Report — s7-3-support-matrix

- **Branch:** `docs/261014-0-s7-3-support-matrix`
- **Range:** `702488e8dd7b..HEAD`
- **Período:** 2026-10-16 22:57 → 2026-10-16 22:59
- **Status:** `final`
- **Gerado em:** 2026-10-16 22:59

## Resumo

Nova `docs/support-matrix.md`: navegadores × funcionalidades (carga, leitura por origem, edição, diff simulado, gravação, exportação, configuração, visual), versões testadas, sistema operacional e ambiente de desenvolvimento; cada célula cita um teste E2E ou fica "não verificado" com o passo manual pendente (M1-M5) ou a lacuna (L1-L3).

## Mudanças

### Added (6)

- `changelog.d/docs-261014-0-s7-3-support-matrix.md` (+16/-0, doc)
- `docs/superpowers/plans/2026-10-14-s7-3-support-matrix.md` (+738/-0, doc)
- `docs/superpowers/reports/2026-10-14-s7-3-support-matrix.html` (+705/-0, doc)
- `docs/superpowers/reports/2026-10-14-s7-3-support-matrix.md` (+153/-0, doc)
- `docs/support-matrix.md` (+129/-0, doc)
- `test/support-matrix.test.js` (+97/-0, test)

### Changed (6)

- `README.md` (+2/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+2/-2, doc)
- `docs/TOPOLOGY.md` (+1/-1, doc)
- `docs/_index.md` (+4/-3, doc)
- `docs/roadmap.data.json` (+31/-12, doc)
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

- [`test/support-matrix.test.js`](../../../test/support-matrix.test.js) — A (+97/-0)

### doc (11)

- [`README.md`](../../../README.md) — M (+2/-1)
- [`changelog.d/docs-261014-0-s7-3-support-matrix.md`](../../../changelog.d/docs-261014-0-s7-3-support-matrix.md) — A (+16/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+2/-2)
- [`docs/TOPOLOGY.md`](../../TOPOLOGY.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+4/-3)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+31/-12)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s7-3-support-matrix.md`](../plans/2026-10-14-s7-3-support-matrix.md) — A (+738/-0)
- [`docs/superpowers/reports/2026-10-14-s7-3-support-matrix.html`](2026-10-14-s7-3-support-matrix.html) — A (+705/-0)
- [`docs/superpowers/reports/2026-10-14-s7-3-support-matrix.md`](2026-10-14-s7-3-support-matrix.md) — A (+153/-0)
- [`docs/support-matrix.md`](../../support-matrix.md) — A (+129/-0)

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
  - [`f425bf8`](https://github.com/brunomaida/Layers/commit/f425bf8ef0034a340f9c49ec44c00898792dc6f6) docs: start S7.3 in the tracker (S7.3)
  - [`c4d6e5f`](https://github.com/brunomaida/Layers/commit/c4d6e5f06269451263403a7dbba6923ab1d7fc77) docs: add S7.3 support matrix plan (S7.3)
  - [`f1e0c8b`](https://github.com/brunomaida/Layers/commit/f1e0c8b0a189f14130e6277337c4423e9bb0599b) docs: apply review edits to S7.3 plan (S7.3)
  - [`32429ed`](https://github.com/brunomaida/Layers/commit/32429ed5d74de3abc18765359ffcfd1a74d5d59b) docs: add the browser support matrix (S7.3 Task 2)
  - [`b9be910`](https://github.com/brunomaida/Layers/commit/b9be9107f0a46c327e89283c9f18adaa37b2445e) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`a7de102`](https://github.com/brunomaida/Layers/commit/a7de1022f02e5811e25479151200ea398c7d140b) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`dd94804`](https://github.com/brunomaida/Layers/commit/dd948040efdd818493984b8d66286ee7ca35b032) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
  - [`a5698ae`](https://github.com/brunomaida/Layers/commit/a5698aeaf2a8090adcc22b0150f31843896c906f) docs: close S7.3 in the tracker with its implementation report (S7.3)
  - [`471fbea`](https://github.com/brunomaida/Layers/commit/471fbea26e58db0697cd4fa4e40875a664deb5eb) test: harden the support matrix guard against false cells (S7.3 Task 3)
  - [`b441d22`](https://github.com/brunomaida/Layers/commit/b441d22376c7f77b7cb28b16823c7c8dde6cc9f5) docs: tighten the support matrix wording (S7.3 Task 2)
  - [`844e9e3`](https://github.com/brunomaida/Layers/commit/844e9e3171b782ffd4f41ac6839f01090d563989) docs: refresh the S7.3 report and tracker (S7.3)
  - [`04649fd`](https://github.com/brunomaida/Layers/commit/04649fdc2bec45efedad9919a79ae525b2732ca7) docs: rebuild the tracker data and index after rebasing S7.3 onto develop (S7.3)
  - [`c191e9d`](https://github.com/brunomaida/Layers/commit/c191e9d3c6e0479537c8c1bbc6dce376025d8611) docs: cite the support matrix and shortcuts docs as delivered in checklist G (S7.3)
  - [`5188c5a`](https://github.com/brunomaida/Layers/commit/5188c5a48315faf565dea42b3ac487faba3b3490) docs: drop stale S3.4 and checklist line refs from the matrix maintenance notes (S7.3)
- **Docs:** README (Requisitos, Estrutura) e docs/TOPOLOGY.md (fronteira App → disco) apontam para a matriz; checklist G "Matriz de suporte" fechado.
  - [`f425bf8`](https://github.com/brunomaida/Layers/commit/f425bf8ef0034a340f9c49ec44c00898792dc6f6) docs: start S7.3 in the tracker (S7.3)
  - [`c4d6e5f`](https://github.com/brunomaida/Layers/commit/c4d6e5f06269451263403a7dbba6923ab1d7fc77) docs: add S7.3 support matrix plan (S7.3)
  - [`f1e0c8b`](https://github.com/brunomaida/Layers/commit/f1e0c8b0a189f14130e6277337c4423e9bb0599b) docs: apply review edits to S7.3 plan (S7.3)
  - [`32429ed`](https://github.com/brunomaida/Layers/commit/32429ed5d74de3abc18765359ffcfd1a74d5d59b) docs: add the browser support matrix (S7.3 Task 2)
  - [`b9be910`](https://github.com/brunomaida/Layers/commit/b9be9107f0a46c327e89283c9f18adaa37b2445e) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`a7de102`](https://github.com/brunomaida/Layers/commit/a7de1022f02e5811e25479151200ea398c7d140b) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`dd94804`](https://github.com/brunomaida/Layers/commit/dd948040efdd818493984b8d66286ee7ca35b032) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
  - [`a5698ae`](https://github.com/brunomaida/Layers/commit/a5698aeaf2a8090adcc22b0150f31843896c906f) docs: close S7.3 in the tracker with its implementation report (S7.3)
  - [`b441d22`](https://github.com/brunomaida/Layers/commit/b441d22376c7f77b7cb28b16823c7c8dde6cc9f5) docs: tighten the support matrix wording (S7.3 Task 2)
  - [`844e9e3`](https://github.com/brunomaida/Layers/commit/844e9e3171b782ffd4f41ac6839f01090d563989) docs: refresh the S7.3 report and tracker (S7.3)
  - [`04649fd`](https://github.com/brunomaida/Layers/commit/04649fdc2bec45efedad9919a79ae525b2732ca7) docs: rebuild the tracker data and index after rebasing S7.3 onto develop (S7.3)
  - [`c191e9d`](https://github.com/brunomaida/Layers/commit/c191e9d3c6e0479537c8c1bbc6dce376025d8611) docs: cite the support matrix and shortcuts docs as delivered in checklist G (S7.3)
  - [`5188c5a`](https://github.com/brunomaida/Layers/commit/5188c5a48315faf565dea42b3ac487faba3b3490) docs: drop stale S3.4 and checklist line refs from the matrix maintenance notes (S7.3)
- **Tests:** `test/support-matrix.test.js`: `npm test` falha se a matriz divergir de `e2e/__snapshots__/compat-probes.json`, citar teste inexistente em `e2e/`, citar mensagem ausente do `index.html` ou ainda citar M1/M2 com a compatibilidade do checklist E fechada.
  - [`c4d6e5f`](https://github.com/brunomaida/Layers/commit/c4d6e5f06269451263403a7dbba6923ab1d7fc77) docs: add S7.3 support matrix plan (S7.3)
  - [`32429ed`](https://github.com/brunomaida/Layers/commit/32429ed5d74de3abc18765359ffcfd1a74d5d59b) docs: add the browser support matrix (S7.3 Task 2)
  - [`b9be910`](https://github.com/brunomaida/Layers/commit/b9be9107f0a46c327e89283c9f18adaa37b2445e) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`a7de102`](https://github.com/brunomaida/Layers/commit/a7de1022f02e5811e25479151200ea398c7d140b) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`dd94804`](https://github.com/brunomaida/Layers/commit/dd948040efdd818493984b8d66286ee7ca35b032) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
  - [`471fbea`](https://github.com/brunomaida/Layers/commit/471fbea26e58db0697cd4fa4e40875a664deb5eb) test: harden the support matrix guard against false cells (S7.3 Task 3)
  - [`b441d22`](https://github.com/brunomaida/Layers/commit/b441d22376c7f77b7cb28b16823c7c8dde6cc9f5) docs: tighten the support matrix wording (S7.3 Task 2)
  - [`04649fd`](https://github.com/brunomaida/Layers/commit/04649fdc2bec45efedad9919a79ae525b2732ca7) docs: rebuild the tracker data and index after rebasing S7.3 onto develop (S7.3)
  - [`c191e9d`](https://github.com/brunomaida/Layers/commit/c191e9d3c6e0479537c8c1bbc6dce376025d8611) docs: cite the support matrix and shortcuts docs as delivered in checklist G (S7.3)
  - [`5188c5a`](https://github.com/brunomaida/Layers/commit/5188c5a48315faf565dea42b3ac487faba3b3490) docs: drop stale S3.4 and checklist line refs from the matrix maintenance notes (S7.3)
- **Perf:** N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
  - [`f425bf8`](https://github.com/brunomaida/Layers/commit/f425bf8ef0034a340f9c49ec44c00898792dc6f6) docs: start S7.3 in the tracker (S7.3)
  - [`c4d6e5f`](https://github.com/brunomaida/Layers/commit/c4d6e5f06269451263403a7dbba6923ab1d7fc77) docs: add S7.3 support matrix plan (S7.3)
  - [`f1e0c8b`](https://github.com/brunomaida/Layers/commit/f1e0c8b0a189f14130e6277337c4423e9bb0599b) docs: apply review edits to S7.3 plan (S7.3)
  - [`32429ed`](https://github.com/brunomaida/Layers/commit/32429ed5d74de3abc18765359ffcfd1a74d5d59b) docs: add the browser support matrix (S7.3 Task 2)
  - [`b9be910`](https://github.com/brunomaida/Layers/commit/b9be9107f0a46c327e89283c9f18adaa37b2445e) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
  - [`a7de102`](https://github.com/brunomaida/Layers/commit/a7de1022f02e5811e25479151200ea398c7d140b) docs: link the support matrix from README and topology (S7.3 Task 4)
  - [`dd94804`](https://github.com/brunomaida/Layers/commit/dd948040efdd818493984b8d66286ee7ca35b032) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
  - [`a5698ae`](https://github.com/brunomaida/Layers/commit/a5698aeaf2a8090adcc22b0150f31843896c906f) docs: close S7.3 in the tracker with its implementation report (S7.3)
  - [`471fbea`](https://github.com/brunomaida/Layers/commit/471fbea26e58db0697cd4fa4e40875a664deb5eb) test: harden the support matrix guard against false cells (S7.3 Task 3)
  - [`b441d22`](https://github.com/brunomaida/Layers/commit/b441d22376c7f77b7cb28b16823c7c8dde6cc9f5) docs: tighten the support matrix wording (S7.3 Task 2)
  - [`844e9e3`](https://github.com/brunomaida/Layers/commit/844e9e3171b782ffd4f41ac6839f01090d563989) docs: refresh the S7.3 report and tracker (S7.3)
  - [`04649fd`](https://github.com/brunomaida/Layers/commit/04649fdc2bec45efedad9919a79ae525b2732ca7) docs: rebuild the tracker data and index after rebasing S7.3 onto develop (S7.3)
  - [`c191e9d`](https://github.com/brunomaida/Layers/commit/c191e9d3c6e0479537c8c1bbc6dce376025d8611) docs: cite the support matrix and shortcuts docs as delivered in checklist G (S7.3)
  - [`5188c5a`](https://github.com/brunomaida/Layers/commit/5188c5a48315faf565dea42b3ac487faba3b3490) docs: drop stale S3.4 and checklist line refs from the matrix maintenance notes (S7.3)

### Todos os commits

- [`f425bf8`](https://github.com/brunomaida/Layers/commit/f425bf8ef0034a340f9c49ec44c00898792dc6f6) docs: start S7.3 in the tracker (S7.3)
- [`c4d6e5f`](https://github.com/brunomaida/Layers/commit/c4d6e5f06269451263403a7dbba6923ab1d7fc77) docs: add S7.3 support matrix plan (S7.3)
- [`f1e0c8b`](https://github.com/brunomaida/Layers/commit/f1e0c8b0a189f14130e6277337c4423e9bb0599b) docs: apply review edits to S7.3 plan (S7.3)
- [`32429ed`](https://github.com/brunomaida/Layers/commit/32429ed5d74de3abc18765359ffcfd1a74d5d59b) docs: add the browser support matrix (S7.3 Task 2)
- [`b9be910`](https://github.com/brunomaida/Layers/commit/b9be9107f0a46c327e89283c9f18adaa37b2445e) test: guard the support matrix against probes, e2e titles, messages and checklist E (S7.3 Task 3)
- [`a7de102`](https://github.com/brunomaida/Layers/commit/a7de1022f02e5811e25479151200ea398c7d140b) docs: link the support matrix from README and topology (S7.3 Task 4)
- [`dd94804`](https://github.com/brunomaida/Layers/commit/dd948040efdd818493984b8d66286ee7ca35b032) docs: close checklist G support matrix item with changelog fragment (S7.3 Task 5)
- [`a5698ae`](https://github.com/brunomaida/Layers/commit/a5698aeaf2a8090adcc22b0150f31843896c906f) docs: close S7.3 in the tracker with its implementation report (S7.3)
- [`471fbea`](https://github.com/brunomaida/Layers/commit/471fbea26e58db0697cd4fa4e40875a664deb5eb) test: harden the support matrix guard against false cells (S7.3 Task 3)
- [`b441d22`](https://github.com/brunomaida/Layers/commit/b441d22376c7f77b7cb28b16823c7c8dde6cc9f5) docs: tighten the support matrix wording (S7.3 Task 2)
- [`844e9e3`](https://github.com/brunomaida/Layers/commit/844e9e3171b782ffd4f41ac6839f01090d563989) docs: refresh the S7.3 report and tracker (S7.3)
- [`04649fd`](https://github.com/brunomaida/Layers/commit/04649fdc2bec45efedad9919a79ae525b2732ca7) docs: rebuild the tracker data and index after rebasing S7.3 onto develop (S7.3)
- [`c191e9d`](https://github.com/brunomaida/Layers/commit/c191e9d3c6e0479537c8c1bbc6dce376025d8611) docs: cite the support matrix and shortcuts docs as delivered in checklist G (S7.3)
- [`5188c5a`](https://github.com/brunomaida/Layers/commit/5188c5a48315faf565dea42b3ac487faba3b3490) docs: drop stale S3.4 and checklist line refs from the matrix maintenance notes (S7.3)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
