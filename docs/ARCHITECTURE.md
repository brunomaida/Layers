---
type: architecture
status: active
solution: Layers
---

# LAYERS — Arquitetura

Editor visual de camadas para projetos web: lê o DOM renderizado de um app, mostra cada elemento como um plano em profundidade (vista explodida) e permite ajustar propriedades CSS com gravação de volta nos arquivos fonte.

Versão de referência: `Traval Layer Editor v2.22.dc.html`.

## Stack

| Camada | Tecnologia | Observação |
|---|---|---|
| UI | HTML5 + CSS inline + JavaScript | Classe React de componente (`class Component extends DCLogic`) hospedada pelo runtime `support.js`. Sem TS, sem bundler. React 18.3.1 UMD versionado em `vendor/`. |
| 3D | CSS 3D transforms | `perspective` no palco, `rotateX/rotateY/scale` no "mundo", `translateZ` por plano. Sem WebGL/canvas. |
| Fontes | Inter, JetBrains Mono, Michroma | 15 `.woff2` versionados em `fonts/`, subsetados por `unicode-range`, via `fonts/fonts.css` gerado. Sem Google Fonts. |
| Disco | File System Access API | `showDirectoryPicker` (leitura da pasta do projeto e gravação de patches). Chrome/Edge apenas. |
| Persistência | `localStorage` + `sessionStorage` + IndexedDB | Quatro chaves `layers/v1/*` (meta, ui, projects, session), `layers/v1/tab` por aba e o handle da pasta no IndexedDB `layers-hist`. Ver § Persistência. |

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
- `data-src="arquivo|seletor|linha"` liga cada nó à regra de origem. Sem `data-src` o nó herda o do ancestral mais próximo.
- Um `change` guarda `fromInline` por id para reverter sem re-scan.
- Escopo de aplicação (`scope`): `one` (só este), `all` (todos os usos da mesma regra) ou `ask`.

## Módulos (dentro do arquivo único)

| Bloco | Responsabilidade |
|---|---|
| `THEMES / ACCENTS / SELECTS`, `applyTheme()` | Paletas; grava variáveis `--*` em `documentElement`. |
| `scan()` / `walk()` | Percorre o DOM alvo, extrai geometria e estilo computado, monta `nodes`/`byId`/`els`. |
| `cam()`, `scene()`, `Plane` | Câmera, projeção e renderização dos planos. Handlers estáveis em `this.H` mantêm o `memo`. |
| `flushMove()` | Orbit/pan/focus por `requestAnimationFrame`. |
| `codeFor()`, `patchCss()`, `lineDiff()` | Leitura do código da regra, patch preservando formatação, diff para revisão. |
| `setProp()`, `applyCode()`, `revert()` | Mutação de estilo, registro de `changes`, escopo. |
| `connectDir`, `readText`, `writeText`, `exportFull` | I/O de arquivos. |
| `autoCreateLayersJson`, `LayersCore.deriveManifest` | Pasta local sem `layers.json`, conectada por clique: varre `.html`/`.css` e grava um manifesto mínimo (ver `docs/layers-json.md` § auto-criação). |
| Menus (engrenagem, INTERAGIR, Ações), dropdowns customizados, toast | Chrome da interface. |
| Mock offscreen (`pageRef`, `left:-20000px`) | Fonte de camadas atual: recriação do Traval anotada com `data-src`. Deve ser substituído pelo loader de projeto. |

## Estado (resumo)

- Câmera: `yaw, tilt, zoom, panX, panY, focus, spacing, persp, flat`.
- Seleção: `selId, hoverId, isoId, active (camada ativa), hoverLayer, layerFocus, focusStr, othersOp`.
- Edição: `changes, history, buf, units, scope, pending, codeBuf, fileText`.
- Painéis: `rightOpen, rightPx, treeOpen, treeTab, splitPct, colOpen, navMin, interSize, menu, menuPin, cbOpen`.
- Aparência: `cfg` (prioridade sobre tweaks do host, regra "último que mudou").
- Persistido: `cfg` + `UI_KEYS` em `layers/v1/ui`, histórico em `layers/v1/projects`, câmera/seleção/último projeto em `layers/v1/session`.

## Persistência

| Onde | Chave | Conteúdo |
|---|---|---|
| `localStorage` | `layers/v1/meta` | `{schema:1, savedAt, migratedFrom}` — `migratedFrom` só existe em navegador que veio das chaves antigas. |
| `localStorage` | `layers/v1/ui` | Preferência de interface: `cfg` (tema, seleção, cores de origem, cabeçalho, escala de fonte, degradê) + `UI_KEYS` (painéis, navegação, árvore, escopo, `interSize`). |
| `localStorage` | `layers/v1/projects` | Histórico de projetos: `{id,kind,name,path,label,last,pinned}`. |
| `localStorage` | `layers/v1/session` | `{lastProjectId, selId, isoId, camera}`. `lastProjectId: null` é valor legítimo — significa "nenhum projeto", e o editor reabre vazio. |
| `sessionStorage` | `layers/v1/tab` | `{projectId}` da aba. Vence o `session` ao restaurar: cada aba reabre o **seu** projeto. Câmera e seleção não: moram no `session` compartilhado e só são restauradas quando `lastProjectId` é o projeto daquela aba. |
| IndexedDB `layers-hist` | store `h`, chave = `id` do histórico | `FileSystemDirectoryHandle` da pasta conectada. É o único lugar onde handle é guardado. |

Nenhuma dessas chaves guarda conteúdo de arquivo, e handle nenhum entra no `localStorage` (F:68).
Escrita: `persistSoon()` com trailing de 400 ms, disparado de `componentDidUpdate` quando a
assinatura de `ui` + `projects` + `session` muda — uma gravação por rajada, não uma por evento.
Recarregar não desmonta o componente, então o `pagehide` drena o trailing pendente; sem isso a
preferência mudada nos últimos 400 ms morreria com a página.
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

Nenhuma. Fontes e React são servidos do próprio repositório — verificado com 12
requisições, todas em `localhost:5180`. Ver [LOCAL-SETUP.md](LOCAL-SETUP.md).

## Limites conhecidos

- DOM 3D: acima de ~1.500 planos o orbit degrada. Mitigações em v2.22: `contain`, `will-change` só durante drag, transições desligadas no drag. Próximo passo: culling por viewport/opacidade e agrupamento de folhas.
- Fonte de camadas fixa (mock). Ver `RELEASE-CHECKLIST.md` → "Loader de projeto".
- Regras vindas de TS/JS/JSX são exibidas e registradas, mas não reescritas.

### Camadas de gravação

O `data-src` de um elemento é `arquivo|seletor|linha`. O que ocupa o slot do seletor decide como se grava:

| Origem | `data-src` | Gravação | Recusa (`LayersCore.DC_CODES`) |
|---|---|---|---|
| Regra em `.css` | `arquivo.css\|.classe\|linha` | `patchCssAt` | folha de utilitários recusa por toast (`UTILITY_SHEET` reservado no enum) |
| Template dc (`<x-dc>`) | `dcSource\|tpl:N\|linha` | `patchDc` → `patchAttrAt`, só valor literal em `style=""` | `VALUE_HAS_BINDING`, `NO_INLINE_STYLE`, `PROP_NOT_INLINE`, `VALUE_UNSAFE`, `SOURCE_CHANGED`, `MAP_MISALIGNED` |
| Qualquer outro arquivo | `arquivo\|…` | nenhuma | `SOURCE_NOT_CSS`; `SNAPSHOT_STYLE` para o `<style>` do próprio snapshot |
| Origem sem pasta gravável | — | nenhuma | toast que nomeia a origem (`READONLY_ORIGIN` reservado no enum) |

O código da recusa é o contrato; a frase mostrada no log do rascunho (`dcWhy` em `index.html`) deriva
dele e vem com um snippet para colar à mão. Só o template dc tem mapa por índice: o runtime carimba
`data-dc-tpl="N"` em ordem de documento, `LayersCore.mapDcTemplate` conta as start tags do arquivo
na mesma ordem (o conteúdo de `<template>` não é carimbado, então é pulado) e o mapa só vale se
`checkDcMap` bate as tags do render **e** `dcStyleMismatch` bate os valores literais do `style=""`
do fonte com o style renderizado; qualquer divergência desabilita toda gravação `tpl:` do projeto.
No `approve`, o patch é recalculado sobre o arquivo atual e só promove o rascunho se o resultado for
idêntico a ele, então uma edição sua no arquivo entre o rascunho e a aprovação não se perde.

## Loader de projeto

`loadProject` lê o `layers.json`, o mock e as folhas, e chama `buildProjectFromHtml` (função de
módulo em `index.html`, só devolve dados): sanitiza, escopa as folhas, monta a raiz (L0) e atribui
`data-src`. O chamador faz o hoist de `@font-face` e monta o resultado no shadow root fora da tela.
A fonte de camadas é sempre um mock sanitizado; nenhum script do projeto roda na origem do editor.
Ler um app renderizado por JS **sem** snapshot manual (Chromium headless em processo separado) está
decidido e não implementado: ver a ADR de 2026-09-18 em `architecture-decisions.md`. Iframe de mesma
origem foi descartado (alcançaria o handle de pasta gravável).
