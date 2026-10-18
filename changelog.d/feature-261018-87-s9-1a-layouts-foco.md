---
adr: none
---

### Added
- Vários layouts por projeto (`layers.json › layouts`, `id`/`name`/`mock`/`states?`) e a faixa LAYOUTS acima de Camadas (só com 2+ layouts): modo Foco, um layout montado por vez; trocar recarrega só o mock dele. Seleção, explosão, câmera e ajustes pendentes ficam por layout; o chip dos outros mostra um badge de pendentes.
- Requisições com `layoutId`, `R<n>` único e exportação agrupada por layout; `interactions[].layout` filtra o menu Interagir; Reanalisar do 0 faz backup do mock de cada layout.
- Helpers puros em `LayersCore` (`projectLayouts`, `pickLayout`, `layoutPendingKey`, `stateMapKey`, `interactionsFor`, `mergeLayoutRequests`, `touchLayoutEntries`, `clearLayoutEntries`) e a fixture `multi-layout`.

### Changed
- Chaves por layout: `pending` e `stateMap` em `<projeto>|<layout>` (o `main` e o projeto sem `layouts` mantêm as de antes); `session` ganha `layouts` (com o mapa não vazio) e `viewLayout` (só com 2+ layouts). Zerar interface limpa `<projeto>|*`.

### Tests
- Vitest: helpers de layout. Playwright: `layouts` (faixa, chaves, vista, pendentes, requisições, backup) e `perf`.

### Perf
- measured — 1.501 nós, mediana de 3 execuções: trocar de layout 175,1 ms contra recarregar o mesmo mock 181,2 ms (razão 0,97; guarda relativo ≤ 1,5×); idas e voltas mantêm 1 shadow root, sem vazamento.
