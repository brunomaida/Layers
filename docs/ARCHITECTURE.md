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
| `sessionStorage` | `layers/v1/tab` | `{projectId}` da aba. Vence o `session` ao restaurar: N abas, N projetos. |
| IndexedDB `layers-hist` | store `h`, chave = `id` do histórico | `FileSystemDirectoryHandle` da pasta conectada. É o único lugar onde handle é guardado. |

Nenhuma dessas chaves guarda conteúdo de arquivo, e handle nenhum entra no `localStorage` (F:68).
Escrita: `persistSoon()` com trailing de 400 ms, disparado de `componentDidUpdate` quando a
assinatura de `ui` + `projects` + `session` muda — uma gravação por rajada, não uma por evento.
Migração (`LayersCore.migrateConfig`) converte `layers-cfg`, `layers-hist` e
`layers-inter-size` e **não** as apaga; a remoção fica para a v2.26.

Reabrir: pasta já autorizada volta sozinha por `queryPermission()` (`requestPermission()`
exigiria clique); `.zip` e repositório GitHub não reabrem sozinhos — o painel do palco diz o
que fazer. Reabrir o último projeto preserva câmera e seleção; abrir um projeto diferente
volta à vista padrão.

Export/import: `layers-config.json` (`{schema:1, exportedAt, ui, projects, session}`) pelas
duas linhas no dropdown de projetos. No import, `ui` substitui e `projects` faz merge por
`id` preservando `pinned`; pastas locais precisam ser reconectadas.

## Rede

Nenhuma. Fontes e React são servidos do próprio repositório — verificado com 12
requisições, todas em `localhost:5180`. Ver [LOCAL-SETUP.md](LOCAL-SETUP.md).

## Limites conhecidos

- DOM 3D: acima de ~1.500 planos o orbit degrada. Mitigações em v2.22: `contain`, `will-change` só durante drag, transições desligadas no drag. Próximo passo: culling por viewport/opacidade e agrupamento de folhas.
- Patch só em `.css`. Regras vindas de TS/JS são exibidas e registradas, mas não reescritas.
- Fonte de camadas fixa (mock). Ver `RELEASE-CHECKLIST.md` → "Loader de projeto".

## Loader de projeto (v1 — a implementar)

1. Usuário conecta a pasta (FS Access).
2. LAYERS sobe o app alvo num `<iframe>` de mesma origem (dev server Vite ou `dist/` servido localmente).
3. `walk()` roda no `iframe.contentDocument`.
4. Origem de cada regra: CSSOM (`document.styleSheets[].cssRules`) → seletor casado com `el.matches()` → arquivo/linha localizados nos `.css` da pasta com `css-tree`.
5. Estilos em TS/JS: TypeScript Compiler API apenas para localizar literais (`style.x = …`, template strings); sem interpretação.
6. Sem parser próprio de HTML: o browser é a engine de layout.
