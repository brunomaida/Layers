---
adr: none
---

### Fixed
- `e2e/perf-helpers.js`: `waitForScan` espera a última rajada de `getComputedStyle` do tamanho de um scan, não a última rajada. Cada render do app depois do scan abre uma rajada de 1 chamada (`renderVals`), e 40-50 % das execuções completas de `e2e/perf.spec.js` estouravam o timeout de 20 s. Reprodução em `e2e/wait-for-scan.spec.js`.

### Perf
- N/A — muda só a espera do harness de testes de performance; nenhuma medida nem código do app muda.
