### Adicionado

- `tools/layers-suggest.js` — inventário de superfícies latentes, para colar no console do
  editor com um projeto carregado. Varre o mock no shadow root por `<dialog>`, `<details>`,
  `[hidden]`, `display:none` computado, `aria-controls`, `aria-expanded`, `popovertarget`,
  `role=tab` e classe alternada, sugere um `interactions[]` e compara com o que o autor
  escreveu no `layers.json`. Ferramenta de spike, descartável, fora do app.
- `tools/layers-derive.js` — deriva `base`, `mock` e `styles` varrendo a pasta do projeto e
  classifica HTML estático × shell de app; compara campo a campo com o manifesto autoral.
  Node, sem dependência nova.
- `docs/superpowers/reports/2026-09-13-spike-superficies-latentes.md` — a medição e o veredito
  do portão da fatia 5.

### Medido

- Cobertura: 4 de 6 entradas autorais que resolvem no mock (67%), ou 4 de 14 contando as que
  não resolvem (29%). Falso-positivo nominal 1,75 por entrada aceita — mas **7 de 7 "extras"
  são superfície latente real** (um `<dialog>` do Axai e seis painéis `display:none` do
  MarketView que o manifesto não declara). Ruído: zero.
- Os quatro sinais de acessibilidade e a heurística de classe alternada não dispararam nenhuma
  vez nos quatro projetos — nenhum mock usa `aria-*`, `popovertarget`, `role=tab` ou classe de
  estado.
- Manifesto derivado acerta 7 de 12 campos; só MarketView fecha os três. "O HTML com mais
  elementos ganha" erra Axai (escolhe um relatório em `docs/`) e Results (escolhe uma tabela
  de dados).
- Achado fora da pergunta: as 8 entradas de `interactions` do Traval **não resolvem** no mock
  que o próprio projeto carrega — o snapshot tem 384 estilos inline e duas classes. O menu
  ⚡ Interagir lista 8 ações que não fazem nada. Mesmo caso no Results.
- Veredito: portão **não passa**; autoria manual do `interactions` segue sendo o caminho e o
  esforço vai para o checklist D, como o plano previa.

### Perf

- **measured** — travessia do `scan()` (`getBoundingClientRect` + `getComputedStyle` por nó),
  média de 5 passagens no Chrome 152: 0,1 ms para 80 nós (MarketView), 0,2 ms para 124 (Axai),
  1,1 ms para 428 (Traval) e 1,3 ms para 671 (Results). ~2,5 µs/nó, linear → ~3,8 ms para 1.500
  nós contra o orçamento `< 300 ms` de D:45. **Scan incremental não se justifica** por este
  número.
- **N/A** — o render do React depois do `scan()` não foi medido: na aba automatizada
  `document.visibilityState` é `hidden` e o Chrome estrangula `requestAnimationFrame` e timers,
  o que torna as duas leituras inúteis. Fica para o runbook manual com a aba em foco.
- Nenhuma linha de `index.html` mudou nesta branch — o spike mede, não entrega.
