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
  "fonts": ["https://fonts.googleapis.com/css2?family=Inter&display=swap"],
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
| `fonts` | `[]` | URLs `https://fonts.googleapis.com/…` injetadas no documento (única origem externa aceita; `@font-face` não funciona dentro de shadow root) |
| `root` | — | `data-name` / `data-src` do elemento raiz (L0) |
| `rules` | `{}` | seletor CSS → `arquivo|regra|linha`; sobrescreve `data-src` (e `data-name`) dos elementos que casam |
| `interactions` | `[]` | itens do menu ⚡ Interagir (abaixo) |

## O que o loader faz com o mock

1. `DOMParser` → remove `script`, `link`, `iframe`, `object`, `embed`, `base`, `meta`, `noscript`, `template`, atributos `on*` e URLs `javascript:`. O mock é **estático**; interação vem de `interactions`.
2. `<style>` inline e as folhas de `styles` entram escopadas no shadow root com reescrita: `:root` → `:host`, `html`/`body` → raiz sintética, `* {` → descendentes da raiz.
3. Raiz (L0): se `<body>` tem um único filho, ele é a raiz; se tem vários (`<main>`, `<dialog>`, barras flutuantes…), um wrapper `body` é criado. `position:fixed` no mock fica contido no host (não escapa para o editor).
4. `data-src` ausente: heurística — para cada elemento, a primeira classe que abre uma regra top-level numa folha carregada vira `arquivo|seletor|linha` (e o nome, se não há `data-name`). `rules` sobrescreve. Sem folha carregada, o código mostrado é a síntese do `style` inline.
5. `data-name` ausente: primeira classe (`.toolbar`), depois `#id`, depois a tag.
6. Elementos com área zero (`display:none`, `hidden`, `<dialog>` fechado) não viram camadas; passam a existir quando uma ação de `interactions` os exibe.

## Modo fixture (dev)

Sem pasta conectada, `LAYERS vX.Y.dc.html#layers=<pasta-servida>/` (ou tweak `fixture`) lê `layers.json` por HTTP — usado nos testes de `fixtures/`.

## interactions

Cada item é uma linha da coluna esquerda do menu ⚡ Interagir; `groups[].items[]` são chips na direita.

- `{ "sep": "Título" }` — separador.
- `key`, `label`, `desc`.
- `show: seletor` — item-superfície: ganha 👁 que exibe/oculta os elementos que casam (`display:none`; `[hidden]` é removido ao exibir; `<dialog>` alterna o atributo `open`). Estado lido do estilo computado.
- Ações dos chips (uma por chip; estado ●/○ derivado do DOM): `toggle`, `show`, `hide` (seletor → `display`), `class: {selector, name}` (ou string = seletor com `active`), `click: seletor` (dispara `click()` nativo: checkbox, radio, `<details>`), `hint` (texto; sem ação = informativo).

Toda ação re-escaneia o mock.

## Snapshot de apps renderizados por JS

Apps que montam o DOM em runtime (React/Babel, TS via Vite) não têm HTML estático. Use `tools/layers-snapshot.js` no console do app rodando: baixa `mock.html` com o `<body>` atual + todo o CSS carregado inline, e sugere o `viewport`. Repita quando a UI mudar.
