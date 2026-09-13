---
type: report
status: active
solution: Layers
---

# Spike — superfícies latentes e manifesto derivado (fatia 5)

Pergunta do plano: **quanto de um `layers.json › interactions` um scanner acha sozinho, e
quanto lixo ele traz junto?** Portão declarado: vira produto se a sugestão cobrir **≥ 60%**
das entradas autorais com **≤ 1 falso-positivo por entrada aceita**; abaixo disso, o esforço
vai para o checklist D.

Construído e descartável: [`tools/layers-suggest.js`](../../../tools/layers-suggest.js)
(console do editor, lê o mock no shadow root) e
[`tools/layers-derive.js`](../../../tools/layers-derive.js) (Node, varre a pasta do projeto).
Nada mudou no `index.html` — o spike mede, não entrega.

## 1. Cobertura por projeto

Entrada autoral = folha de `groups[].items[]` (`toggle`/`class`/`show`/`hide`/`click`) mais o
`show` da superfície. Separadores não contam. "Coberta" = alguma sugestão resolve para o mesmo
conjunto de elementos, ou para um subconjunto dele.

| Fixture | Nós no mock | Autorais | Resolvem no mock | Sugeridas | Cobertas | Extras |
|---|---:|---:|---:|---:|---:|---:|
| Traval | 428 | 8 | **1** | 0 | 0 | 0 |
| Axai | 124 | 4 | 4 | 5 | **4 (100%)** | 1 |
| MarketView | 80 | 2 | 2 | 6 | 0 | 6 |
| **Pool** | — | **14** | **7** | **11** | **4** | **7** |

A fixture `results` ficou fora porque **não tem** `layers/mock.html` — só o README. Num dev
server recém-iniciado o loader diz exatamente isso (`Mock não encontrado.` · `0 camadas · 0
elementos`, medido). A leitura de 671 nós que apareceu antes veio de um dev server obsoleto que
entregava o `index.html` do editor em vez de 404; ver §9.

Duas contas, porque o denominador muda a resposta:

- sobre as entradas que **resolvem** no mock: `4 / 7` = **57%** — abaixo do corte de 60%.
- sobre **todas** as entradas autorais: `4 / 14` = **29%**.
- falso-positivo por entrada aceita: `7 / 4` = **1,75** — acima do limite de 1.

## 2. Por sinal

| Sinal | Sugeridas | Casaram com o autoral | Extras |
|---|---:|---:|---:|
| `<dialog>` | 3 | 2 | 1 |
| `[hidden]` | 2 | 2 | 0 |
| `display:none` computado | 6 | 0 | 6 |
| `aria-controls` / `aria-expanded` / `popovertarget` / `role=tab` | 0 | 0 | 0 |
| classe alternada (`.active`, `.is-open`, …) | 0 | 0 | 0 |

Os quatro sinais de acessibilidade e a heurística de classe **não dispararam nenhuma vez** nos
quatro projetos: nenhum mock usa `aria-controls`, `aria-expanded`, `popovertarget` ou
`role=tab`, e nenhum carrega classe de estado. A heurística ruidosa, que era o risco previsto,
não teve chance de errar.

## 3. Os 7 "extras", inspecionados um por um

O portão os chama de falso-positivo. A leitura diz outra coisa:

| Extra | Onde | O que é |
|---|---|---|
| `#new-dialog` | Axai | `<dialog>` real de criação, que o manifesto não declara |
| `#viewPill`, `#c3d`, `#hud3d`, `#depthbar`, `#presexit`, `#legend3d` | MarketView | seis painéis com `display:none` — pelos ids, HUD 3D, legenda, barra de profundidade e saída de apresentação (rótulos inferidos do id, não inspecionados) |

Nenhum é ruído: **7 de 7 apontam superfície latente de verdade**. São lacunas do manifesto, não
erro do scanner. A precisão prática dos sinais precisos é 100%; o que o número do portão mede
é desalinhamento de vocabulário, não imprecisão.

## 4. As 2 "perdidas" do MarketView

`#left` e `#right` resolvem, existem e são **visíveis**. O autor os declarou para poder
*esconder*; o scanner só enxerga o que está escondido. Recall contra o manifesto autoral é
estruturalmente limitado por isso: autor e scanner falam de conjuntos diferentes.

## 5. Achado fora da pergunta: 7 das 8 entradas do Traval estão mortas

`C:\Development\Traval\layers.json` declara oito folhas. Sete são seletores de classe —
`.global-summary`, `.gs-body`, `.gs-chart-chip svg`, `.tab` (+classe `active`),
`.equity-sparkline--tab-summary, .tile-row`, `.instrument-block`, `.position-table` — e
**nenhuma resolve** no mock que o projeto carrega. A oitava,
`[data-name="canvas (lightweight-charts) pane 1"]`, resolve: é a única escrita no vocabulário
que o mock realmente usa.

O motivo não é snapshot. O arquivo se identifica no cabeçalho como
`Mock estático do Traval para o LAYERS (derivado da recriação v2.19–v2.23)`: é o **mock
autoral**, com 384 estilos inline, `data-name`/`data-src` em cada nó e duas classes no total
(`__layers-root`, `eq-zero`). As sete entradas foram escritas contra as classes do **app real**,
que o mock não reproduz — manifesto e mock descrevem o mesmo projeto em vocabulários
diferentes.

O menu ⚡ Interagir lista as 8 ações, sete delas com estado `null` e sem efeito ao clicar. Isto
é mais grave que o resultado do spike e não depende dele — entra como item do checklist.

## 6. Manifesto derivado da pasta

`tools/layers-derive.js` nas quatro pastas reais, comparando campo a campo com o `layers.json`
autoral:

| Projeto | HTMLs | Classificação | `base` | `mock` | `styles` |
|---|---:|---|:--:|:--:|:--:|
| Traval | 7 | HTML estático | ✅ | ✅ | ❌ (5 folhas vs 4 — incluiu `src/styles/base.css`) |
| Axai | 3 | HTML único com `<style>` inline | ❌ | ❌ | ⚪ vazio == vazio |
| MarketView | 1 | HTML único com `<style>` inline | ✅ | ✅ | ✅ |
| Results | 74 | HTML estático | ❌ | ❌ | ⚪ vazio == vazio |

Acerto: **5 de 12 campos** com conteúdo, mais dois empates triviais entre listas vazias (⚪) que
não provam nada. Só MarketView fecha os três de verdade.

A heurística "o HTML com mais elementos ganha" é a culpada dos dois projetos errados: no Axai
escolheu um relatório em `docs/superpowers/reports/` (752 elementos) em vez de
`src/Axai.Api/wwwroot/index.html` (175, o candidato nº 2, com o `base` autoral); no Results
escolheu uma tabela de dados (1.243 elementos) em vez do `layers/mock.html` que o manifesto pede
— e que a pasta real ainda não tem. "Índice na raiz, ou o mais raso" resolveria os dois, e é uma
linha de código; não foi mudado aqui porque o portão já decidiu não seguir com o produto.

Classificação HTML estático × shell de app funcionou onde foi testada: o `index.html` do Traval
aparece como `1 el · shell` na lista de candidatos, exatamente como o loader o classifica em
runtime.

## 7. Custo do re-scan por ação

`act()` chama `forceUpdate()` + `scanSoon()`, e o `scan()` percorre a árvore chamando
`getBoundingClientRect` e `getComputedStyle` por nó.

| Mock | Nós | Travessia + `getComputedStyle` (mediana de 5) |
|---|---:|---:|
| MarketView | 80 | 0,9 ms |
| Axai | 124 | 0,6 ms |
| Traval | 428 | 1,1 ms (passagens 0,9 · 1,0 · 1,1 · 1,3 · 1,3) |

Chrome 152. Cada passagem **invalida o estilo antes de medir** (escreve uma custom property na
raiz do mock), porque o `scan()` real vem depois de uma mutação no DOM; a primeira versão desta
medição lia cache quente em quatro das cinco passagens e diluía a fria na média.

Com o recálculo no caminho a curva não é linear em nós — o custo fixo da invalidação domina em
árvore pequena, e é por isso que 80 nós (0,9 ms) custam quase o mesmo que 428 (1,1 ms).
Extrapolando pela pior das três (2,6 µs/nó do Traval): **~3,9 ms para 1.500 nós**, contra o
orçamento de `< 300 ms` de D:45. Há duas ordens de grandeza de folga; **scan incremental não se
justifica por este número**.

Não medido: o render do React que vem depois do `scan()`. Tentei via `requestAnimationFrame` e
atraso de event loop, e as duas leituras são inúteis na aba automatizada —
`document.visibilityState === 'hidden'` faz o Chrome estrangular timers e quadros. Fica para o
runbook manual, com a aba em foco.

## 8. Veredito do portão

**Não passa** — e por um motivo que o portão não previa.

```
cobertura  4/7 entradas que resolvem = 57%   <  60%   falha
           4/14 entradas autorais    = 29%   <  60%   falha
precisao   7 extras / 4 aceitas      = 1,75  >  1     falha pela letra
           7 de 7 extras sao superficie real = 0 ruido   passa pela leitura
```

Decisão: **não virar produto agora**. O scanner encontra superfície latente com precisão de
100% nos sinais precisos, mas descobrir latência não é o mesmo que reproduzir o manifesto
autoral — metade das entradas autorais é superfície visível que o autor quer poder esconder, e
no Traval o manifesto fala de classes que o mock autoral não tem (§5). Autoria manual do
`interactions` continua o caminho declarado, como o plano previa.

O que sobrevive do spike, na ordem:

1. **Entradas mortas no manifesto** (§5) — vira item de checklist: o loader deve avisar quando
   um seletor de `interactions` não resolve no mock, em vez de listar ação que não faz nada.
2. **Lacunas do manifesto** (§3) — os 7 extras são uma lista de trabalho para o autor dos
   manifestos do Traval/Axai/MarketView, não código.
3. **Travessia medida** (§7) — fecha a dúvida de scan incremental e alimenta D:45.
4. **`base`/`mock` derivados** (§6) — MarketView e Traval saem de graça; "maior HTML ganha"
   precisaria virar "índice na raiz, ou o mais raso", o que é uma linha, não um projeto.

Esforço segue para o **checklist D** (culling, cache de `getComputedStyle`, árvore
virtualizada), como o portão manda.

## 9. Terceiro achado: dev server obsoleto entrega fixture errada, calado

A primeira versão desta seção culpava o Vite 8 por uma regressão no
`server.middlewares.use()`. **Estava errada** — o review derrubou a hipótese subindo um server
novo com a mesma `vite.config.js`. Medido, lado a lado:

| Pedido | Server iniciado hoje (`npm run dev`) | Server da porta 5180, iniciado em 12/09 20:53 |
|---|---|---|
| `/fixtures/traval/src/styles/layout.css` | 200 `text/css`, 6.610 bytes | 200 `text/javascript` (wrapper de HMR) |
| `/fixtures/traval/nao-existe.css` | 404 `not found: …` | 200 `text/html` |
| `/fixtures/results/layers/mock.html` | 404 → painel diz `Mock não encontrado.` | 200 `text/html`, 271.349 bytes — o `index.html` do editor |

Vite instalado: **8.3.0**. O plugin `layers-fixtures-raw` funciona e o `vite.config.js` não tem
defeito. A causa é banal: o processo da 5180 subiu **antes** de o `vite.config.js` existir na
árvore de trabalho daquela sessão (o arquivo entrou em `61da7e6`), e um dev server não recarrega
a própria config — ele carrega os plugins uma vez, na partida.

O que isso invalidou, e o que não:

- **Invalidou** a linha `results` da tabela do §1: os 671 nós eram o editor lido como mock.
- **Não invalidou** as contagens de elemento e camada das fatias anteriores — não passam por CSS
  — nem o resultado do portão: remedi as três fixtures num server novo e a cobertura saiu
  idêntica (4 de 7).
- **Não existe** bug de harness para corrigir. O que existe é uma pegadinha de operação: server
  antigo serve fixture errada sem avisar. Virou nota em `docs/LOCAL-SETUP.md`, não item de
  release.

O `tools/layers-suggest.js` agora detecta o sintoma: se o `layers.json` não voltar como JSON,
ele avisa `dev server obsoleto? o fallback do Vite entrega index.html` em vez de medir zero
entradas autorais em silêncio.

## 10. Correções de método vindas do review

O review (`/code-review 7 high`, tier opus) achou quatro defeitos que enviesavam a própria
métrica. Todos corrigidos, e a medição refeita com as ferramentas corrigidas:

| Defeito | Efeito na métrica | Correção |
|---|---|---|
| cobertura usava **interseção** de conjuntos, não subconjunto como o texto dizia | uma sugestão larga tocando 1 de 40 elementos marcaria a entrada como coberta | `subset()` explícito; interseção agora só aparece como `tocadaPor`, informativo |
| `selFor` caía em **nome de tag puro** sem id/classe/`data-name` | `sel: 'div'` resolveria para todos os divs do mock e cobriria quase tudo | caminho estrutural com `:nth-child` |
| `pathOf` devolvia `'0'` para a raiz **e** para o primeiro filho | `sameSet`/`subset` confundiam raiz com filho — e é dessa aritmética que sai o portão |  prefixo `'0'` + índices, o mesmo esquema do `scan()` |
| `popovertarget` vazio lançava `SyntaxError` fora de try/catch | derrubava `collect()` e a medição inteira | guarda de id vazio, como o `aria-controls` já tinha |

Nenhum deles mudou o resultado **neste** conjunto de projetos — a cobertura remedida é a mesma
4 de 7 — mas os três primeiros aprovariam projeto que não deveria passar, e é por isso que
entram no registro. O `layers-derive.js` também foi corrigido: `styles` agora sai relativo a
`base`, como `docs/layers-json.md` manda; `href` do mock resolve na pasta do mock; `<link>` e
`<style>` em comentário não contam; e um HTML ilegível não derruba mais a varredura das outras
pastas.

