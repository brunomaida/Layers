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

Risco central: os ids de nó são caminhos posicionais (`0.1.2`, `scan()` em `index.html`). Se o mock ou uma folha CSS mudou, um id salvo aponta para outro elemento, e "Aplicar nos arquivos" gravaria no lugar errado. Falso descarte custa um aviso; falso keep custa dado. A revisão da primeira versão desta spec mostrou que validar change a change (impressão `tag|src`, baseline, valor computado) falha nos dois sentidos, então a validade passa a ser decidida por um hash das fontes lidas.

## Objetivo

Ajustes pendentes sobrevivem a um reload ou à reabertura do projeto. Ao reabrir com as mesmas fontes, o Layers reaplica tudo no preview e avisa por toast. Se qualquer fonte mudou no disco, descarta tudo e avisa. Nada é gravado em disco sem "Aplicar nos arquivos".

## Fora de escopo

- Pilha de undo/redo ([S2.13](2026-10-14-s2-13-undo-redo-design.md)): recomeça vazia ao reabrir.
- Rascunho `codeBuf` antes do "Aplicar": continua só em memória.
- Botão, menu ou painel novos: o visual está congelado (CLAUDE.md). A única saída visível é o toast existente.
- Validar ou salvar parcialmente: a unidade de restauração é a entrada inteira do projeto.
- Exportar/importar ajustes no `layers-config.json`.

## Design

```
 changes[] ──componentDidUpdate──► (identidade mudou?) ──persistSoon(400 ms)──► layers/v1/pending
                                                                                 byProject[chave]
 loadProject (síncrono, 1ª instrução): writeConfig() · pendingReady = false · chave = pendingKey()
      │ lê mock + css + dcText ─► hash = LayersCore.sourceHash(partes)
      ▼
 LayersCore.restorePlan(entry, hash)
      ├ hash igual     → changes (ordem original, decided:true) → el.style[prop] = c.to por caminho
      └ hash diferente → nada; contagem descartada
 setState({ changes: restaurados }) · toast do loader + 'N ajustes restaurados' | 'N descartados: arquivo mudou'
 pendingReady = true
```

### Armazenamento

Quinta chave `localStorage`, `layers/v1/pending`:

```
{ schema: 1, byProject: { "<chave>": { savedAt, hash, changes: [ …change ] } } }
```

| Campo | Regra |
|---|---|
| `<chave>` | calculada uma vez no início síncrono de `loadProject`, na ordem de `readBytes`: pasta ou `.zip` ou repositório → `projectId` (`folder:`, `zip:`, `repo:`); senão `fx:` + `fixtureBase` sem barra final. Demo, `?layers=` e `?project=` caem em `fx:`. Guardada em `this.pendingKey` e usada em toda gravação: nunca se lê `projectId` na hora de escrever |
| `hash` | `LayersCore.sourceHash` sobre `[mockPath, html, …(arquivo, texto) de cada .css, dcFile, dcText]`, texto cru como lido |
| `changes` | o registro completo de cada change; só valores CSS e metadados, nunca conteúdo de arquivo (regra de [ARCHITECTURE § Persistência](../../ARCHITECTURE.md)) |
| teto | 200 changes: acima disso a entrada é removida e um toast `warn` avisa que o ajuste não será restaurado |
| expiração | entradas com `savedAt` de mais de 30 dias são removidas na escrita |

### Componentes

| Unidade | Responsabilidade | Onde |
|---|---|---|
| `LayersCore.sourceHash(parts)` | Pura, síncrona. Hash não criptográfico (FNV-1a 53 bits) sobre a lista de strings, com separador entre elas. | `lib/layers-core.js` |
| `LayersCore.restorePlan(entry, hash)` | Pura. `entry` nulo → `{ keep: [], dropped: 0 }`; `entry.hash === hash` → `{ keep: changes com decided:true, dropped: 0 }`; senão `{ keep: [], dropped: changes.length }`. | `lib/layers-core.js` |
| `LayersCore.getPending(storage, chave)` | Lê e sanitiza a entrada (tipos, `schema`); lixo vira `null`. | `lib/layers-core.js` |
| `LayersCore.setPending(storage, chave, entry, now)` | Lê a chave, troca ou remove a entrada (`entry === null` remove), aplica teto e expiração, grava. | `lib/layers-core.js` |
| `elAtPath(id)` | Desce `this.mockRoot.children` pelo caminho `0.i.j…`. Não usa `this.els`: nó de tamanho zero (`display:none`, `width:0`) fica fora de `els` mas o caminho segue válido. | `index.html`, junto de `scan` |
| `restorePending(entry, hash)` | Aplica `restorePlan`: para cada change, em ordem, `elAtPath(i).style[prop] = c.to` por id; devolve `{ changes, dropped }`. Roda em `loadProject` antes do `setState`. | `index.html`, junto de `loadProject` |

`scan()` já roda no callback do `setState` de `loadProject` (`index.html:1257`), depois do DOM reestilizado: os nós refletem os valores restaurados sem `scanSoon()` extra.

### Ciclo de vida

| Evento | Efeito na entrada do projeto |
|---|---|
| `loadProject` (1ª instrução, antes de qualquer `await`) | `writeConfig()` drena a rajada pendente na chave antiga; depois `pendingReady = false` e `this.pendingKey` recalculada |
| `loadProject`, após ler as fontes | `restorePending` + `setState({ changes })` no lugar do `changes: []`; `pendingReady = true`; só então vale `seq === this.loadSeq` (outra carga concorrente vence e a restauração desta é descartada) |
| edição (`applyEdit`, `applyCodeText`, `revert`, undo/redo) | `state.changes` troca de identidade → `persistSoon()` → entrada reescrita com o `hash` corrente |
| `approve` / `cancelAll` | `changes` vira `[]` → entrada removida |
| `doReload` após confirmar "recarregar descarta todas" | `setPending(…, null)` **antes** de `loadProject`, senão a restauração ressuscitaria o que o usuário descartou |
| `resetUI` | remove a entrada do projeto atual: é um "zerar tudo" explícito |
| `unloadProject(why)` por erro de carga | `pendingReady` fica falso; a entrada permanece (projeto que falhou ao abrir não perde ajustes) |
| `pagehide` | o `writeConfig` existente drena a escrita, mas só grava a entrada se o trecho pendente estiver sujo (`pendingDirty`) |

### Gravação sem varrer o DOM

`pendingSnapshot()` devolve `undefined` enquanto `pendingReady` é falso e, depois, o par `{ hash, changes }` memoizado pela identidade de `state.changes`: orbitar a câmera (~60 `componentDidUpdate` por segundo) não gera `JSON.stringify` extra. O trecho pendente tem assinatura e flag `pendingDirty` próprias, separadas da assinatura de `ui`/`projects`/`session`: uma aba ociosa que só orbita a câmera nunca regrava a entrada.

## Erros e bordas

- `localStorage` indisponível ou cheio: `setJson` já devolve `false` e a store cai no `memStore`; o ajuste não sobrevive, sem erro visível.
- JSON corrompido ou `schema` desconhecido: `getPending` devolve `null`; a próxima escrita sobrescreve.
- Hash diferente: toast `warn` com a contagem descartada; a entrada é removida pela assinatura (`changes` vazio, `dirty`).
- Restaurar mid-pergunta de escopo: o change volta `decided: true`, `scope: 'one'` com os ids que tinha, o mesmo efeito do Escape em `decide(false)`.
- Troca de projeto menos de 400 ms depois de editar: o `writeConfig()` do início de `loadProject` grava a última edição na chave antiga antes de recalcular a chave.
- Duas abas no mesmo projeto: o último a gravar vence, mas só aba com `pendingDirty` grava. Aprovar na aba A remove a entrada; a aba B só a regrava se tiver editado depois, caso em que os ajustes dela voltam como pendentes na próxima abertura.
- Duas pastas com o mesmo nome (cópia, worktree) compartilham `folder:<nome>`; com fontes idênticas o hash casa e os ajustes de uma aparecem na outra. Risco aceito: o toast do loader já nomeia o projeto.
- Restaurar não cria passo de undo: a pilha foi zerada em `loadProject` e fica vazia.
- Fontes ainda carregando (`document.fonts.ready`): não afeta, nenhum teste usa valor computado.

## Testes

| Nível | Caso | Gate |
|---|---|---|
| Vitest (`test/layers-core.test.js`) | `SourceHash_MesmasPartes_MesmoHash`, `SourceHash_PartesTrocadasDeFronteira_HashDiferente`, `RestorePlan_HashIgual_RestauraTudoDecidedTrue`, `RestorePlan_HashDiferente_DescartaTudo`, `RestorePlan_EntryNula_VazioSemDescarte`, `SetPending_AcimaDoTeto_RemoveEntrada`, `SetPending_Expirada_Remove`, `SetPending_EntryNull_RemoveSoDoProjeto`, `GetPending_JsonCorrompido_DevolveNull` | commit |
| E2E Playwright (`e2e/pending-persist.spec.js`, fixture traval) | editar uma propriedade → recarregar → ajuste de volta com toast; editar o `.css` da fixture (mudar uma linha dentro de uma regra `data-src`) e reabrir → descartado com toast `warn`; editar e trocar de projeto em menos de 400 ms preserva a edição; demo seguido de pasta grava na chave `folder:`; `cancelAll` e "Aplicar" limpam a entrada; "R" com confirmação não ressuscita; carga que falha mantém a entrada; aba ociosa não apaga a entrada; ajuste `display:none` sobrevive; restaurar não cria passo de undo; toast do loader com aviso continua visível junto da contagem | manual |

## Docs a atualizar

[ARCHITECTURE](../../ARCHITECTURE.md) (§ Persistência: quinta chave, hash e regra de descarte; § Estado), [RELEASE-CHECKLIST](../../RELEASE-CHECKLIST.md) (item B L28), [roadmap](../../roadmap.md) (S2.14 → `done`), fragmento `changelog.d/feature-261014-0-s2-14-pending-persist.md` com bloco `### Perf`.

## Perf

Custo por edição: uma comparação de identidade e, quando muda, um `JSON.stringify` do trecho pendente por rajada de 400 ms. Na carga: um hash linear sobre os bytes das fontes que o loader já leu, uma vez. Nada no caminho de orbitar a câmera. Medição: estimada, sem benchmark novo.
