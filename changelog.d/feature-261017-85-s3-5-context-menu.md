---
adr: none
---

### Added
- Menu de contexto no palco 3D (botão direito num plano ou numa linha da árvore): painel `Camadas do componente` com L0 a Ln e o selecionado destacado, e submenu `Ações do ramo` (Explodir daqui, Recolher até aqui, Requisição). Esc, clique fora e ação executada fecham; arrastar com o botão direito não abre.
- Explodir ramo na vista plana: só a subárvore escolhida ganha profundidade (`explodeFrom`/`collapseAt`, `LayersCore.branchZ`/`branchOf`/`inBranchOf`/`ctxMenuModel`/`ancestorAt`); o ramo volta com a sessão, some em Reanalisar do 0, troca de projeto ou raiz inexistente, e leva o selo `▧ ramo`.
- Requisições manuais no painel Ajustes: chip de dado, texto livre "O QUE MUDAR", "Mostrar no palco" e rodapé "Requisições Manuais" (`LayersCore.requestsMarkdown`) para copiar ou gravar `layers-requests.md` na pasta conectada.
- Persistência em `layers/v1/pending › requests[]` (`LayersCore.validRequest`): a entrada sobrevive sem `changes`, tem teto de 200 e, se a fonte muda, mantém cada requisição marcada "alvo a confirmar" (`confirm` por requisição).

### Changed
- `onContextMenu` do palco passa a abrir o menu de contexto; `session` ganha `explodeFrom`/`collapseAt` (não gravados no modo fixture).
- Recarregar, Trocar de estado e Reanalisar do 0 mantêm as requisições (só os `changes` caem); Zerar interface limpa tudo.
- `layoutId` fixo em `'main'` até a S9.1; versão do Markdown como travessão (ver ARCHITECTURE).

### Tests
- Vitest: `BranchZ_*`, `BranchOf_*`, `CtxMenuModel_*`, `AncestorAt_*`, `ValidRequest_*`, `RequestsMarkdown_*` e casos novos de pending.
- Playwright: `e2e/context-menu.spec.js`, `e2e/request.spec.js`, `e2e/pending-persist.spec.js` e o guarda `Orbit_BranchExploded_Above50Fps`.

### Perf
- measured — 1.500 tags, vista plana, maior ramo explodido: orbit 19,26 ms/frame, 51,9 fps, p95 18,0 ms (`Orbit_BranchExploded_Above50Fps`); sem ramo 18,98 ms, 52,7 fps, p95 17,2 ms. Custo do ramo ≈ +0,3 ms/frame (+1,5 %); os dois acima de 50 fps.
