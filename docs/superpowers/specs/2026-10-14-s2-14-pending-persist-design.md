---
title: "Layers — persistência de ajustes pendentes (S2.14)"
type: spec
solution: Layers
status: draft
created: 2026-10-14
---

# Layers — persistência de ajustes pendentes (S2.14)

## Context

O Layers registra ajustes de estilo ainda não gravados em `changes[]` (`{ key, id, ids, prop, from, to, fromInline, scope, decided, scopedSel, … }`) e escreve o valor em `el.style` para o preview ao vivo. A lista vive só em memória: `loadProject` a zera e um reload da página a descarta. A fatia 4 persistiu interface, histórico e sessão (`layers/v1/*`) e deixou o ajuste pendente de fora de propósito. O item vem do checklist B: "Persistência de `changes` pendentes entre reloads (com aviso ao reabrir)" ([RELEASE-CHECKLIST](../../RELEASE-CHECKLIST.md)).

Risco central: os ids de nó são caminhos posicionais (`0.1.2`, `scan()` em `index.html`). Se o mock ou o arquivo de origem mudou, um id salvo aponta para outro elemento. A persistência precisa validar antes de reaplicar.

## Objetivo

Ajustes pendentes sobrevivem a um reload ou à reabertura do projeto. Ao reabrir, o Layers reaplica no preview o que ainda é válido e avisa por toast quantos ajustes voltaram e quantos foram descartados. Nada é gravado em disco sem "Aplicar nos arquivos".

## Fora de escopo

- Pilha de undo/redo ([S2.13](2026-10-14-s2-13-undo-redo-design.md)): recomeça vazia ao reabrir.
- Rascunho `codeBuf` antes do "Aplicar": continua só em memória.
- Botão, menu ou painel novos: o visual está congelado (CLAUDE.md). A única saída visível é o toast existente.
- Sincronizar entre abas: duas abas no mesmo projeto seguem "último que grava vence", como `ui` e `projects`.
- Exportar/importar ajustes no `layers-config.json`.

## Design

Abordagem escolhida: persistir o registro completo de cada change e validar cada um contra o DOM vivo na reabertura. Alternativas descartadas: reancorar por seletor `arquivo|seletor|linha` e recalcular `ids` (reimplementa o mapeamento de regras), e gravar o log de `applyEdit` para reexecutar (perde o `fromInline` exato e repete a pergunta de escopo).

```
 changes[] ──componentDidUpdate (assinatura)──► persistSoon(400 ms) ──► layers/v1/pending
                                                                       byProject[chave]
 reabrir ──► loadProject ──► scan() ──► validatePending(saved, probe)
                                         ├ keep    → el.style[prop] = c.to · setState({ changes })
                                         └ dropped → descartado
                                       toast 'N restaurados' (ok) | 'N restaurados, M descartados' (warn)
```

### Armazenamento

Quinta chave `localStorage`, `layers/v1/pending`:

```
{ schema: 1, byProject: { "<chave>": { savedAt, changes: [ { …change, fp: { "<id>": "<tag>|<src>" } } ] } } }
```

| Campo | Regra |
|---|---|
| `<chave>` | `projectId` do histórico; em modo fixture, `fixtureBase` (torna o E2E possível) |
| `fp[id]` | `tagName` minúsculo + `\|` + `dataset.src` do próprio elemento (`arquivo\|seletor\|linha`, vazio quando herdado) |
| conteúdo | só valores CSS e metadados; nunca conteúdo de arquivo (regra de [ARCHITECTURE § Persistência](../../ARCHITECTURE.md)) |
| teto | 200 changes por projeto; acima disso o mais antigo cai |
| poda | entradas cujo `<chave>` não está em `hist` nem é o projeto atual são removidas na escrita |

### Componentes

| Unidade | Responsabilidade | Onde |
|---|---|---|
| `LayersCore.packPending(changes, probe)` | Pura. Devolve os changes com `fp` por id; `probe(id)` → `{ tag, src }` ou `null`. | `lib/layers-core.js` |
| `LayersCore.validatePending(saved, probe)` | Pura. Devolve `{ keep, dropped }`; ver regras abaixo. | `lib/layers-core.js` |
| `LayersCore.setPending(storage, chave, entry)` | Lê a chave, troca ou remove a entrada do projeto, poda e grava. `entry === null` remove. | `lib/layers-core.js` |
| `LayersCore.getPending(storage, chave)` | Lê e sanitiza a entrada do projeto (tipos e `schema`); lixo vira `null`. | `lib/layers-core.js` |
| `pendingSnapshot()` | Ligações com o DOM: monta o `probe` sobre `this.els` e chama `packPending`. Devolve `undefined` enquanto `this.pendingReady` é falso. | `index.html`, junto de `sessionSnapshot` |
| `restorePending()` | Valida, reaplica no DOM, `setState({ changes })`, toast. Marca `pendingReady = true` ao terminar. | `index.html`, junto de `loadProject` |

### Regras de `validatePending(saved, probe)`

Unidade de validação é o change inteiro: restaurar `ids` parciais mudaria a semântica de `scope: 'all'`. Um change entra em `keep` somente se, para **todos** os seus `ids`:

| Teste | Falha quando |
|---|---|
| nó existe | `probe(id)` devolve `null` |
| impressão bate | `tag\|src` atual difere de `fp[id]` (a linha em `src` desloca quando o arquivo muda) |
| baseline inline | `el.style[prop]` atual difere de `fromInline[id]` |

E, para o id primário `c.id`, o valor computado atual de `prop` precisa ser igual a `c.from`. Os dois últimos testes entram no `probe` como `{ tag, src, inline, computed }`.

Restaurar um change grava `decided: true`: a pergunta de escopo (`state.pending`) não é persistida e não deve reaparecer.

### Ciclo de vida

| Evento | Efeito na entrada do projeto |
|---|---|
| `loadProject` | `pendingReady = false`; depois do primeiro `scan()`, `restorePending()` lê a entrada, reaplica e liga `pendingReady` |
| edição (`applyEdit`, `applyCodeText`, `revert`, undo/redo) | `changes` muda → assinatura muda → `persistSoon()` → entrada reescrita |
| `approve` / `cancelAll` | `changes` vira `[]` → entrada removida |
| `doReload` após confirmar "recarregar descarta todas" | `setPending(…, null)` **antes** de `loadProject`, senão a restauração ressuscitaria o que o usuário acabou de descartar |
| `unloadProject(why)` | `pendingReady = false`; a entrada fica intacta (projeto que falhou ao abrir não perde ajustes) |
| `pagehide` | o `writeConfig` existente drena a escrita pendente |

A assinatura de `componentDidUpdate` ganha `this.pendingSnapshot()`. `writeConfig` do componente chama `LayersCore.setPending` quando o snapshot não é `undefined`.

## Erros e bordas

- `localStorage` indisponível ou cheio: `setJson` já devolve `false` e a store cai no `memStore`; o ajuste simplesmente não sobrevive, sem erro visível.
- JSON corrompido ou `schema` desconhecido na chave: `getPending` devolve `null` e a entrada é sobrescrita na próxima escrita.
- Projeto `.zip` ou GitHub reaberto por clique: a mesma `<chave>` volta a casar, e a validação decide por `fp` e baseline.
- Todos os changes descartados: toast `warn` com `0 restaurados, M descartados` e a entrada é removida pela assinatura.
- `fixtureBase` com barra final ou sem: a chave é normalizada sem barra final.
- Undo logo após restaurar: a pilha está vazia, toast `Nada para desfazer`. Restaurar não cria passo.

## Testes

| Nível | Caso | Gate |
|---|---|---|
| Vitest (`test/layers-core.test.js`) | `PackPending_ChangeComIds_GravaFingerprintPorId`, `ValidatePending_TudoBate_Mantem`, `ValidatePending_FingerprintDiverge_DescartaChange`, `ValidatePending_IdAusente_DescartaChange`, `ValidatePending_BaselineInlineMudou_DescartaChange`, `ValidatePending_ComputedDiferenteDeFrom_DescartaChange`, `SetPending_ComTeto_DescartaMaisAntigo`, `SetPending_EntryNull_RemoveEntrada`, `GetPending_JsonCorrompido_DevolveNull` | commit |
| E2E Playwright (`e2e/pending-persist.spec.js`, fixture traval) | editar uma propriedade → recarregar a página → ajuste de volta com toast; editar o `.css` da fixture fora do Layers e reabrir → descartado com toast `warn`; "Aplicar" limpa a entrada; `cancelAll` limpa a entrada | manual |

## Docs a atualizar

[ARCHITECTURE](../../ARCHITECTURE.md) (§ Persistência: quinta chave e regra de validação; § Estado), [RELEASE-CHECKLIST](../../RELEASE-CHECKLIST.md) (item B L28), [roadmap](../../roadmap.md) (S2.14 → `done`), fragmento `changelog.d/feature-261014-0-s2-14-pending-persist.md` com bloco `### Perf`.

## Perf

Custo por edição: um `JSON.stringify` do snapshot na assinatura (lista curta) e uma escrita por rajada de 400 ms. Na reabertura: um `getComputedStyle` por change, uma vez. Nada no caminho de orbitar a câmera. Medição: estimada, sem benchmark novo.
