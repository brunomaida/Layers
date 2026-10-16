---
title: "layers.json — contrato de carregamento de projetos (LAYERS v2.24+)"
type: reference
solution: Layers
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
| `states` | `[]` | estados do mock: `[{ "name": "csv-loaded", "mock": "layers/mock.csv.html" }]`. Com ao menos uma entrada válida (`name` e `mock` strings não vazias; nome repetido vale o primeiro), o `mock` vem do estado ativo (padrão: o primeiro; `mock` do topo é ignorado) e `base` também prefixa o mock do estado. Com 2+ estados o menu ⚡ Interagir › Modo interativo ganha o grupo "Estado do mock": escolher um relê as camadas do zero (pede confirmação se há edições não salvas). Sem `states` o campo `mock` vale como antes |
| `styles` | `[]` | folhas `.css` reais, lidas da pasta e aplicadas dentro do shadow root (não vazam para o editor). `<link rel="stylesheet" href="relativo">` dentro do mock também é resolvido e lido. Em mock de snapshot, a folha listada substitui a cópia do mesmo arquivo no snapshot quando o bloco traz `data-layers-origin` (ocupa a posição da cópia na ordem do mock); snapshot antigo, sem o atributo, precisa ser gerado de novo para isso |
| `fonts` | `[]` | Famílias de fonte que o projeto usa. **Nada é buscado na rede**: cada família é resolvida contra `fonts/projects.css`, versionado no repositório do LAYERS. Por compatibilidade, uma URL de serviço de fontes com parâmetro `family=` também é aceita — só as famílias são lidas dela, a URL nunca é requisitada. Família ausente do sheet local vira aviso e cai no fallback |
| `root` | — | `data-name` / `data-src` do elemento raiz (L0). Em mock de snapshot (S2.22c) o L0 leva o rótulo `<nome> · snapshot` e `name`/`src` vão para o primeiro descendente que casa o seletor `name` (ex.: `.shell` dentro de `#app`); sem match, ficam no L0 |
| `watch` | `[]` | globs de fontes TS/JS vigiadas pela deriva do layout (S2.22d), relativos à raiz da pasta conectada (o mesmo espaço de `data-src` e `root.src`): `"watch": ["src/ui/**/*.ts"]`. `*` não cruza `/`, `**` cruza pastas só como segmento inteiro (`src/**/x.ts`, `src/**`; em `a**b` vale como `*`), `?` é um caractere; entrada vazia, com `..`, `\` ou `/` inicial é ignorada; no máximo 20 globs, de até 200 caracteres e 8 curingas (`*`/`?` seguidos contam um). Pastas e arquivos que começam com `.` não são vigiados. A varredura pula `node_modules`, `.git`, `dist`, `build` e pastas de ponto, para em 5000 entradas ou além de 8 níveis de pasta (ambos avisados, sem contar o que ficou de fora) e observa até 50 arquivos (citados em `data-src` primeiro; o excedente é avisado). Vale para qualquer mock, em especial o de snapshot, que não traz `data-src` |
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

O loader lê de cinco origens, todas pela mesma porta (`readText`/`readBytes`), nesta ordem:

| origem | como | grava? |
|---|---|---|
| pasta local | File System Access, conectada em `mode: 'read'` | sim, após `ensureWrite()` escalar para `readwrite` |
| `.zip` | `showOpenFilePicker` + diretório central + `DecompressionStream('deflate-raw')` | não |
| repositório GitHub público | `api.github.com` para o branch padrão, `raw.githubusercontent.com` para os arquivos | não |
| fixture HTTP | `?layers=<pasta>/` (também aceita `#layers=<pasta>/`), usado nos testes | não |
| pasta via Atlas | `?project=<pasta absoluta>`, servida pelo dev server em `/@project/…`; exige `layers.json` na raiz | não |

Todo caminho passa por `safePath` antes de virar arquivo: vazio, `/` inicial, `C:`, esquema de URL e segmento `.`/`..` são recusados. Num `.zip` isso não é teoria — é o único caminho por onde uma entrada `../../evil.css` chegaria ao loader.

O repositório remoto pede confirmação explícita, uma por repositório, dizendo quais hosts serão chamados. Nenhum token é pedido nem guardado, então repositório privado simplesmente não carrega. Sem token o limite da API é 60 requisições por hora.

Origem somente leitura recusa a gravação nomeando a origem, em vez de deixar a escrita estourar sem contexto.

## Pasta local sem layers.json (auto-criação)

Se a pasta local conectada não tem `layers.json` e a conexão veio de um clique ("Conectar pasta local…" ou reabrir um item de "Projetos recentes"), o loader varre a pasta (`.html`/`.css`, os mesmos diretórios ignorados de `tools/layers-derive.js` mais `test-results`/`playwright-report`), escolhe o melhor candidato a `mock` pela mesma heurística (mais elementos no `<body>`, `<link rel="stylesheet">` resolvido contra os `.css` encontrados) e grava um manifesto mínimo — mesmo contrato acima, sem os campos que ficam vazios (`base`, `styles`). A varredura tem teto de entradas visitadas e de bytes lidos no total — se algum for atingido, o manifesto é gravado mesmo assim (a partir de uma visão parcial da pasta) e o aviso registra a truncagem. Um arquivo individual maior que o teto por arquivo é só pulado, silenciosamente, sem truncar o resto da varredura.

Reconexão automática sem clique (reload de uma pasta já autorizada) **nunca** tenta criar o arquivo — o painel de erro mostra um botão "Criar layers.json" para o mesmo processo sob um clique explícito. Um `layers.json` existente nunca é sobrescrito, mesmo se o JSON dentro dele for inválido (esse caso vira um estado de erro à parte, "layers.json inválido"). O manifesto gerado é um ponto de partida: revise `mock`/`base`/`styles` à mão se a heurística escolher o arquivo errado (comum em pastas com relatórios de teste ou builds cacheados fora da lista acima ignorada).

## Modo fixture (dev)

Sem pasta conectada, `index.html?layers=<pasta-servida>/` (ou tweak `fixture`) lê `layers.json` por HTTP — usado nos testes de `fixtures/`.

`vite.config.js` serve `/fixtures/**` sem transformação e devolve 404 para arquivo ausente. Sem isso o Vite responderia os `.css` como módulo JS de HMR (o loader leria JavaScript em vez de CSS) e o fallback de SPA devolveria o próprio `index.html` do editor no lugar de um `mock` inexistente.

## interactions

Cada item é uma linha da coluna esquerda do menu ⚡ Interagir; `groups[].items[]` são chips na direita.

- `{ "sep": "Título" }` — separador.
- `key`, `label`, `desc`.
- `show: seletor` — item-superfície: ganha 👁 que exibe/oculta os elementos que casam (`display:none`; `[hidden]` é removido ao exibir; `<dialog>` alterna o atributo `open`). Estado lido do estilo computado.
- Ações dos chips (uma por chip; estado ●/○ derivado do DOM): `toggle`, `show`, `hide` (seletor → `display`), `class: {selector, name}` (ou string = seletor com `active`), `click: seletor` (dispara `click()` nativo: checkbox, radio, `<details>`), `hint` (texto; sem ação = informativo).

Toda ação re-escaneia o mock.

Seletor que não casa nada no mock (`show`, `toggle`, `hide`, `on`, `click`, `class`) é avisado na carga e a superfície sem alvo aparece como "sem alvo" no menu. Elementos ocultos contam como alvo; só o seletor sem nenhum elemento (ou inválido) é morto.

## Snapshot de apps renderizados por JS

Apps que montam o DOM em runtime (React/Babel, TS via Vite) não têm HTML estático. Com o app rodando no seu dev server (só loopback), use `node tools/layers-snapshot-cli.mjs <url-do-app> <pasta>/layers/mock.html [--viewport 1280x760] [--wait 2500] [--state <nome>]`: um Chromium headless separado abre o app, roda o mesmo `tools/layers-snapshot.js` e grava o mock; depois use "Reanalisar do 0" no Layers. Sem o CLI, cole `tools/layers-snapshot.js` no console do app rodando: baixa `mock.html` com o `<body>` atual + todo o CSS carregado inline, e sugere o `viewport`. Repita quando a UI mudar: se um `.ts`/`.js` citado em `data-src` for mais novo que o mock, o Layers avisa na carga ("Mock mais antigo que a fonte") e oferece "Reanalisar do 0", que guarda o layout atual em `.design-history/layout-<carimbo>/` antes de reler. Reler só traz a UI nova depois de regenerar o mock. Para projetos com `states`, `--state <nome>` abre `<url-do-app>/gallery.html#/<nome>` (a gallery do app, uma rota de hash por estado; um caminho sem barra final recebe a barra, `/app` vira `/app/gallery.html`) em vez da página inicial, e uma resposta de erro HTTP da gallery aborta sem gravar (um fallback SPA que responde 200 não é detectado), e `--url <url-do-app>` é a forma com flag do primeiro argumento; grave cada estado no arquivo que o `states` aponta (ex.: `layers/mock.csv.html`). O nome do estado aceita letras, dígitos, `.`, `_` e `-`.
