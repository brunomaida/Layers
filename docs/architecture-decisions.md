---
type: decisions
status: active
solution: Layers
---

# LAYERS — Decisões de arquitetura

Decisões com consequência duradoura. Uma entrada por decisão, mais nova em cima.
Registrar o que foi **descartado** e por quê — é o que evita refazer a análise.

---

## 2026-09-18 · Ler apps renderizados por JS em processo separado; nunca iframe, nunca mesma origem

**Contexto.** O editor é ele próprio um app dc (`<x-dc>` + `support.js`): o DOM só existe depois do
runtime rodar, então um parser estático não vê as camadas. `docs/ARCHITECTURE.md` e
`docs/TOPOLOGY.md` prometiam um `<iframe>` de mesma origem com `walk()` em `contentDocument`, mas o
que foi entregue na v2.24 é um mock sanitizado num shadow root, sem executar script do projeto.
A pergunta era como ler e editar apps assim sem perder essa garantia.

**Decisão.** (1) Nenhum código do projeto-alvo roda na origem do editor. (2) O caminho para apps
renderizados por JS é um **snapshot headless**: um endpoint Node em `/__layers/*` no `:5180`
dirige um Chromium separado contra o dev server do alvo (loopback) e devolve HTML + trace, que
entra no sanitizer existente. Fica para um plano próprio. (3) Já entregue e independente disso: o
runtime dc carimba `data-dc-tpl="N"` em cada elemento, então `LayersCore.mapDcTemplate` mapeia o
elemento renderizado ao `style=""` do template fonte, e `patchDc` grava. Toda recusa devolve um
código estável (`LayersCore.DC_CODES`); a frase de UI deriva do código. O **CSP não muda**.

**Alternativas descartadas.**

| Opção | Por que não |
|---|---|
| Proxy same-origin em `:5180` + iframe com `contentDocument` | O código do alvo rodaria na origem do editor e alcançaria o handle de pasta gravável guardado em IndexedDB (`layers-hist`) e a permissão `readwrite` já concedida (`ensureWrite`). Não há `sandbox` que recupere isso: o ponto da opção é ser same-origin |
| Iframe cross-origin + script sonda injetado | Custo do pipeline ≈ o do snapshot (serializar DOM e CSS, postMessage, remontar) mais `frame-src` e uma injeção que só funciona em alvo proxiado |
| Spawnar o dev server do alvo a partir de um comando do `layers.json` | RCE quando o `layers.json` vem de `.zip` ou GitHub. Allowlist de comando é teatro (`npm run dev` roda scripts arbitrários do `package.json`). v1 só aceita URL loopback que o usuário já subiu |
| `layers/overrides.css` para propriedade não gravável | O alvo não importa o arquivo, muda a cascata em silêncio e uma gravação sem efeito é pior que uma recusa. Recusa com motivo e snippet |

**Regras para o endpoint headless (slice futura).** Escreve nada e não recebe caminho: devolve
HTML + trace no corpo e o editor persiste sob clique (R1). `Origin` exato (`http://localhost:5180`
ou `127.0.0.1:5180`) + `Sec-Fetch-Site` + checagem de `Host`, com o middleware registrado depois
dos internos do Vite (o padrão de `server.cors` aceita qualquer `localhost:*`, inclusive o alvo).
Entry só loopback, `http:`, porta ≠ 5180, inerte para `.zip`/GitHub e confirmado por clique.
`import('playwright')` dinâmico, 501 quando ausente: `npm run dev` nunca depende dele. R1 vale
só para o snapshot; qualquer tool que grava precisa de regra própria.

**Política de escrita como contrato.** Qualquer escritor futuro (Node, MCP) tem de reproduzir o
comportamento de `writeText` (`index.html`): guarda de `lastModified`, `.bak` da primeira versão,
`.tmp` + `move()` com fallback, `writeLog`, escopo por `safePath` e raiz fixada fora dos
argumentos. Um servidor MCP não consegue forçar confirmação; com a tool auto-aprovada ele fica
mais fraco que o gate por clique de hoje, e só as defesas mecânicas sobrevivem.

**Consequências.** O `data-src` ganha a camada `arquivo|tpl:N|linha` (o slot do seletor guarda o
índice do template). Só se grava valor **literal** em `style=""` do template; cor via `var(--x)`,
`{{ }}`, `:root` do `<helmet>` e `<style>` de snapshot (CSS serializado) recusam. Se as tags do
mapa não batem com o render, nenhuma gravação `tpl:` é feita. O rascunho de um alvo `.html`
(`index.design-draft.html`) cai na raiz servida, por isso o `vite.config.js` passou a ignorar
rascunho, histórico, `.bak` e `.tmp`. Playwright/Chromium (~170 MB, baixado da CDN na instalação)
fica restrito ao endpoint opcional.

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
- Ao comparar render, limpar `layers/v1/*` e as chaves antigas que a migração ainda lê (snippet em [LOCAL-SETUP.md](LOCAL-SETUP.md)).
- Mudar default visual = editar `data-props`, não o `:root`.

## 2026-09-13 · Reusar o IndexedDB `layers-hist` e gravar configuração por picker

**Contexto.** A fatia 4 do plano do loader previa um IndexedDB novo (`layers-store` v1, store
`handles`) e o export da configuração em arquivo. Duas colisões com o que já existe: o
`layers-hist` v1 (store `h`) já guarda exatamente `id do histórico -> handle` e tem projetos
reais conectados; e o `CLAUDE.md` diz que toda gravação passa por `writeInto`/`writeText`, que
são escopados à pasta do projeto — configuração não tem pasta de projeto.

**Decisão.** O banco continua `layers-hist`/`h`, sem renomear. `layers-config.json` é gravado
por `showSaveFilePicker`, com o alvo escolhido no clique, do mesmo jeito que o `exportFull` já
usa `showDirectoryPicker`.

**Alternativas descartadas.**

| Opção | Por que não |
|---|---|
| Criar `layers-store` e copiar os handles na primeira abertura | Código de migração para ganhar um nome melhor; quem não reabrir o editor perde o handle |
| Criar `layers-store` sem copiar | Orfana os projetos já conectados |
| Gravar a configuração por `writeInto`, na pasta do projeto | Preferência de interface não é artefato do projeto, e sem projeto conectado não haveria onde gravar |
| Download por `<a download>` | Não é File System Access, não diz onde gravou e não dá erro legível |

**Consequências.** O nome do banco (`layers-hist`) ficou mais estreito que o conteúdo (handle
de pasta de qualquer origem) — custo aceito, registrado aqui para não parecer esquecimento.
`writeInto`/`writeText` seguem exclusivos da pasta conectada; a única gravação fora dela é a
configuração, e sempre no arquivo que o usuário escolheu.

---

## Formato

```
## AAAA-MM-DD · Título no imperativo

**Contexto.** O que forçou a decisão.
**Decisão.** O que foi escolhido.
**Alternativas descartadas.** Tabela: opção | por que não.
**Consequências.** O que passa a ser verdade, incluindo o que fica pior.
```
