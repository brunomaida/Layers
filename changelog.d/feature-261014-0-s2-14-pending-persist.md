---
adr: none
---

### Added
- Ajustes pendentes sobrevivem a recarregar a página ou reabrir o projeto: `changes[]` é gravado em `layers/v1/pending` (por projeto, teto de 200, expira em 30 dias) e volta ao preview com toast. A validade é tudo-ou-nada por hash de `layers.json`, mock, `.css` e `dcSource`; fonte diferente descarta com aviso, fonte que falhou na leitura preserva a entrada. `LayersCore.sourceHash`, `restorePlan`, `getPending` e `setPending` (puros, testados). Fora: pilha de undo/redo e rascunho de código.
- `e2e/pending-persist.spec.js`: restauração após reload, desfazer até vazio e fonte alterada.

### Perf
- N/A — um `JSON.stringify` de `changes[]` por rajada de 400 ms e um hash linear das fontes já lidas por carga; nada no caminho de câmera (estimado).
