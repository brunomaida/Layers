---
adr: none
---

### Added
- Menu de contexto no palco 3D (botão direito num plano ou numa linha da árvore): painel `Camadas do componente` com L0 a Ln e o selecionado destacado, e submenu `Ações do ramo` com Explodir daqui, Recolher até aqui e Requisição. Esc, clique fora e ação executada fecham; arrastar com o botão direito não abre.
- Explodir ramo na vista plana: só a subárvore escolhida ganha profundidade (`explodeFrom`/`collapseAt`, `LayersCore.branchZ`/`branchOf`/`inBranchOf`/`ctxMenuModel`/`ancestorAt`); o ramo volta com a sessão, some em Reanalisar do 0, troca de projeto ou raiz inexistente, e leva o selo `▤ Plana · ▧ ramo`.
- Requisições manuais no painel Ajustes: chip de dado, texto livre "O QUE MUDAR", "Mostrar no palco" e rodapé "Requisições Manuais" (`LayersCore.requestsMarkdown`) para copiar ou gravar `layers-requests.md` na pasta conectada. Não entram em `changes[]` nem no contador de Salvar.
- Persistência em `layers/v1/pending › requests[]` (`LayersCore.validRequest`): a entrada sobrevive sem `changes`, tem teto de 200 e, se a fonte muda, mantém cada requisição marcada "alvo a confirmar" (`confirm` por requisição).

### Changed
- `onContextMenu` do palco deixa de só bloquear o menu do navegador e passa a abrir o menu de contexto; o estado `session` ganha `explodeFrom`/`collapseAt` (não gravados no modo fixture).
- Recarregar, Trocar de estado e Reanalisar do 0 descartam os `changes` mas mantêm as requisições; Zerar interface limpa tudo.
- Limites em `docs/ARCHITECTURE.md`: `layoutId` fixo em `'main'` até a S9.1 e versão do Markdown como travessão.

### Tests
- Vitest: `BranchZ_*`, `BranchOf_*`, `CtxMenuModel_*`, `AncestorAt_*`, `ValidRequest_*`, `RequestsMarkdown_*` e casos novos de pending.
- Playwright: `e2e/context-menu.spec.js`, `e2e/request.spec.js`, `e2e/pending-persist.spec.js` (requisições) e o guarda de orbit `Orbit_BranchExploded_Above50Fps` em `e2e/perf.spec.js`.

### Perf
- A medir: Orbit_BranchExploded_Above50Fps (preenchido na Task 7b).
