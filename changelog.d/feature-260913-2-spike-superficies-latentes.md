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
- Segundo achado, corrigido depois do review: **dev server obsoleto** entrega fixture errada
  calado. O Vite carrega plugins uma vez na partida, então um server que subiu antes de o
  `vite.config.js` existir serve `.css` de fixture como `text/javascript` e devolve o
  `index.html` do editor, com 200, para arquivo ausente. Num server novo (Vite 8.3.0) os três
  pedidos voltam certos — `text/css`, 404, e o painel dizendo `Mock não encontrado.`. Não há
  bug de config: virou nota em `docs/LOCAL-SETUP.md` com o `curl` de conferência, e o
  `layers-suggest.js` passou a avisar quando o manifesto não volta como JSON.
- Veredito: portão **não passa**; autoria manual do `interactions` segue sendo o caminho e o
  esforço vai para o checklist D, como o plano previa.

### Corrigido após review

- Quatro defeitos de método nas ferramentas do spike, achados pelo `/code-review` e todos com
  efeito na própria métrica: cobertura usava interseção de conjuntos em vez de subconjunto;
  `selFor` caía em nome de tag puro (um `div` sem id resolvia para todos os divs do mock);
  `pathOf` dava o mesmo id para a raiz e para o primeiro filho; `popovertarget` vazio lançava
  fora de try/catch e derrubava a medição. Remedido com as correções: cobertura **idêntica**
  (4 de 7) — nenhum deles mudou o resultado neste conjunto, mas os três primeiros aprovariam
  projeto que não deveria passar.
- `layers-derive.js`: `styles` agora sai relativo a `base` (contrato de `docs/layers-json.md`),
  `href` do mock resolve na pasta do mock, `<link>`/`<style>` dentro de comentário não contam, e
  um HTML ilegível não derruba mais a varredura das outras pastas.

### Perf

- **measured** — travessia do `scan()` (`getBoundingClientRect` + `getComputedStyle` por nó),
  mediana de 5 passagens no Chrome 152, **invalidando o estilo antes de cada passagem** (o
  `scan()` real vem depois de mutação no DOM): 0,9 ms para 80 nós (MarketView), 0,6 ms para 124
  (Axai) e 1,1 ms para 428 (Traval). Com o recálculo no caminho o custo fixo domina em árvore
  pequena; extrapolando pela pior das três (2,6 µs/nó), ~3,9 ms para 1.500 nós contra o
  orçamento `< 300 ms` de D:45 — duas ordens de grandeza de folga. **Scan incremental não se
  justifica** por este número.
- **N/A** — o render do React depois do `scan()` não foi medido: na aba automatizada
  `document.visibilityState` é `hidden` e o Chrome estrangula `requestAnimationFrame` e timers,
  o que torna as duas leituras inúteis. Fica para o runbook manual com a aba em foco.
- Nenhuma linha de `index.html` mudou nesta branch — o spike mede, não entrega.
