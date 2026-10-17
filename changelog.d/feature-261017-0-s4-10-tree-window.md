---
adr: none
---

### Added
- Janela de linhas na árvore de camadas (Hierarquia e Elementos): só as linhas visíveis mais 10 de sobra ficam montadas, entre dois espaçadores invisíveis (`data-tree-pad`) que mantêm a altura total e a barra de rolagem. `LayersCore.treeWindow` calcula a faixa (linhas de código têm altura medida por `ResizeObserver`, chave `data-code-key`); o scroll só reconstrói a faixa a cada 110 px; `revealInTree` rola por índice. Com textarea ou foco de teclado dentro da árvore o início da faixa fica congelado (o fim cresce com o scroll e com o Tab; a vista passar acima do início solta o foco); foco de mouse em botão sai antes de a janela mover. Listas de até 3 telas não usam janela. Nada visível muda (`tree-visual` com diff zero). Limitação conhecida (S4.11): com uma textarea ou foco de teclado na árvore, rolar longe e clicar numa linha pode perder o clique ou atingir outra linha, e a vista pode ficar em branco por instantes perto do início congelado; o uso do mouse sem foco não é afetado.
- `e2e/virtual-tree.spec.js` (invariantes da janela: poucas linhas montadas, faixa cobre a vista em passos de 97 px, selecionar plano, fim da lista, Filtrar, código aberto, digitação e Tab sem trocar a regra, roda do mouse sem fuga de `scrollTop`), `e2e/tree-visual.spec.js` (gate de pixel manual, `LAYERS_VISUAL=1`) e os helpers `treeRow`, `lastTreeRow` e `treeWindowState` em `e2e/tree-helpers.js`; as specs com seletor cru da árvore migraram para eles.

### Fixed
- Selecionar a raiz com a árvore no topo rolava 4 px e escondia o padding superior (`treeWindow` devolve `scrollTo` nulo quando a linha já está no topo).

### Perf
- measured — 1.500 tags, orbit: 53,38 → 34,03 ms/frame (mediana de 3 execuções alternadas ABABAB, Chromium 153.0.8010.12, i7-12700, mesma máquina, `dirty` falso; desvio da base 1,15 ms). Seleção de linha 308,9 → 181,9 ms; hover de linha 74,0 → 17,1 ms.
- measured — Traval, orbit: 23,82 → 21,30 ms/frame (desvio da base 0,16 ms); seleção de linha 70,9 → 48,2 ms; explode 62,6 → 58,6 ms; scan de 1.500 tags 42,6 → 43,3 ms (sem custo novo). Guardas (`orbit/traval`, `orbit/1500-tags`, `tree/1500-tags/scroll-frame` ≤ antes + max(0,5 ms; 2σ)) todas dentro.
- measured — scroll da árvore em 1.500 tags: 141,2 → 134,2 ms/frame, só 5 %. Cada passo de 110 px ainda roda o `render()` completo com a construção inline das ~1.650 linhas (a S4.7 fechou sem memo); a janela corta a montagem e o diff, não a construção. Reduzir o custo do scroll exigiria memoizar as linhas, fora desta leaf.
- measured — hover de linha, só relatado (sem guarda): Traval 25,7 → 43,2 ms (1ª amostra 16 ms, as seguintes ~43 ms) e 1.500 tags com outliers de 137 e 139,5 ms em 2 de 3 execuções (base: máximo 85,8 ms). Artefato da métrica, não regressão: `rowInputCost` mede até o 2º `requestAnimationFrame`; com a janela o render termina cedo, o commit cai no 1º quadro e o Layerize (~34 ms no Traval, ~120 ms em 1.500 tags, traço do Chrome) fica antes do 2º rAF; sem a janela cai no 2º quadro e não é contado. Execução diagnóstica única (fora do ABABAB), Event Timing de entrada até o quadro apresentado, mediana: Traval 56 ms contra 80 a 88 ms na base; 1.500 tags ~184 contra ~260 ms. Com a janela desligada à força o hover volta a 24 ms na métrica antiga e a 80 a 104 ms no Event Timing.

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
