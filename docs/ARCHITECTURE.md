---
type: reference
solution: Layers
---

# LAYERS — Arquitetura

Editor visual de camadas para projetos web: lê o DOM renderizado de um app, mostra cada elemento como um plano em profundidade (vista explodida) e permite ajustar propriedades CSS com gravação de volta nos arquivos fonte.

Versão de referência: `index.html` (CHANGELOG 0.25.0).

## Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| UI | HTML5 + CSS inline + JavaScript | Classe React de componente (`class Component extends DCLogic`) hospedada pelo runtime `support.js`. Sem TS, sem bundler. React 18.3.1 UMD versionado em `vendor/`. |
| 3D | CSS 3D transforms | `perspective` no palco, `rotateX/rotateY/scale` no "mundo", `translateZ` por plano. Sem WebGL/canvas. |
| Fontes | Inter, JetBrains Mono, Michroma | 15 `.woff2` versionados em `fonts/`, subsetados por `unicode-range`, via `fonts/fonts.css` gerado. Sem Google Fonts. |
| Disco | File System Access API | `showDirectoryPicker` (leitura da pasta do projeto e gravação de patches). Chrome/Edge apenas. |
| Persistência | `localStorage` + `sessionStorage` + IndexedDB | Cinco chaves `layers/v1/*` (meta, ui, projects, session, pending), `layers/v1/tab` por aba e o handle da pasta no IndexedDB `layers-hist`. Ver § Persistência. |

## Fluxo de dados

```
Fonte de camadas (DOM do app alvo, offscreen)
        │  scan(): getBoundingClientRect + getComputedStyle + data-src
        ▼
Modelo de nós  { id, parent, depth, name, src, x, y, w, h, bg, borders, font, text, svg… }
        │
        ├── scene(): planos 3D (React.memo Plane) ── câmera (yaw, tilt, zoom, pan, focus, spacing)
        ├── Árvore de camadas (Hierarquia / Elementos por regra)
        └── Propriedades do nó selecionado (declaradas · herdadas · editadas)
                    │  setProp / applyCode → el.style[prop] = valor (preview ao vivo)
                    ▼
        changes[]  { key, ids, prop, from, to, src, scope }
                    │
                    ├── Ver diff  (lineDiff sobre patchCss do arquivo real ou síntese)
                    ├── Aplicar nos arquivos  (branch/rascunho → gravação via FS Access)
                    └── Exportar versões completas
```

Regras:

- O modelo de nós é sempre derivado do DOM; nunca é editado diretamente. Um ajuste escreve `style` inline no elemento e re-escaneia (`scanSoon`, debounce 90 ms + `ResizeObserver`).
- `data-src="arquivo|seletor|linha"` liga cada nó à regra de origem. Sem `data-src` o nó herda o do ancestral mais próximo. Um `data-src` escrito à mão no mock só vale enquanto a folha carregada mostra o seletor naquela linha (`LayersCore.checkOrigin`): se o seletor ainda existe no mesmo arquivo a linha é corrigida, senão o atributo cai e a regra derivada das folhas assume; arquivo fora das folhas (`.ts`) fica como está.
- Um `change` guarda `fromInline` por id para reverter sem re-scan.
- Escopo de aplicação (`scope`): `one` (só este), `all` (todos os usos da mesma regra) ou `ask`.

Requisições manuais (S3.5) formam um ramo à parte: pedem uma mudança em texto livre e **não** alimentam `changes[]` (nada é aplicado, revertido nem entra no diff).

```
Menu de contexto do palco / da árvore  ── "Requisição" ──▶ addRequest(id)
        │  lê o nó selecionado (nodeKey, path, caixa, estilos declarados, usos, ajuste pendente)
        ▼
requests[]  { id, layoutId, nodeKey, path, name, depth, alvo, caixa, estilos, uses, pendente, text, srcHash?, confirm?, createdAt }
        │
        ├── Ajustes: lista + textarea "O QUE MUDAR" (setRequestText / removeRequest / showRequest)
        ├── LayersCore.requestsMarkdown ──▶ "Requisições Manuais": copiar ou exportar layers-requests.md (pasta conectada)
        └── layers/v1/pending › requests[]  (restaura com o hash; hash diferente marca confirm, não descarta)
```

- A fronteira com `changes[]` é deliberada: o texto do usuário vai para uma IA ou outra pessoa, não para o escritor de arquivos. O campo `pendente` é só um retrato textual (`prop de → para`) do ajuste da mesma seleção no momento da criação; fica congelado e não acompanha Aplicar nem reverter.
- No Markdown, as linhas de continuação do `pedido` levam 4 espaços de recuo para ficar dentro do item da lista; o texto do usuário ainda pode virar título ou cerca de código dentro desse item, porque não é escapado.
- `layoutId` é o do layout ativo (`'main'` num projeto sem `layouts`, ver § Layouts); com um único layout o cabeçalho do Markdown omite o token de layouts (`<!-- Layers — · carimbo · mock caminho -->`); só com mais de um layout acrescenta `· N layouts` e agrupa os itens por layout.
- O token de versão no cabeçalho do Markdown é um travessão (`—`): a interface não mostra versão em lugar nenhum, e o `package.json` não é lido no navegador.

## Módulos (dentro do arquivo único)

| Bloco | Responsabilidade |
|---|---|
| `THEMES / ACCENTS / SELECTS`, `applyTheme()` | Paletas; grava variáveis `--*` em `documentElement`. |
| `scan()` → `scanRoot(host, root, {maxDepth})` | `scanRoot` percorre o DOM alvo e devolve `{nodes, byId, els, maxDepth}` (geometria e estilo computado) sem tocar no estado; `scan()` o chama, atribui `this.els`, valida seleção, isolado e ramo e faz o `setState`. `maxDepth` (padrão infinito) corta a descida mas o índice dos irmãos continua contando todos, então os ids da varredura rasa são subconjunto dos da cheia (§ Espalhar). |
| `cam()`, `scene()`, `Plane` | Câmera, projeção e renderização dos planos. Handlers estáveis em `this.H` mantêm o `memo`. Durante o arrasto, `LayersCore.viewCuller` esconde (`display:none`) os planos cuja projeção cai inteira fora do palco, e `LayersCore.groupPlanesByZ` agrupa os planos de mesmo `translateZ` em `div[data-plane-group]` (uma camada composta por `z`; o wrapper tem `will-change: transform` e `pointer-events: none`, e os planos perdem `transform`, `transition` e `will-change`). Fora do arrasto cada plano volta a ter o seu `translateZ`. Todo `Plane` leva `data-plane="<id>"` em qualquer modo: é o marcador estável que testes e helpers usam (o `transform` inline deixa de identificar o plano durante o arrasto); `sel`, `lframe`, `llbl` e as medidas ficam fora dos grupos. |
| `flushMove()` | Sem chamadores no código atual (código morto herdado do orbit por `requestAnimationFrame`; apontado nos planos S4.5 e S4.6). |
| `codeFor()`, `patchCss()`, `LayersCore.lineDiff()` (dados puros; `index.html` só pinta) | Leitura do código da regra, patch preservando formatação, diff para revisão. |
| `setProp()`, `applyCode()`, `revert()` | Mutação de estilo, registro de `changes`, escopo. |
| `pushUndo()`, `undo()`, `redo()`, `stepHistory()`, `LayersCore.inlineDelta`, `LayersCore.pushSnapshot` | Undo/redo global (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) sobre snapshots `{layoutId, changes}` (S9.1d: uma pilha para o projeto todo; passo de outro layout troca o layout via `stepAcross`, `LayersCore.undoStepApplies` decide `here`/`switch`/`drop`); `inlineDelta` calcula as escritas inline entre dois snapshots. |
| `connectDir`, `readText`, `writeText`, `exportFull` | I/O de arquivos. |
| `checkStale`, `reloadProject`, `doReload`, `dismissStale`, `onFocus` | Recarregar projeto e aviso de "arquivos mudaram no disco" (ver § Loader de projeto). Helpers puros em `LayersCore`: `staleFiles`, `hasUnsaved`, `pickWatched`. |
| `ensureProbe`, `probeOthers`, `evictProbed`, `buildSaveSet`, `alsoAffects` | Sonda dos outros layouts, Salvar entre layouts e aviso de escopo (S9.1d, § Edição entre layouts). Helpers puros em `LayersCore`: `mergeLayoutChanges`, `countUses`, `useKey`, `undoStepApplies`, `staleLayouts`. |
| `probeLayout`, `restructureProject`, `doRestructure`, `backupLayout` | Deriva do layout e Reanalisar do 0 (S2.21, § Reanalisar do 0). Helpers puros em `LayersCore`: `citedSources`, `layoutDrift`, `staleKind`, `layoutBackupPaths`. |
| `autoCreateLayersJson`, `LayersCore.deriveManifest` | Pasta local sem `layers.json`, conectada por clique: varre `.html`/`.css` e grava um manifesto mínimo (ver `docs/layers-json.md` § auto-criação). |
| `switchLayout`, `allRequests`; `LayersCore.projectLayouts`, `pickLayout`, `layoutPendingKey`, `stateMapKey`, `mergeLayoutRequests`, `touchLayoutEntries`, `clearLayoutEntries`, `interactionsFor` | Vários layouts por projeto (S9.1a): um layout montado por vez, visão (seleção, câmera, ramo) e pendências por layout, requisições agrupadas por layout (§ Layouts). |
| `analyzeCoverage`, `collectProjectFiles`, `collectZipFiles`, `covVals`, `closeCoverage`, `copySnippet`; `LayersCore.COVERAGE`, `coverageScope`, `cssHiddenSelectors`, `htmlRegions`, `scanScriptMarkers`, `coverageModel`, `coverageVerdict`, `suggestLayouts`, `layoutsSnippet`; `LayersCore.normalizePath` (S9.1e) | Projetos ▾ › Analisar cobertura (S9.1b): varre o repositório sem rodar o app e abre um modal com a cobertura de Monovisual, Monovisual + states e Múltiplos layouts, o veredito e um trecho `layouts` copiável. Só leitura; nada é gravado (§ Cobertura). |
| `spreadOn`, `setSpreadPick`, `setSpreadDist`, `swapCam`, `leaveSpread`, `loadSpread`, `lodSnapshot`, `freezeLeaving`, `activateFromLod`, `spreadView`, `spreadUi`, `takeSpreadSession`, `LodPlane`; `LayersCore.spreadPicked`, `spreadOffsets`, `lodNodes`, `spreadPlaneTotal`, `spreadSessionEntry`, `overviewFit` | Espalhar (S9.1c): vários layouts no mesmo palco, o ativo vivo e os demais como retratos congelados em LOD, câmera de visão geral, botão `⊞ ESPALHAR ▾` com popover e ativação por clique no plano LOD (§ Espalhar). |
| `makeDraft`, `approve`, `discardDraft`, `dropDraft`, `refreshSpread`; `draftRun`, `draftBusy`, `draftedPaths` | Ciclo do rascunho (S9.1e): gerar, aprovar e descartar o `.design-draft` sem corrida entre as três ações; `refreshSpread` relê os retratos LOD depois de gravar (§ Ciclo do rascunho). |
| Menus (Projetos, Aparência, Interagir, Ações), dropdowns customizados, toast | Chrome da interface. Os quatro menus seguem um padrão só, decidido por `LayersCore.menuStep` (puro) e aplicado por `menuGo`: hover abre (0 ms), saída fecha após 260 ms, clique fixa, `pointerdown` fora (captura), Esc, foco saindo e item de ação fecham; um menu aberto por vez (`menu`, `menuPin`). Os dropdowns de valor (`cbOpen`) abrem por clique e fecham no blur ou no Esc. Os popovers não usam `role=menu`: a navegação por setas nos itens fica fora do escopo. O menu de contexto do palco (linha abaixo) não segue esse padrão de hover: abre só por botão direito. |
| Menu de contexto (`ctx`, `onStageCtx`, `openCtx`, `closeCtx`, `ctxPick`, `ctxRun`, `fitCtx`); `LayersCore.ctxMenuModel`, `ancestorAt` | Botão direito num plano (ou numa linha da árvore) abre um painel fixo (`role=menu`, `aria-label="Camadas do componente"`) com as camadas L0 a Ln do componente e o selecionado destacado; o submenu "Ações do ramo" (`role=menu`) traz Explodir daqui, Recolher até aqui e Requisição. `onStageCtx` sempre chama `preventDefault`; sem plano sob o cursor (nem `hoverId`) não abre, e um arrasto com o botão direito (> 3 px entre `mousedown` e `contextmenu`) também não. Clicar numa camada seleciona o ancestral e mantém o menu aberto. Fecha com Esc (primeiro da cadeia em `escape()`), `pointerdown` fora (primeira instrução de `onDocDown`), qualquer tecla que resolva outra ação em `onKey`, ação executada, `unloadProject` e `scan()` quando o nó-alvo some. `fitCtx` mantém painel e submenu dentro da viewport (o submenu inverte para a esquerda perto da borda). Modelo puro em `ctxMenuModel` (contagens por profundidade, `inBranch`, itens disponíveis); o painel fica no topo do template, fora do palco. |
| Explodir ramo (`explodeFrom`, `collapseAt`, `explodeHere`, `collapseHere`, `branchInfo`); `LayersCore.branchOf`, `inBranchOf`, `branchZ` | Na vista plana só o ramo escolhido ganha profundidade: `scene()` põe cada nó do ramo em `LayersCore.branchZ(depth, raiz.depth, collapseAt, spacing)` e o resto fica em z 0; `cam()` soma `s.spacing * span` ao afastamento lateral. `collapseAt` (profundidade) achata os níveis abaixo dele no plano daquele nível. `branchInfo()` memoiza conjunto, raiz e `span` por (`nodes`, `explodeFrom`, `collapseAt`) e devolve `null` fora da vista plana. O ramo se identifica por prefixo de id pontuado (`inBranchOf`). Marcas: selo `▤ Plana · ▧ ramo` no palco (canto inferior direito), `▧` na linha da árvore e no chip da régua. Não há plano fantasma tracejado para os níveis recolhidos, nem esmaecimento dos irmãos do ramo. |
| Requisições (`addRequest`, `setRequestText`, `removeRequest`, `showRequest`, `requestsMd`, `copyRequests`, `exportRequests`, `rewritePending`); `LayersCore.validRequest`, `requestsMarkdown` | Entradas manuais no painel Ajustes (chip de dado, texto livre, "Mostrar no palco", tag "alvo a confirmar") e o rodapé "Requisições Manuais" (Markdown, copiar, exportar). Persistem em `layers/v1/pending › requests[]` (§ Persistência). `requestsMd()` memoiza por identidade de `requests`, projeto e minuto, para que o orbit não regenere o texto. "Mostrar no palco" fica desabilitado quando a requisição está marcada `confirm`. |
| `LayersCore.ACTIONS`, `SHORTCUTS`, `keyAction`, `tooltip`; `keyRun`, `onKey` | Registro único de ações e atalhos (S3.3). `ACTIONS` dá rótulo, teclas e escopo (`global` no `onKey`, `ctrl` no ramo Ctrl/Cmd, `local` nos campos, `none` sem tecla); `keyAction` resolve a tecla e `keyRun` (montado uma vez) executa; `SHORTCUTS` é a tabela do painel `?`; `tooltip(id)` gera o `title` "Ação (K)". Exportado em [shortcuts.md](shortcuts.md). |
| Mock offscreen (`pageRef`, `left:-20000px`) | Fonte de camadas atual: recriação do Traval anotada com `data-src`. Deve ser substituído pelo loader de projeto. Desde a S9, hosts transitórios `[data-lod-host]` (leituras LOD do Espalhar e a sonda dos outros layouts, `lodSnapshot`/`probeOthers`) ficam fora da tela ao lado do host do layout ativo e são removidos no `finally`. |

## Estado (resumo)

- Câmera: `yaw, tilt, zoom, panX, panY, focus, spacing, persp, flat`.
- Ramo explodido (S3.5): `explodeFrom` (id da raiz do ramo, ou `null`) e `collapseAt` (profundidade a partir da qual o ramo volta ao plano daquele nível, ou `null`). Só valem na vista plana. Limpam explicitamente em `unloadProject`, na troca de projeto (`useDir`/`pickZip`/`loadRepo`) e em Reanalisar do 0; `loadProject` também os zera sempre que não há seleção a reaproveitar (`pendingSel` nulo, caso de Trocar de estado). O `scan()` os limpa só quando a raiz some de `byId`, o que inclui a raiz de tamanho zero (por exemplo após Interagir); desfazer não restaura o ramo.
- Menu de contexto: `ctx` é `null` ou `{x, y, id, fx, fy, flip}` (cursor, nó-alvo, posição ajustada à viewport e se o submenu inverte). Limpa no fechamento, em `unloadProject` e quando o `id` some no `scan()`.
- Requisições: `requests` (as do layout ativo; registros do ramo de requisição, ver § Fluxo de dados) mais `reqSel` (id expandido) e `mdOpen` (rodapé Markdown aberto), ambos só de interface.
- Cobertura (S9.1b): `coverage` (`null` ou `{open, status, …}`) no state; `covRun` (contador da corrida) e `_cov` (cache dos dados do modal) são campos de instância (§ Cobertura). Desde a S9.1e `analyzeCoverage` ignora um 2º clique com `status: 'running'` e o erro `projeto ainda carregando` (`COV_LOADING`) some quando a carga termina.
- Espalhar (S9.1c): `spread` (`{on, mode, picked, dist}`), `spreadRev`, `spreadMenu` e `lodHover` no state; `spreadFrozen`, `spreadSeq`, `spreadKey`, `normalCam`/`normalCamOwner` e `pendingSpread` são campos de instância (§ Espalhar).
- Sonda (S9.1d): `layoutProbe` (Map), `probeSeq`, `probeRun` e `watchLayouts` são campos de instância; só existem com 2+ layouts ([§ Edição entre layouts](#edição-entre-layouts-s91d)).
- Layouts (S9.1a): `project.layouts`/`project.layoutId`/`project.inter`, `layoutBadges` e `layoutPend` (no state; `layoutPend` = id → quantidade de `changes` guardados dos outros layouts, S9.1e, soma do badge de Salvar); `layoutMap`, `viewCache`, `pendingView`, `otherRequests`, `reqFloor` e `baseKey` são campos de instância (§ Layouts).
- Rascunho (S9.1e): `modal.drafting` (token da execução, no state) e `draftRun`, `draftBusy` e `draftedPaths` (campos de instância); ver [§ Ciclo do rascunho](#ciclo-do-rascunho-s91e).
- Teclado (S9.1e): com o modal de Salvar, o diff, a Cobertura ou os Atalhos abertos, `onKey` deixa passar só `escape` (e `shortcuts`, para fechar os Atalhos); `reload` também passa (com os Atalhos abertos, `reloadProject` não checa `s.shortcuts` e recarrega de fato, ou abre o modal de confirmação por cima). O prompt de escopo flutuante (`s.pending`) não tem fundo e **não** entra nesse conjunto: câmera e atalhos seguem valendo com ele visível (`Scope_PromptVisible_CameraKeysStillWork`). Ctrl+Z e Ctrl+Y são tratados antes e se recusam sozinhos com Salvar, diff ou Cobertura abertos; com os Atalhos abertos, `stepHistory` não checa `s.shortcuts` e desfazer age por baixo.
- Seleção: `selId, hoverId, isoId, active (camada ativa), hoverLayer, layerFocus, focusStr, othersOp`.
- Edição: `changes, history, buf, units, scope, pending, codeBuf, fileText`; as pilhas de undo/redo (`undoS`, `redoS`, snapshots `{layoutId, changes}`, 100 passos) são campos de instância, fora do `state`; cada `change` novo leva `layoutId`. `switchLayout` mantém as pilhas (`keepUndo`, lido no início de `loadProject`); projeto novo, Recarregar, troca de estado e `unloadProject` zeram tudo. `undoHash[layoutId]` guarda o hash da fonte contra o qual os passos foram feitos; `dropUndoFor(layoutId)` tira os passos de um layout cuja fonte mudou entre visitas (hash diferente) ou cuja carga voltou incompleta, do layout que sai perdendo ajustes que não cabem no armazenamento e do layout aplicado em `approve`. `stepHistory` ignora a tecla com carga em curso; um passo de outro layout espera a troca (sem teto enquanto o modal de confirmação está aberto, 10 s depois que a carga começa) e uma barreira de commit antes de aplicar. Os ajustes pendentes (`changes`) também vão para `layers/v1/pending` e voltam em `loadProject` (§ Persistência).
- Painéis: `rightOpen, rightPx, treeOpen, treeTab, splitPct, colOpen, navMin, interSize, menu, menuPin, cbOpen`.
- Recarga: `stale` (paths que mudaram no disco, ou `null`); `drift` (fontes citadas mais novas que o mock, ou `null`); `this.watch` (mtimes vigiados, fora do state) e `this.loadedSeq` (geração do `loadSeq` a que o watch pertence).
- Aparência: `cfg` (só o que o usuário mudou no menu Aparência; o resto vem de `LayersCore.APPEARANCE_DEFAULTS`).
- Persistido: `cfg` + `UI_KEYS` em `layers/v1/ui`, histórico em `layers/v1/projects`, câmera/seleção/último projeto em `layers/v1/session`.

## Persistência

| Onde | Chave | Conteúdo |
|---|---|---|
| `localStorage` | `layers/v1/meta` | `{schema:1, savedAt, migratedFrom}` — `migratedFrom` só existe em navegador que veio das chaves antigas. |
| `localStorage` | `layers/v1/ui` | Preferência de interface: `cfg` (tema, seleção, cores de origem, cabeçalho, escala de fonte, degradê) + `UI_KEYS` (painéis, navegação, árvore, escopo, `interSize`). |
| `localStorage` | `layers/v1/projects` | Histórico de projetos: `{id,kind,name,path,label,last,pinned}`. |
| `localStorage` | `layers/v1/session` | `{lastProjectId, selId, isoId, camera, explodeFrom, collapseAt, states, layouts?, viewLayout?, spread?}`. `layouts` (layout ativo por projeto) só é gravado se não vazio e `viewLayout` (layout a que `selId`/câmera pertencem) só em projeto com 2+ layouts (§ Layouts). `spread` (`{on, mode, picked, dist, cam}`) só com Espalhar ligado e 2+ layouts (§ Espalhar). `lastProjectId: null` é valor legítimo — significa "nenhum projeto", e o editor reabre vazio. `explodeFrom`/`collapseAt` só são restaurados quando a sessão é do projeto da aba; no modo fixture (`?layers=`, `?project=`) não são persistidos (grava `null`). Limpam em descarregar o projeto, trocar de projeto e Reanalisar do 0; uma raiz que não existe mais no scan zera os dois; `collapseAt` não numérico é ignorado. |
| `localStorage` | `layers/v1/pending` | `{schema:1, byProject:{<chave>:{savedAt, hash, changes[], requests[]}}}` (`requests[]` na linha seguinte). `<chave>` = `projectId` (`folder:`/`zip:`/`repo:`) ou `fx:<fixtureBase>`, mais `|<layoutId>` para um layout que não é o `main` (§ Layouts). `hash` cobre `layers.json`, mock, folhas `.css` e `dcSource` lidos em `loadProject`; hash igual restaura tudo na ordem; hash diferente descarta os `changes` com toast `warn` e mantém as requisições (marcadas `confirm`). `getPending` valida `changes` e `requests` separadamente: um `change` inválido zera só os `changes` e preserva as requisições válidas; `hash` ou `savedAt` inválidos anulam a entrada. Teto de 200 changes e expiração de 30 dias. |
| `localStorage` | `layers/v1/pending` › `requests[]` | Requisições manuais da mesma entrada: `{savedAt, hash, changes[], requests[]}`. Registro: `id` (`R<n>`), `layoutId`, `nodeKey`, `path`, `text`, `createdAt` (obrigatórios) e as âncoras opcionais `name`, `depth`, `alvo`, `caixa`, `estilos`, `uses`, `texts`, `pendente`, `nodeId`, `srcHash`, `confirm`; `validRequest` descarta a requisição cujo campo obrigatório falta ou cujo opcional presente (inclusive `nodeId`, string) não tem o tipo certo. A entrada **sobrevive sem changes**: só some quando `changes` e `requests` estão ambos vazios. Hash diferente descarta os `changes` mas **mantém** as requisições, cada uma com `confirm: true` ("alvo a confirmar"; o `nodeId` posicional só vale com `confirm` falso). Com `srcHash` a marca é derivada (`r.srcHash !== hash`) e some quando o hash original volta; sem `srcHash` (registro antigo) ou após leitura incompleta ela persiste até a requisição ser removida. Leitura incompleta (CSS ou dcSource não lido) também marca `confirm` e **continua gravando** o texto das requisições (modo `pendingReqOnly`), mantendo o `hash` e os `changes` já guardados; o mesmo vale quando `refreshPendingHash` falha depois de Aplicar. Teto de 200 requisições (toast ao passar). Restaurar reescreve a entrada (novo `savedAt`, hash atual), então a expiração de 30 dias renova a cada carga que restaurou requisições; em leitura incompleta o `hash` guardado é mantido, não o atual. |
| `sessionStorage` | `layers/v1/tab` | `{projectId}` da aba. Vence o `session` ao restaurar: cada aba reabre o **seu** projeto. Câmera e seleção não: moram no `session` compartilhado e só são restauradas quando `lastProjectId` é o projeto daquela aba. |
| IndexedDB `layers-hist` | store `h`, chave = `id` do histórico | `FileSystemDirectoryHandle` da pasta conectada. É o único lugar onde handle é guardado. |

Nenhuma dessas chaves guarda conteúdo de arquivo, e handle nenhum entra no `localStorage` (F:68).
Escrita: `persistSoon()` com trailing de 400 ms, disparado de `componentDidUpdate` quando a
assinatura de `ui` + `projects` + `session` muda — uma gravação por rajada, não uma por evento.
Recarregar não desmonta o componente, então o `pagehide` drena o trailing pendente; sem isso a
preferência mudada nos últimos 400 ms morreria com a página.
Ajustes pendentes: a gravação segue a identidade de `state.changes` (não a assinatura de `ui`),
com `pendingDirty`, para que uma aba ociosa nunca regrave a entrada de outra. `loadProject`
drena a rajada pendente antes de recalcular `pendingKey`, restaura só na carga vencedora e, se
uma fonte falhou na leitura, preserva a entrada sem restaurar `changes` (as requisições seguem sendo gravadas). `doReload` descarta só os `changes` e mantém as requisições; `resetUI` limpa a
entrada inteira; `approve`/`rollback` recalculam o hash da sessão (`refreshPendingHash`).
Recarregar, Trocar de estado e Reanalisar do 0 descartam os `changes` mas mantêm as requisições (`rewritePending`); Zerar interface limpa tudo, inclusive requisições e as entradas dos demais layouts (§ Layouts). Multi-estado: `pendingKey` é por projeto (e por layout, § Layouts) e o `hash` por estado do mock, então cada requisição grava o `srcHash` do estado em que nasceu (`addRequest`) e `restorePlan` deriva `confirm = r.srcHash !== hash` ao restaurar: trocar para outro estado marca, voltar ao original desmarca (`Request_ConfirmedStateSwitch_KeepsRequests`). O `nodeId` permanece no registro e só vale com `confirm` falso. Registros sem `srcHash` (antes desta correção) e cargas incompletas mantêm a marca pegajosa.

Casos de borda: Zerar interface com a carga incompleta (`pendingReady` falso) não toca a entrada salva, então requisições e ajustes guardados voltam na próxima carga completa. Do mesmo modo, depois de uma carga incompleta, Recarregar ou Trocar de estado confirmados não reescrevem os `changes` guardados (`dropPending` só reescreve com `pendingReady` verdadeiro). Exportar de novo as requisições cria `layers-requests.md.bak` na raiz do projeto (o `writeText` faz `.bak` antes de sobrescrever).
Migração (`LayersCore.migrateConfig`) converte `layers-cfg`, `layers-hist` e
`layers-inter-size` e **não** as apaga; a remoção fica para a v2.26.

Reabrir: pasta já autorizada volta sozinha por `queryPermission()` (`requestPermission()`
exigiria clique); `.zip` e repositório GitHub não reabrem sozinhos — o painel do palco diz o
que fazer. Reabrir o último projeto preserva câmera e seleção; abrir um projeto diferente
volta à vista padrão.

Export/import: `layers-config.json` (`{schema:1, exportedAt, ui, projects}` — sessão fica
fora, é da aba) pelas duas linhas no dropdown de projetos. No import, `ui` substitui as
chaves que o arquivo traz e `projects` faz merge por `id` preservando `pinned`; pastas locais
precisam ser reconectadas. Arquivo é dado de fora: `sanitizeUi` só aceita valor que casa com
o tipo do estado, `theme`/`selectColor` dentro das paletas, `fontScale` entre 0,7 e 1,6, e o
histórico importado passa pela mesma poda de `histMax` do `touchHist`.

Escrita entre abas é "último que grava vence" para `ui` e `projects` — não há listener de
`storage`. Vale para preferência e histórico; o ponteiro de projeto é por aba e não sofre.

## Rede

Nenhuma requisição no carregamento. Fontes e React são servidos do próprio repositório — verificado com 12
requisições, todas em `localhost:5180`. Única saída: o loader de repositório público do GitHub, iniciado
pelo usuário e confirmado a cada carga (CSP `connect-src` api.github.com e raw.githubusercontent.com).
Ver [LOCAL-SETUP.md](LOCAL-SETUP.md).

## Limites conhecidos

- DOM 3D: acima de ~1.500 planos o orbit degrada. Mitigações: `contain`, `will-change` só durante drag, transições desligadas no drag (v2.22) e culling por viewport durante o arrasto (S4.5; selecionado e hover nunca cortam; opacidade não é critério, ver comentário v2.7-b no `Plane`). Leitura do estilo computado medida fora do caminho crítico do orbit (S4.6, sem cache). Atributos de plano (hit-test, will-change, planos vazios) medidos fora do caminho crítico do orbit (S4.8): o custo está nas camadas compostas por plano (Layerize ~11,5 ms/frame no trace; custo linear por plano visível), mitigado na S4.9 pelo agrupamento por `z` durante o arrasto (429 para 31 camadas compostas; orbit do Traval 23,8 para 17,7 ms/frame, 41,9 para 56,5 fps); custo conhecido: ao soltar o arrasto os ~414 planos remontam e há uma travada visível de ~100 ms (`dragEndMs` 33 a 133 ms). Árvore de camadas medida fora do caminho crítico no Traval (S4.7): ganho do teto de 2,6 % do frame, teto do memo das linhas ≈ 0 e troca de `hoverId` ≈ 0,01 a 0,03 por frame (nenhum memo ou janela foi implementado na S4.7); com 1.500 tags o teto é de 23,8 % (orbit 62,4 para 47,5 ms/frame; select de linha 486 ms; scroll da árvore 271 ms/frame), custo de montagem e diff de ~1.650 linhas. Janela da árvore (S4.10): a Hierarquia e os Elementos montam só as linhas visíveis (±10 de sobra) entre espaçadores invisíveis (`data-tree-pad`); as linhas de código têm altura medida por `ResizeObserver` (`data-code-key`), o scroll só reconstrói a faixa a cada 110 px; a lista tem um slot por linha (o `sc-for` do runtime chaveia por índice, então, enquanto a lista não muda, cada linha fica no slot do seu índice): fora da faixa o slot é vazio, com um espaçador por trecho vazio, e a linha com textarea ou foco de teclado (`_treeKeep`) fica montada junto das 10 linhas antes e depois dela para Tab e Shift+Tab seguirem (`LayersCore.treeSlots`, S4.11); a faixa segue o scroll sem congelar e o blur com a janela sem foco (alt-tab) não solta a linha; limitação conhecida: se um scan (por exemplo depois de Ctrl+Enter no código) acrescentar ou remover linhas acima da linha com foco, o slot dela muda, como já era antes; listas de até 3 telas não usam janela. Em 1.500 tags: seleção de linha 309 → 182 ms, hover 74 → 17 ms, orbit 53,4 → 34,0 ms/frame; o scroll da árvore melhorou só 5 % (141 → 134 ms/frame), porque cada passo ainda roda o `render()` completo com a construção inline das linhas.
- Fonte de camadas fixa (mock). Ver `RELEASE-CHECKLIST.md` → "Loader de projeto".
- Regras vindas de TS/JS/JSX são exibidas e registradas, mas não reescritas; o cabeçalho do painel de propriedades e a lista de Ajustes as marcam como "manual" (`LayersCore.isManualSource`).

### Camadas de gravação

O `data-src` de um elemento é `arquivo|seletor|linha`. O que ocupa o slot do seletor decide como se grava:

| Origem | `data-src` | Gravação | Recusa (código ou toast) |
|---|---|---|---|
| Regra em `.css` | `arquivo.css\|.classe\|linha` | `patchCssAt` | folha de utilitários recusa por toast (`utilityBlock`) |
| Template dc (`<x-dc>`) | `dcSource\|tpl:N\|linha` | `patchDc` → `patchAttrAt`, só valor literal em `style=""` | `VALUE_HAS_BINDING`, `NO_INLINE_STYLE`, `PROP_NOT_INLINE`, `VALUE_UNSAFE`, `SOURCE_CHANGED`, `MAP_MISALIGNED` |
| Qualquer outro arquivo | `arquivo\|…` | nenhuma | `SOURCE_NOT_CSS`; `SNAPSHOT_STYLE` para o `<style>` do próprio snapshot |
| Origem sem pasta gravável | — | nenhuma | toast que nomeia a origem (`readOnlyBlock`) |

Onde há código (`LayersCore.DC_CODES`), o código da recusa é o contrato; a frase mostrada no log
do rascunho (`dcWhy` em `index.html`) deriva dele e vem com um snippet para colar à mão. Só o
template dc tem mapa por índice: o runtime carimba
`data-dc-tpl="N"` em ordem de documento, `LayersCore.mapDcTemplate` conta as start tags do arquivo
na mesma ordem (o conteúdo de `<template>` não é carimbado, então é pulado) e o mapa só vale se
`checkDcMap` bate as tags do render **e** `dcStyleMismatch` bate os valores literais do `style=""`
do fonte com o style renderizado; qualquer divergência desabilita toda gravação `tpl:` do projeto.
No `approve`, o patch é recalculado sobre o arquivo atual e só promove o rascunho se o resultado for
idêntico a ele, então uma edição sua no arquivo entre o rascunho e a aprovação não se perde.

## Loader de projeto

`loadProject` lê o `layers.json`, o mock e as folhas, e chama `buildProjectFromHtml` (função de
módulo em `index.html`, só devolve dados): sanitiza, escopa as folhas, monta a raiz (L0) e atribui
`data-src`. O chamador faz o hoist de `@font-face` e monta o resultado no shadow root fora da tela. Os avisos escritos pelo hoist entram em `warn` depois dos do build (folha de utilitários,
mapa dc, `rules`); como o toast de carga mostra só `warn[0]`, um aviso que desabilita gravação
ganha de uma fonte do projeto ausente.
A fonte de camadas é sempre um mock sanitizado; nenhum script do projeto roda na origem do editor.
Ler um app renderizado por JS **sem** snapshot manual (Chromium headless em processo separado) está
decidido e não implementado: ver a ADR de 2026-09-18 em `architecture-decisions.md`. Iframe de mesma
origem foi descartado (alcançaria o handle de pasta gravável).

### Fidelidade do snapshot (S2.22c)

O snapshot copia os atributos do `<html>` (`data-theme`, `lang`, `dir`, variáveis `--*` do `style`) e troca cada `<canvas>` por `<img data:image/png>` marcado com `data-layers-frozen="canvas"` (acima de 4 Mpx, de 1,5 M caracteres por canvas ou de 4 M no total do snapshot o canvas fica vazio; os atributos `on*` do `<html>` não são copiados). O loader filtra os atributos por allowlist (`LayersCore.hostAttrsFromHtml`: `class` só com letras, dígitos, `_`, `-` e espaço; nada de `on*`, `data-src`, `data-layers-*`, nem nome `data-*` fora de `[a-z0-9_.-]`; o valor de uma variável passa por allowlist: só `[#\w\s.,%()+-*/"']`, sem `/*`, aspas pares e só funções da lista (`var`, `calc` e outras de matemática, cores, `light-dark`, `env`, gradientes, transformações e filtros), com no máximo 2000 caracteres), aplica-os ao host do shadow root e acrescenta as variáveis como regra `:host{…!important}` no fim da folha. `scopeAst` reescreve `:root[data-theme='light']`, `html.dark` e `html[…]` como `:host(…)`; o composto com `:has()` fica no escopo antigo, porque `:has` dentro de `:host()` olha os filhos do host. Na árvore, a linha de um canvas congelado leva o selo `IMG` e o L0 de um snapshot leva o sufixo `· snapshot` com a origem da captura no `title`. O mock continua estático: o gráfico não atualiza com dados novos. Limites do canvas em `<img>`: regras escritas para `canvas` deixam de casar, resets de `img` (`max-width`, `height:auto`) passam a valer e um canvas WebGL sem `preserveDrawingBuffer` congela em branco. A captura (URL, data, viewport) é lida até o `-->` do comentário (`LayersCore.snapshotCapture`: o marcador `snapshot LAYERS` tem de começar nos primeiros 4000 caracteres, e o `-->` é procurado sem janela), e o sufixo `· snapshot` do L0 entra depois de `rules`.

### Recarregar projeto e aviso de mudança no disco

Recarregar relê do disco todos os arquivos do projeto: tecla `R` ou `Projetos ▾ › Recarregar projeto`
(só com pasta local conectada). Com `changes` ou `codeBuf` pendentes (`LayersCore.hasUnsaved`) pede
confirmação, porque descarta as edições; não abre com painel modal aberto. `doReload` grava
`pendingSel` (`selId`/`isoId`) e chama `loadProject`, que restaura seleção e isolamento e preserva a
câmera (só um projeto novo a zera).

Ao fim de cada carga, `this.watch` guarda o mtime de `layers.json`, do mock, das folhas CSS e do
`dcSource` (`LayersCore.pickWatched` sobre `this.mtimes`; rascunhos e `.design-history` ficam fora).
Ao focar a janela (`focus`/`visibilitychange`, debounce de 300 ms), `checkStale` confere só esses
arquivos com `getFile()`, sem ler conteúdo, e só depois de `queryPermission` retornar `granted`.
`LayersCore.staleFiles` compara com o snapshot (mtime diferente ou arquivo ausente) e o banner
aparece com o primeiro path e `+N`. Os `.ts`/`.js` citados em `data-src` entram no conjunto vigiado depois da carga
(§ Reanalisar do 0); `src/**/*.ts` que o mock não cita continua fora (o app alvo só entra via mock/snapshot). Escritas do próprio LAYERS (`writeText`) atualizam
`this.watch`, então não se auto-acusam; "×" (`dismissStale`) aceita os mtimes atuais. Cargas
concorrentes (`loadedSeq !== loadSeq`) suprimem a checagem.
A posição do banner acompanha o dock (`top` = 36 + `topBarH` + 12, logo abaixo dele); `LayersCore.staleBannerBox`
mantém a caixa entre a coluna da árvore e o painel direito (largura mínima de 240 px; a 1024 px ela encolhe). O conjunto vigiado
lista só o que foi lido com sucesso e `this.mtimes` é zerado a cada `loadProject`, para não herdar os mtimes da
pasta anterior. `LayersCore.dismissWatch` aceita os mtimes atuais e mantém os paths ausentes no `watch` como
`'missing'`: continuam vigiados e voltam a acusar quando reaparecem (salvamento atômico = apaga + renomeia).
Com o `watch` de quando `checkStale` leu (`staleSeen`), o "×" só aceita paths que uma gravação própria não moveu
desde então. Reverter uma aprovação (`rollback`) compara o mtime atual com o que o `approve` deixou
(`entry.written`) e recusa se o arquivo mudou fora do LAYERS, mesmo depois de um reload; `retryCreateLayersJson`
lê o `loadSeq` na entrada e desiste se uma carga mais nova começou.
Uma carga superada (`seq !== loadSeq`) não descarrega nem marca `loadedSeq` por cima da carga mais nova.

S9.1d: com 2+ layouts o `checkStale` também vigia o mock de cada outro layout e os arquivos da sonda, e o banner nomeia o layout; o fluxo, a invalidação do cache e os limites estão em [Edição entre layouts](#edição-entre-layouts-s91d).

### Reanalisar do 0 e deriva do layout

O mock é a fonte das camadas, e um mock autoral ou de snapshot não se regenera sozinho: o app alvo
muda e o Layers continua mostrando o layout antigo. O caso que motivou a S2.21 foi o Traval, cujo
`layers/mock.html` é feito à mão (estilo inline) e ficou para trás das mudanças de `src/ui/*.ts`.

Ao fim de cada carga, `probeLayout` (sem `await`, só com `queryPermission` `granted`) lê o mtime dos
`.ts`/`.js` citados em `data-src` e em `root.src` (`LayersCore.citedSources`: caminho no mesmo espaço
das folhas, tetos de 50 arquivos, sem `tpl:`) e os acrescenta a `this.watch`. Se algum é mais novo que
o mock (`LayersCore.layoutDrift`), `state.drift` abre o banner "Mock mais antigo que a fonte: …" com o
botão "Reanalisar do 0" (borda `--warn`, para se destacar) e a dica de gerar um novo snapshot. O "×" e o
Reanalisar reconhecem a deriva na sessão (`ackDrift`, `LayersCore.layoutDrift(…, ack)`): ela só volta se a
fonte for editada de novo; numa sessão nova o aviso reaparece enquanto o mock continuar mais velho. Depois da carga, `checkStale` classifica a lista com `LayersCore.staleKind`:
`layout` (mock, `layers.json` ou fonte citada) troca o botão "Recarregar" por "Reanalisar do 0";
`style` (só folha CSS) mantém o banner de antes.

S2.22d: `layers.json › watch` (globs de fontes, relativos à raiz da pasta) completa as fontes citadas. `walkWatch` percorre a pasta conectada só nas pastas que algum glob alcança (`LayersCore.globDirMayMatch`), pula `node_modules`, `.git`, `dist`, `build` e pastas de ponto e para em 5000 entradas; `LayersCore.globMatch` seleciona os arquivos e `citedSources(srcs, known, cap, extra)` os junta depois dos citados em `data-src`, com o mesmo teto de 50. Assim um mock de snapshot, que não traz `data-src`, também acusa deriva quando o código-fonte muda. O excedente do teto vira um toast `watch: N arquivos além do teto de 50 ignorados`; a varredura parada em 5000 entradas ou em 8 níveis de pasta também avisa. Cada glob é compilado uma vez (`LayersCore.compileGlob`: `match` e `dirMayMatch`), e `watchGlobs` recusa glob acima de 200 caracteres ou 8 curingas para limitar o backtracking.

"Reanalisar do 0" (banner ou `Projetos ▾`) pede confirmação sempre. Se `layers.json` e o mock têm o mesmo
mtime da carga (`layoutMoved`), o modal vira "O mock não mudou": explica que reler não traz UI nova, manda
gerar o snapshot e só recarrega com "Reler mesmo assim". Ao confirmar, `backupLayout` grava o
`layers.json` e o mock **como foram lidos** (`this.loaded`, em memória, então mesmo um mock já
sobrescrito no disco fica salvo) em `.design-history/layout-<AAAAMMDD-HHMMSS>/`, mais o mock de cada outro layout declarado em `layouts/<id>/` (lido do disco na hora; § Layouts), por `writeText`
(permissão de escrita, guarda de conflito, `writeLog`). Falha no backup aborta antes de recarregar, com
toast `warn`. Depois o toast da carga nomeia a pasta do backup (`bakNote`). `dropPending`, `pendingSel = null` e `loadProject`: projeto novo, sem seleção,
câmera, undo nem ajustes salvos. O backup não tem retenção nem poda.

Limite: reler só traz a UI nova se o mock mudou. Em app renderizado por JS, regenere o mock com
`node tools/layers-snapshot-cli.mjs <url-do-app> <pasta>/layers/mock.html` (S2.21c; o texto do modal de
confirmação diz isso). O CLI é um processo à parte que o usuário roda: abre o app (dev server já no ar, só
`http:` em loopback, nunca a porta 5180) num Chromium headless, executa `tools/layers-snapshot.js` e grava o
mock no caminho dado; nada do app roda na origem do editor. O endpoint `/__layers/*` da ADR de 2026-09-18
(snapshot sob clique, dentro do editor) segue não implementado.

### CSS do snapshot e folhas reais

Um mock de snapshot (`tools/layers-snapshot.js`) copia o CSS computado das folhas do app em `<style>`; sem
tratamento, essa cópia entrava no shadow root depois das folhas de `styles` e as mascarava: editar a folha
real não mudava o palco. O snapshot agora emite um `<style>` por folha com `data-layers-origin` (id do Vite
em `data-vite-dev-id`, senão `sheet.href`, senão sem atributo); folha cross-origin ilegível vira `<style>` só
de comentário, sem atributo.

`buildProjectFromHtml` descarta o bloco cuja origem é coberta por uma folha de `styles` **lida com
sucesso** (`LayersCore.snapshotOriginCovered`: caminho completo da folha como sufixo da origem numa
fronteira `/`; aceita URL com query e barra invertida do Windows). Com `base`, a origem vem da raiz servida,
então a cobertura testa o caminho com o prefixo de `base` e sem ele. A folha real, escopada, ocupa a posição
do primeiro bloco que a copiava na ordem do mock, preservando a cascata do app; por isso uma folha
deduplicada deixa a ordem do manifesto e segue a ordem do mock. Folha listada que falhou ao ler mantém a
cópia do snapshot. Mock sem o atributo (snapshot antigo, mock autoral) carrega como antes.

Se o snapshot é legado (blob único: **nenhum** bloco com origem e ao menos um com regras; comentário puro não
conta), esse CSS pode mascarar qualquer folha listada: `this.maskedCss` (as folhas lidas em `css`, inclusive
as vindas de `<link>` do mock e sem as que falharam ao ler) entra em `this.structural` e `LayersCore.staleKind`
devolve `layout` ("Reanalisar do 0") em vez de `style` quando uma delas muda. Num snapshot rotulado, o bloco
sem origem (CSS do próprio app, CSS-in-JS) não mascara nada. `LayersCore.maskedSheets` decide isso.

Limites: o casamento por sufixo de uma folha listada na raiz (ex.: `theme.css`) é frouxo e pode casar
`/node_modules/x/theme.css`; snapshots antigos precisam de um novo para se beneficiar. Num snapshot
rotulado, uma cópia cuja origem não casa com nenhuma folha listada (diferença de caixa no Windows, bundle com
hash como `/assets/index-<hash>.css`) é mantida e continua vencendo, e o banner reporta `style`. O aviso de
`interactions` sem alvo vai antes dos avisos de URL remota (`LayersCore.placeDeadWarning`), porque o toast da
carga mostra só `warn[0]`; `css não encontrado` continua primeiro.

### Ação `attr` de `interactions` (S2.22e)

O motor de interações do menu ⚡ Interagir (`act`/`actOn` em `index.html`) ganha `attr`, que alterna `data-*`/`aria-*` nos
elementos do mock (`mockQ(selector)`), reaproveitando o re-scan das demais ações. A validação é pura em `lib/layers-core.js`
(`attrAction` normaliza e recusa nomes fora de `data-*`/`aria-*`, `attrIsOn`/`attrToggle` aplicam) e `deadInteractions`
passa a listar o seletor do `attr`. O mock continua estático: nenhum script roda, só o atributo muda e o CSS do shadow root reage.

### Estados do mock (`states`)

`layers.json › states` (`[{ name, mock }]`) deixa um projeto ter vários mocks, um por estado da interface
(vazio, com dados, painel aberto). `LayersCore.projectStates` normaliza a lista (entrada inválida sai, nome
repetido fica com o primeiro) e `LayersCore.pickState` escolhe o estado ativo (`this.stateMap`, senão o
primeiro); `loadProject` lê o `mock` do estado no lugar de `man.mock` e guarda `project.states` e
`project.stateName`. Sem `states` nada muda. O seletor é o grupo "Estado do mock" do item "Modo interativo" do
menu ⚡ Interagir (só aparece com 2+ estados). `switchState` relê o projeto do zero: o DOM é outro, então seleção
e câmera não valem, e edições não salvas pedem confirmação e são descartadas, como no Recarregar. O hash das
fontes inclui o caminho do mock, por isso ajustes pendentes de um estado não valem em outro.
`this.stateMap` (estado escolhido por projeto e layout, chave = `LayersCore.stateMapKey(base, layoutId)`, que coincide com o `pendingKey` fora o `-` do projeto sem chave) vai em `layers/v1/session › states`, então
Recarregar e reabrir voltam ao mesmo estado e os ajustes pendentes dele são restaurados. Mock ausente no estado
escolhido limpa a entrada e o erro cita `states`; recarregar abre o primeiro estado. O CLI de snapshot captura cada estado da gallery do app com
`--state <nome>` (`<url-do-app>/gallery.html#/<nome>`).

### Layouts (S9.1a)

`layers.json › layouts` (`[{ id, name, mock, states? }]`, contrato em [layers-json.md](layers-json.md)) deixa um projeto ter várias telas. **Foco**: um layout montado por vez, no mesmo shadow root; trocar de layout recarrega só o mock dele. Espalhar (vários layouts no mesmo palco, só um vivo) é a S9.1c ([§ Espalhar](#espalhar-s91c)); a cobertura % é a S9.1b ([§ Cobertura](#cobertura-s91b)).

```
layers.json ── LayersCore.projectLayouts(man) ──▶ [{id,name,mock,states}]   (sem layouts: 'main' implícito)
                                                        │ pickLayout(list, layoutMap[base])
chip da faixa LAYOUTS ─▶ switchLayout(id)               ▼
   │ guardas: painel, diff, loadedSeq      loadProject()  ── baseKey local + guarda de loadSeq
   │ codeBuf sem salvar? modal (só limpa   │              ── pendingKey = layoutPendingKey(base, id)
   │   o codeBuf, nunca dropPending)       │              ── scan(): nodes/byId só do layout ativo
   │ viewCache[saindo] = vista atual       ▼
   │ layoutMap[base] = id             palco, Árvore, Camadas, Ajustes (um layout)
   └ pendingView = vista alvo (carimbo {projectId, layoutId})
```

**Modelo.** `LayersCore.projectLayouts` devolve a lista normalizada: sem `layouts` válido existe só o `main` implícito (`mock` e `states` da raiz, como antes); com `layouts` válido a raiz é ignorada (limite g). `pickLayout` escolhe o pedido ou o primeiro. O mock vem do estado ativo do layout (se houver `states`) ou do `mock` dele. `project` ganha `layouts` (`[{id, name}]`) e `layoutId`.

**Chaves.** Um projeto sem `layouts` (ou o layout `main`) usa exatamente as chaves de antes; os demais acrescentam `|<id>`. O `<id>` casa `^[A-Za-z0-9_-]{1,40}$`, então nunca contém `|`.

| Dado | `main` (ou sem `layouts`) | Outro layout `<id>` | Onde |
|---|---|---|---|
| `pendingKey` | `<base>` | `<base>\|<id>` | `layers/v1/pending › byProject` |
| `stateMap` (estado do mock) | `<base>` (ou `-`) | `<base>\|<id>` (ou `-\|<id>`) | memória e `session › states` |
| layout ativo (`layoutMap`) | `{ <base ou ->: '<id>' }` | idem | `session › layouts`, só se não vazio |
| vista da sessão (`selId`, câmera) | carimbo `viewLayout` | idem | `session › viewLayout`, só com 2+ layouts |
| `viewCache` (`selId`, `isoId`, câmera, `flat`, `explodeFrom`, `collapseAt`) | `stateMapKey(base, id)` | idem | memória; esvazia em `unloadProject` |

`restoreSession` só reaproveita câmera, seleção e ramo se o `viewLayout` gravado bate com o layout ativo, então fechar a aba durante uma troca não pareia a vista de um layout com o mock de outro. `stateMapKey` e `layoutPendingKey` são puras em `LayersCore` (`test/layers-core.test.js`).

**Carga e troca.** `loadProject` guarda `baseKey` em variável local e só atribui `this.baseKey` e `this.pendingKey` depois do `JSON.parse` **e** do teste `seq !== loadSeq`, para uma carga superada não mexer nas chaves da vencedora. A rajada pendente é drenada (`writeConfig`) na chave antiga antes da reatribuição, então os `changes` do layout que sai ficam gravados e voltam com o mesmo hash. `switchLayout` tem as guardas do `switchState` (modal, painel de pendentes, diff, `loadedSeq`); só abre modal se houver `codeBuf` sem salvar (ou `changes` que não podem ser gravados: carga incompleta, acima do teto de 200 ou armazenamento cheio depois de uma escrita recusada), e o `onYes` só limpa o `codeBuf`, nunca chama `dropPending`. A vista do layout que sai vai para `viewCache`; a do que entra (se existir) segue em `pendingView` e é aplicada no `setState` principal da carga vencedora (como `keep`, sem segundo render), validada pelo `scan()`. Mock do layout ausente apaga `stateMap` e `layoutMap` daquele projeto antes de descarregar: recarregar abre o primeiro layout. Um id de `layoutMap` que já não existe em `layers.json` cai no primeiro layout e é apagado da carga, para o carimbo `viewLayout` da sessão voltar a bater na próxima. O mapa `layoutMap` só é gravado na sessão quando não vazio; um id lembrado permanece enquanto existir no projeto e é apagado na carga quando some (inclusive se o projeto passar a ter um só layout); o carimbo `viewLayout` só existe com 2+ layouts. Os mapas por id de layout (`viewCache`, `otherRequests`, `layoutBadges`) têm protótipo nulo, então ids como `constructor` ou `__proto__` valem como qualquer outro.

**Calculado uma vez por carga** (nunca no `writeConfig`, que roda a cada rajada de câmera):

- Numa só leitura de `layers/v1/pending` por layout não ativo saem os badges da faixa (`layoutBadges`, `changes + requests`), o piso do `R<n>` (`reqFloor`, o maior número entre as requisições dos outros layouts) e as requisições dos outros layouts (`otherRequests`).
- `project.inter` guarda as interações do layout ativo (`LayersCore.interactionsFor`; interação sem `layout` vale para todos), cada uma com o índice **original**, de que dependem as chaves do menu Interagir. `deadInteractions` recebe a lista filtrada.

**Requisições.** `addRequest` grava o `layoutId` ativo e numera `R<n>` globalmente (máximo entre as do layout ativo e `reqFloor`). Na exportação, `allRequests()` junta (`LayersCore.mergeLayoutRequests`, na ordem de `layouts`) as do ativo com as lidas dos outros, e o Markdown agrupa por layout com `· N layouts` no cabeçalho (N = layouts declarados). A guarda de vazio, a contagem dos toasts, Copiar e Exportar usam a lista **mesclada**, então exportar funciona com o layout ativo sem requisições. O painel Ajustes lista só as do ativo e mostra, numa linha à parte, `outros layouts: Nome (N), …` (só contagem).

**Backup e Zerar.** Reanalisar do 0 (`backupLayout`) grava também o mock atual de cada outro layout declarado em `layouts/<id>/<arquivo>` dentro de `layout-<carimbo>/` (`layoutBackupPaths(stamp, mock, id)`; o caminho do layout ativo não muda). Falha de **leitura** de outro mock vira aviso no toast; falha de **escrita** continua tudo-ou-nada. Reanalisar mantém o layout ativo (`layoutMap`) e esvazia só o `viewCache` dele. Zerar interface remove as entradas `<base>|*` (`clearLayoutEntries`), o `layoutMap` do projeto e, quando o `main` é declarado, também a entrada `<base>` (e sempre, sem projeto montado); com a carga incompleta (`pendingReady` falso e `pendingKey` definida) as entradas guardadas não são tocadas, só o `layoutMap`; se a carga atual falhou antes de ler o `layers.json` (o `baseKey` ainda é o do projeto anterior), não toca nas chaves de outro projeto.

**Renovação do TTL.** Cada escrita da chave ativa (`writePending`, `rewritePending`) chama `touchLayoutEntries` (só com 2+ layouts) e renova o `savedAt` das entradas irmãs `<base>|*`, e o da `<base>` quando o `main` é declarado (`includeBase`). Sem isso a expiração de 30 dias apagaria os ajustes e as requisições de layouts fechados enquanto o projeto é usado todo dia. A renovação também poda o que já expirou, então cada irmã precisa ser renovada em até 30 dias da renovação anterior. Se a renovação não consegue gravar, as entradas guardadas ficam como estavam e o resultado entra no mesmo aviso de armazenamento cheio da escrita da chave ativa (`touchLayoutEntries` devolve `false` com `now` inválido ou escrita recusada).

#### Limites do Foco

| # | Limite | Observação |
|---|---|---|
| a | Trocar de layout não descarta `changes` (ficam na chave antiga e voltam com hash igual); `codeBuf` sem salvar pede confirmação e é descartado | `changes` que não podem ser gravados (carga incompleta, acima do teto ou armazenamento cheio) se perdem, e o modal diz isso |
| b | Fechado (S9.1d): **Aplicar** e **Salvar** (mesmo modal, `openSave`) juntam as pendências dos outros layouts ([§ Edição entre layouts](#edição-entre-layouts-s91d)); os outros layouts seguem com badge | CSS compartilhado aplicado muda o hash dos outros layouts: as pendências deles que não entraram no Salvar são descartadas ao abri-los (toast) |
| c | Requisições dos outros layouts vêm do `layers/v1/pending`, com o `confirm` gravado | A marca "alvo a confirmar" fica desatualizada até o layout ser aberto |
| d | Deriva e `driftAck` valem só para o layout montado; Undo/Redo (pilha única) e watch (mock de cada layout e arquivos da sonda) cobrem todos desde a S9.1d | Deriva em layout desmontado só aparece ao abri-lo; o backup do Reanalisar lê o mock de todos |
| e | O botão "Espalhar" entrou na S9.1c; não há botão "Foco" no dock | "Foco" é o segmento do popover que desliga o Espalhar (evita o choque de nome com o FOCO das camadas) |
| f | O aviso de escopo `all` ("também afeta …") vem da sonda dos outros layouts (S9.1d) | Contagem sob demanda, em cache, só com 2+ layouts; layout indisponível fica fora da linha |
| g | Com `layouts` declarado, `mock` e `states` da raiz são ignorados, e as chaves antigas (`<base>`) só voltam se existir `id: "main"` | Sem `main` os pendentes antigos ficam órfãos; ver [layers-json.md](layers-json.md) |
| h | A escrita da chave ativa renova o `savedAt` das irmãs | Entradas de layouts abandonados vivem enquanto o projeto viver |
| i | Clicar no layout cujo mock não existe descarrega o projeto e a faixa some | Recarregar a página reabre o primeiro layout (o `layoutMap` foi apagado) |
| j | Badges e requisições dos outros layouts são um retrato da carga | Só se atualizam na próxima carga (trocar de layout recarrega) |
| k | Um `<base>` (nome de pasta ou `.zip`) com `\|` pode colidir com `<base>\|<id>` | O `<id>` nunca contém `\|`, mas o nome da pasta pode |
| l | Ids de layout são deduplicados sem diferenciar maiúsculas (vale o primeiro) | `Main` e `main` contam como o mesmo layout; só o `main` exato, em minúsculas, usa as chaves antigas (`Main` usa `<base>\|Main`) |
| m | O backup do Reanalisar lê do disco o mock dos outros layouts; só o ativo vem da memória (`this.loaded`) | Um mock sobrescrito no disco entra no backup já alterado; leitura que falha vira aviso |

### Cobertura (S9.1b)

`Projetos ▾ › Analisar cobertura` (só com projeto carregado) responde, sem rodar o app e sem rede, quanto do repositório cada abordagem mostra: **Monovisual** (o mock do `main`), **Monovisual + states** (mais os `states` dele) e **Múltiplos layouts** (todos os layouts declarados ou, sem `layouts`, as telas estáticas candidatas). Só leitura: nada é gravado, e Copiar usa a área de transferência. A análise é sob demanda; carregar o projeto não varre (`Coverage_Load_DoesNotScan`).

```
Projetos ▾ › Analisar cobertura ─▶ analyzeCoverage()
   │ guarda: loadedSeq !== loadSeq ─▶ erro "projeto ainda carregando"
   │ captura dir, seq, zip e run (covRun) ANTES do 1º await; state.coverage = {open, status:'running'}
   │ man normalizado: base sem barras nas pontas, mock padrão layers/mock.html (como o loader)
   ├─ pasta local ─▶ collectProjectFiles(dir, {html,css,script}, COVERAGE.SKIP_DIRS, base)
   ├─ .zip ───────▶ collectZipFiles(zip, base)         (mesmos tipos, pulos e tetos, em memória)
   └─ GitHub / fixture HTTP ─▶ sem listagem: files = mocks declarados + man.styles (lidos como css), partial = true
   │ mocks declarados (layouts × states) lidos por readBytes + TextDecoder
   │ planes[mock montado] = state.nodes.length (nós reais do layout montado)
   ▼
LayersCore.coverageModel({man, files, mocks, planes, partial})        (puro, sem DOM)
   │ coverageScope ─▶ htmlRegions / scanScriptMarkers ─▶ regiões detectadas
   │ build(mono | monoStates | multi) ─▶ cobReg, cobEl, planes, maxPlanes
   ▼
coverageVerdict(model) ─▶ {verdict, rule, split, gainPp}
suggestLayouts(model, man, files) ─▶ [{id, name, mock}]
layoutsSnippet(man, suggestion) ─▶ {layouts: declarados + sugeridos, added}
   │ stale()? (dir, seq ou run mudou) ─▶ descarta o resultado
   ▼
state.coverage = {open, status:'done', model, verdict, suggestion, snippet, added, capped} ─▶ covVals() ─▶ modal
```

**Região.** Tela (cada `.html` estático do escopo), aba (`role="tabpanel"`), diálogo (`<dialog>`, `aria-modal="true"` ou classe `modal`) e painel (elemento com `hidden`, `display:none` inline ou regra CSS de topo `#id`/`.cls` com `display:none`). `coverageScope` exclui `docs/`, `test/`, `tests/`, `testing/`, `e2e/`, `fixtures/`, `bench/`, `tools/`, `vendor/`, `node_modules/`, `.design-history/` e `*.dc.html`, e com `base` só olha abaixo dele. Um HTML de shell (corpo só com a raiz do app) não vira tela e marca a confiança como baixa.

**Contratos do core** (`LayersCore`, todos puros, em `test/layers-core.test.js`):

| Função | Entrada → saída |
|---|---|
| `COVERAGE` | `MONO_MIN 0.85`, `GAIN_MIN 0.15`, `PLANES_MAX 1500`, `SHARED_MIN 0.6`, `SCRIPT_FILES_MAX 200`, `SCRIPT_BYTES_MAX 262144` e `SKIP_DIRS` (as pastas acima) |
| `coverageScope(path, base)` | boolean: o arquivo pertence ao app analisado |
| `cssHiddenSelectors(cssTexts)` | seletores `#id`/`.cls` de regras de topo com `display:none` |
| `htmlRegions(text, hiddenSels)` | `{nodes, visibleNodes, rootEl, tokens, regions[{sel, kind, el, hidden}]}`; tokenizador por regex com pilha, numa passada linear que descarta comentários, `<script>`, `<style>` e `<template>` |
| `scanScriptMarkers(path, text)` | regiões de baixa confiança (`{key, kind, name, el: null, lowConf: true, marker}`): `role="tab"`, `<dialog`/`aria-modal` e rotas `#/nome` |
| `coverageModel({man, files, mocks, planes, partial})` | `{regions, models: {mono, monoStates, multi}, sharedStates, unreadable, estimates, confidence}`; cada modelo traz `mocks`, `visible`, `cobReg`, `cobEl`, `planes`, `maxPlanes`; `confidence` é `ok`, `baixa` ou `parcial` |
| `coverageVerdict(model)` | `{verdict, rule, split, gainPp}` |
| `suggestLayouts(model, man, files)` | `[{id, name, mock}]`: o `main` implícito (só sem `layouts`) mais uma entrada por tela que nenhum mock do modelo mostra |
| `layoutsSnippet(man, suggestion)` | `{layouts, added}`: os `layouts` declarados (como estão no manifesto) seguidos da sugestão, já que colar substitui o array inteiro; o `main` implícito leva os `states` da raiz; `added` = entradas sugeridas com um `mock` que nenhum layout atual tem |

**Cálculo.** A identidade da região é o `key`: o caminho (tela) ou `<caminho>#<sel>` (sub-região; `sel` = `tag#id`, senão `tag.cls`, senão `tag[role=tabpanel]`, `dialog` ou `tag[aria-modal]`, com `~N` no N-ésimo repetido). Um mock **contém** a tela se o caminho é o mesmo ou se divide ≥ 60 % dos tokens de nó (`SHARED_MIN`) com o HTML dela; o mesmo teste funde mock autoral e fonte numa região só e gera o aviso de *states* (regra 5), mantendo o caminho mais curto e a união das sub-regiões. Uma sub-região é **visível** num mock quando o mock a tem sem `hidden`/`display:none` próprio nem de ancestral; uma região de marcador (`.js/.ts`) é visível quando o texto do mock casa o marcador. `cobReg` = regiões visíveis / detectadas; `cobEl` = Σ elementos visíveis / Σ elementos estimados (as regiões de marcador têm `el: null` e contam só em `cobReg`). Planos: `nodes.length` real para o layout montado e, para os demais mocks, os elementos visíveis do HTML (estimativa).

**Veredito** (`coverageVerdict`; `best` = melhor entre Monovisual e Monovisual + states, `gainPp` = Múltiplos menos `best`, em pontos percentuais):

| Regra | Condição | Veredito |
|---|---|---|
| 0 | nenhuma região detectada | `Indeterminado` (sem trecho) |
| 2 | `best` ≥ 85 % e maior layout ≤ 1.500 planos | `Monovisual` |
| 4 | `best` ≥ 85 % e maior layout > 1.500 planos | `Múltiplos layouts`, com a marca "dividir" (`split`) |
| 3 | `best` < 85 % e ganho ≥ 15 p.p. | `Múltiplos layouts` |
| 3 | `best` < 85 % e ganho < 15 p.p. | `Monovisual (layouts não ajudam)` (sem trecho) |

O trecho `layouts` (`JSON.stringify({ layouts })` de `layoutsSnippet`, com Copiar) só aparece com o veredito `Múltiplos layouts` e `added > 0`: o `main` implícito sozinho não muda o `layers.json`, então sem tela a acrescentar não há trecho nem Copiar. Como colar substitui o array `layouts`, o trecho traz os layouts declarados primeiro e depois as telas sugeridas. O `styles` é do projeto, não do layout, e o `deriveManifest` não muda.

**Estado.** `state.coverage` é `null` (fechado) ou `{open: true, status, …}`:

| `status` | Campos | Quando |
|---|---|---|
| `running` | — | do clique até o resultado ou o erro |
| `done` | `model`, `verdict`, `suggestion`, `snippet`, `added`, `capped` | análise concluída; `capped` = algum teto de varredura estourou |
| `error` | `error` (mensagem) | `projeto ainda carregando`, base inválida ou ausente, permissão de leitura negada ou falha na leitura |

`covVals()` deriva os dados do modal (`covOpen`, `covBars`, `covRows`, `covWarns`, `covSnippet`, …): um objeto congelado compartilhado com o modal fechado (o orbit re-renderiza sem alocar) e um cache por resultado e nome de projeto. A tabela mostra no máximo 200 regiões e o resto vira a linha `+N regiões`; as barras mostram `cob_reg · cob_el` arredondados. O modal é um overlay próprio de `z-index: 100`, como o de Atalhos; Esc o fecha na cadeia de `escape()` (depois do menu de contexto, dos Atalhos, dos pendentes e do diff, antes do modal genérico).

**Guardas.** (1) `loadedSeq !== loadSeq` na entrada: carga em curso vira o erro `projeto ainda carregando` (`COV_LOADING`), que o `loadProject` apaga ao terminar a carga; um 2º clique com `status: 'running'` volta sem iniciar outra varredura (S9.1e). (2) `dir`, `loadSeq` e `zip` são capturados antes do primeiro `await`; `stale()` compara de novo antes de gravar o resultado e antes de gravar o erro. (3) `covRun` conta as corridas: `closeCoverage` (Fechar, Esc, fundo) e um novo clique o incrementam, e a corrida em voo descarta o que leu. (4) `loadProject` e `unloadProject` zeram `state.coverage`, então um resultado nunca sobrevive ao projeto que leu. (5) Os mocks são lidos com `readBytes` + `TextDecoder`, não `readText`, para não renovar `this.mtimes` e mascarar a guarda de edição externa do `writeText`. (6) Os tetos da varredura de pasta e de `.zip` são os do `autoCreateLayersJson` (5.000 entradas, 6 níveis, 3 MB por arquivo e 20 MB no total para HTML/CSS), mais os de scripts; `collectProjectFiles` é o walker extraído do `autoCreateLayersJson`, que segue pedindo só `html`/`css` com o comportamento de antes.

#### Limites da Cobertura

| # | Limite | Observação |
|---|---|---|
| 1 | Sem router por AST | Rotas de JS/TS só entram por marcadores literais (`role="tab"`, `<dialog`, `aria-modal`, `#/nome`); docs de UI não servem de dica |
| 2 | Sem listagem em GitHub nem em fixture HTTP: cobertura parcial | Só os mocks declarados e os `man.styles` (lidos como css) entram e a confiança fica `parcial`; a regra e o trecho saem dessa visão incompleta |
| 3 | "Visível" é estático | Vale `hidden`, `display:none` inline, regra CSS de topo `#id`/`.cls` e diálogo sem `open`; classe ligada por JS, `@media` e seletor composto não contam |
| 4 | Painéis visíveis por padrão ficam dentro da tela | Só um elemento que nasce oculto vira região de painel; os visíveis contam nos elementos da tela que os contém |
| 5 | A estimativa de planos de um mock desmontado é aproximada | Com várias raízes no `<body>` o loader acrescenta um root sintético, então a estimativa fica 1 abaixo (imaterial frente ao teto de 1.500); o layout montado usa `nodes.length` real |
| 6 | `.ts/.js` por regex = confiança baixa | Regiões de marcador contam só em `cob_reg` (Elem. `—`) e o modal avisa "App renderizado por JS" |
| 7 | Tetos por arquivo (HTML/CSS 3 MB, script 256 KB) e de scripts (200 arquivos, 8 MB no total) | Um arquivo acima do próprio teto é pulado sozinho, e passar de 200 scripts ou de 8 MB também; todos marcam a varredura como parcial ("Varredura parcial: arquivos ou tamanho acima dos tetos; parte da pasta ficou fora.") |
| 8 | Sem teste automatizado: `.zip` cujo `base` não existe, teto de 8 MB de scripts e a marca de parcial do teto por arquivo em `collectZipFiles` | Fechado (S9.1e Task 4): `connectZip` (e2e/folder-helpers.js) abre um `.zip` de verdade pelo menu; testes `Coverage_Zip_*` e `Coverage_Folder_ScriptBytesCap_*` em e2e/coverage.spec.js |
| 9 | Barras arredondadas, texto da regra truncado | Perto dos limiares a barra mostra 85 % enquanto a regra diz 84 % (o texto trunca para não contradizer a comparação estrita) |
| 10 | `base` com barras invertidas não é normalizado | Parcial (S9.1e Task 4): `analyzeCoverage` troca `\` por `/` em `base` antes do `joinPath`, e um `base` com `\` monta no loader porque toda leitura passa por `safePath` (só o ramo `readText` de fixtures HTTP não passa). Mas `buildMockDom` junta o `base` cru e o `safePath` só converte depois do colapso: com `..` no caminho (ex.: `styles: ["../shared.css"]` e `base: "app\sub"`) o loader trata `app\sub` como um segmento só e lê outro arquivo que a Cobertura, e as duas divergem |
| 11 | Duplo clique em Analisar cobertura dispara duas varreduras | Fechado (S9.1e Task 2): `analyzeCoverage` volta de imediato com `status: 'running'` (`Coverage_DoubleClick_RunsOneScan`) |
| 12 | `?` abre Atalhos por baixo da Cobertura | Fechado (S9.1e Task 2): com a Cobertura (ou o modal de Salvar, o diff ou os Atalhos) aberta, `onKey` deixa passar só `escape`, o fechar dos Atalhos e `reload`, então as teclas de câmera e os atalhos não agem por baixo (`Coverage_OverlayOpen_BlocksCameraAndShortcutKeys`) |
| 13 | O erro `projeto ainda carregando` sobrevive à carga | Fechado (S9.1e Task 2): o `loadProject` apaga `state.coverage` quando ele é exatamente esse erro; um resultado ou outro erro fica (`Coverage_LoadingErrorOverlay_ClearsWhenLoadFinishes`). Uma carga que falha também o apaga, porque `unloadProject` zera `coverage` |
| 14 | A regra 4 só dispara com melhor monovisual ≥ 85 % | Um monovisual abaixo disso com layout acima de 1.500 planos cai na regra 3, sem a marca "dividir". **Decisão fechada (S9.1e)**: fica assim; o board é que é ambíguo |
| 15 | `coverageModel` continua quadrático quando muitas páginas distintas compartilham tokens de chrome | 3.000 páginas com nav/rodapé comuns e sub-regiões ocultas levam ~1,8 s (1.000 páginas ~0,2 s); sob demanda e síncrono |
| 16 | Mock com `/` inicial ou `..` acima da raiz faz `joinPath` (index.html) e `resolvePosix` (lib/layers-core.js) divergirem | Fechado (S9.1e Task 4): mesmo colapso para `/` e `..`: `joinPath` chama `normalizePath` (core) e `coverageModel.fullPath` cai nele quando `resolvePosix` devolve `null`; uma `\` dentro do caminho do mock ainda diverge (`fullPath` a mantém, o `safePath` do loader a converte), assim como a do `base` (limite 10) |

### Espalhar (S9.1c)

`⊞ ESPALHAR ▾` (último item da faixa LAYOUTS, só com 2+ layouts) mostra vários layouts lado a lado no mesmo palco 3D. **Só um layout segue vivo**: o ativo, montado como no Foco (um shadow root; Árvore, Camadas e Ajustes inalterados). Os demais são **retratos congelados** (planos já escaneados, sem DOM vivo) desenhados em páginas vizinhas no eixo X. Espalhar desligado é o Foco: o DOM, as chaves de sessão e o custo são os de antes (`Spread_Off_ChangesNothing`); um projeto de 1 layout não ganha botão, página nem chave.

```
⊞ ESPALHAR ▾ ─▶ popover { Foco | Todos | 1–N, layouts, distância }
   │ spreadOn(on, mode) / setSpreadPick / setSpreadDist ──▶ state.spread = {on, mode, picked[], dist}
   │ ligar: normalCam = câmera atual (dono = layout ativo); a câmera de visão geral assume (swapCam, com 2+ páginas)
   ▼
loadProject(ativo) ── inalterado: 1 shadow root vivo, scan completo ──▶ state.nodes/byId
   │ cauda da carga vencedora (seq == loadSeq)
   ▼
loadSpread(seq, ctx) ── ++spreadSeq; poda as entradas do ativo e as não escolhidas; para cada layout escolhido ≠ ativo, um por vez:
   │   lodSnapshot: buildMockDom(man, layout, {active:false, state})      leitura quieta, não toca em host
   │      ├ seq/spreadSeq vencidos ─▶ null (descarta)
   │      ├ mock ausente, vazio, ilegível ou sem nós ─▶ {unavailable:true}
   │      └ host temporário offscreen (data-lod-host): mountMockDom ─▶ hostAttrs ─▶ scanRoot(maxDepth:1) ─▶ remove o host
   ▼
spreadFrozen: id ─▶ {nodes, pageW, pageH, full, count} | {unavailable}        (state.spreadRev++ a cada mudança)
   │ trocar de layout com Espalhar ligado: freezeLeaving(saindo, entrando) — o que sai vira retrato cheio (full:true),
   │ o cheio anterior cai para LOD (lodNodes ≤ 1) e a entrada do que entra some (ele agora é o vivo)
   ▼
scene(): world ─┬─ página[ativo]       Plane (data-plane), handlers e culling de sempre       translateX(offs[ai])
                ├─ página[LOD/cheio]   LodPlane (data-lod-plane + data-layout)               translateX(offs[i])
                └─ câmera de visão geral: cam() com footprint = N·pageW + (N−1)·gap
clique num LodPlane (sem arrasto) ─▶ activateFromLod(layoutId, nodeId) ─▶ switchLayout(id, nodeId)
```

**Contratos do core** (`LayersCore`, puros, `test/layers-core.test.js`):

| Função | Entrada → saída |
|---|---|
| `spreadPicked(layouts, mode, picked, activeId)` | ids na ordem do `layers.json`; id desconhecido sai; o ativo sempre entra; `mode:'all'` = todos |
| `spreadOffsets(count, pageW, dist)` | `i · (pageW + pageW · dist/100)`; `dist` limitado a 0–100; `pageW` inválido dá offsets 0 |
| `lodNodes(nodes, maxDepth)` | os nós com `depth ≤ maxDepth`, mesmos objetos (ids preservados) |
| `spreadPlaneTotal(activeCount, frozen)` | soma do ativo com a `count` de cada retrato; o chamador avisa acima de `COVERAGE.PLANES_MAX` (1.500) |
| `spreadSessionEntry(spread, layoutCount)` | cópia normalizada (`mode` `'all'` ou `'pick'`, `dist` 0–100, `cam` mantida) ou `null` com Espalhar desligado ou menos de 2 layouts |
| `overviewFit({foot, pageH, zm, yaw, tilt, persp, stageW, stageH})` | `{fit, tx, ty}`: o maior `fit` (bisseção) para o qual a caixa da pegada, projetada em perspectiva (8 cantos), cabe no palco com a folga do ajuste de uma página (1,18 × largura + 80 · fit; altura + 200 · fit); `tx`/`ty` a centralizam. `fit · z` fica limitado a `persp/2` para o pior pivô sobre a pegada |
| `viewCuller({…, zs})` | `zs` (padrão 1) escala o `z` à parte de `x/y`; o mundo da visão geral usa `S = fit · zoom` e `zs = fit` |

**Estado.** `state.spread` = `{on, mode: 'all'|'pick', picked: id[], dist}` (padrão `{false, 'all', [], 30}`), mais `state.spreadRev` (contador incrementado a cada mudança dos retratos; é a chave das memoizações), `state.spreadMenu` (popover aberto) e `state.lodHover` (`layoutId:nodeId`, transitório). Campos de instância, fora do `state`: `spreadFrozen` (Map), `spreadSeq` (corrida), `spreadKey` (projeto dos retratos), `normalCam` e `normalCamOwner`, `pendingSpread` (sessão salva à espera da carga), `_lodEls` (elementos das páginas LOD), `_sv` e `_spu` (memos). Com o Espalhar desligado não há DOM, chave de sessão nem custo por quadro: `clearSpread` só incrementa `spreadSeq` e limpa o que existir. A troca de projeto ainda faz `setState({spread, spreadMenu, lodHover})` com os padrões (inofensivo) e `switchLayout` escreve `lodHover: null`.

`spreadView()` é o contrato da UI e dos cliques: `null` com Espalhar desligado ou menos de 2 páginas, senão `{ids, offs, ai, foot, maxD}`. `ids` = `spreadPicked` menos os layouts cujo retrato é `unavailable` (os ainda não lidos **mantêm** o slot); `offs[i]` = `spreadOffsets` sobre as páginas desenhadas; `ai` = índice do ativo (nem sempre 0: a ordem é a do `layers.json`); `foot` = largura da pegada; `maxD` = maior profundidade entre os retratos. O popover, o clique e a câmera leem sempre dele, na hora, e nunca recalculam `spreadPicked`/`spreadOffsets`. Memoizado por identidade de projeto, layout, `spread`, `spreadRev` e `pageW`.

**Retratos.** `spreadFrozen.get(id)` é `{nodes, pageW, pageH, full, count}` ou `{unavailable: true}`. `full:false` = LOD (varredura rasa, profundidade ≤ 1); `full:true` = o layout que acabou de sair, em profundidade cheia. No máximo um retrato cheio além do ativo (LRU de 2: `freezeLeaving` rebaixa o cheio anterior com `lodNodes`). Uma entrada, de qualquer tipo, é reaproveitada até Recarregar, Reanalisar, projeto novo ou reconexão; um layout indisponível não é relido.

**Leitura sem tocar no loader vivo.** O `loadProject` foi dividido para o Espalhar reaproveitar o pipeline sem os efeitos colaterais:

| Peça | Contrato |
|---|---|
| `buildMockDom(man, layout, opts)` | async e **só lê e monta**: lê mock, CSS e dc, roda `buildProjectFromHtml` e devolve `{rootEl, styleText, built, html, css, mockPath, dcFile, dcText, warn, dc}`, ou `{missing}`, `{empty}`, `{stale}`. Nunca toca num host nem nos singletons do loader (`mockRoot`, `els`, `loaded`, `watch`, `hostApplied`, `ResizeObserver`). Só `opts.active` (o loader) acrescenta o hoist de fontes, as checagens `isStale` e o registro de mtimes |
| `mountMockDom(host, mb, active)` | **síncrono**: monta o resultado no shadow root do host. Recusa o host do palco quando `active` é falso (nunca o esvazia). O `loadProject` o chama logo depois do último `seq !== loadSeq`, no mesmo tick das escritas de singleton; quem chama com `active` falso é dono da checagem de `seq` depois do `await` e de remover o host |
| `scanRoot(host, root, {maxDepth})` | percorre e devolve `{nodes, byId, els, maxDepth}` sem `setState`; `scan()` o chama e faz o resto |
| `readText(path, quiet)` | `quiet` não grava `this.mtimes[path]`: a leitura LOD de um CSS compartilhado não pode mascarar uma edição externa que o `writeText` deve recusar |

**Cena.** Com `spreadView()` nulo, `scene()` monta o mesmo filho único de antes. Com ele, uma `div[data-spread-page="<id>"]` por página (chave = id do layout, `translateX(offs[i])`): a ativa embrulha os `planes` de sempre e leva um rótulo (`--sel`) e uma moldura L0; as demais são `pointer-events:none`, com rótulo `Nome · LOD` (retrato cheio: só o nome) e um `LodPlane` por nó. `LodPlane` não leva `data-plane` (usa `data-lod-plane` e `data-layout`), então `planeCensus`, hit-tests e culling do ativo não mudam; desenha só a caixa (fundo por profundidade, raio, opacidade `.5 · n.opacity`) em `translateZ(depth · spacing)` e, como o board, borda tracejada `rgba(173,181,190,.45)` no LOD e sólida `.35` no retrato cheio. Os elementos de cada página LOD ficam em `_lodEls` por (retrato, espaçamento, deslocamento, nome, tamanho, hover), então um render de arrasto reaproveita o mesmo elemento React. Os retratos honram `flat` (espaçamento 0) e ignoram explodir/recolher, `isoId`, solo e foco de camada do ativo.

S9.1d: acima de `COVERAGE.PLANES_MAX` (`LayersCore.spreadDrawPlan`, guardado em `spreadView().plan`) o retrato cheio é **desenhado** como LOD (rótulo `· LOD`, borda tracejada, só profundidade ≤ 1); `spreadFrozen` não muda e `maxD` conta só o que é desenhado. Durante o arrasto cada página LOD corta os planos com `viewCuller` (deslocamento da página relativo ao ativo) e agrupa os `LodPlane` por `z` em `div[data-lod-group]` (marca própria: `data-plane-group` é do ativo e entra no `planeCensus`); a chave de `_lodEls` inclui `dragging`; no arrasto os grupos ficam em cache por retrato e um `Uint8Array` de flags de corte é preenchido no lugar a cada render, e o elemento da página é reaproveitado enquanto nenhuma flag muda (órbita estável = N chamadas de corte, sem alocar); uma flag que vira, o início e o fim do arrasto reconstroem a página.

**Câmera.** O mundo da visão geral é `translate(shiftX+panX, shiftY+panY) scale(zoom) scale3d(fit,fit,fit) rotateX rotateY translate3d(-f)`: o **zoom é uma ampliação 2D fora do `scale3d`** e o `fit` (de `overviewFit`) é o único fator que alcança o `z`. A perspectiva enxerga `fit · z` seja qual for o zoom, então nenhuma página distante cruza o plano do olho; com `scale(fit · zoom)`, como no Foco, Enquadrar e a roda empurravam páginas para trás do olho. O pivô é limitado à pegada (`clamp` em `fx`/`fy` na renderização e o mesmo limite em `panFocus`, no estado), e o enquadramento inicial `shiftX/shiftY` passa para `panX/panY` quando o foco sai de `null` (`panFocus`), sem salto. `defFocus()` (centro da página ou da pegada, em coordenadas da página ativa) alimenta os três pontos de pan no plano. A memoização de `cam()` ganha `|ov<foot>|<maxD>|<persp>|<tilt>` só com Espalhar ligado.

A câmera **normal** não se perde: ao ligar, `spreadOn` (ou `swapCam`, assim que há 2+ páginas desenhadas; num 1–N sem escolha fica para depois) guarda `{yaw, tilt, zoom, panX, panY, focus}` em `this.normalCam`, com o dono em `normalCamOwner` (o layout ativo na hora); a de visão geral começa em zoom 1, sem pan nem foco, com yaw e tilt mantidos. Desligar no layout dono, `unloadProject` e `leaveSpread` a devolvem intacta; desligar num layout que não é o dono devolve `viewCache[ativo]` (se existir) ou a câmera normal com `focus: null`. Com o Espalhar ligado, `switchLayout` mantém a câmera de visão geral (o foco, em coordenadas da página, é reancorado na página nova) e o `viewCache` do layout que sai recebe a câmera **normal** só se ele é o dono; qualquer outro layout mantém a que já tinha.

**Interação.** Só o ativo aceita seleção, edição, Árvore, Camadas, Interagir e menu de contexto. Um `LodPlane` aceita clique, duplo clique (só `stopPropagation`, para o duplo clique do palco não reiniciar a vista) e hover. O clique usa o mesmo limiar de 3 px (`this.dragged`) dos planos, então arrastar a órbita sobre um plano LOD não ativa nada; o hover é ignorado com o botão pressionado. `activateFromLod(layoutId, nodeId)` resolve **na hora** contra `spreadView().ids` e o retrato (recusa o ativo, um id não desenhado, uma entrada ausente ou `unavailable`) e chama `switchLayout(id, nodeId)`; o nó cai no mesmo id porque a varredura rasa é subconjunto da cheia (id desconhecido cai na raiz `'0'`). `switchLayout(id, selId)` monta o `pendingView` dentro do `go()`, então o caminho do modal de confirmação também funciona. Quando um plano LOD do retrato cheio fica na frente de um plano do ativo (é 3D), `activePlaneAt` prefere o plano ativo sob o ponteiro (`elementsFromPoint`), no clique esquerdo e no menu de contexto. Em 1–N, **qualquer troca de layout** (chip, LOD, teclado) junta o layout que sai ao `picked`, para ele continuar no palco.

**Botão e popover.** O botão (borda e cor `--sel`, fundo `rgba(var(--selRgb),.18)` quando ligado, `aria-haspopup="dialog"`, `aria-controls="spread-pop"`, `aria-expanded`) abre um popover de 176 px (`right:10; bottom:52`) com três segmentos **Foco | Todos | 1–N** (Foco = Espalhar desligado), uma linha por layout (checkbox, nome, contagem de planos: `…` enquanto lê, `—` fora da seleção, `indisponível`), o slider de distância (0–100), a linha `Total: N planos` e, acima do teto, o aviso. Fecha com Esc (depois dos modais e menus na cadeia de `escape()`), clique fora e clicar no botão. O total soma o ativo com os retratos das páginas **desenhadas** (`spreadPlaneTotal`) e o aviso, **não bloqueante**, diz `Acima de 1.500 planos (N): a órbita pode degradar. Selecione menos layouts.`; no botão aparecem só o `⚠` e o `title`. `spreadUi()` memoiza por identidade (projeto, layout, `spread`, `spreadRev`, nº de nós, aberto): o total é calculado uma vez por mudança, nunca por quadro de órbita (`SpreadUi_Total_IsCachedAcrossRenders`). De Todos para 1–N, `picked` nasce com os ids desenhados, para os retratos já lidos não se perderem.

**Sessão.** `layers/v1/session › spread` só existe com Espalhar ligado e 2+ layouts: `spreadSessionEntry({...spread, cam})`, com `cam = {yaw, tilt, zoom, panX, panY, focus}` a câmera de visão geral. O `camera` da sessão guarda a câmera **normal** enquanto o Espalhar está ligado, então restaurar com ele desligado é são. No modo fixture `sessionSnapshot` não grava a chave `spread`. `restoreSession` guarda a entrada em `pendingSpread` (só para o projeto da aba, nunca em modo fixture) e a cauda da carga vencedora a valida em `takeSpreadSession`: `on === true`, `mode` `'pick'` senão `'all'`, `picked` filtrado por `spreadPicked` contra os layouts carregados, `dist` limitado a 0–100, números finitos e limitados, foco só se o carimbo `viewLayout` bate com o layout ativo; lixo, projeto de 1 layout ou `on:false` deixam o Espalhar desligado. `enterSpread` guarda a câmera restaurada como normal, aplica a de visão geral e dispara `loadSpread`. Zerar remove a chave.

**Guardas.**

| # | Guarda | Onde |
|---|---|---|
| 1 | `live() = seq === loadSeq && mine === spreadSeq` depois de cada `await` | `loadSpread` e `lodSnapshot`: trocar de projeto ou de layout, Recarregar, Zerar ou desligar com a leitura em voo descarta o resultado e não deixa host temporário |
| 2 | O host temporário nasce e é removido sem `await` no meio (`finally`) | `lodSnapshot`: o palco segue com 1 shadow root vivo; o temporário existe só entre a montagem e o `remove` |
| 3 | `clearSpread` (sempre incrementa `spreadSeq`; esvazia o Map e incrementa `spreadRev` só se havia entradas) | `unloadProject` (cobre Zerar), `doReload`, `doRestructure`, `useDir`, `pickZip`, `loadRepo`, `spreadOn(false)` e `loadProject` quando o `baseKey` muda |
| 4 | Reset por projeto: `state.spread` volta ao padrão no `unloadProject` e quando o `baseKey` difere do `spreadKey` | a sessão salva é aplicada depois, na cauda da carga vencedora |
| 5 | `takeSpreadSession` roda síncrono ANTES do callback do `setState` final da carga e consome `pendingSpread`; só `enterSpread` roda no callback, depois de `seq !== loadSeq` | uma carga superada não restaura o Espalhar de outra; como `pendingSpread` já foi consumido, uma carga superada dentro da janela do callback perde a sessão restaurada (limite 13) |
| 6 | Recarregar um projeto que passou a ter um só layout, com o Espalhar ligado, chama `leaveSpread` | evita Espalhar ligado sem botão e com a câmera de visão geral |
| 7 | Projeto novo com o Espalhar ligado de novo dentro da janela da carga (a UI do projeto que sai ainda aceita o clique) chama `leaveSpread` antes de `keepCam` | o toggle é descartado: nada de `normalCam` do projeto antigo na câmera ou na sessão do novo |

#### Limites do Espalhar

| # | Limite | Observação |
|---|---|---|
| 1 | Os retratos congelados não acompanham o disco | Recarregar, Reanalisar, reconectar ou abrir outro projeto os relê, e desde a S9.1e também Aplicar (se gravou algum arquivo) e Reverter (com pasta), com o Espalhar ligado (`refreshSpread`); uma edição externa continua só aparecendo no Recarregar. Trocar de estado não os limpa (muda só o DOM do ativo) |
| 2 | Um plano LOD não é editável: só ativa o layout | Undo, Salvar junta tudo, watch e aviso de escopo entre layouts vieram na S9.1d ([§ Edição entre layouts](#edição-entre-layouts-s91d)); a deriva segue só no ativo |
| 3 | LOD = varredura rasa (profundidade ≤ 1), sem texto e sem hoist das fontes dos layouts não ativos | As fontes são do documento: subir as de um layout não ativo quebraria o invariante de uma só folha `@font-face`; a geometria de um retrato pode usar a fonte de fallback |
| 4 | Os retratos ignoram explodir/recolher, `isoId`, solo e foco de camada do ativo; só `flat` vale | Cada página tem o seu `translateZ(depth · spacing)` |
| 5 | O custo de ligar é proporcional ao número de layouts escolhidos | Uma leitura rasa por layout, em sequência e em segundo plano; medido 373 ms com 3 layouts de ~1.500 nós (§ D do [checklist](RELEASE-CHECKLIST.md)) |
| 6 | Acima de 1.500 planos o aviso não bloqueia e a órbita degrada | Medido ~10 fps a 3.303 planos (ativo + anterior cheio + LOD) na S9.1c e ~44 fps (22,6 ms/quadro) depois da S9.1d, que desenha a cheia como LOD acima do teto; o orçamento de 50 fps vale só abaixo do teto |
| 7 | Layout indisponível (mock ausente, ilegível, vazio ou sem nós) sai do palco | Os slots são compactados: as páginas seguintes se deslocam uma vez quando uma leitura em voo vira `unavailable` (os pendentes mantêm o slot) |
| 8 | Sem teto de bytes nas leituras de mock | O loader do ativo também não tem; um mock gigante só custa tempo |
| 9 | O pivô da câmera é limitado à pegada, no estado e na renderização | O arrasto no plano para na borda e, num gesto novo, o quadro anda de imediato ao voltar (dentro do mesmo gesto o desvio é medido do ponto inicial, então voltar menos que o excesso não move o quadro); `zoomBy` é exato só com `k = 1` |
| 10 | A página distante fica estreita com a distância alta | A 1280×760 com yaw padrão ela mede 84 px a dist 100; ≥ 120 px só a dist 30 (o limite geométrico a dist 100 é ~103 px de lado) |
| 11 | As bordas internas `.45` dos níveis d > 0 do board não são desenhadas na página ativa | `Plane` já codifica seleção, hover, camada e wire nas bordas; o visual do ativo é congelado |
| 12 | O popover em `bottom:52` pode cobrir o Navegação e o fim da faixa em palcos abaixo de ~792 px | A faixa também pode quebrar linha com todos os chips mais o botão |
| 13 | Uma sessão restaurada em 1–N com nada escolhido troca a câmera mesmo assim; uma carga superada dentro da janela do último `setState` descarta a sessão restaurada | Raros; ligar o Espalhar de novo recupera |
| 14 | Em 1–N, qualquer troca de layout junta o layout que sai ao `picked` | O que o usuário deixou para trás continua no palco; para tirá-lo, desmarque no popover |
| 15 | Um projeto que passa a ter um só layout ao recarregar sai do Espalhar | `leaveSpread` devolve a câmera normal e a sessão deixa de guardar a chave |
| 16 | Só um projeto conectado (pasta, `.zip`, repositório) restaura o Espalhar ao recarregar a página | O modo fixture (`?layers=`, `?project=`) não restaura câmera nem Espalhar |
| 17 | Fechado em parte na S9.1d: a cheia congelada passou a ser desenhada como LOD acima de `PLANES_MAX` e os `LodPlane` são cortados e agrupados por `z` no arrasto. A entrada cheia não tem teto abaixo de 1.500, e o caso silencioso segue lento | Medido, não resolvido: 700 + 700 (1.407 planos, abaixo do teto, sem aviso, cheia desenhada inteira) orbita a 21,2 ms/quadro (≈ 47 fps), abaixo da meta de 50 fps e mais caro que 800 + 800 (1.607, avisa e rebaixa), a 18,9 ms (≈ 53 fps). Números em § D do [checklist](RELEASE-CHECKLIST.md) |

### Edição entre layouts (S9.1d)

Com 2+ layouts, quatro pontos deixam de ficar presos ao layout montado: o undo, o Salvar, o aviso de escopo e o watch. Continua **um só mock vivo** (o ativo); os demais são lidos sem montar, por uma sonda em cache. Projeto de 1 layout e Espalhar desligado mantêm o DOM, as chaves e o custo de antes: a sonda e o watch extra só existem com 2+ layouts, e nada roda no carregamento.

```
Ctrl+Z ─▶ pilha única {layoutId, changes}  ── undoStepApplies(passo, ativo, ids)
            ├ here   ─▶ applyStep                                        (delta inline no DOM do ativo)
            ├ switch ─▶ stepAcross ─▶ switchLayout (keepUndo) ─▶ barreira de commit ─▶ re-lê o topo ─▶ applyStep
            └ drop   ─▶ tira o passo, toast

Salvar ─▶ buildSaveSet ─▶ refreshProbe + ensureProbe ─▶ layers/v1/pending dos outros layouts (sem montar)
            │ pending.hash == sonda.hash? ─ não / indisponível / template dc ─▶ aviso; a pendência fica
            ▼ sim
          mergeLayoutChanges (ativo vence; depois a ordem do layers.json) ─▶ modal.set
            ▼
          makeDraft / approve: 1 escrita por arquivo|seletor|prop ─▶ setPending por chave dos incluídos ─▶ clearProbe

escopo Todos iguais / prompt ─▶ wantProbe ─▶ layoutProbe[id].uses ─▶ "também afeta Config (3 usos)"
checkStale ─▶ this.watch (+ mock de cada outro layout + arquivos da sonda) ─▶ banner "(layout Config)"
```

**Núcleo puro** (`LayersCore`, `test/layers-core.test.js`): `mergeLayoutChanges(byLayout, activeId, order, patchSelFn)` funde por `arquivo|seletor|prop` (o ativo vence; entre os outros vale a ordem do manifesto; só conflito **entre** layouts é reportado, um valor por layout de origem); `countUses` e `useKey(src, tag, folha)` contam usos; `undoStepApplies(step, activeId, layoutIds)` devolve `'here'`, `'switch'` ou `'drop'`; `staleLayouts(paths, stale)` mapeia path para layouts; `spreadDrawPlan(activeCount, entries, max)` decide cheio ou LOD ([§ Espalhar](#espalhar-s91c)).

**Undo.** Cada `change` leva `layoutId` e cada passo é `{layoutId, changes}`. `switchLayout` não zera mais a pilha (`keepUndo`), e `undoHash[layoutId]` descarta os passos de um layout cuja fonte mudou entre visitas. As regras de espera e de descarte estão no item "Edição" do [Estado (resumo)](#estado-resumo).

**Sonda.** `this.layoutProbe` (`id → {hash, uses, files} | {unavailable}`) é preenchido sob demanda por `ensureProbe`/`probeOthers`, por gesto (escopo Todos iguais, prompt de escopo, Salvar), nunca por render nem no carregamento. É uma leitura quieta (`buildMockDom` sem gravar `this.mtimes`), um layout por vez, num host temporário `[data-lod-host]` removido em `finally`, com `scanRoot` completo; só a contagem de usos (`useKey`) e os `files` com mtime ficam. O `hash` é o `pendingHash` que a carga daquele layout calcularia (`hashSpecOf`), e o `live()` (`loadSeq` mais uma semente própria) descarta o resultado de uma sonda superada por troca de layout, Recarregar, Reestruturar ou Zerar.

**Invalidação do cache.**

1. `clearProbe` (junto de `clearSpread` em conectar, zip, repositório, `unloadProject`, Recarregar e Reanalisar, e também em `approve`, `rollback` e numa carga cujo `layers.json` difere do anterior) esvazia tudo e mata a sonda em voo.
2. `evictProbed`, chamado por `checkStale`, aplica três regras em ordem: `layers.json` stale esvazia tudo (como em 1); depois descarta o layout **nomeado por um path de `watchLayouts` que está stale**, o que inclui uma entrada `unavailable` cujo mock acabou de aparecer; por fim descarta a entrada cujo arquivo tem mtime diferente do da sonda, o que inclui folhas compartilhadas com o layout ativo.
3. `dismissStale` descarta as entradas dos layouts nomeados no banner ignorado.

`switchLayout` mantém o cache e só remove a entrada do layout que passa a ser ativo.

**Watch.** `probeLayout` faz `getFile()` (sem ler conteúdo) no mock de cada outro layout e o acrescenta a `this.watch`; um mock que ainda não existe entra como `'missing'`, e a criação dele acusa. `this.watchLayouts` (`{path: [layoutId]}`) diz de qual layout é cada path, e os `files` do cache voltam ao `watch` com o mtime da sonda. O banner acrescenta "(layout Config)" quando `staleLayouts` casa, ou "(inclui layout Config)" quando a lista mistura um arquivo do layout ativo (folha compartilhada, `layers.json`).

**Salvar entre layouts.** O conjunto (mudanças fundidas, origem por layout, avisos, ids incluídos) é calculado **uma vez** ao abrir, fica em `modal.set` e é o único que `modalFiles`, `makeDraft`, `discardDraft` e `approve` usam (`planStale` recusa se o projeto foi recarregado depois do plano). Salvar abre mesmo quando só outro layout tem pendência. `approve` escreve cada arquivo uma vez, guarda no histórico a lista fundida (o `rollback` restaura os arquivos de todos os layouts e os estilos inline só do ativo, a partir da lista própria dele antes da fusão) e limpa, por chave (`setPending`), só as pendências dos layouts incluídos cujos arquivos foram gravados: as requisições ficam, os passos de undo dos incluídos saem e o `layoutBadges` é refeito. A pendência de um layout ignorado ou mantido segue no storage.

**Badge, Ver diff e Exportar (S9.1e).** O badge de Salvar soma `state.changes.length` do ativo com `layoutPend` (as `changes` guardadas de cada outro layout, lidas do storage no `loadProject` e zeradas por layout no `approve`; o `rollback` não mexe no storage, então também não mexe no mapa). Ver diff e Exportar usam o mesmo conjunto fundido (`buildSaveSet`) quando algum outro layout tem pendência e, se esse conjunto sai vazio (ex.: o único pendente é de fonte velha), mostram os avisos num toast e não gravam nada (o Exportar só descobre isso depois do seletor de pasta); com 1 layout seguem o caminho de antes. Depois de `approve` (se gravou algum arquivo) e de `rollback` (com pasta), com o Espalhar ligado, `refreshSpread` esvazia `spreadFrozen` e relê os retratos LOD.

**Aviso "também afeta".** `alsoAffects(nó)` lê `probe.uses` e acrescenta ao painel (nas três variantes) e ao prompt de escopo `também afeta Config (3 usos) · Replay (1 uso)`; "contando outros layouts…" aparece enquanto a sonda roda, sem bloquear a escolha. Layout indisponível ou com zero usos fica fora da linha.

#### Limites da edição entre layouts

| # | Limite | Observação |
|---|---|---|
| a | Gravar um arquivo compartilhado invalida as pendências guardadas dos layouts que não entraram no Salvar | `man.styles` e `dcSource` entram no hash de **todo** layout, então o hash deles muda; as pendências são descartadas ao abrir o layout, com toast (o aviso do Salvar diz isso). Mesma regra da S9.1a, agora anunciada |
| b | Fechado na S9.1e: Ver diff e Exportar usam o conjunto fundido (`buildSaveSet`) quando outro layout tem pendência, e o badge de Salvar soma o ativo com `layoutPend` | O badge é uma dica do que está guardado (conta o que o Salvar funde e o que ele pula: fonte mudou, layout indisponível, template dc), então o plano pode listar menos ajustes; com 1 layout o caminho é o de antes |
| c | Uma mudança de template dc em outro layout faz o Salvar pular o layout inteiro | O escritor dc está preso ao dc do ativo; o aviso diz "template só grava no layout ativo" |
| d | Uma entrada cheia rebaixada acima de 1.500 planos perde os planos profundos (profundidade > 1) | `spreadFrozen` não muda, então eles voltam quando o total cai; só o desenho é raso |
| e | A sonda lê e dá `stat` em cada arquivo em separado | Uma edição no meio da leitura pode guardar o mtime novo com o hash do conteúdo antigo: o aviso some até o Recarregar |
| f | 700 + 700 planos (1.407, abaixo do teto) orbita a ~47 fps e não avisa | Medido (21,2 ms/quadro), não resolvido: o limite 17 do Espalhar continua com o número, e o orçamento de 50 fps só é guardado no Traval |
| g | Uma sonda `unavailable` não tem arquivo para comparar | Só é relida quando o path do mock aparece, quando o `layers.json` muda ou no Recarregar |
| h | Gravar um arquivo que um layout não incluído também usa tira os passos de undo dele na volta | Regra do hash (`undoHash`) |
| i | O aviso "também afeta" só aparece com Todos iguais e um nó com irmãos no ativo (e no prompt de escopo) | Um nó sem irmãos no ativo, mas usado em outro layout, não mostra nada |
| j | Uma gravação que falha mantém a mudança do ativo cujo arquivo não foi gravado | Vale também para projeto de 1 layout (antes a mudança era limpa) |
| k | Fechado na S9.1e: depois de Aplicar ou Reverter, com o Espalhar ligado, `refreshSpread` esvazia `spreadFrozen` e relê os retratos LOD | Com o Espalhar desligado nada é tocado |

### Ciclo do rascunho (S9.1e)

`Salvar › Gerar rascunho paralelo` grava `<arquivo>.design-draft.<ext>` ao lado de cada arquivo afetado; `Aprovar` o promove (o atual vai para `.design-history/`) e `Descartar` o remove. A S9.1e fechou as corridas entre essas três ações.

```
makeDraft ─▶ draftBusy = draftRun = n ; draftedPaths = {} ; modal.drafting = n
   │ por arquivo: gone()? (draftRun mudou, modal fechado ou outro drafting) ─▶ sai
   │ css: readText + patched ─▶ writeText(draft) ─▶ draftedPaths.add(path)     (dc: draftDc, mesmo critério)
   │ falha ─▶ dropDraft(draft, onlyEmpty) : só apaga o que ficou com 0 bytes
   ▼ gone() no fim ─▶ apaga os rascunhos que esta execução gravou e não loga nada no modal novo
   finally: draftBusy = 0 ; modal.drafting = false (só se ainda for o token desta execução)

Aprovar / Descartar ─▶ planStale() é verdadeiro enquanto drafting ─▶ os botões nem renderizam
Aprovar   : só o arquivo com path em draftedPaths; os demais ficam pendentes com aviso no log
Descartar : só os drafts de draftedPaths; os outros ficam e são citados no log
```

- Enquanto `modal.drafting` está ligado, Aprovar e Descartar não aparecem (`isDraft = stage === 'draft' && !drafting`) e `approve`/`discardDraft` voltam em `planStale()`. Fechar o modal não interrompe uma gravação em voo: `draftBusy` recusa um 2º Gerar (com uma linha no log) até a primeira terminar, e a execução superada limpa o que gravou.
- Um rascunho que a execução atual não gravou (editado à mão e protegido pela guarda de conflito, ou de uma execução anterior) nunca é promovido nem apagado. `Rascunho paralelo pronto` só é logado se nenhum arquivo falhou ou foi recusado; senão o log diz `Rascunho incompleto` e quais arquivos ficaram sem rascunho.
- `dropDraft` resolve a pasta sem criar nada, não age se a pasta conectada mudou e apaga `this.mtimes[draft]` junto, senão o próximo Gerar seria recusado pela guarda. `approve` (arquivo não dc) recusa um rascunho vazio quando o original não é vazio (`✗ … rascunho vazio — refaça o rascunho`).
- Testes em `e2e/apply-flow.spec.js` (`Apply_*Draft*`, `Apply_AprovarWhileDrafting_IsNotAvailable`, `Apply_HandEditedDraft*`, `Apply_SupersededRun*`).

#### Limites do ciclo do rascunho

Aceitos na S9.1e; nenhum perde o arquivo original (`.design-history/` guarda a cópia anterior).

| # | Limite | Consequência |
|---|---|---|
| 1 | `dropDraft` apaga `this.mtimes[draft]` antes do `removeEntry`; se a remoção falha por outro erro que não "não existe", a guarda de edição externa fica desarmada | O próximo Gerar sobrescreve esse rascunho sem comparar o mtime |
| 2 | A recusa da guarda manda recarregar o projeto (`R`), mas Recarregar zera `this.mtimes` | Depois de recarregar, o próximo Gerar sobrescreve o rascunho editado à mão sem aviso; a edição só sobrevive em `<rascunho>.bak` se nenhum `.bak` desse rascunho foi gravado antes na sessão (`this.baks` marca só a primeira vez), caso contrário é perdida |
| 3 | Aprovar sem nenhum arquivo gravado (todos recusados ou sem rascunho desta execução) vai ao estágio `3 · aprovado e substituído`, mostra o bloco de commit e grava uma linha de histórico | As `changes` seguem pendentes; só o rótulo e o log enganam (o teste `Apply_HandEditedDraftGerarRefusedThenAprovar_*` fixa esse rótulo) |
| 4 | Descartar apaga o rascunho que esta execução gravou sem comparar o `lastModified` com `mtimes[draft]` | Um retoque feito à mão nesse rascunho depois do Gerar se perde |
| 5 | `approve` (arquivo não dc) relê `f.path`, o que renova o mtime dele | Uma edição externa entre Gerar e Aprovar é sobrescrita; o conteúdo anterior fica em `.design-history/` |
| 6 | `approve` e `discardDraft` não têm guarda de execução em voo | Um duplo clique pode rodá-los duas vezes |
| 7 | Os ramos simulados (`!this.state.dir`) em `makeDraft`/`approve` e o `dir0 ?` do cálculo de `missing` são código morto: `readOnlyBlock` já volta sem pasta | Sem efeito visível; ruído na leitura |
| 8 | `writeText` lê `state.dir` tarde: a checagem `dir0` vem antes dele, não dentro | Uma troca de pasta entre a checagem e a escrita não é bloqueada; inalcançável pela UI, porque o modal cobre a tela |
| 9 | Em `Coverage_OversizedFile_FlagsPartial` (S9.1b, pasta), o caso `Script256KB` afirma `not.toContain(path)` sobre chaves de região, e as de script são `path:dialog` | A asserção nunca falha; o teto de 256 KB é guardado por `capped` e pelo aviso de varredura parcial |

### Guarda de conflito na gravação

`readText` registra em `this.mtimes[path]` o mtime lido (exceto com o 2º argumento `quiet`, usado nas leituras de layouts não ativos do Espalhar, que não podem mascarar uma edição externa); `writeText` compara o mtime atual com ele e
**recusa** a gravação se o arquivo mudou fora do LAYERS desde a leitura (o erro pede para recarregar o projeto (`R`)
ou reconectar a pasta e refazer o ajuste). Sem leitura prévia (`mtimes[path]` indefinido) não há recusa. Antes de sobrescrever,
faz `.bak` uma vez por arquivo por sessão e grava via `.tmp` + `move`.
Depois de gravar, cada gravação entra em `this.writeLog` com tamanho em bytes UTF-8 e SHA-256 (`LayersCore.contentHash`)
do conteúdo antes e depois; se o digest falhar, só os hashes saem como `-` (os tamanhos ficam) e a gravação segue. `exportFull` grava o registro
como `layers-export.log` no formato v2 (`LayersCore.writeLogText`, cabeçalho `# layers-export.log v2`). O hash "depois"
confere com `sha256sum` do arquivo gravado. O "antes" confere com o `.bak` só na primeira gravação do caminho na sessão com
conteúdo anterior não vazio, e apenas se a gravação do `.bak` teve sucesso. O caminho sai com caracteres de controle e
espaços duplos escapados (`\xNN`), então não forja nem quebra linha do log. "Antes" e `.bak` são o texto decodificado (`f.text()`)
regravado em UTF-8: BOM e bytes não UTF-8 do original não se preservam.
