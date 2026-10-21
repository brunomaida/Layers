---
title: "Atlas embed mode — Layers dentro do Atlas"
type: text-spec
solution: "Layers"
created: 2026-10-19
level: meso
---

# Text spec — Atlas embed mode (Layers dentro do Atlas)

## Contexto

- O Atlas (C:\Development\Atlas, issue brunomaida/Atlas#153, leaf S13.1d, ADR-45 lá) vai abrir o Layers dentro de um iframe, no modo "full" do painel de projeto, em vez de `window.open` (ADR-12 do Atlas). Hoje o Layers não tem nenhum suporte a embed nem a `postMessage`.
- O desenho aprovado pelo dono (2026-10-19) está no mock do Atlas: `C:\Development\Atlas\docs\design\ui-mock\boards\Layers.dc.html` (canto com ⚙/↩/Salvar, diálogo Salvar em texto, transição B) e a tabela de decisões em `Decisoes.dc.html`. Plano do lado Atlas: `C:\Development\Atlas\docs\superpowers\plans\2026-10-19-s13-1-radar-inicial.md` (Wave D, Tasks 25 a 29, seção "External dependency: Layers repo").
- O Atlas desenvolve a onda D contra uma ponte falsa; o teste manual só fecha quando esta leaf existir. As duas leaves andam em paralelo.

## Objetivo

- Fazer o Layers funcionar como componente embutido no Atlas, sem mudar nada do app quando carregado sem os parâmetros novos.

## Escopo

1. Parâmetro `?embed=atlas`: esconde a barra superior do Layers (a linha de 36 px do grid) e leva Aparência, Cancelar e Salvar para o canto do palco (canto superior direito, dentro do iframe): ⚙ Aparência; ↩ Cancelar com o selo da contagem de ajustes (desabilitado e esmaecido com 0); Salvar com ícone e chip âmbar da contagem pendente. Sem ícone de Atalhos (a tecla `?` continua abrindo). O seletor de projeto, as contagens e o wordmark LAYERS não aparecem no embed (o Atlas mostra o caminho).
2. Parâmetro `?panels=collapsed`, só em carga embutida: abre com os painéis laterais recolhidos. Nunca reescreve `colOpen` nas chaves `layers/v1/*` (preferência da aba própria); `rightOpen` segue não salvo.
3. Âncora dos popovers: Aparência e o diálogo Salvar abrem hoje sob a barra superior; no embed ancoram no canto superior direito do iframe, logo abaixo dos ícones.
4. Mensagens `postMessage` do Layers para o Atlas, enviadas só às origens exatas `http://127.0.0.1:5190` e `http://localhost:5190` (nunca `*`):
   - `layers:ready` quando o palco está montado (a transição de entrada do Atlas só termina com ele);
   - `layers:exit` quando Esc é pressionado sem nada mais a fechar (menu, modal, diff, isolar, solo, seleção volta a L0 por último); o Atlas desmonta o iframe sem confirmação;
   - `layers:state { adj, req }` a cada mudança, com debounce: contagens de ajustes e de solicitações manuais.
5. Mensagens do Atlas para o Layers: `layers:phases` com a lista de fases ativas do roadmap, aceita só se `event.origin` for uma das duas origens do item 4 e `event.source` for `window.parent`.
6. Diálogo Salvar em texto (decisão 6a A, "Salvar visível, Aplicar desabilitado"): lista TODAS as mudanças do editor e as solicitações manuais, em formato texto (bloco monoespaçado exatamente como seria gravado: seção "Mudanças no editor" com linhas `camada · propriedade: a → b` e o caminho de origem; seção "Solicitações manuais"). Botão "Copiar texto". Destino: nome livre, ou um text-spec numa fase ativa (seletor alimentado por `layers:phases`; nome derivado `docs/text-specs/AAAA-MM-DD-<id>-<titulo>.md`); este caminho envia `layers:textspec { phase, title, text }` ao Atlas, que abre o painel de requisição preenchido (escrita create-only no lado Atlas, só após o Criar do usuário). Aplicar e Gravar ficam desabilitados com `?project=` (modo somente leitura), com dica apontando "Nova aba ↗" (onde a pasta conectada grava). O Layers nunca grava fora da pasta conectada (regra existente).
7. O servidor de dev (Vite, :5180) não pode enviar `X-Frame-Options` nem `frame-ancestors` que excluam o Atlas (`http://127.0.0.1:5190` e `http://localhost:5190`).
8. Registrar um ADR no Layers (`?embed=atlas`, protocolo de mensagens, origens, exceção à regra "Visual congelado" para o modo embutido) e atualizar docs/ARCHITECTURE.md / TOPOLOGY se aplicável.

## Critérios de aceite

- Sem `?embed=atlas` o Layers é idêntico ao de hoje (testes e E2E existentes verdes).
- Carga embutida não reescreve `layers/v1/*`.
- Nenhuma mensagem sai para origem diferente das duas listadas; uma `layers:phases` de outra origem ou outra janela é ignorada (teste unitário).
- Esc só emite `layers:exit` quando não há nada a fechar.
- Com `?project=`, Aplicar e Gravar estão desabilitados e Copiar texto funciona.
- Nenhuma requisição externa nova (regra "Recursos sem rede").

## Fora de escopo

- A transição de entrada/saída (zoom, `layer-motion.js`) é do Atlas; o Layers só emite `layers:ready` e `layers:exit`.
- Nova gravação em disco no embed: continua só pela Nova aba.
- Os nomes `layers:phases` e `layers:textspec` são proposta do Atlas; ajustar aqui, avisando o Atlas, se necessário.

> Fazer `/design` do canto e do diálogo Salvar neste repo só se o dono pedir alteração; o desenho de referência já está aprovado no mock do Atlas.
