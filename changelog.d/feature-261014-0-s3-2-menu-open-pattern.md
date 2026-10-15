---
adr: none
---

### Changed
- Padrão único de abertura de menus: Projetos, Aparência, Interagir e Ações abrem no hover e fixam no clique (Projetos e Ações só abriam por clique). Clique fora, Esc, foco saindo e item de ação fecham; um menu aberto por vez; toque abre fixado; arrastar o palco com o botão pressionado não abre menu. `LayersCore.menuStep` (puro, testado) decide; tempos em `LayersCore.MENU_TIMING` (0 ms para abrir, 260 ms de tolerância ao sair).
- Um menu fixado não troca por hover em outro gatilho (antes, passar o mouse em Interagir com a Aparência fixada trocava de menu e soltava a fixação).
- Esc fecha primeiro o dropdown de valor aberto, depois o menu, e devolve o foco ao gatilho: o anel `:focus-visible` do gatilho aparece depois do Esc pelo teclado (mudança intencional de acessibilidade). Com o foco num `<input>` dentro do menu (o controle de Fonte), Esc segue sem efeito, como hoje.
- Fechar um menu (Esc, foco saindo, clique fora) limpa o campo de registrar repositório e um dropdown de valor aberto dentro da Aparência; apertar num item do popover de Ações o fixa, como nos outros menus.

### Added
- `e2e/menu-open.spec.js`: hover, fixar, clique fora, teclado, foco saindo, aninhado, redimensionar, arrasto e toque nos quatro menus.
- `e2e/menu-visual.spec.js`: gate manual (`LAYERS_VISUAL=1`) que compara pixel a pixel os quatro menus abertos (clique e hover) e fechados com a captura de antes da mudança; as capturas ficam locais e não entram no repositório.

### Perf
- estimated — uma chamada de `menuStep` por entrada, saída ou clique nos quatro gatilhos e um `contains()` por `pointerdown` só com menu aberto; os manipuladores de menu são criados uma vez (`menuH`), sem alocação por render; nada no caminho de câmera, scan ou render dos planos.
