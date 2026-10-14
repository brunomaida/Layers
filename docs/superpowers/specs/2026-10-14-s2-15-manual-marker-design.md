---
title: "S2.15 — Marcador manual para TS/JS (design)"
type: spec
solution: Layers
status: draft
created: 2026-10-14
---

# S2.15 — Marcador manual para TS/JS (design)

Leaf S2.15 do [roadmap](../../roadmap.md); item do [checklist de release](../../RELEASE-CHECKLIST.md) (B, "Falta marcar TS/JS explicitamente como 'manual' na interface").

## Contexto

O comportamento "patch manual" para origens TS/JS já existe como texto livre: nota do trecho de código (`index.html` `codeRow`), nota do diff (`openDiff`) e log do rascunho (`dcWhy.SOURCE_NOT_CSS`). `makeDraft`, `approve` e `exportFull` já pulam origens não-CSS e não-dc. Falta um marcador visível no chip de origem e na lista de ajustes: hoje uma origem `.ts` aparece como `mock`.

## Decisão

- "Manual" = origem `.ts|.tsx|.js|.jsx|.mjs|.cjs` (predicado puro `LayersCore.isManualSource(file)`). `.html` dc continua automático; `.css` inalterado.
- Marcador textual, só com tokens existentes (`--fg3`, `--warn`); visual congelado, sem novas cores ou tamanhos.
- Nenhum caminho de gravação muda: só rótulos de UI e um predicado no core.

## Fluxo

```
 origem do nó (src = file|selector|line)
        │ ruleOf
        ▼
 ┌───────────────────────────┐  true  ┌─────────────────────────────────────┐
 │ LayersCore.isManualSource │ ─────▶ │ cabeçalho do painel: "patch manual" │
 │ (file)  [novo]            │        │ tooltip do chip: "— patch manual"   │
 └──────────┬────────────────┘        │ Ajustes: prefixo "patch manual ·"   │
            │                         └─────────────────────────────────────┘
            │ false
            ▼
   fluxo CSS inalterado (".css real" / "mock")
```

## Mudanças

| # | Arquivo | Mudança |
|---|---|---|
| 1 | `lib/layers-core.js` | `isManualSource(file)`: `/\.[cm]?[jt]sx?$/i`; exportar |
| 2 | `index.html` (cabeçalho do painel, `originSource`) | span `· patch manual` (`--warn`) após `selSize`; tooltip do chip `origem: <file> — patch manual`. O texto do chip (`mock`) não muda: o slot tem ~12px úteis e cortaria o marcador |
| 3 | `index.html` (lista de ajustes) | prefixo `patch manual · ` (`--warn`) na linha `file › selector`; prefixo, não sufixo, porque a linha corta por reticências no fim |
| 4 | — | descartada: a nota do `codeRow` já diz "patch manual no .ts"; fica como está |
| 5 | `test/layers-core.test.js` | `isManualSource_TsJsx_True`, `_Css_False`, `_Html_False` |
| 6 | `e2e/manual-marker.spec.js` | traval, origem curta (`.shell`) e longa (`origin marker`): cabeçalho e Ajustes mostram "manual" sem recorte (mede a caixa, não só o texto) |
| 7 | docs | checklist L29 `[x]`; roadmap S2.15 `done`; nota em ARCHITECTURE; fragmento `changelog.d` com `### Perf` N/A |

## Verificação

| Gate | Comando |
|---|---|
| Unit (commit) | `npm test` |
| E2E (manual) | `npm run test:e2e -- e2e/manual-marker.spec.js` e `origin-sample`/`tree-snapshot` sem regressão |
| Rede | DevTools → Network sem requisição fora de `localhost:5180` |

## Limites conhecidos

O marcador cobre extensão TS/JS. O gravador pula mais casos (`.scss`, `.vue`, snapshot `mock.html`, ajuste não-tpl em `index.html` dc); neles o patch também é manual e segue sem marcador. Ampliar é decisão própria.

## Fora de escopo

S2.18 e S2.19 (verificação manual da gravação dc, limpeza de códigos reservados), refatorar os 9 testes inline `/\.css$/`.
