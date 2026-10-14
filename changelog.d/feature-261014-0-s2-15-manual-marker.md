---
adr: none
---

### Added
- Origens TS/JS aparecem como "manual" no chip de origem (`.ts · manual`, antes `mock`) e na lista de Ajustes (sufixo "patch manual"). `LayersCore.isManualSource` (puro, testado); nenhum caminho de gravação mudou.
- `e2e/manual-marker.spec.js`: chip e Ajustes no `traval`, e chip inalterado em origem `.css`.

### Perf
- estimated — um teste de regex por seleção de nó e por linha de Ajustes; nada no caminho de câmera.
