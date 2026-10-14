---
adr: none
---

### Added
- Origens TS/JS aparecem como "manual" no cabeçalho do painel de propriedades ("· patch manual"), no tooltip do chip de origem e na lista de Ajustes (prefixo "patch manual ·", que o corte por reticências não alcança). `LayersCore.isManualSource` (puro, testado); nenhum caminho de gravação mudou.
- `e2e/manual-marker.spec.js`: cabeçalho e Ajustes no `traval` (origem curta e longa, medindo recorte), e nenhum marcador em origem `.css`.

### Perf
- estimated — um teste de regex por seleção de nó e por linha de Ajustes; nada no caminho de câmera.
