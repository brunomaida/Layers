---
title: "layers.json — contrato de carregamento de projetos (LAYERS v2.24+)"
type: report
solution: Layers
status: draft
created: 2026-09-12
---

# layers.json — contrato de carregamento de projetos (LAYERS v2.24+)

O editor não traz projeto embutido. Ao conectar uma pasta (Projetos recentes › Conectar pasta local…), o loader lê `layers.json` na raiz, monta o mock num **shadow root fora da tela** e o motor lê o DOM + `data-name` / `data-src`.

## Arquivo

```json
{
  "name": "Traval",
  "base": "",
  "viewport": { "width": 1280, "height": 760 },
  "mock": "layers/mock.html",
  "styles": ["src/styles/tokens.css", "src/styles/layout.css"],
  "fonts": ["Newsreader", "Geist"],
  "root": { "name": ".shell", "src": "src/ui/shell.ts|.shell|3" },
  "rules": { ".toolbar": "src/styles/layout.css|.toolbar|8" },
  "interactions": [ … ]
}
```

| campo | padrão | descrição |
|---|---|---|
| `name` | nome da pasta | mostrado no botão de projeto |
| `base` | `""` | subpasta que prefixa `mock` e `styles` (ex.: `src/Axai.Api/wwwroot`) |
| `viewport` | 1280×760 | tamanho da página do mock em px; define a geometria do palco. Páginas longas: use a altura real (`scrollHeight`) |
| `mock` | `layers/mock.html` | HTML do mock. Pode ser o próprio `index.html` do app quando o DOM é estático |
| `styles` | `[]` | folhas `.css` reais, lidas da pasta e aplicadas dentro do shadow root (não vazam para o editor). `<link rel="stylesheet" href="relativo">` dentro do mock também é resolvido e lido |
| `fonts` | `[]` | Famílias de fonte que o projeto usa. **Nada é buscado na rede**: cada família é resolvida contra `fonts/projects.css`, versionado no repositório do LAYERS. Por compatibilidade, uma URL de serviço de fontes com parâmetro `family=` também é aceita — só as famílias são lidas dela, a URL nunca é requisitada. Família ausente do sheet local vira aviso e cai no fallback |
| `root` | — | `data-name` / `data-src` do elemento raiz (L0) |
| `rules` | `{}` | seletor CSS → `arquivo|regra|linha`; sobrescreve `data-src` (e `data-name`) dos elementos que casam |
| `dcSource` | — | arquivo (relativo a `base`) com o bloco `<x-dc>` do app dc que gerou o `mock`. Elementos do mock com `data-dc-tpl` ganham `data-src` `arquivo\|tpl:N\|linha` e passam a poder gravar valor literal de `style=""` no template. Só vale se as tags do arquivo batem com as do mock; senão avisa e nenhuma gravação `tpl:` é feita. Inerte fora de pasta local (a origem precisa ser gravável) |
| `interactions` | `[]` | itens do menu ⚡ Interagir (abaixo) |

## O que o loader faz com o mock

1. `DOMParser` → remove `script`, `link`, `iframe`, `object`, `embed`, `base`, `meta`, `noscript`, `template`, atributos `on*`, URLs `javascript:` e **todo atributo com URL remota** (`src`, `srcset`, `poster`, `data`, `href`, `xlink:href`; `data:` e `blob:` passam). O mock é **estático**; interação vem de `interactions`.
2. `<style>` inline e as folhas de `styles` entram escopadas no shadow root com reescrita: `:root` → `:host`, `html`/`body` → raiz sintética, `* {` → descendentes da raiz.
   - `@font-face` é **retirado** da folha escopada e reinjetado no documento (dentro de shadow root ele não carrega), com cada `url()` relativa lida da pasta e trocada por `blob:`. `url()` remota é descartada.
   - Qualquer `url(http…)` no restante do CSS vira `url(about:blank)` com aviso.
3. Raiz (L0): se `<body>` tem um único filho, ele é a raiz; se tem vários (`<main>`, `<dialog>`, barras flutuantes…), um wrapper `body` é criado. `position:fixed` no mock fica contido no host (não escapa para o editor).
4. `data-src` ausente: heurística — para cada elemento, a primeira classe que abre uma regra top-level numa folha carregada vira `arquivo|seletor|linha` (e o nome, se não há `data-name`). `rules` sobrescreve. Sem folha carregada, o código mostrado é a síntese do `style` inline.
5. `data-name` ausente: primeira classe (`.toolbar`), depois `#id`, depois a tag.
6. Elementos com área zero (`display:none`, `hidden`, `<dialog>` fechado) não viram camadas; passam a existir quando uma ação de `interactions` os exibe.

## Origens

O loader lê de quatro origens, todas pela mesma porta (`readText`/`readBytes`), nesta ordem:

| origem | como | grava? |
|---|---|---|
| pasta local | File System Access, conectada em `mode: 'read'` | sim, após `ensureWrite()` escalar para `readwrite` |
| `.zip` | `showOpenFilePicker` + diretório central + `DecompressionStream('deflate-raw')` | não |
| repositório GitHub público | `api.github.com` para o branch padrão, `raw.githubusercontent.com` para os arquivos | não |
| fixture HTTP | `#layers=<pasta>/`, usado nos testes | não |

Todo caminho passa por `safePath` antes de virar arquivo: vazio, `/` inicial, `C:`, esquema de URL e segmento `.`/`..` são recusados. Num `.zip` isso não é teoria — é o único caminho por onde uma entrada `../../evil.css` chegaria ao loader.

O repositório remoto pede confirmação explícita, uma por repositório, dizendo quais hosts serão chamados. Nenhum token é pedido nem guardado, então repositório privado simplesmente não carrega. Sem token o limite da API é 60 requisições por hora.

Origem somente leitura recusa a gravação nomeando a origem, em vez de deixar a escrita estourar sem contexto.

## Pasta local sem layers.json (auto-criação)

Se a pasta local conectada não tem `layers.json` e a conexão veio de um clique ("Conectar pasta local…" ou reabrir um item de "Projetos recentes"), o loader varre a pasta (`.html`/`.css`, os mesmos diretórios ignorados de `tools/layers-derive.js` mais `test-results`/`playwright-report`), escolhe o melhor candidato a `mock` pela mesma heurística (mais elementos no `<body>`, `<link rel="stylesheet">` resolvido contra os `.css` encontrados) e grava um manifesto mínimo — mesmo contrato acima, sem os campos que ficam vazios (`base`, `styles`). A varredura tem teto de entradas visitadas, tamanho por arquivo e total lido; se algum for atingido, o manifesto é gravado mesmo assim (a partir de uma visão parcial da pasta) e o aviso registra a truncagem.

Reconexão automática sem clique (reload de uma pasta já autorizada) **nunca** tenta criar o arquivo — o painel de erro mostra um botão "Criar layers.json" para o mesmo processo sob um clique explícito. Um `layers.json` existente nunca é sobrescrito, mesmo se o JSON dentro dele for inválido (esse caso vira um estado de erro à parte, "layers.json inválido"). O manifesto gerado é um ponto de partida: revise `mock`/`base`/`styles` à mão se a heurística escolher o arquivo errado (comum em pastas com relatórios de teste ou builds cacheados fora da lista acima ignorada).

## Modo fixture (dev)

Sem pasta conectada, `index.html#layers=<pasta-servida>/` (ou tweak `fixture`) lê `layers.json` por HTTP — usado nos testes de `fixtures/`.

`vite.config.js` serve `/fixtures/**` sem transformação e devolve 404 para arquivo ausente. Sem isso o Vite responderia os `.css` como módulo JS de HMR (o loader leria JavaScript em vez de CSS) e o fallback de SPA devolveria o próprio `index.html` do editor no lugar de um `mock` inexistente.

## interactions

Cada item é uma linha da coluna esquerda do menu ⚡ Interagir; `groups[].items[]` são chips na direita.

- `{ "sep": "Título" }` — separador.
- `key`, `label`, `desc`.
- `show: seletor` — item-superfície: ganha 👁 que exibe/oculta os elementos que casam (`display:none`; `[hidden]` é removido ao exibir; `<dialog>` alterna o atributo `open`). Estado lido do estilo computado.
- Ações dos chips (uma por chip; estado ●/○ derivado do DOM): `toggle`, `show`, `hide` (seletor → `display`), `class: {selector, name}` (ou string = seletor com `active`), `click: seletor` (dispara `click()` nativo: checkbox, radio, `<details>`), `hint` (texto; sem ação = informativo).

Toda ação re-escaneia o mock.

## Snapshot de apps renderizados por JS

Apps que montam o DOM em runtime (React/Babel, TS via Vite) não têm HTML estático. Use `tools/layers-snapshot.js` no console do app rodando: baixa `mock.html` com o `<body>` atual + todo o CSS carregado inline, e sugere o `viewport`. Repita quando a UI mudar.
