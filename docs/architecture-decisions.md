---
type: decisions
status: active
solution: Layers
---

# LAYERS — Decisões de arquitetura

Decisões com consequência duradoura. Uma entrada por decisão, mais nova em cima.
Registrar o que foi **descartado** e por quê — é o que evita refazer a análise.

---

## 2026-09-12 · Vendorizar React e fontes sem tocar no `support.js`

**Contexto.** O app buscava três recursos em runtime: React e ReactDOM do `unpkg.com`
e as três famílias de fonte do Google Fonts. Isso quebra offline, deixa o render
dependente de um CDN, e as fontes ausentes mudam toda a métrica de texto. O
`CLAUDE.md` proíbe editar `support.js`, que é gerado upstream.

**Decisão.** Versionar os recursos em `vendor/` e `fonts/`, e carregá-los por tags
locais no `<head>` **antes** de `support.js`.

```js
// support.js:1839 — o escape que torna a edição desnecessária
function loadReactUmd() {
  const w = window;
  if (w.React && w.ReactDOM) return Promise.resolve();
  ...
}
```

**Alternativas descartadas.**

| Opção | Por que não |
|---|---|
| Editar as três constantes de URL no `support.js` | Viola a regra de não editar arquivo gerado; perde-se na próxima regeneração upstream |
| `window.__resources = { url: caminhoLocal }` (hook oficial do runtime) | Funciona, mas tem efeito colateral: `support.js:158` usa `if (!window.__resources)` para decidir se refaz o fetch do template. Defini-lo muda a semântica de boot por um ganho nulo |
| Inline dos `@font-face` no `<style>` do `<helmet>` | ~18 KB a mais no `index.html` e regenerar exigiria patch no HTML. O `<link>` externo funciona e mantém o arquivo gerado separado |
| Baixar as fontes de rsms.me / jetbrains.com | Builds diferentes, com hinting e métricas diferentes. O objetivo era render idêntico, não "a mesma família" |

**Consequências.**

- `vendor/` e `fonts/` são commitados e regenerados só por `scripts/vendor-assets.py`.
- A **ordem** das tags no `<head>` virou invariante. Guardada pelo `.githooks/pre-push`.
- `.gitattributes` marca `vendor/**` e `support.js` como `-text`: conversão de fim de
  linha mudaria os bytes e invalidaria a validação por SRI num clone novo.
- `@babel/standalone`, também declarado no `support.js`, não foi vendorizado — só é
  usado por `x-import` com `kind "jsx"`, e o `index.html` não tem nenhum. Se algum dia
  entrar um `x-import` JSX, ele volta a ser dependência de rede.

---

## 2026-09-12 · `data-props` é a fonte de verdade dos defaults visuais

**Contexto.** Três lugares descreviam o tema inicial e discordavam: o `README.md`
(`Dark / acento 1 Aço / seleção Azul`), os literais do `:root` no `<style>`
(`--bg0:#0e1116`, `--acc:#60a5fa`) e os `data-props` do `<script data-dc-script>`
(`Gray · 1 Grafite`, `5 · Cinza médio`, `Coral`).

**Decisão.** Valem os `data-props`. Verificado em runtime sem `localStorage`:
`--bg0:#2a2e34`, `--acc:#8b96a3`, `--sel:#f08c6c`.

Os literais do `:root` são placeholders para o intervalo antes de `applyTheme()`
rodar — nunca são o estado final. O `README` estava simplesmente errado.

**Consequências.**

- Precedência documentada: `localStorage` › `data-props` › literais do `:root`.
- Ao comparar render, limpar `traval-layer-editor-cfg` antes de concluir que regrediu.
- Mudar default visual = editar `data-props`, não o `:root`.

---

## Formato

```
## AAAA-MM-DD · Título no imperativo

**Contexto.** O que forçou a decisão.
**Decisão.** O que foi escolhido.
**Alternativas descartadas.** Tabela: opção | por que não.
**Consequências.** O que passa a ser verdade, incluindo o que fica pior.
```
