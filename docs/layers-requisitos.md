# Requisitos técnicos de mapeamento — LAYERS v2.24

Resultado dos testes do loader (`layers.json`) com os quatro projetos de `C:\Development` e o que cada tipo de arquivo exige.

## Testes

| projeto | forma do código | mock usado | resultado |
|---|---|---|---|
| **Traval** | Vite + TS; DOM construído em `src/ui/*.ts`; CSS em `src/styles/*.css`; `index.html` só tem `<div id="app">` | `layers/mock.html` gerado a partir da recriação v2.23 (estático, com `data-name`/`data-src` autorais) + 4 folhas reais | ✓ 415 elementos · 12 camadas · 98 regras com arquivo/linha; leitura do `.css` real, diff e patch funcionam |
| **Axai** | ASP.NET; UI estática em `wwwroot/index.html` + `painel.css`; conteúdo das listas montado por `painel.js` | o próprio `wwwroot/index.html` (`<link>` relativo resolvido) | ✓ 60 elementos · 7 camadas · 24 regras mapeadas por heurística de classe → `painel.css|.seletor|Lnn`. Listas de produtos/resultados vazias (dependem de JS) |
| **MarketView** | `index.html` único com `<style>` e `<script>` inline; grafo desenhado por JS/canvas | o próprio `index.html` | ✓ 46 elementos · 6 camadas (topbar, painéis, tabs). Palco do grafo vazio (canvas + JS). Sem `data-src` (CSS inline no HTML → só síntese do `style`) |
| **Results** | React + Babel no navegador; `export/*.html` traz `<div id="app">` + scripts | `export/admin.html` direto | ✗ 1 elemento (`#app` vazio). Precisa de snapshot do DOM renderizado (`tools/layers-snapshot.js`) |

Conclusão: o loader cobre HTML estático diretamente; tudo que é renderizado por JS precisa de um **snapshot** (uma vez por mudança de UI) ou de um mock autoral.

## Requisitos por tipo de arquivo

### Pastas
- `layers.json` obrigatório na **raiz da pasta conectada** (a pasta que o usuário escolhe no picker). Se a UI mora numa subpasta (`src/Axai.Api/wwwroot`), use `base`.
- Caminhos sempre relativos à raiz, com `/`. Nada fora da pasta (o handle não permite).
- Leitura via File System Access API (Chromium). `readwrite` só é pedido para gravar rascunho/patch de `.css`.

### `.html`
- Lido, parseado com `DOMParser`, sanitizado (scripts, iframes, handlers, `javascript:` removidos) e injetado em shadow root. Nunca executa.
- Serve como mock **se o DOM já está no arquivo**. `<div id="app"></div>` → snapshot.
- `<link rel="stylesheet" href="relativo">` é resolvido em relação ao HTML e lido da pasta; `href` externo é descartado (só Google Fonts passa, para o documento).
- Vários filhos em `<body>` → wrapper `body` como L0. `<dialog>`/`[hidden]` entram como camadas só quando exibidos.
- `position:fixed` no mock é contido no host.

### `.css`
- Lido inteiro e aplicado escopado (`:root`→`:host`, `html/body`→raiz). É a **única** fonte que o editor grava (rascunho paralelo `.design-draft.css`, histórico `.design-history/`, patch por seletor).
- Indexado por seletor de classe top-level para gerar `data-src` (`arquivo|seletor|linha`). Regras aninhadas (`@media`, `@layer`, nesting) não entram no índice — ficam só visíveis.
- `@font-face` dentro de shadow root não carrega fontes: declare via `fonts` (Google) ou copie o `@font-face` para o editor (não previsto no baseline).
- `@import` não é seguido (listar cada arquivo em `styles`).

### `.js` / `.ts`
- **Nunca executados.** Só referência: um `data-src` apontando para `.ts|símbolo|linha` mostra o trecho do arquivo (±6 linhas) no painel, marca o ajuste como "patch manual" e não entra no diff automático.
- Para o DOM que esses arquivos constroem, o caminho é snapshot (`tools/layers-snapshot.js`) ou mock autoral com `data-src` apontando para o `.ts` que cria o elemento (modelo do Traval).

### `.jsx` / `.tsx`
- Igual a `.js`/`.ts`: não há transpilação no editor (segurança e ausência de build). O snapshot do app rodando é o caminho. Referência de código funciona (`Componente.jsx|NomeDoComponente|linha`), edição não.
- Avaliação: **incluir só como referência**. Evaluar Babel no navegador exigiria executar código do projeto dentro do editor.

### `.scss`
- Não é CSS válido para o navegador; o loader não compila. Duas opções: apontar `styles` para o `.css` gerado pelo build (e `data-src` para o `.scss` como referência, sem patch automático), ou compilar antes.
- Avaliação: **referência sim, edição não** no baseline. Compilador Sass no navegador (~1 MB) é possível, mas fora do escopo.

### `.json`
- `layers.json` é o único lido pelo editor. Outros `.json` (datasets, `package.json`) não são necessários — o mock deve trazer dados já renderizados.
- Avaliação: **não incluir**; se um projeto quiser dados dinâmicos no mock, o snapshot já os captura renderizados.

### `.env`
- **Nunca ler.** Segredos. O loader não toca em `.env*`, e o snapshot não inclui. Recomendação: nada em `layers.json` deve depender de ambiente.

### `.md`
- Não participa do carregamento. Útil só como documentação (`docs/layers-json.md`, changelog). Avaliação: **não incluir no loader**.

## Segurança (resumo)
- Sanitização do mock; CSS escopado; nenhum script do projeto executa; origem externa restrita a `fonts.googleapis.com`; `.env` ignorado; gravação só em `.css` e sempre por rascunho + aprovação.

## Pendências para o checklist B
1. Snapshot do Results (rodar `tools/layers-snapshot.js` no `Painel CCRC.html` aberto) e definir `viewport`.
2. Traval: substituir o mock derivado da v2.23 por snapshot do app real (mesmo script) mantendo `rules` para os `data-src`.
3. MarketView: `rules` opcionais mapeando classes → `index.html|.seletor|linha` (CSS inline; o índice não cobre `<style>` do HTML).
4. Loader remoto (repositório GitHub) reutiliza o mesmo contrato com um leitor HTTP — já isolado em `readText`.
