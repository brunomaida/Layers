---
type: guide
status: active
solution: Layers
---

# LAYERS — Setup local com visual idêntico

Como rodar o LAYERS na sua máquina e obter **exatamente** o mesmo render que o app
tinha quando era servido pelo host. Ver também
[ARCHITECTURE.md](ARCHITECTURE.md) · [RELEASE-CHECKLIST.md](RELEASE-CHECKLIST.md) ·
[../fonts/README.md](../fonts/README.md)

## Rodar

Duplo clique em `run.bat`, ou na mão:

```
npm install
npm run dev          # http://localhost:5180
```

`run.bat` faz `cd` para a pasta do próprio script, instala as dependências se
faltarem, recusa subir se a 5180 já estiver ocupada e dá `pause` em caso de erro —
senão a janela fecha antes de você ler a mensagem.

Não abrir via `file://`. A File System Access API e `document.fonts` exigem origem HTTP.

**Toolchain:** Node 22.22.2+ ou 24.15.0+ com npm 12+. Verificado em **Node 24.19.0 LTS
(Krypton) + npm 12.0.2**: install limpo, `npm audit` com 0 vulnerabilidades, e o app
renderizando sem erro de console.

O piso vem do npm 12, que exige `^22.22.2 || ^24.15.0 || >=26.0.0`. O Vitest 4 também
não suporta a linha 23 (`^20.0.0 || ^22.0.0 || >=24.0.0`).

## O que garante o visual idêntico

Todo recurso de runtime está **versionado no repositório**. O app não faz nenhuma
requisição externa: verificado com 12 requisições, todas em `localhost:5180`.

```
index.html
  ├─ <script src="./vendor/react.production.min.js">      ─┐ carregados ANTES de
  ├─ <script src="./vendor/react-dom.production.min.js">  ─┤ support.js, que então
  ├─ <script src="./support.js">                          ─┘ pula o fetch ao unpkg
  └─ <link rel="stylesheet" href="./fonts/fonts.css">
        └─ 15 .woff2 em fonts/, subsetados por unicode-range
```

| Recurso | Onde está | Por que importa |
|---|---|---|
| Inter, JetBrains Mono, Michroma | `fonts/` — 15 `.woff2` + `fonts.css` (48 blocos `@font-face`) | Sem eles o browser cai para Segoe UI e toda a métrica de texto muda |
| React 18.3.1 + ReactDOM UMD | `vendor/` — 2 `.js` | Sem eles o app não abre offline nem se o unpkg cair |
| Versões de dev | `package-lock.json` | `npm install` reproduz o mesmo Vite/Vitest |

### Por que `support.js` não foi editado

O `CLAUDE.md` proíbe editar `support.js` (é gerado). Não foi preciso: o runtime já
tem o escape certo.

```js
// support.js:1839
function loadReactUmd() {
  const w = window;
  if (w.React && w.ReactDOM) return Promise.resolve();   // ← curto-circuito
  ...
}
```

Basta que as tags `<script>` locais venham **antes** de `support.js` no `<head>`.
Quando `loadReactUmd()` roda, os globais já existem e nenhum fetch ao unpkg acontece.

Os arquivos em `vendor/` foram validados contra os hashes **SRI que o próprio
`support.js` declara** (`REACT_SRI`, `REACT_DOM_SRI`) — prova de que a cópia local é
byte-idêntica ao que o app carregava do CDN.

### Babel não é necessário

`support.js` também declara `BABEL_URL`, mas `ensureBabel()` só é chamado para
`x-import` com `kind === "jsx"`. O `index.html` não tem nenhum `x-import`, então o
Babel **nunca é baixado**. Confirmado em runtime: `window.Babel === undefined`.

### Fontes: por que não baixar do site do autor

O Google não serve uma fonte estática por peso — serve **15 arquivos variáveis
subsetados por `unicode-range`**, e o mesmo arquivo cobre 400–700 de uma família. Um
`.woff2` de rsms.me ou do site da JetBrains é outro build, com hinting e métricas
diferentes. Os arquivos aqui são espelhos byte-a-byte do que o `fonts.gstatic.com`
entrega. Detalhes em [../fonts/README.md](../fonts/README.md).

## Defaults visuais reais

Sem `localStorage`, valem os `data-props` do `index.html` — **não** os literais do
`:root` no `<style>`, que são apenas placeholders antes do `applyTheme()` rodar.

| Prop | Default | Variável resolvida |
|---|---|---|
| `theme` | Gray · 1 Grafite | `--bg0: #2a2e34` |
| `accent` | 5 · Cinza médio | `--acc: #8b96a3` |
| `selectColor` | Coral | `--sel: #f08c6c` |
| `originColors` | Mono · cor de seleção | — |
| `panelHeader` | B · Faixas rotuladas | — |
| `sliderScale` | 85 | `--sliderS: 0.85` |
| `fontScale` | 1 | `--fs: 1` |

Se o seu render estiver diferente, o motivo mais provável é preferência salva no
browser. Limpe e recarregue:

```js
['meta', 'ui', 'projects', 'session'].forEach(k => localStorage.removeItem('layers/v1/' + k));
['layers-cfg', 'layers-hist', 'layers-inter-size',
 'traval-layer-editor-cfg', 'traval-layer-editor-hist', 'traval-layer-editor-inter-size']
  .forEach(k => localStorage.removeItem(k));
sessionStorage.removeItem('layers/v1/tab');
```

As chaves antigas continuam no navegador até a v2.26 e são lidas uma vez, na migração para
`layers/v1/*` — por isso apagar só as de `layers/v1` **não** devolve os defaults: a migração
roda de novo e traz o tema antigo de volta. O mapa completo das chaves está em
[ARCHITECTURE.md](ARCHITECTURE.md) § Persistência.

## Verificar que está tudo local

Com o dev server no ar, abra o DevTools → Network e recarregue. **Nenhuma requisição
pode sair de `localhost:5180`.** Se aparecer `fonts.googleapis.com`, `fonts.gstatic.com`
ou `unpkg.com`, o `index.html` regrediu para as tags de CDN.

Checagem rápida no console:

```js
await document.fonts.ready;
({ inter:  document.fonts.check("400 13px Inter"),
   mono:   document.fonts.check("500 11px 'JetBrains Mono'"),
   michroma: document.fonts.check("400 15.6px Michroma"),
   react:  window.React?.version,
   babel:  !!window.Babel })
// esperado: inter/mono/michroma true, react "18.3.1", babel false
```

## Regenerar os recursos versionados

Só ao atualizar uma versão fixada:

```
python scripts/vendor-assets.py
```

O script baixa as fontes, reescreve `fonts/fonts.css` com os caminhos locais
(preservando os `unicode-range`) e revalida os UMD do React contra o SRI — abortando
se o CDN mudar os bytes. Revise o diff: um `.woff2` alterado pode mudar a
renderização.

## O que ainda difere do host

Honestamente, dois pontos fora do controle do repositório:

- **Viewport.** O export `.dc.html` rodava num artboard de tamanho fixo; standalone o
  app é `100vw`/`100vh`. Ajuste a janela se quiser comparar pixel a pixel.
- **Rasterização de fonte.** Sub-pixel antialiasing depende de SO e escala de tela.
  Mesmos arquivos, mesmas métricas, desenho final ligeiramente diferente entre
  máquinas.

Fora isso, o render é o mesmo.

## Problemas conhecidos

**`npm install` falha com `Cannot read properties of null (reading 'edgesOut')`**

Sintoma de npm antigo — o 10.9.2 quebra em `arborist#loadPeerSet` ao resolver o grafo
de peers do Vitest 4.x. Não é problema das versões declaradas, que resolvem normalmente.

Cheque `node -v` e `npm -v` antes de qualquer outra coisa. Se estiver abaixo do piso
acima, atualize em vez de contornar com `--legacy-peer-deps`, que só mascara:

```
winget install OpenJS.NodeJS.LTS   # Node 24 LTS; pede UAC
npm i -g npm@latest
```

Resolvido nesta máquina em 2026-09-12 (Node 22.14.0 + npm 10.9.2 → Node 24.19.0 +
npm 12.0.2).
