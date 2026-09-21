---
type: topology
solution: Layers
---

# LAYERS — Topologia

Grafo de arquivos e dependências. O *fluxo de dados* (scan → nós → cena → changes →
gravação) está em [ARCHITECTURE.md](ARCHITECTURE.md) e não é repetido aqui.

## Assembly Roles

LAYERS não tem assemblies — é um app estático de arquivo único. A tabela mapeia os
artefatos de topo.

| Artefato | Papel | Editável | Origem |
|---|---|---|---|
| `index.html` | O app inteiro: template `<x-dc>`, CSS inline, classe `Component extends DCLogic`, `data-props` | Sim | Mão |
| `support.js` | Runtime dc: parse do template, binding, boot do React, `x-import` | **Não** | Gerado por `dc-runtime` (upstream) |
| `vendor/react.production.min.js` | Global `window.React` | Não | `scripts/vendor-assets.py` |
| `vendor/react-dom.production.min.js` | Global `window.ReactDOM` | Não | `scripts/vendor-assets.py` |
| `vendor/csstree.js` | Global `csstree` (parser CSS); dependência declarada no cabeçalho de `lib/layers-core.js` | Não | Vendor (`index.html:14`) |
| `lib/layers-core.js` | `globalThis.LayersCore`: lógica pura do loader (caminhos, AST CSS, zip, config, manifesto, template dc), sem DOM/React | Sim | Mão |
| `fonts/fonts.css` | 48 blocos `@font-face` com `unicode-range` | Não | `scripts/vendor-assets.py` |
| `fonts/*.woff2` | 15 faces variáveis subsetadas | Não | `scripts/vendor-assets.py` |
| `scripts/vendor-assets.py` | Regenera `fonts/` e `vendor/`; valida SRI do React | Sim | Mão |
| `.githooks/pre-push` | Guarda de branch, CDN e `support.js`; delega ao hook global | Sim | Mão |
| `tools/layers-snapshot.js` | Snapshot do DOM renderizado de um app JS (colado no console) | Sim | Mão |
| `tools/layers-suggest.js` | Spike: sugere `interactions` a partir do mock (colado no console) | Sim | Mão |
| `tools/layers-derive.js` | Spike: deriva manifesto de uma pasta (`node`; só `fs`/`path`) | Sim | Mão |
| `test/layers-core.test.js`, `test/setup.js` | Vitest sobre `lib/layers-core.js`; `setup.js` instala a global `csstree` (pacote `css-tree`) | Sim | Mão |
| `fixtures/` | Projetos-alvo do loader, lidos por HTTP (`#layers=<pasta>/`) e pelos testes | Sim | Vendor/Mão |
| `vite.config.js` | Plugin dev que serve `fixtures/` sem o wrapper de HMR | Sim | Mão |
| `package.json` | Dev server (Vite) e runners de teste. Não há build de produção | Sim | Mão |

## Dependency Direction Graph

```
                        ┌─────────────────────────────┐
                        │  scripts/vendor-assets.py   │  build-time, manual
                        └──────────────┬──────────────┘
                             gera      │
                  ┌────────────────────┴────────────────────┐
                  ▼                                         ▼
          ┌───────────────┐                        ┌──────────────────┐
          │   vendor/     │                        │     fonts/       │
          │  react.js     │                        │  fonts.css       │
          │  react-dom.js │                        │  15x .woff2      │
          │  csstree.js   │                        └────────┬─────────┘
          └──┬─────────┬──┘                                 │ @font-face
             │         │ define window.React                │
             │         │        window.ReactDOM             │
             │         │  window.csstree                    │
             │         ▼                                    │
             │  ┌───────────────┐                           │
             │  │  support.js   │  loadReactUmd() ve os     │
             │  │  (gerado)     │  globais e pula o unpkg   │
             │  └───────┬───────┘                           │
             ▼          │ hospeda a classe, faz o boot      │
   ┌──────────────────┐ │                                   │
   │ lib/layers-core  │ │  define window.LayersCore         │
   │ .js (logica pura)│ │  (le a global csstree em uso)     │
   └────────┬─────────┘ │                                   │
            │           ▼                                   ▼
          ┌─────────────────────────────────────────────────────┐
          │                    index.html                       │
          │   <x-dc> template · CSS inline · Component · props  │
          └─────────────────────────────┬───────────────────────┘
                                        │ le o DOM de
                                        ▼
                        ┌───────────────────────────────┐
                        │  mock offscreen (left:-20000)  │  ← a ser trocado
                        │  recriacao do Traval           │     pelo loader
                        └───────────────────────────────┘     (checklist B)

  Fora do caminho de runtime (dev/teste, nada no app aponta para eles):

     test/*.test.js ──importa──▶ test/setup.js ──▶ css-tree (npm) + lib/layers-core.js
                   └─ le ─────▶ fixtures/**
     vite.config.js ── serve fixtures/ ao dev server (#layers=<pasta>/)
     tools/layers-derive.js    (node: fs, path)   · layers-snapshot.js / layers-suggest.js
                                                    (colados no console do navegador)
```

Direção: nada aponta de volta. `support.js` não conhece o `index.html`; descobre o
`<x-dc>` em runtime. `index.html` não importa nada — consome globais.

**Ordem no `<head>` é significativa.** Ordem atual (`index.html:12-16`): `vendor/react`,
`vendor/react-dom`, `vendor/csstree.js`, `lib/layers-core.js`, `support.js`. Os `vendor/*.js`
precisam vir antes de `support.js`, senão `loadReactUmd()` não encontra os globais e busca o
unpkg. `lib/layers-core.js` resolve `csstree` a cada uso, não na carga. O
`.githooks/pre-push` bloqueia a volta de CDN/unpkg e a edição de `support.js`, mas não
verifica a ordem das tags.

## Fronteiras

| Fronteira | Como atravessa | Estado |
|---|---|---|
| App → disco | File System Access API (`showDirectoryPicker`, `writeInto`/`writeText`) | Chrome/Edge apenas |
| App → app alvo | DOM sanitizado num shadow root fora da tela; nenhum script do projeto roda na origem do editor | Definitivo. Iframe descartado (ADR 2026-09-18); o snapshot headless de apps JS é um processo separado, ainda não implementado |
| App → rede | Nenhuma | Verificado: 12/12 requisições em `localhost` |

## Quando atualizar

Componente novo, mudança na ordem de carga do `<head>`, novo artefato gerado, ou
troca do mock pelo loader.
