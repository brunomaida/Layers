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
| `scan()` / `walk()` | Percorre o DOM alvo, extrai geometria e estilo computado, monta `nodes`/`byId`/`els`. |
| `cam()`, `scene()`, `Plane` | Câmera, projeção e renderização dos planos. Handlers estáveis em `this.H` mantêm o `memo`. Durante o arrasto, `LayersCore.viewCuller` esconde (`display:none`) os planos cuja projeção cai inteira fora do palco, e `LayersCore.groupPlanesByZ` agrupa os planos de mesmo `translateZ` em `div[data-plane-group]` (uma camada composta por `z`; o wrapper tem `will-change: transform` e `pointer-events: none`, e os planos perdem `transform`, `transition` e `will-change`). Fora do arrasto cada plano volta a ter o seu `translateZ`. Todo `Plane` leva `data-plane="<id>"` em qualquer modo: é o marcador estável que testes e helpers usam (o `transform` inline deixa de identificar o plano durante o arrasto); `sel`, `lframe`, `llbl` e as medidas ficam fora dos grupos. |
| `flushMove()` | Orbit/pan/focus por `requestAnimationFrame`. |
| `codeFor()`, `patchCss()`, `LayersCore.lineDiff()` (dados puros; `index.html` só pinta) | Leitura do código da regra, patch preservando formatação, diff para revisão. |
| `setProp()`, `applyCode()`, `revert()` | Mutação de estilo, registro de `changes`, escopo. |
| `pushUndo()`, `undo()`, `redo()`, `stepHistory()`, `LayersCore.inlineDelta`, `LayersCore.pushSnapshot` | Undo/redo global (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) sobre snapshots de `changes[]`; `inlineDelta` calcula as escritas inline entre dois snapshots. |
| `connectDir`, `readText`, `writeText`, `exportFull` | I/O de arquivos. |
| `checkStale`, `reloadProject`, `doReload`, `dismissStale`, `onFocus` | Recarregar projeto e aviso de "arquivos mudaram no disco" (ver § Loader de projeto). Helpers puros em `LayersCore`: `staleFiles`, `hasUnsaved`, `pickWatched`. |
| `probeLayout`, `restructureProject`, `doRestructure`, `backupLayout` | Deriva do layout e Reanalisar do 0 (S2.21, § Reanalisar do 0). Helpers puros em `LayersCore`: `citedSources`, `layoutDrift`, `staleKind`, `layoutBackupPaths`. |
| `autoCreateLayersJson`, `LayersCore.deriveManifest` | Pasta local sem `layers.json`, conectada por clique: varre `.html`/`.css` e grava um manifesto mínimo (ver `docs/layers-json.md` § auto-criação). |
| Menus (Projetos, Aparência, Interagir, Ações), dropdowns customizados, toast | Chrome da interface. Os quatro menus seguem um padrão só, decidido por `LayersCore.menuStep` (puro) e aplicado por `menuGo`: hover abre (0 ms), saída fecha após 260 ms, clique fixa, `pointerdown` fora (captura), Esc, foco saindo e item de ação fecham; um menu aberto por vez (`menu`, `menuPin`). Os dropdowns de valor (`cbOpen`) abrem por clique e fecham no blur ou no Esc. Os popovers não usam `role=menu`: a navegação por setas nos itens fica fora do escopo. O menu de contexto do palco (linha abaixo) não segue esse padrão de hover: abre só por botão direito. |
| Menu de contexto (`ctx`, `onStageCtx`, `openCtx`, `closeCtx`, `ctxPick`, `ctxRun`, `fitCtx`); `LayersCore.ctxMenuModel`, `ancestorAt` | Botão direito num plano (ou numa linha da árvore) abre um painel fixo (`role=menu`, `aria-label="Camadas do componente"`) com as camadas L0 a Ln do componente e o selecionado destacado; o submenu "Ações do ramo" (`role=menu`) traz Explodir daqui, Recolher até aqui e Requisição. `onStageCtx` sempre chama `preventDefault`; sem plano sob o cursor (nem `hoverId`) não abre, e um arrasto com o botão direito (> 3 px entre `mousedown` e `contextmenu`) também não. Clicar numa camada seleciona o ancestral e mantém o menu aberto. Fecha com Esc (primeiro da cadeia em `escape()`), `pointerdown` fora (primeira instrução de `onDocDown`), qualquer tecla que resolva outra ação em `onKey`, ação executada, `unloadProject` e `scan()` quando o nó-alvo some. `fitCtx` mantém painel e submenu dentro da viewport (o submenu inverte para a esquerda perto da borda). Modelo puro em `ctxMenuModel` (contagens por profundidade, `inBranch`, itens disponíveis); o painel fica no topo do template, fora do palco. |
| Explodir ramo (`explodeFrom`, `collapseAt`, `explodeHere`, `collapseHere`, `branchInfo`); `LayersCore.branchOf`, `inBranchOf`, `branchZ` | Na vista plana só o ramo escolhido ganha profundidade: `scene()` põe cada nó do ramo em `LayersCore.branchZ(depth, raiz.depth, collapseAt, spacing)` e o resto fica em z 0; `cam()` soma `s.spacing * span` ao afastamento lateral. `collapseAt` (profundidade) achata os níveis abaixo dele no plano daquele nível. `branchInfo()` memoiza conjunto, raiz e `span` por (`nodes`, `explodeFrom`, `collapseAt`) e devolve `null` fora da vista plana. O ramo se identifica por prefixo de id pontuado (`inBranchOf`). Marcas: selo `▤ Plana · ▧ ramo` no palco (canto inferior direito), `▧` na linha da árvore e no chip da régua. Não há plano fantasma tracejado para os níveis recolhidos, nem esmaecimento dos irmãos do ramo. |
| Requisições (`addRequest`, `setRequestText`, `removeRequest`, `showRequest`, `requestsMd`, `copyRequests`, `exportRequests`, `rewritePending`); `LayersCore.validRequest`, `requestsMarkdown` | Entradas manuais no painel Ajustes (chip de dado, texto livre, "Mostrar no palco", tag "alvo a confirmar") e o rodapé "Requisições Manuais" (Markdown, copiar, exportar). Persistem em `layers/v1/pending › requests[]` (§ Persistência). `requestsMd()` memoiza por identidade de `requests`, projeto e minuto, para que o orbit não regenere o texto. "Mostrar no palco" fica desabilitado quando a requisição está marcada `confirm`. |
| `LayersCore.ACTIONS`, `SHORTCUTS`, `keyAction`, `tooltip`; `keyRun`, `onKey` | Registro único de ações e atalhos (S3.3). `ACTIONS` dá rótulo, teclas e escopo (`global` no `onKey`, `ctrl` no ramo Ctrl/Cmd, `local` nos campos, `none` sem tecla); `keyAction` resolve a tecla e `keyRun` (montado uma vez) executa; `SHORTCUTS` é a tabela do painel `?`; `tooltip(id)` gera o `title` "Ação (K)". Exportado em [shortcuts.md](shortcuts.md). |
| Mock offscreen (`pageRef`, `left:-20000px`) | Fonte de camadas atual: recriação do Traval anotada com `data-src`. Deve ser substituído pelo loader de projeto. |

## Estado (resumo)

- Câmera: `yaw, tilt, zoom, panX, panY, focus, spacing, persp, flat`.
- Ramo explodido (S3.5): `explodeFrom` (id da raiz do ramo, ou `null`) e `collapseAt` (profundidade a partir da qual o ramo volta ao plano daquele nível, ou `null`). Só valem na vista plana. Limpam explicitamente em `unloadProject`, na troca de projeto (`useDir`/`pickZip`/`loadRepo`) e em Reanalisar do 0; `loadProject` também os zera sempre que não há seleção a reaproveitar (`pendingSel` nulo, caso de Trocar de estado). O `scan()` os limpa só quando a raiz some de `byId`, o que inclui a raiz de tamanho zero (por exemplo após Interagir); desfazer não restaura o ramo.
- Menu de contexto: `ctx` é `null` ou `{x, y, id, fx, fy, flip}` (cursor, nó-alvo, posição ajustada à viewport e se o submenu inverte). Limpa no fechamento, em `unloadProject` e quando o `id` some no `scan()`.
- Requisições: `requests` (as do layout ativo; registros do ramo de requisição, ver § Fluxo de dados) mais `reqSel` (id expandido) e `mdOpen` (rodapé Markdown aberto), ambos só de interface.
- Layouts (S9.1a): `project.layouts`/`project.layoutId`/`project.inter` e `layoutBadges` (no state); `layoutMap`, `viewCache`, `pendingView`, `otherRequests`, `reqFloor` e `baseKey` são campos de instância (§ Layouts).
- Seleção: `selId, hoverId, isoId, active (camada ativa), hoverLayer, layerFocus, focusStr, othersOp`.
- Edição: `changes, history, buf, units, scope, pending, codeBuf, fileText`; as pilhas de undo/redo (`undoS`, `redoS`, snapshots de `changes`, 100 passos) são campos de instância, fora do `state`, e zeram em `loadProject`, `unloadProject` e `approve`. Os ajustes pendentes (`changes`) também vão para `layers/v1/pending` e voltam em `loadProject` (§ Persistência).
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
| `localStorage` | `layers/v1/session` | `{lastProjectId, selId, isoId, camera, explodeFrom, collapseAt, states, layouts?, viewLayout?}`. `layouts` (layout ativo por projeto) só é gravado se não vazio e `viewLayout` (layout a que `selId`/câmera pertencem) só em projeto com 2+ layouts (§ Layouts). `lastProjectId: null` é valor legítimo — significa "nenhum projeto", e o editor reabre vazio. `explodeFrom`/`collapseAt` só são restaurados quando a sessão é do projeto da aba; no modo fixture (`?layers=`, `?project=`) não são persistidos (grava `null`). Limpam em descarregar o projeto, trocar de projeto e Reanalisar do 0; uma raiz que não existe mais no scan zera os dois; `collapseAt` não numérico é ignorado. |
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

- DOM 3D: acima de ~1.500 planos o orbit degrada. Mitigações: `contain`, `will-change` só durante drag, transições desligadas no drag (v2.22) e culling por viewport durante o arrasto (S4.5; selecionado e hover nunca cortam; opacidade não é critério, ver comentário v2.7-b no `Plane`). Leitura do estilo computado medida fora do caminho crítico do orbit (S4.6, sem cache). Atributos de plano (hit-test, will-change, planos vazios) medidos fora do caminho crítico do orbit (S4.8): o custo está nas camadas compostas por plano (Layerize ~11,5 ms/frame no trace; custo linear por plano visível), mitigado na S4.9 pelo agrupamento por `z` durante o arrasto (429 para 31 camadas compostas; orbit do Traval 23,8 para 17,7 ms/frame, 41,9 para 56,5 fps); custo conhecido: ao soltar o arrasto os ~414 planos remontam e há uma travada visível de ~100 ms (`dragEndMs` 33 a 133 ms). Árvore de camadas medida fora do caminho crítico no Traval (S4.7): ganho do teto de 2,6 % do frame, teto do memo das linhas ≈ 0 e troca de `hoverId` ≈ 0,01 a 0,03 por frame (nenhum memo ou janela foi implementado na S4.7); com 1.500 tags o teto é de 23,8 % (orbit 62,4 para 47,5 ms/frame; select de linha 486 ms; scroll da árvore 271 ms/frame), custo de montagem e diff de ~1.650 linhas. Janela da árvore (S4.10): a Hierarquia e os Elementos montam só as linhas visíveis (±10 de sobra) entre dois espaçadores invisíveis (`data-tree-pad`); as linhas de código têm altura medida por `ResizeObserver` (`data-code-key`), o scroll só reconstrói a faixa a cada 110 px e o início da faixa congela com textarea ou foco de teclado (o fim cresce com o scroll; a vista passar acima do início solta o foco; limitações conhecidas na S4.11); listas de até 3 telas não usam janela. Em 1.500 tags: seleção de linha 309 → 182 ms, hover 74 → 17 ms, orbit 53,4 → 34,0 ms/frame; o scroll da árvore melhorou só 5 % (141 → 134 ms/frame), porque cada passo ainda roda o `render()` completo com a construção inline das linhas. Próximo passo: agrupamento de folhas (S4.9).
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

`layers.json › layouts` (`[{ id, name, mock, states? }]`, contrato em [layers-json.md](layers-json.md)) deixa um projeto ter várias telas. **Foco**: um layout montado por vez, no mesmo shadow root; trocar de layout recarrega só o mock dele. Espalhar (vários montados) é a S9.1c e a cobertura % é a S9.1b.

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
| b | **Aplicar** e **Salvar** agem só no layout montado; os outros mostram badge | CSS compartilhado aplicado muda o hash dos outros layouts: os ajustes pendentes deles são descartados ao abri-los (toast). "Aplicar junta tudo" é da S9.1c |
| c | Requisições dos outros layouts vêm do `layers/v1/pending`, com o `confirm` gravado | A marca "alvo a confirmar" fica desatualizada até o layout ser aberto |
| d | Undo/Redo, watch, deriva e `driftAck` valem só para o layout montado | Deriva em layout desmontado só aparece ao abri-lo; o backup do Reanalisar lê o mock de todos |
| e | Sem botão "Espalhar" e sem novo "Foco" no dock | Evita o choque de nome com o FOCO das camadas; Espalhar é da S9.1c |
| f | Sem aviso de escopo `all` ("também afeta …") | Exige contar usos em layouts desmontados; S9.1c |
| g | Com `layouts` declarado, `mock` e `states` da raiz são ignorados, e as chaves antigas (`<base>`) só voltam se existir `id: "main"` | Sem `main` os pendentes antigos ficam órfãos; ver [layers-json.md](layers-json.md) |
| h | A escrita da chave ativa renova o `savedAt` das irmãs | Entradas de layouts abandonados vivem enquanto o projeto viver |
| i | Clicar no layout cujo mock não existe descarrega o projeto e a faixa some | Recarregar a página reabre o primeiro layout (o `layoutMap` foi apagado) |
| j | Badges e requisições dos outros layouts são um retrato da carga | Só se atualizam na próxima carga (trocar de layout recarrega) |
| k | Um `<base>` (nome de pasta ou `.zip`) com `\|` pode colidir com `<base>\|<id>` | O `<id>` nunca contém `\|`, mas o nome da pasta pode |
| l | Ids de layout são deduplicados sem diferenciar maiúsculas (vale o primeiro) | `Main` e `main` contam como o mesmo layout; só o `main` exato, em minúsculas, usa as chaves antigas (`Main` usa `<base>\|Main`) |
| m | O backup do Reanalisar lê do disco o mock dos outros layouts; só o ativo vem da memória (`this.loaded`) | Um mock sobrescrito no disco entra no backup já alterado; leitura que falha vira aviso |

### Guarda de conflito na gravação

`readText` registra em `this.mtimes[path]` o mtime lido; `writeText` compara o mtime atual com ele e
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
