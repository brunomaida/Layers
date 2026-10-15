---
adr: none
---

### Docs

- Nova `docs/support-matrix.md`: navegadores × funcionalidades (carga, leitura por origem, edição, diff simulado, gravação, exportação, configuração, visual), versões testadas, sistema operacional e ambiente de desenvolvimento; cada célula cita um teste E2E ou fica "não verificado" com o passo manual pendente (M1-M5) ou a lacuna (L1-L3).
- README (Requisitos, Estrutura) e docs/TOPOLOGY.md (fronteira App → disco) apontam para a matriz; checklist G "Matriz de suporte" fechado.

### Tests

- `test/support-matrix.test.js`: `npm test` falha se a matriz divergir de `e2e/__snapshots__/compat-probes.json`, citar teste inexistente em `e2e/`, citar mensagem ausente do `index.html` ou ainda citar M1/M2 com a compatibilidade do checklist E fechada.

### Perf

- N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
