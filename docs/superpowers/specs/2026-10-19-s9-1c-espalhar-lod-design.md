---
title: "S9.1c — Espalhar layouts no palco 3D com LOD — design"
type: spec
solution: Layers
status: draft
created: 2026-10-19
---

# S9.1c — Espalhar layouts no palco 3D com LOD — design

Fatia da [S9.1 layouts newlogic](../../text-specs/2026-10-17-s9-1-layouts-newlogic.md). Parte do fluxo **V3 Híbrido** decidido em [](2026-10-17-s3-5-s9-1-design-decisions.md) (board `S91Fluxos`). Plano de implementação: [](../plans/2026-10-19-s9-1c-espalhar-layouts-no-palco.md). Issue #91.

## Intenção

Um projeto com várias telas (S9.1a) só mostra uma por vez (Foco). O Espalhar mostra várias lado a lado no mesmo palco 3D, sem montar todas por inteiro, para o usuário comparar e navegar entre elas com o custo de memória e de planos sob controle.

## Objetivos

- Botão `⊞ ESPALHAR ▾` na faixa LAYOUTS e popover: **Ver todos** ou **Selecionar 1–N**, mais o slider de **distância** entre layouts.
- Layout ativo completo; os demais em **LOD**; clicar num layout esmaecido o ativa.
- Câmera de visão geral própria, que enquadra todos os layouts escolhidos.
- Aviso não bloqueante acima de 1.500 planos somados.
- Espalhar desligado = app idêntico ao de hoje (mesmo DOM, chaves e custo).

## Não objetivos

- Edição entre layouts: undo com `layoutId`, watch/deriva global, aviso "também afeta … (N usos)" e "Aplicar junta tudo" ficam na leaf **S9.1d**. No Espalhar, só o layout ativo aceita seleção, edição, Aplicar e Salvar.
- Montar vários mocks vivos ao mesmo tempo, animação de câmera (sem voo ao ativar) e trocar o estilo do chip ativo (decisão visual adiada para o fim da S9.1).
- Reescrever `loadProject`; o refator se limita a extrair a montagem e a varredura (Task 2).

## Decisões do usuário (2026-10-19)

| # | Decisão | Escolha |
|---|---|---|
| 1 | Escopo | S9.1c cobre os 4 itens do roadmap; a edição entre layouts vira S9.1d |
| 2 | LOD | Planos L0–L1 congelados: varredura rasa (profundidade ≤ 1), borda tracejada, opacidade .5, sufixo " · LOD" |
| 3 | Limites | Ativo + último ativo completos ("2 completos"); aviso não bloqueante acima de 1.500 planos (completos + LOD) |
| 4 | Seleção | Ids simples no ativo; `layoutId:nodeId` só no clique e no hover dos planos LOD |
| 5 | Câmera | Ativar só troca o ativo; a câmera de visão geral persiste na sessão |
| 6 | Palco | Eixo X, ordem do `layers.json`, espaço uniforme pelo slider; seleção 1–N e distância persistem; o ativo sempre entra |
| 7 | Chip ativo | Sem mudança agora |
| 8 | Botão | `⊞ ESPALHAR ▾` como no board; "Foco" é o Espalhar desligado |

## Design

Um único layout, o **ativo**, segue montado como hoje (`loadProject`, um shadow root, Árvore, Camadas e Ajustes inalterados). Os demais viram **retratos congelados** em `spreadFrozen` (planos, sem shadow root vivo):

- **LOD:** depois da carga vencedora, `loadSpread` lê, um por vez, o mock e o CSS de cada layout escolhido, monta num host temporário, varre com `maxDepth: 1` e descarta o host. O resultado é `{nodes, pageW, pageH, full: false, count}`.
- **Último ativo:** ao trocar de layout, o que sai fica congelado em profundidade cheia (`full: true`); é o segundo "completo".
- **Cena:** `scene()` desenha uma página por layout dentro do `world`, com `translateX(i·(pageW + gap))`. Os planos LOD usam `LodPlane` (`data-lod-plane` e `data-layout`, nunca `data-plane`), então `planeCensus`, hit-tests e culling do ativo não mudam.
- **Câmera:** `cam()` ganha um ramo de visão geral com `footprint = N·pageW + (N−1)·gap`; ligado, vale uma câmera só (`spread.cam`); desligado, o `viewCache` por layout volta a valer.
- **Ativar:** clicar num `LodPlane` (sem arrasto) chama `switchLayout(id)` e deixa `pendingView.selId` com o nó clicado. Os ids da varredura rasa são subconjunto dos da cheia, então a seleção cai no mesmo nó.
- **Estado e sessão:** `state.spread = {on, mode, picked, dist}`; `session › spread` só existe com o Espalhar ligado e 2+ layouts.

Funções puras novas em `LayersCore`: `spreadPicked`, `spreadOffsets`, `lodNodes`, `spreadPlaneTotal`, `spreadSessionEntry` (assinaturas no plano).

## Custo e limites esperados

- Ligar o Espalhar custa uma leitura rasa por layout escolhido (a ordem de grandeza de uma carga fria cada, em segundo plano e sequencial); medir na Task 7.
- Retratos congelados não acompanham mudanças em disco até Recarregar.
- Mock ausente, ilegível ou acima dos tetos do loader: o layout fica "indisponível" e fora do palco.
- Orçamentos de `docs/RELEASE-CHECKLIST.md` § D valem: scan < 300 ms para 1.500 nós, órbita > 50 fps.

## Divergências do texto original (a registrar na Task 8)

- Ids simples no ativo, em vez de `layoutId:nodeId` literal na tabela de decisões.
- LOD como varredura rasa, e não montagem parcial.
- Edição entre layouts adiada para a S9.1d.
