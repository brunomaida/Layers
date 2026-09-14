### Adicionado

- 5 fixtures vendorizados de projetos públicos reais (MIT), um por extensão pedida —
  `student-dashboard` (.html), `plain-admin` (.css), `choices-js` (.js), `todomvc-react` (.jsx),
  `coffee-masters` (.ts) — cada um com `NOTICE.md` (repo, commit, licença, e decomposição de
  sublicenças quando o CSS vendorizado embute terceiros, como `plain-admin`/`todomvc-react`).
- `docs/RELEASE-CHECKLIST.md` (checklist E) atualizado com a lista dos 5 novos fixtures.

### Corrigido

- `todomvc-react` e `coffee-masters` trocaram `root` por `rules` no `layers.json`: os dois mocks
  têm `<body>` com dois filhos, e o loader só atribui `root.name`/`root.src` de forma limpa quando
  há um único filho — `rules` mira o elemento certo (`.todoapp`, `app-home`) em vez de rotular o
  wrapper sintético.

### Achado registrado

- `tools/layers-snapshot.js` não atravessa shadow roots abertos — `coffee-masters` (Custom
  Elements + `shadow: true`) exigiu piercing manual do shadow root de `<app-home>` pra capturar o
  mock; documentado em `fixtures/coffee-masters/NOTICE.md` com o caminho de código que causa o
  sintoma (`walk()` em `index.html:1259`), fora de escopo desta branch consertar a ferramenta.

### Perf

- **N/A** — cold path only (nenhum arquivo tocado está em `path-tiers.json`; o projeto não tem
  esse arquivo, todos os arquivos tratados como cold).
