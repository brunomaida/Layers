---
adr: none
---

### Added
- Janela de linhas na árvore de camadas (Hierarquia e Elementos): só as linhas visíveis mais 10 de sobra ficam montadas, entre dois espaçadores invisíveis (`data-tree-pad`) que mantêm a altura total e a barra de rolagem. `LayersCore.treeWindow` calcula a faixa (linhas de código têm altura medida por `ResizeObserver`, chave `data-code-key`); o scroll só reconstrói a faixa a cada 110 px; `revealInTree` rola por índice. Com textarea ou foco de teclado dentro da árvore o início da faixa fica congelado (só o fim cresce, para o Tab seguir pelas linhas); foco de mouse em botão sai antes de a janela mover. Listas de até 3 telas não usam janela. Nada visível muda (`tree-visual` com diff zero).
- `e2e/virtual-tree.spec.js` (invariantes da janela: poucas linhas montadas, faixa cobre a vista em passos de 97 px, selecionar plano, fim da lista, Filtrar, código aberto, digitação e Tab sem trocar a regra, roda do mouse sem fuga de `scrollTop`), `e2e/tree-visual.spec.js` (gate de pixel manual, `LAYERS_VISUAL=1`) e os helpers `treeRow`, `lastTreeRow` e `treeWindowState` em `e2e/tree-helpers.js`; as specs com seletor cru da árvore migraram para eles.

### Fixed
- Selecionar a raiz com a árvore no topo rolava 4 px e escondia o padding superior (`treeWindow` devolve `scrollTo` nulo quando a linha já está no topo).

### Perf
- measured — 1.500 tags, orbit: 53,38 → 34,03 ms/frame (mediana de 3 execuções alternadas ABABAB, Chromium 153.0.8010.12, i7-12700, mesma máquina, `dirty` falso; desvio da base 1,15 ms). Seleção de linha 308,9 → 181,9 ms; hover de linha 74,0 → 17,1 ms.
- measured — Traval, orbit: 23,82 → 21,30 ms/frame (desvio da base 0,16 ms); seleção de linha 70,9 → 48,2 ms; explode 62,6 → 58,6 ms; scan de 1.500 tags 42,6 → 43,3 ms (sem custo novo). Guardas (`orbit/traval`, `orbit/1500-tags`, `tree/1500-tags/scroll-frame` ≤ antes + max(0,5 ms; 2σ)) todas dentro.
- measured — scroll da árvore em 1.500 tags: 141,2 → 134,2 ms/frame, só 5 %. Cada passo de 110 px ainda roda o `render()` completo com a construção inline das ~1.650 linhas (a S4.7 fechou sem memo); a janela corta a montagem e o diff, não a construção. Reduzir o custo do scroll exigiria memoizar as linhas, fora desta leaf.
- measured — item a vigiar: hover de linha no Traval 25,7 → 43,2 ms (+17,5; preso ao vsync, só relatado, sem guarda). Causa não diagnosticada.

| cenário (ms) | antes | depois |
|---|---|---|
| orbit Traval (ms/frame) | 23,82 | 21,30 |
| orbit 1.500 tags (ms/frame) | 53,38 | 34,03 |
| seleção de linha, 1.500 tags | 308,9 | 181,9 |
| hover de linha, 1.500 tags | 74,0 | 17,1 |
| scroll da árvore, 1.500 tags (ms/frame) | 141,2 | 134,2 |
| seleção de linha, Traval | 70,9 | 48,2 |
| hover de linha, Traval | 25,7 | 43,2 |
| scan, 1.500 tags | 42,6 | 43,3 |
| explode, Traval | 62,6 | 58,6 |
