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

A fixture `results` ficou fora: não tem `layers/mock.html` (só o README), e o que mediu 671 nós
foi o **próprio `index.html` do editor**, servido pelo fallback do Vite no lugar de um 404.
Ver §9 — é um bug do harness, não um dado.

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
| Axai | 3 | HTML estático | ❌ | ❌ | ❌ |
| MarketView | 1 | HTML único com `<style>` inline | ✅ | ✅ | ✅ |
| Results | 74 | HTML estático | ❌ | ❌ | ❌ |

A heurística "o HTML com mais elementos ganha" é a culpada dos dois ❌ completos: no Axai
escolheu um relatório em `docs/superpowers/reports/` (752 elementos) em vez de
`src/Axai.Api/wwwroot/index.html` (175, o candidato nº 2, com o `base` autoral); no Results
escolheu uma tabela de dados (1.243 elementos) em vez do `layers/mock.html` que o manifesto
pede — e que a pasta real ainda não tem. Acerto: **7 de 12 campos**, e só MarketView fecha
os três.

Classificação HTML estático × shell de app funcionou onde foi testada: o `index.html` do Traval
aparece como `1 el · shell` na lista de candidatos, exatamente como o loader o classifica em
runtime.

## 7. Custo do re-scan por ação

`act()` chama `forceUpdate()` + `scanSoon()`, e o `scan()` percorre a árvore chamando
`getBoundingClientRect` e `getComputedStyle` por nó.

| Mock | Nós | Travessia + `getComputedStyle` |
|---|---:|---:|
| MarketView | 80 | 0,1 ms |
| Axai | 124 | 0,2 ms |
| Traval | 428 | 1,1 ms |

Média de 5 passagens por medição, Chrome 152. É um **piso, com cache de estilo quente**: o
`scan()` real vem depois de uma mutação no DOM e paga o recálculo de estilo antes de ler. Linear
em nós: ~2,6 µs/nó → **~3,9 ms para 1.500 nós**, contra o orçamento de `< 300 ms` de D:45. Há
80× de folga; **scan incremental não se justifica por este número** nem com um recálculo
completo no caminho.

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

## 9. Terceiro achado: o middleware de fixtures não roda no Vite 8.2.2

Medido com `curl` no dev server desta sessão:

| Pedido | Esperado pelo `vite.config.js` | Obtido |
|---|---|---|
| `/fixtures/traval/src/styles/layout.css` | 200 `text/css`, 6.610 bytes | 200 **`text/javascript`**, wrapper de HMR (`import { createHotContext } …`) |
| `/fixtures/traval/nao-existe.css` | 404 | 200 `text/html` |
| `/fixtures/results/layers/mock.html` | 404 | 200 `text/html`, 271.349 bytes — o `index.html` do editor |

O plugin `layers-fixtures-raw` existe exatamente para isto e o comentário dele descreve os dois
sintomas. Sob Vite 8.2.2 o `server.middlewares.use()` registrado dentro de `configureServer`
deixou de rodar antes do pipeline interno, então o transform de CSS e o fallback de SPA vencem.

Consequências, em ordem de gravidade:

1. **O modo fixture entrega CSS embrulhado em JavaScript.** O índice por AST parseia o wrapper,
   não a folha: resolução de origem (`data-src`) a partir de fixture está quebrada agora. As
   contagens de elemento e camada não passam por CSS, e por isso as verificações das fatias
   anteriores (414 elementos · 11 camadas) continuam de pé — mas qualquer número de **regras**
   medido em fixture desde a subida do Vite 8 é suspeito.
2. **Arquivo ausente devolve o editor.** O estado vazio "mock não encontrado" (B:25) não
   aparece em modo fixture: o loader recebe 200 e renderiza o LAYERS dentro do LAYERS. Foi
   assim que a fixture `results`, que não tem mock, mediu 671 nós nesta sessão.
3. A fixture `results` segue **sem** `layers/mock.html` — pendência de snapshot já conhecida,
   agora com o efeito acima escondendo-a.

Não corrigido aqui: está fora do escopo da fatia 5 e a correção é de harness, não de spike.
Entra no checklist E como item próprio.
