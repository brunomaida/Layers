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

## Módulos (dentro do arquivo único)

| Bloco | Responsabilidade |
|---|---|
| `THEMES / ACCENTS / SELECTS`, `applyTheme()` | Paletas; grava variáveis `--*` em `documentElement`. |
| `scan()` / `walk()` | Percorre o DOM alvo, extrai geometria e estilo computado, monta `nodes`/`byId`/`els`. |
| `cam()`, `scene()`, `Plane` | Câmera, projeção e renderização dos planos. Handlers estáveis em `this.H` mantêm o `memo`. Durante o arrasto, `LayersCore.viewCuller` esconde (`display:none`) os planos cuja projeção cai inteira fora do palco. |
| `flushMove()` | Orbit/pan/focus por `requestAnimationFrame`. |
| `codeFor()`, `patchCss()`, `LayersCore.lineDiff()` (dados puros; `index.html` só pinta) | Leitura do código da regra, patch preservando formatação, diff para revisão. |
| `setProp()`, `applyCode()`, `revert()` | Mutação de estilo, registro de `changes`, escopo. |
| `pushUndo()`, `undo()`, `redo()`, `stepHistory()`, `LayersCore.inlineDelta`, `LayersCore.pushSnapshot` | Undo/redo global (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y) sobre snapshots de `changes[]`; `inlineDelta` calcula as escritas inline entre dois snapshots. |
| `connectDir`, `readText`, `writeText`, `exportFull` | I/O de arquivos. |
| `checkStale`, `reloadProject`, `doReload`, `dismissStale`, `onFocus` | Recarregar projeto e aviso de "arquivos mudaram no disco" (ver § Loader de projeto). Helpers puros em `LayersCore`: `staleFiles`, `hasUnsaved`, `pickWatched`. |
| `autoCreateLayersJson`, `LayersCore.deriveManifest` | Pasta local sem `layers.json`, conectada por clique: varre `.html`/`.css` e grava um manifesto mínimo (ver `docs/layers-json.md` § auto-criação). |
| Menus (Projetos, Aparência, Interagir, Ações), dropdowns customizados, toast | Chrome da interface. Os quatro menus seguem um padrão só, decidido por `LayersCore.menuStep` (puro) e aplicado por `menuGo`: hover abre (0 ms), saída fecha após 260 ms, clique fixa, `pointerdown` fora (captura), Esc, foco saindo e item de ação fecham; um menu aberto por vez (`menu`, `menuPin`). Os dropdowns de valor (`cbOpen`) abrem por clique e fecham no blur ou no Esc. Os popovers não usam `role=menu`: a navegação por setas nos itens fica fora do escopo. |
| Mock offscreen (`pageRef`, `left:-20000px`) | Fonte de camadas atual: recriação do Traval anotada com `data-src`. Deve ser substituído pelo loader de projeto. |

## Estado (resumo)

- Câmera: `yaw, tilt, zoom, panX, panY, focus, spacing, persp, flat`.
- Seleção: `selId, hoverId, isoId, active (camada ativa), hoverLayer, layerFocus, focusStr, othersOp`.
- Edição: `changes, history, buf, units, scope, pending, codeBuf, fileText`; as pilhas de undo/redo (`undoS`, `redoS`, snapshots de `changes`, 100 passos) são campos de instância, fora do `state`, e zeram em `loadProject`, `unloadProject` e `approve`. Os ajustes pendentes (`changes`) também vão para `layers/v1/pending` e voltam em `loadProject` (§ Persistência).
- Painéis: `rightOpen, rightPx, treeOpen, treeTab, splitPct, colOpen, navMin, interSize, menu, menuPin, cbOpen`.
- Recarga: `stale` (paths que mudaram no disco, ou `null`); `this.watch` (mtimes vigiados, fora do state) e `this.loadedSeq` (geração do `loadSeq` a que o watch pertence).
- Aparência: `cfg` (prioridade sobre tweaks do host, regra "último que mudou").
- Persistido: `cfg` + `UI_KEYS` em `layers/v1/ui`, histórico em `layers/v1/projects`, câmera/seleção/último projeto em `layers/v1/session`.

## Persistência

| Onde | Chave | Conteúdo |
|---|---|---|
| `localStorage` | `layers/v1/meta` | `{schema:1, savedAt, migratedFrom}` — `migratedFrom` só existe em navegador que veio das chaves antigas. |
| `localStorage` | `layers/v1/ui` | Preferência de interface: `cfg` (tema, seleção, cores de origem, cabeçalho, escala de fonte, degradê) + `UI_KEYS` (painéis, navegação, árvore, escopo, `interSize`). |
| `localStorage` | `layers/v1/projects` | Histórico de projetos: `{id,kind,name,path,label,last,pinned}`. |
| `localStorage` | `layers/v1/session` | `{lastProjectId, selId, isoId, camera}`. `lastProjectId: null` é valor legítimo — significa "nenhum projeto", e o editor reabre vazio. |
| `localStorage` | `layers/v1/pending` | `{schema:1, byProject:{<chave>:{savedAt, hash, changes[]}}}`. `<chave>` = `projectId` (`folder:`/`zip:`/`repo:`) ou `fx:<fixtureBase>`. `hash` cobre `layers.json`, mock, folhas `.css` e `dcSource` lidos em `loadProject`; hash igual restaura tudo na ordem, hash diferente descarta tudo com toast `warn`. Teto de 200 changes e expiração de 30 dias. |
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
uma fonte falhou na leitura, preserva a entrada sem restaurar. `doReload` e `resetUI` limpam a
entrada; `approve`/`rollback` recalculam o hash da sessão (`refreshPendingHash`).
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

- DOM 3D: acima de ~1.500 planos o orbit degrada. Mitigações: `contain`, `will-change` só durante drag, transições desligadas no drag (v2.22) e culling por viewport durante o arrasto (S4.5; selecionado e hover nunca cortam; opacidade não é critério, ver comentário v2.7-b no `Plane`). Próximo passo: cache de `getComputedStyle` (S4.6), árvore virtualizada (S4.7) e agrupamento de folhas.
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
aparece com o primeiro path e `+N`. Editar `src/**/*.ts` não dispara: não está no conjunto vigiado
(o app alvo só entra via mock/snapshot). Escritas do próprio LAYERS (`writeText`) atualizam
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
