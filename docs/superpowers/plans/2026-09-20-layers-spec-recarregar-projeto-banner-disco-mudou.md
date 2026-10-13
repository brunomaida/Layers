# Spec — Recarregar projeto + banner "disco mudou" (r1, pós-revisão opus)

## Context
Layers carrega um projeto uma vez (`loadProject`, index.html:1183) e nunca relê o disco. Sem reload nem detecção de mudança; hoje só reclicar em Projetos ▾ ou F5. Objetivo: (1) ação explícita de recarregar; (2) aviso passivo quando arquivos **lidos pelo loader** mudaram.

**Limite honesto:** o loader lê só `layers.json`, `man.mock`, `man.styles[]`/`<link>` CSS e `man.dcSource`. Editar `src/**/*.ts` do Traval não muda nada disso; só edições nesses arquivos disparam o banner. A causa raiz do "schema/interface antigos" no Traval (mock estático de 14/09) **não** é resolvida aqui. Fora de escopo: regenerar `layers/mock.html`; aviso de mock defasado vs `src/**`.

## Design: Architecture & Flows
```
 loadProject (caminho feliz, logo antes do setState 1238)
   this.watch = pickWatched(this.mtimes, [layers.json, mockPath, cssFiles, dcFile])
   this.loadedSeq = seq                       ← "carga concluída"

 focus / visibilitychange(visible) ──debounce 300ms──▶ checkStale()
   guardas: state.dir && state.project && !state.modal && loadedSeq===loadSeq
            && !this.staleBusy && queryPermission('read')==='granted'
   current[p] = lastModified | 'missing'(NotFoundError) | omitido(outro erro)
   list = LayersCore.staleFiles(this.watch, current)
   list.length ? state.stale = list : state.stale = null
        │
        ▼ banner persistente  [Recarregar] [×]
             │                        └▶ dismiss: this.watch = {...watch, ...current}; stale=null
             ▼
 tecla r / item Projetos ▾ ─▶ reloadProject()
   guardas: state.dir && !state.modal && loadedSeq===loadSeq
   LayersCore.hasUnsaved(changes, codeBuf) ? modal confirm ─▶ doReload : doReload
 doReload: pendingSel={id,selId,isoId}; state.stale=null; loadProject()
           (this.mtimes NÃO é zerado)
```
Câmera é preservada por omissão das chaves em 1238 quando `pendingSel` casa; seleção via `select(keep.selId)`.

## Mudanças
| Arquivo | Mudança |
|---|---|
| `lib/layers-core.js` (~424, export ~893) | 3 helpers puros: `staleFiles(seen, current)` (current tri-estado `number\|'missing'`; itera `Object.keys(seen)`; retorna paths com número ≠ ou `'missing'`; ausente em `current` = indeterminado, ignorado); `hasUnsaved(changes, codeBuf)` (`changes.length>0 \|\| Object.keys(codeBuf).length>0`); `pickWatched(mtimes, paths)` (copia só os paths dados). |
| `index.html` `loadProject` (antes de 1238) | `this.watch = pickWatched(...)`; `this.loadedSeq = seq`. Nada mais muda. |
| `index.html` `componentDidMount/WillUnmount` (1425/1447) | `this.onFocus` em `window.focus` + `document.visibilitychange`; debounce `this.staleT`; remoção simétrica + `clearTimeout`. |
| `index.html` `checkStale()` | Conforme fluxo. Um único `dir.queryPermission({mode:'read'})` antes do laço (padrão 1689-1690); não `granted` → sai sem banner. |
| `index.html` `reloadProject()/doReload()` | Só `state.dir` (fixture/zip/repo/demo: item de menu escondido por `sc-if`, padrão `histReset` ~85; `r` vira no-op). Modal aberto → toast e retorna. Confirm reutiliza padrão 1344-1346. |
| `index.html` estado/UI | `stale` (lista). Banner `sc-if stale && dir && project`. Item "Recarregar projeto (R)" no dropdown (~79). Tecla `r` no `onKey` (1432, livre). Linha em `SHORTCUTS` (822-829). |
| `test/layers-core.test.js` | Novos `describe` PascalCase (`StaleFiles`, `HasUnsaved`, `PickWatched`), nomes `Metodo_Cenario_Esperado`: `StaleFiles_SemMudanca_RetornaVazio`, `_MtimeDiferente_RetornaPath`, `_Missing_RetornaPath`, `_Indeterminado_Ignora`, `_CurrentComExtra_Ignora`; `HasUnsaved_SoCodeBuf_RetornaTrue`, `_BufSemChanges_RetornaFalse`; `PickWatched_ArtefatosDesignDraft_Excluidos`. |
| `docs/ARCHITECTURE.md` | Linha em "Módulos"; "Estado" (`stale`, `watch`, `loadedSeq`); "Loader de projeto" (reload + watch); documentar guarda `mtimes` (hoje sem doc). |
| `CHANGELOG.md` + `changelog.d/feature-260920-1-project-reload.md` | Entrada visível + fragmento (`changelog-draft`); `### Perf` estimated: ≤ ~6 `getFile()` por foco, debounced, 1 `queryPermission`. |

## Decisões de design (mudanças vs r0, todas de achados opus)
- **Watch set próprio (`this.watch`), não `this.mtimes`.** `mtimes` recebe `.design-draft.*`/`.design-history/*` (index.html:1714, 1735, 1770) e chaves de pasta anterior; usá-lo geraria banner falso após todo apply e vazamento entre projetos. `watch` é reconstruído a cada carga.
- **`loadedSeq`** substitui flag "em voo" (8 saídas antecipadas em `loadProject`); cobre também corrida de `r` duplo consumindo `pendingSel` (1234 vs 1236).
- **Não zerar `this.mtimes`** no reload: manter guarda de conflito de escrita (1702).
- **Dirty = `changes` + `codeBuf`** (não `buf`/`units`, transitórios; `codeBuf` é descartado em 1238 e é texto do usuário).
- Banner só com `dir`; escritas do próprio Layers não disparam (não estão em `watch`; arquivos lidos e depois gravados pelo Layers, ex. `layers.json`, têm `mtimes` atualizado em 1714 mas `watch` fica com a leitura de carga → **risco**: ver abaixo).
- Posição do banner declarada (visual congelado): topo-centro, `position:fixed; top:56px; left:50%; z-index:109`, tokens do toast (742-745); não colide com toast (bottom:64px).
- Dismiss aceita baseline atual (`watch = {...watch, ...current}`), sem tocar `mtimes`.
- F5/Ctrl+R não interceptados.

## Riscos
- **Escrita própria em arquivo do watch** (ex.: Layers grava CSS/`layers.json` no apply): `watch` ficaria com mtime antigo → banner falso. Mitigação: em `writeText` (após 1714), se `path in this.watch` então `this.watch[path] = novo mtime`. Uma linha; incluída no escopo.
- Permissão expirada: sem banner (indeterminado ≠ mudou).
- `showDirectoryPicker` devolve foco → `checkStale` cai em `loadedSeq !== loadSeq` ou usa `watch` da carga nova; sem vazamento.

## Verificação
1. `npm test`: novos testes + suíte existente.
2. Manual/Playwright, pasta local: editar CSS listado externamente → trocar de aba e voltar → banner; [Recarregar] preserva câmera/seleção; [×] silencia até novo mtime.
3. Apply pelo próprio Layers (com draft/history) → sem banner falso.
4. `codeBuf` sujo → `r` → modal; Cancelar mantém; confirmar recarrega. Com modal de apply aberto, `r` não faz nada.
5. Trocar pasta A→B com banner ativo → banner some, sem chaves de A.
6. Zip/demo/fixture: sem item de menu, sem banner.
7. Network: zero requisições fora de `localhost:5180`.

## Model Routing
| Etapa | Tier |
|---|---|
| Implementação | sonnet |
| Revisão pré-merge | opus (`adversarial-reviewer`), verifier ≥ generator |
| Fable | não usado sem confirmação explícita |

> [!DECISION] gh-issue-gate
> Criar issue `feat: project reload + external-change banner` (branch `feature/260920-N-project-reload`)? Recomendado: sim. Pendente de resposta do usuário.

> [!DECISION] phase-intake
> Classificar como micro (leaf) sob checklist B (loader de projeto) em `docs/RELEASE-CHECKLIST.md` (`docs/roadmap.md` não existe). Recomendado: micro. Pendente de resposta do usuário.
