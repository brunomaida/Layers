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

- Cobertura: 4 de 7 entradas autorais que resolvem no mock (57%), ou 4 de 14 contando as que
  não resolvem (29%). Falso-positivo nominal 1,75 por entrada aceita — mas **7 de 7 "extras"
  são superfície latente real** (um `<dialog>` do Axai e seis painéis `display:none` do
  MarketView que o manifesto não declara). Ruído: zero.
- Os quatro sinais de acessibilidade e a heurística de classe alternada não dispararam nenhuma
  vez nos quatro projetos — nenhum mock usa `aria-*`, `popovertarget`, `role=tab` ou classe de
  estado.
- Manifesto derivado acerta 7 de 12 campos; só MarketView fecha os três. "O HTML com mais
  elementos ganha" erra Axai (escolhe um relatório em `docs/`) e Results (escolhe uma tabela
  de dados).
- Achado fora da pergunta: 7 das 8 entradas de `interactions` do Traval **não resolvem** no
  mock que o próprio projeto carrega. O arquivo é o mock autoral (recriação v2.19–v2.23), com
  384 estilos inline, `data-name`/`data-src` por nó e duas classes; as sete entradas foram
  escritas contra as classes do app real. A oitava, escrita por `data-name`, resolve. O menu
  ⚡ Interagir lista sete ações sem efeito.
- Segundo achado: o middleware `layers-fixtures-raw` do `vite.config.js` não roda no Vite
  8.2.2 — CSS de fixture volta como `text/javascript` (wrapper de HMR) e arquivo ausente volta
  como o `index.html` do editor em vez de 404. Isso quebra a resolução de origem em modo
  fixture e esconde o estado vazio "mock não encontrado" (B:25). Medido com `curl`, não
  corrigido aqui — é harness, não spike.
- Veredito: portão **não passa**; autoria manual do `interactions` segue sendo o caminho e o
  esforço vai para o checklist D, como o plano previa.

### Perf

- **measured** — travessia do `scan()` (`getBoundingClientRect` + `getComputedStyle` por nó),
  média de 5 passagens no Chrome 152: 0,1 ms para 80 nós (MarketView), 0,2 ms para 124 (Axai) e
  1,1 ms para 428 (Traval). ~2,6 µs/nó, linear → ~3,9 ms para 1.500 nós contra o orçamento
  `< 300 ms` de D:45, com 80× de folga. Piso, com cache de estilo quente: o `scan()` real paga
  um recálculo antes de ler. **Scan incremental não se justifica** por este número.
- **N/A** — o render do React depois do `scan()` não foi medido: na aba automatizada
  `document.visibilityState` é `hidden` e o Chrome estrangula `requestAnimationFrame` e timers,
  o que torna as duas leituras inúteis. Fica para o runbook manual com a aba em foco.
- Nenhuma linha de `index.html` mudou nesta branch — o spike mede, não entrega.
