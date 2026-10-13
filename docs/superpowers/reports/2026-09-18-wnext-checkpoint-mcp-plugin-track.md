---
title: "Checkpoint — Layers: branch dc-template-writer aberta + trilha MCP/plugin (ideia gravada)"
type: report
solution: Layers
status: draft
created: 2026-09-18
---

Session: 6b8f9fa5-2117-4878-a8ca-c25d920fd4c2 — resume with `claude --resume 6b8f9fa5-2117-4878-a8ca-c25d920fd4c2`

# Checkpoint — Layers: branch dc-template-writer aberta + trilha MCP/plugin (ideia gravada)

## 1. Scope

- **Branch em curso:** `feature/260918-15-dc-template-writer` (issue #15), plano aprovado slices 0–2: mapper do template dc + writer por camadas + seam de `loadProject`. Plano canônico: `docs/superpowers/plans/2026-09-18-layers-editar-apps-renderizados-por-js-no.md`, ADR em `docs/architecture-decisions.md` (2026-09-18).
- **Ideia para a próxima sessão (não implementada):** transformar o Layers em ferramenta que o usuário leva para a máquina (MCP / plugin / servidor local), usada com ou sem IA. Com IA, a chamada tem de ser a mais fácil possível: a IA recomenda o Layers quando o usuário pede ajuste de interface.
- Restrições do dono: visual congelado, zero rede fora do esperado, escrita só na pasta conectada, "mínimo de código, sem feature especulativa".

## 2. Done

- PR #14 (auto-create `layers.json`) mergeada em `develop` (`93fb7ee`).
- Issue #15 criada; branch criada a partir de `origin/develop`, sem upstream (para nunca empurrar por engano para `develop`).
- `f182b14` mapper + `patchAttrAt` + `checkDcMap` + enum `DC_CODES`. Validado contra o runtime real: 728/728 elementos, 0 divergências.
- `548cc31` `patchDc` (várias edições, guarda de fonte alterada, recusa por item) + `line` no mapper.
- `279aa7c` writer por camadas em `index.html` (`dcSource`, `tpl:N`, `draftDc`, `dcWhy`), `server.watch.ignored` em `vite.config.js`, fixture `fixtures/dc-template/`.
- `3e47cdf` seam `buildProjectFromHtml` (função de módulo, só devolve dados). Impressão digital idêntica antes/depois em 4 fixtures.
- `21411e9` docs: ADR, `ARCHITECTURE.md`, `TOPOLOGY.md`, `layers-json.md` (`dcSource`), plano canônico em EN-US.
- `npm test`: 122/122 (79 antigos + 43 novos). Perf medido: `mapDcTemplate` 0,68 ms/chamada em 304 KB / 728 elementos; `patchDc` de 1 edição 2,85 ms.
- Revisão de arquitetura do Opus (3 desenhos + visão MCP) feita. Fable nunca foi usado.

## 3. Findings

- **Iframe same-origin está refutado:** o código do alvo alcançaria o handle de pasta gravável em IndexedDB `layers-hist` e o `readwrite` já concedido. Cross-origin custa o mesmo que um snapshot. Caminho escolhido para depois: snapshot headless (Node + Chromium) em `/__layers/*` no `:5180`, write-free e path-free (regra R1), CSP inalterado.
- O runtime dc já carimba `data-dc-tpl="N"` (`support.js:474`, `:799`) e o snapshot preserva: o `index.html` do editor dispensa servidor e Playwright.
- `docs/ARCHITECTURE.md` e `TOPOLOGY.md` prometiam iframe, o que contradizia o entregue na v2.24. Corrigido.
- O draft de um alvo `.html` (`index.design-draft.html`) cai na raiz servida e recarregaria o editor; por isso o `server.watch.ignored`.
- **Valor único do Layers para IA** (Opus): (1) geometria/contexto visual, que exige navegador; (2) proveniência (qual regra vence a cascata); (3) patch seguro (mtime, `.bak`, `.tmp`, `.design-history`, log); (4) o humano apontando o pixel. Só o item 3 funciona sem navegador.
- **Ponto fraco da visão:** para CSS puro em repo onde a IA já edita arquivos, Layers só acrescenta uma volta. Tailwind, CSS-in-JS, `var(--x)` e `{{ }}` já recusam.
- **Risco central:** não é "usuário quer editor visual", é "a IA vai escolher rotear pelo Layers em vez de `grep` + `Edit`?".
- Ferramentas MCP `mcp__claude-in-chrome__*` do ambiente do dono dão DOM renderizado e estilos computados sem escrever servidor: úteis só para os spikes.

## 4. Watch-outs

- Alterações **não relacionadas** do dono no working tree: `CHANGELOG.md` (reformatação do 0.25.0) e `docs/layers-json.md` linha 72. Não commitar sem pedir. Existem também `pixel-art-react-mock.html` e `docs/superpowers/plans/2026-09-14-fixtures-reais-batch-2.md` não rastreados, que não são meus.
- `CLAUDE.md:81` diz "Nenhum teste ainda escrito", mas há 122. Só mencionado, não editado.
- **Não verificado por automação:** a gravação real (conectar pasta → editar → rascunho → aprovar → diff de 1 linha em `index.html`). `showDirectoryPicker` exige gesto do usuário; fazer à mão. `index.html` não tem harness.
- `UTILITY_SHEET` e `READONLY_ORIGIN` estão só reservados no enum; a UI segue usando os toasts antigos.
- Bash tool: `\n` dentro de heredoc/python é convertido pelo shell. Escrever scripts com a ferramenta Write e checar sintaxe.
- O hook removeu o rascunho `~/.claude/plans/bright-puzzling-lagoon.md` depois da aprovação e gravou uma cópia PT-BR desatualizada em `docs/`; já substituída pela cópia EN-US correta.
- A visão MCP exige, antes de qualquer `apply_patch`, reproduzir a política de escrita de `writeText` (`index.html`) num escritor Node e extrair `lineDiff` (hoje em `index.html`, não no core). Um servidor MCP não consegue forçar confirmação: com a tool auto-aprovada fica mais fraco que o gate por clique.
- Sem SDK do MCP, `bin`, HTTP, config do Playwright ou mudança de CSP até haver plano próprio.

## 5. Pending

Branch atual:
1. Revisão adversarial Opus: feita. 1 BLOCKER (conteúdo de `<template>` aninhado deslocava os `tplId`) e 5 MEDIUM corrigidos em `aa48eeb`, com guarda extra de valores do `style=""` (0 falsos positivos em 129 elementos reais). Não corrigidos, só registrados: ordem dos avisos de `hoistFaces`, `attrNames` e 3 códigos reservados sem uso. Falta decidir se vale uma segunda revisão do fix.
2. Rascunho do changelog aguarda aprovação do dono (skill `changelog-draft`): `changelog.d/feature-260918-15-dc-template-writer.md`, com `#### Perf` medido acima. Depois comitar.
3. Teste manual da gravação real (item "Não verificado").
4. `superpowers:finishing-a-development-branch`: menu merge / PR / manter. A decisão é do dono; nada de push ou merge sem resposta explícita.

Trilha MCP (plano próprio, depois de fechar a branch), roteiro do Opus:
1. Slices 0–2 + C1–C4 (feito nesta branch).
2. Spike: MCP stdio (~100 linhas) sobre o core puro, sem navegador e sem gravação: `find_rule`, `get_rule_text`, `propose_css_patch` (devolve diff). Dar a Claude Code a tarefa "os cards estão apertados" com o servidor, sem e depois com um SKILL.md (bloco TRIGGER/SKIP). Registrar se ele chama as tools ou só faz `grep`.
3. Gate: se a IA ignora as tools, o produto é o editor no navegador como seletor/aprovador com a IA recebendo `{data-src, estilos computados, geometria}`; se usa, segue o MCP puro.
4. Spike de medição do Playwright: `data-vite-dev-id` sobrevive num app Vite+React?
5. Slice 3 (snapshot headless), só depois de 3 e 4.
6. Só então `apply_patch` + port Node da política de escrita + `lineDiff` extraído, com o modelo de confiança escrito primeiro.

## 6. Next Step

```
--- prompt de continuidade ---
Estou retomando o Layers (C:\Development\Layers), branch feature/260918-15-dc-template-writer (issue #15,
6 commits à frente de origin/develop, não empurrada). Slices 0–2 do plano
docs/superpowers/plans/2026-09-18-layers-editar-apps-renderizados-por-js-no.md estão implementadas
(122/122 testes). A revisão adversarial Opus já foi feita e o blocker corrigido (aa48eeb). Faltam:
aprovar e gravar o fragmento de changelog; testar à mão a gravação real; e só então rodar
superpowers:finishing-a-development-branch (a decisão de merge/PR é minha).
Depois, abrir um plano novo para a trilha MCP/plugin: começar pelo spike de MCP stdio sobre o core
puro (find_rule / get_rule_text / propose_css_patch) para descobrir se a IA roteia por Layers em vez
de grep+Edit, conforme a seção 5 deste checkpoint. Não implementar apply_patch antes do modelo de
confiança escrito.
------------------------------
```
