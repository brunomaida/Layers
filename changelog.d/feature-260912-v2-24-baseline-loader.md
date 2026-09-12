# Baseline sem projeto + loader layers.json

Branch `feature/v2.24-from-editor`. Renomeia o editor para LAYERS (arquivo `LAYERS v2.24.dc.html` no projeto de design).

### Removed

- Mock embutido do Traval (DOM offscreen de ~190 KB, superfícies Resumo Global / Configurações / Popovers, abas e seções do painel ESTUDOS, constantes `TABS`/`DTABS`/`MENUS`, `mockVals`, atalhos e textos que citavam Traval).

### Added

- Loader de projeto: ao conectar uma pasta, lê `layers.json` na raiz (contrato em `docs/layers-json.md`), carrega `mock` + `styles` e injeta num shadow root do host offscreen. Sanitização (scripts, iframes, `on*`, `javascript:`), reescrita `:root/html/body`, wrapper `body` quando há várias raízes, `<link rel=stylesheet>` relativo resolvido, fontes só de `fonts.googleapis.com`, `viewport` do manifesto define a geometria do palco.
- `data-src` automático por heurística: primeira classe do elemento que abre regra top-level numa folha carregada → `arquivo|seletor|linha`; `rules` do manifesto sobrescreve.
- Menu ⚡ Interagir dirigido por `layers.json › interactions` (`show`, `toggle`, `hide`, `class`, `click`, `hint`); estado ●/○ lido do estilo computado; `<dialog>` alterna `open`, `[hidden]` é removido ao exibir.
- Estados vazios: árvore, painel Propriedades e rail de camadas sem projeto; botão de projeto mostra "Nenhum projeto" / "pasta · sem layers.json" (âmbar) / nome do projeto.
- Modo fixture para testes: `index.html#layers=fixtures/<proj>/` (ou tweak `fixture`) lê o manifesto por HTTP. Fixtures de Traval, Axai, MarketView e Results em `fixtures/`.
- `tools/layers-snapshot.js`: snapshot do DOM renderizado de apps JS → `layers/mock.html`.
- `docs/layers-requisitos.md`: requisitos por tipo de arquivo (.html/.css carregam; .js/.ts/.jsx/.scss só referência; .json só layers.json; .env nunca; .md não participa).

### Changed

- Chaves de `localStorage` renomeadas para `layers-cfg`, `layers-hist`, `layers-inter-size` (migração automática das chaves `traval-layer-editor-*`).
- `readText` abstrai a origem (handle local ou fixture HTTP) — ponto de entrada para o loader remoto do GitHub.
- `scan()` parte de `this.mockRoot` (dentro do shadow root) e mede em relação ao host.

### Perf

- Sem projeto o motor não faz scan periódico (removido o `setInterval` de boot); ResizeObserver só observa a raiz do mock após o carregamento.
