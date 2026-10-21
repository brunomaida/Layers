---
adr: none
---

### Fixed
- Janela da árvore de camadas com foco de textarea ou de teclado: a lista passa a ter um slot por linha (`LayersCore.treeSlots`), fora da faixa o slot é vazio (um espaçador `data-tree-pad` por trecho) e a linha com foco fica montada junto das 10 linhas antes e depois dela para Tab e Shift+Tab seguirem. Como nenhuma linha muda de slot enquanto a lista não muda (o `sc-for` chaveia por índice), o congelamento do início da faixa deixou de existir e com ele os três defeitos da S4.10: clique em linha perdido ou em outro nó depois de rolar com a textarea focada, vista em branco ao rolar para cima perto do início congelado e fim congelado crescendo sem limite. Blur com a janela sem foco (alt-tab) não solta a linha; o botão focado por mouse sai da árvore só quando a linha desmonta.

### Changed
- `e2e/virtual-tree.spec.js` ganha 3 testes de regressão (clique após rolar com a textarea focada, rolar para cima além do início antigo, linhas montadas limitadas ao rolar até o fim) e `test/layers-core.test.js` os `TreeSlots_*` da função pura.

### Perf
- measured — 1.500 tags, ABABAB na mesma máquina (mediana de 3, `develop` → S4.11, Chromium 153, i7-12700): hover de linha 20,6 → 19,1 ms, seleção de linha 211,6 → 214,8 ms, scroll da árvore 160,0 → 167,6 ms/frame (dentro do ruído das execuções, 152 a 184 ms). Traval: hover 47,4 → 48,2 ms, seleção 61,0 → 57,3 ms. Sem regressão: os N slots vazios por render custam menos que o ruído (o hover mede um render completo, como cada tecla digitada na textarea); os valores absolutos estão acima dos da S4.10 (17,1 e 181,9 ms) porque a máquina estava mais lenta nesta sessão, a base `develop` mediu 20,6 e 211,6 ms na mesma janela.
