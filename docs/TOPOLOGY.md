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
| `fonts/fonts.css` | 48 blocos `@font-face` com `unicode-range` | Não | `scripts/vendor-assets.py` |
| `fonts/*.woff2` | 15 faces variáveis subsetadas | Não | `scripts/vendor-assets.py` |
| `scripts/vendor-assets.py` | Regenera `fonts/` e `vendor/`; valida SRI do React | Sim | Mão |
| `.githooks/pre-push` | Guarda de branch, CDN e `support.js`; delega ao hook global | Sim | Mão |
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
          └───────┬───────┘                        └────────┬─────────┘
                  │ define window.React                     │ @font-face
                  │        window.ReactDOM                  │
                  ▼                                         │
          ┌───────────────┐                                 │
          │  support.js   │  loadReactUmd() ve os globais    │
          │  (gerado)     │  e pula o fetch ao unpkg         │
          └───────┬───────┘                                 │
                  │ hospeda a classe, faz o boot            │
                  ▼                                         ▼
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
```

Direção: nada aponta de volta. `support.js` não conhece o `index.html`; descobre o
`<x-dc>` em runtime. `index.html` não importa nada — consome globais.

**Ordem no `<head>` é significativa.** `vendor/*.js` precisa vir antes de
`support.js`, senão `loadReactUmd()` não encontra os globais e busca o unpkg. Guardado
pelo `.githooks/pre-push`.

## Fronteiras

| Fronteira | Como atravessa | Estado |
|---|---|---|
| App → disco | File System Access API (`showDirectoryPicker`, `writeInto`/`writeText`) | Chrome/Edge apenas |
| App → app alvo | DOM sanitizado num shadow root fora da tela; nenhum script do projeto roda na origem do editor | Definitivo. Iframe descartado (ADR 2026-09-18); o snapshot headless de apps JS é um processo separado, ainda não implementado |
| App → rede | Nenhuma | Verificado: 12/12 requisições em `localhost` |

## Quando atualizar

Componente novo, mudança na ordem de carga do `<head>`, novo artefato gerado, ou
troca do mock pelo loader.
