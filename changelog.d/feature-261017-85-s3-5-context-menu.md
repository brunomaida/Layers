---
adr: none
---

### Added
- Menu de contexto no palco 3D (botão direito num plano ou numa linha da árvore): painel `Camadas do componente` com L0 a Ln e o selecionado destacado, e submenu `Ações do ramo` (Explodir daqui, Recolher até aqui, Requisição). Esc, clique fora e ação fecham; arrastar com o botão direito não abre no Windows (outros sistemas abrem no mousedown).
- Explodir ramo na vista plana: só a subárvore escolhida ganha profundidade (`explodeFrom`/`collapseAt`, `LayersCore.branchZ`/`branchOf`/`ctxMenuModel`); o ramo volta com a sessão, some em Reanalisar do 0, troca de projeto, Trocar de estado ou raiz inexistente, e leva o selo `▧ ramo`.
- Requisições manuais no painel Ajustes: chip de dado, texto livre "O QUE MUDAR", "Mostrar no palco" e rodapé "Requisições Manuais" (`LayersCore.requestsMarkdown`) para copiar ou gravar `layers-requests.md` na pasta conectada.
- Persistência em `layers/v1/pending › requests[]` (`LayersCore.validRequest`): a entrada sobrevive sem `changes`, tem teto de 200 e, fonte mudada, mantém cada requisição "alvo a confirmar" (`confirm` derivado do `srcHash`: voltar ao estado original desmarca); fonte não lida mantém texto.

### Changed
- `onContextMenu` do palco abre o menu de contexto; `session` ganha `explodeFrom`/`collapseAt` (não gravados no modo fixture).
- Recarregar, Trocar de estado e Reanalisar do 0 mantêm as requisições (só os `changes` caem); Zerar interface limpa tudo.
- `layoutId` fixo em `'main'` até a S9.1; versão do Markdown como travessão.

### Tests
- Vitest: ramo, menu, requisições e pending em `test/layers-core.test.js`.
- Playwright: `context-menu`, `request`, `pending-persist` e o guarda `Orbit_BranchExploded_CostsNoMoreThanFlat`.

### Perf
- measured — 1.500 tags, vista plana, mediana de 3 runs: controle sem ramo 22,26 ms/frame (44,9 fps); com o maior ramo explodido 19,63 ms/frame (50,9 fps), p95 18,3 ms; o ramo não acrescentou custo (guarda relativo ≤ 1,1× o controle). Vista 3D padrão (contexto) 20,11 ms.
