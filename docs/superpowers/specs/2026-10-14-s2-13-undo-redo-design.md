---
title: "Layers — undo/redo global dos ajustes (S2.13)"
type: spec
solution: Layers
status: draft
created: 2026-10-14
---

# Layers — undo/redo global dos ajustes (S2.13)

## Context

O Layers registra ajustes de estilo em `changes[]` (`{ key, ids, prop, from, to, fromInline, scope, … }`) e escreve o valor em `el.style` para o preview ao vivo. Hoje só existe `revert(c)` (desfaz um `change` inteiro) e `cancelAll`. Não há como voltar ao estado anterior de uma edição nem refazer o que foi desfeito. O item vem do checklist B: "Undo/redo global (câmera fora; ajustes de propriedade e código dentro)".

## Objetivo

Ctrl+Z desfaz e Ctrl+Shift+Z / Ctrl+Y refaz os ajustes de propriedade e de código ainda não gravados, com um toast curto por passo. Câmera, seleção, isolamento e layout ficam fora.

## Fora de escopo

- Botões ou itens de menu: o visual está congelado (CLAUDE.md). Só teclado e toast.
- Desfazer gravação em disco: continua com `rollback(h)` do histórico de commits.
- Persistir a pilha: é a S2.14.
- Digitação em `input`/`textarea` e rascunho `codeBuf` antes do "Aplicar": ficam com o undo nativo do navegador.

## Design

Abordagem escolhida: snapshot de `changes[]` (alternativas descartadas: par do/inverso por operação, porque o inverso de `extend`/`decide` reescreve vários nós; log de eventos com replay, porque re-aplica tudo no DOM).

```
 applyEdit (+ decide) / applyCodeText / revert / cancelAll
        │  1) pushUndo(clone de changes[])  → limpa redo
        │  2) muta changes[] + el.style (como hoje)
        ▼
 Ctrl+Z ── undo.pop → redo.push(atual)
        └─ LayersCore.inlineDelta(atual, anterior) → [{id, prop, value}] → el.style[prop] = value
 Ctrl+Shift+Z / Ctrl+Y ── inverso
 loadProject · reloadProject · "Aplicar nos arquivos" (commit) ── limpa as duas pilhas
```

### Componentes

| Unidade | Responsabilidade | Onde |
|---|---|---|
| `LayersCore.inlineDelta(cur, target)` | Função pura. Para cada par `(id, prop)` presente em `cur` ou `target` devolve o valor inline a escrever para ir de `cur` a `target`. | `lib/layers-core.js` |
| `LayersCore.pushSnapshot(stack, snap, cap)` | Função pura. Acrescenta o snapshot e descarta o mais antigo acima de `cap` (100). | `lib/layers-core.js` |
| `pushUndo()`, `undo()`, `redo()` | Ligam as pilhas (`this.undoS`, `this.redoS`, campos de instância, fora do `state`) ao DOM e ao `setState({ changes })`. | `index.html`, junto de `revert` |
| Handler de tecla | `Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`, `Ctrl/Cmd+Y` no `onKey`, antes do ramo que ignora `ctrlKey`. | `index.html` (`this.onKey`) |
| Lista de atalhos | Uma linha em `shortcuts` com os três atalhos. | `index.html` (constante de atalhos) |

### Regras de `inlineDelta(cur, target)`

Para cada `(id, prop)`:

| Em `target` | Em `cur` | Valor escrito |
|---|---|---|
| sim | qualquer | `target.to` |
| não | sim | `cur.fromInline[id] \|\| ''` |
| não | não | nada |

`id` que não existe mais em `els` é ignorado ao aplicar. O snapshot é clone profundo (`cloneChanges()` já existe), então `scope`, `decided` e `scopedSel` voltam junto.

### Comportamento

- Pilha de 100 snapshots; acima disso descarta o mais antigo.
- Com `state.pending` (pergunta de escopo `one`/`all`), `state.modal` ou `state.diff` abertos, Ctrl+Z não faz nada: o painel ou a pergunta é dono da lista de ajustes (mesma regra de `reloadProject`).
- Edições seguidas da mesma propriedade do mesmo elemento em até 600 ms (arrasto de slider, tecla de seta segurada) formam um único passo.
- Foco em `textarea` ou `input` de texto/número: o handler não age, vale o undo nativo. Com foco em `range`, `color`, `checkbox`, `radio` ou `select`, o atalho global age.
- Pilha vazia: toast `Nada para desfazer` / `Nada para refazer`.
- Passo executado: toast `Desfeito: <prop>` / `Refeito: <prop>`, onde `<prop>` vem da diferença entre os dois `changes[]`; `N propriedades` quando mais de uma propriedade muda.
- Após restaurar, `scanSoon()` como em `revert`.

## Erros e bordas

- Snapshot referencia `id` que sumiu do DOM após re-scan: o delta pula esse `id`; nenhum erro.
- `applyEdit` com valor inválido (`CSS.supports` falso) retorna antes de qualquer mudança; com o mesmo valor já registrado no ajuste (`c.to === val`) não chama `pushUndo`: não cria passo fantasma.
- `decide` (resposta da pergunta de escopo) não abre passo próprio: faz parte do passo do `applyEdit` que abriu a pergunta, então um Ctrl+Z desfaz os dois.
- `applyCodeText` só cria passo quando pelo menos uma declaração muda algo.
- `cancelAll` vira um passo único: Ctrl+Z restaura todos os ajustes cancelados.

## Testes

| Nível | Caso | Gate |
|---|---|---|
| Vitest (`test/layers-core.test.js`) | `InlineDelta_TargetTemValor_EscreveTo`, `InlineDelta_SoNoCur_RestauraFromInline`, `InlineDelta_VaziosIguais_SemEscrita`, `PushSnapshot_AcimaDoCap_DescartaMaisAntigo` | commit |
| E2E Playwright (`e2e/undo-redo.spec.js`, fixture traval) | editar uma propriedade → Ctrl+Z restaura o inline original → Ctrl+Shift+Z reaplica; pilha zera ao recarregar; foco em `input` não dispara | manual |

## Docs a atualizar

`docs/ARCHITECTURE.md` (estado de edição e módulos), `docs/RELEASE-CHECKLIST.md` (item B), `docs/roadmap.md` (S2.13 → `done`), fragmento `changelog.d/feature-261014-0-s2-13-undo-redo.md` com bloco `### Perf`.

## Perf

Custo por edição: um clone de `changes[]` (lista curta). Sem alocação no caminho de arrastar câmera. Medição: estimada, sem benchmark novo.
