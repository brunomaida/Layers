---
title: "Layers — Plano geral da Onda 3 (S7.3, S3.4, S4.8, S4.7, S3.3, S7.4)"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# Layers — Plano geral da Onda 3 (S7.3, S3.4, S4.8, S4.7, S3.3, S7.4)

Executar as leaves pendentes fora da S2.22 em duas faixas (desempenho e UX/docs), integrar em `develop` numa ordem que minimiza conflito e fechar o tracker uma vez só.

## Context

Onda 1 (S2.19, S4.5, S5.6, S6.2, S7.1) e Onda 2 (S5.7, S3.2, S4.6) estão em `develop`. Sobram as leaves abaixo; cinco levantamentos read-only (um por leaf, `develop@0da02d6`) deram as regiões de código, as colisões e as decisões em aberto.

| Leaf | Checklist | Estado | Tasks | Plano da leaf |
|---|---|---|---|---|
| S7.3 Matriz de suporte | G | **pronta** na branch `docs/261014-0-s7-3-support-matrix` (10 commits, relatório e tracker fechados), falta mesclar | 0 | existe na branch |
| S3.4 Fonte única de aparência | C | `registered`, decisão de produto aberta (D1) | 5 | a escrever |
| S4.8 Custo dos planos no orbit | D | `registered`, causa só inferida de 2 cenários; começa por diagnóstico | 6 | a escrever |
| S4.7 Árvore virtualizada | D | `registered`, ganho no orbit incerto (script total 7,7 ms) | 6 | a escrever |
| S3.3 Tooltips ação · atalho | C | `registered`, formato e escopo abertos (D2) | 5 | a escrever |
| S7.4 `docs/shortcuts.md` | G | `registered`, depende do registro de atalhos da S3.3 | 4 | a escrever |

Fora da Onda 3: S2.18 (verificação manual humana na pasta real), S8.1-S8.6 (fase nova, trilha MCP, Onda 4) e a parte WAVE da S2.22 (outro repo).

Estado a respeitar:
- Ids e branches seguem `fact-git-conventions`; toda branch nasce de uma leaf do roadmap (`docs/roadmap.md`), reservada no primeiro commit.
- Pontos de colisão garantidos mesmo com código disjunto: `docs/roadmap.md`, `docs/roadmap.data.json`, `docs/_index.md`, contador do `RELEASE-CHECKLIST.md` (linha 8), linhas 43-44 (C) e 51-52 (D) do checklist, `ARCHITECTURE.md:126`, bloco "Related" que `retrofit_docs.py` anexa ao `README.md` (reverter em toda branch).
- `index.html` é um arquivo só: o conflito é de âncora, não de região. Editar com âncoras únicas e contar matches antes de substituir.
- Visual congelado: nenhuma leaf muda cor, tipografia, espaçamento ou tamanho do dock/painéis; `menu-visual.spec.js` (`LAYERS_VISUAL=1`) com diff zero é gate de S3.3 e S3.4.

## Review Focus

- **Ordem S4.8 → S4.7:** as duas atacam o mesmo orçamento (`Orbit_Budget_Above50Fps`, `RELEASE-CHECKLIST.md:52`); a medição de uma suja a da outra. A que fechar o orçamento remove o `test.fail`.
- **S4.7 → S3.3:** os `title` da árvore (`index.html:2219-2224`, `:2250`, `:2254`) estão na região que a S4.7 reescreve. Sete specs usam `[data-node-id][title^="<nome>"]`: só se anexa sufixo ao título, o prefixo `n.name · L…` não muda.
- **S3.3 → S7.4:** a S7.4 só pode usar um guarda simples se a S3.3 mover `SHORTCUTS` para `lib/layers-core.js`; senão a S7.4 lê `index.html` por regex.
- **S3.4:** remover `theme`/`selectColor`/`originColors` de `data-props` faz o fallback `|| 'Dark'` (`index.html:1577`, `:2335`, `:2339`) virar default visível: regressão silenciosa de Grafite para Dark.
- **S4.7:** `revealInTree` (`:1821`) usa `querySelector`, quebra com linha desmontada; `folder-helpers.js:49` e 7 specs com `[data-node-id]` mudam de semântica.

## Design: Architecture & Flows

Três faixas partem de `develop`; a integração é serial, com gate humano a cada merge.

```
                          develop @ 0da02d6
   ┌───────────────────┬─────────────────────────┬────────────────────────────┐
   │ Faixa 0           │ Faixa A (desempenho)    │ Faixa B (UX e docs)        │
   │ S7.3 só merge     │ S4.8 diagnóstico + fix  │ S3.4 aparência (paralela)  │
   │                   │   │                     │                            │
   │                   │   ▼ (mede sobre develop)│ S3.3 tooltips + registro   │
   │                   │ S4.7 árvore             │   (depois da S4.7)         │
   │                   │                         │   │                        │
   │                   │                         │   ▼                        │
   │                   │                         │ S7.4 shortcuts.md          │
   └─────────┬─────────┴────────────┬────────────┴─────────────┬──────────────┘
             ▼                      ▼                          ▼
        merge serial em develop (gate humano a cada um)
        rebase + rebuild de roadmap.data.json antes de cada merge
                                    │
                                    ▼
                  recontagem única do checklist (Task G)
```

Ordem de merge e motivo:

| # | Leaf | Por quê nesta posição |
|---|---|---|
| 1 | S7.3 | Pronta; resolve cedo as linhas de README, checklist, `_index.md` e roadmap que S7.4 também edita |
| 2 | S3.4 | Sem sobreposição de código com a árvore e os planos; só `RELEASE-CHECKLIST.md:44`; zero diff visual (baselines geradas na `develop`, não regeneradas) |
| 3 | S4.8 | Diagnóstico não mexe em `index.html`; o fix é em `Plane`/`scene()`, longe da árvore |
| 4 | S4.7 | Mede sobre a `develop` já com o resultado da S4.8; a árvore libera a região para a S3.3 |
| 5 | S3.3 | Edita `title` da árvore já virtualizada e move `SHORTCUTS` para o core |
| 6 | S7.4 | Só consome o registro da S3.3; doc novo, sem código |

Regiões por par (resolução esperada):

| Par | Região | Tratamento |
|---|---|---|
| S4.8 × S4.7 | `e2e/perf.spec.js` (`EXPECTED`, `test.fail` 146-153), checklist `:52`, `ARCHITECTURE.md:126` | Serializar: S4.8 primeiro; a S4.7 rebaseia e mede de novo |
| S4.7 × S3.3 | título/estrutura da linha da árvore `:2214-2230`, template `:273-283` | S3.3 depois da S4.7; só strings de `title`, prefixo preservado |
| S3.3 × S3.4 | trigger do menu Aparência `:92` vs `:95`, `:102` | Sem hunk em comum: a S3.3 não edita `:92` (revisão do plano da S3.3); a S3.4 não toca `data-menu="apar"` nem o prefixo `Aparência · Fonte` |
| S4.8 × S4.7 (V1) | `pointer-events:none` nos planos durante o drag zera o `hoverId`, premissa do memo da S4.7 | Se a V1 entrar, a S4.7 refaz o gate da Task 1 depois do rebase, não só a medição final |
| S3.3 × S7.4 | `SHORTCUTS` `:828-836` | S7.4 depois; guarda lê o registro do core |
| S7.3 × S7.4 | README (Estrutura), checklist `:85-88`, `_index.md` | S7.3 mescla antes; S7.4 rebaseia |
| S4.8 × S3.4 | `scene()` `:2106` lê `s.wire`/`wireAlpha` | S4.8 não mexe em `:2106` |

## Implementation Outline

Passos de orquestração, expandidos em tasks abaixo:
- **A. Pré-voo** — escrever os planos das 5 leaves, resolver as decisões D1-D5, `npm ci`.
- **B. Executar S3.4 e S4.8** — em paralelo, branch verde local.
- **C. Executar S4.7** — código em paralelo; medição final depois do merge da S4.8.
- **D. Executar S3.3, depois S7.4** — serial atrás da S4.7.
- **E. Integração serial** — S7.3 e as 5 leaves, na ordem acima.
- **F. Fechamento** — limpeza e tracker.

### Task A: Pré-voo

0. **Mesclar primeiro a branch `docs/261016-0-wave-3-plan` em `develop`** (PR, gate humano). Pré-condição de todas as leaves: os planos já estão em `develop`; nenhuma leaf copia arquivo de plano por `git checkout <ref> -- docs/...` nem por cherry-pick (evita add/add e `docs/_index.md` divergente). Cada leaf trabalha em worktree próprio: `git fetch origin && git worktree add .claude/worktrees/<leaf> -b <branch> origin/develop`, depois `npm ci`. Tipo de branch: `feature/` (`perf/` não existe em `fact-git-conventions`), `refactor/` na S3.4, `docs/` na S7.4. → verificar: `git ls-tree develop docs/superpowers/plans/` lista o plano geral e os cinco planos.
1. Resolver D1-D8 (callouts abaixo) com o usuário. → verificar: cada callout com resposta registrada neste plano.
2. Escrever os 5 planos de leaf (`docs/superpowers/plans/2026-10-16-<leaf>.md`), a partir dos esboços da seção "Esboço por leaf", e passar `plan-concision-review`. → verificar: cada plano com Tasks, Review Focus e `## Model Routing`.
3. Revisão adversarial dos 5 planos no Architect (`adversarial-reviewer`, somente leitura). → verificar: findings registrados; plano ajustado ou finding descartado com motivo.
4. Regra do contador: **nenhuma leaf edita a linha 8 do checklist**; a Task E recontou uma vez com `grep -c`.
5. `npm ci` e baseline visual em `develop` (`LAYERS_VISUAL=1 npx playwright test e2e/menu-visual.spec.js`) antes de editar `index.html`. → verificar: `npm test` verde; baselines geradas.

### Task B: S3.4 e S4.8 em paralelo

Reservar a leaf de cada uma como 1º commit (roadmap + config + rebuild), depois seguir o plano da leaf em worktree próprio. S4.8 Task 1 (diagnóstico) é go/no-go e não altera `index.html`. → verificar: `npm test` verde; S4.8 entrega tabela de medianas (3 runs limpas) antes de qualquer fix.

### Task C: S4.7

Código e testes em worktree próprio; Task 1 (medir o teto com a árvore recolhida) é go/no-go. A medição final roda sobre `develop` depois do merge da S4.8. → verificar: `npm test`; `npx playwright test e2e/virtual-tree.spec.js e2e/tree-snapshot.spec.js`; 3 runs limpas de `orbit/traval/mean-frame-ms`.

### Task D: S3.3 e S7.4

S3.3 sobre a `develop` com S4.7 mesclada; S7.4 sobre a `develop` com S3.3 mesclada. → verificar: `npm test`; `LAYERS_VISUAL=1` com diff zero; guarda de atalhos verde.

### Task E: Integração serial

Para cada leaf, na ordem acima, depois que o usuário autoriza o merge dela:
1. `phase-close-gate` da leaf (status `done`, colunas plano/changelog do roadmap, fragmento com `### Perf`).
2. `git rebase develop`, rebuild de `docs/roadmap.data.json`, regenerar `_index.md`, reverter o `README.md` tocado pelo retrofit.
3. `pr-precheck`, depois `superpowers:finishing-a-development-branch`: PR ou merge só com resposta explícita; nunca push em `develop`.
4. Depois do último merge: recontar o contador do checklist (`grep -c` por estado) numa única edição e atualizar `ARCHITECTURE.md` se algum fragmento ficou para trás. → verificar: `npm test` verde e contagem batendo.

### Task F: Fechamento

`post-merge-close` (uma confirmação da lista completa): branches remotas e locais, worktrees, prune, tracker. → verificar: `git branch -a` sem as branches da onda e `roadmap_fresh.py` = `fresh`.

## Esboço por leaf

**S3.4 (opção A, se D1 = A)** — 5 tasks: (1) dump de `getComputedStyle(documentElement)` das variáveis `--*` para os 7 `THEMES` × accent × origem × seleção, gravado antes; (2) `APPEARANCE_DEFAULTS` alimenta `applyTheme`, `opts`, `cfgVals`, `sanitizeUi`; grep sem `'Dark'` nem `|| 85` fora da constante; (3) remover as 6 props de `data-props` e o código morto (`logoGrad`, `DEFAULT_GRAD`, `randGrad`; `ph` fica, ver D1); (4) Vitest `ResolveAppearance_*` e `SanitizeUi_*` se a resolução for ao core; (5) docs (`LOCAL-SETUP.md:94-107`, `ARCHITECTURE.md:74`, nova entrada em `architecture-decisions.md` superando `:130`, checklist `:44`).

**S4.8** — 6 tasks: (1) `planeCensus.empty` e helper de override de CSS em `e2e/perf-helpers.js`, cenários V1-V4 em `e2e/perf.spec.js` (`pointer-events:none`, `will-change:auto`, ocultar planos sem pintura, ocultar 1 a cada 2), 3 runs limpas; (2) fix escolhido pelo resultado (`Plane` `:909/:912`, predicado `:2122`); (3) Vitest do predicado se for ao core; (4) E2E `Culling_DragEmptyPlanes_HiddenOnlyWhenNoPaint`; (5) perf final e `test.fail` (`perf.spec.js:151`); (6) docs.

**S4.7** — 6 tasks: (1) medir o teto (árvore recolhida e cenário de 1.500 tags); (2) avaliar memo de `treeRows`/`elemRows` e não calcular a aba inativa antes da janela; (3) `LayersCore.treeWindow` + Vitest; (4) ligar no template e em `render()`, `revealInTree` por índice; (5) `e2e/virtual-tree.spec.js` e ajuste de `selectLayer` e dos 7 seletores crus; (6) medir depois e fechar docs.

**S3.3** — 5 tasks: (1) registro `ACTIONS`/`SHORTCUTS`/`tooltip(id)` em `lib/layers-core.js` com Vitest; (2) handler `onKey` (`:1614-1616`) derivado do registro, adiciona `M` e `=`; (3) migrar `navBtns` e os títulos existentes para `tooltip(id)`; (4) preencher lacunas do dock e da árvore (Ações ▾, ↑ Pai, Isolar, Fechar, chevrons, chips PgUp/PgDn) com sufixo no `title` da linha; (5) gate visual (`LAYERS_VISUAL=1`), changelog, checklist `:43`.

**S7.4** — 4 tasks: (1) guarda `test/shortcuts.test.js` primeiro (vermelha); (2) `docs/shortcuts.md` (7 tabelas = `SHORTCUTS` + seção de contextos: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação, menus); (3) links (README, checklist `:88` e `:85`, fragmento); (4) `phase-close-gate`.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| A.1, A.2, A.4 decisões e planos de leaf | gen | Architectural | Architect | prosa de plano nunca é Executor |
| A.3 revisão dos 5 planos | review | Architectural | Architect | verifier ≥ generator, via `adversarial-reviewer` |
| A.5 `npm ci` | gen | Mechanical | Executor | comando + resumo, caller valida `exit_code` |
| S3.4, S4.8, S4.7, S3.3, S7.4 implementação | gen | Standard | Workhorse | código e testes com julgamento |
| S4.8 e S4.7 review do caminho quente (`scene`/`Plane`/árvore) | review | Architectural | Architect | hot path, regra 5 |
| S3.4 review do fallback de tema e do dump visual | review | Architectural | Architect | regressão visual silenciosa |
| E.1-E.3 gates e rebase | gen | Standard | Workhorse | julgamento de conflito |
| E.4 recontagem do contador | gen | Mechanical | Executor | `grep -c` + edição de uma linha, caller valida |
| F limpeza | gen | Mechanical | Executor | comandos git; exige a confirmação do usuário antes |

Executor: A.5, E.4 e F, sempre com formato, tokens de recusa e validação pelo caller.

> [!DECISION] D1 — S3.4: o que significa "fonte única"
> - **Opção A (recomendada)**: o código vira dono dos defaults (`APPEARANCE_DEFAULTS`); `data-props` perde `theme`, `accent`, `selectColor`, `originColors`, `sliderScale`, `panelHeader` e mantém `fixture`, `histMax`. Zero mudança visual se os defaults forem copiados exatamente. Perde a capacidade de mudar `accent` e `sliderScale` pelo host de design.
> - **Opção B**: A, mais controles novos para `accent` e `sliderScale` no menu Aparência. Muda o popover (viola visual congelado) e cria chave nova em `layers/v1/ui`.
> - **Opção C**: só consolidar duplicações internas e manter `data-props`. Não cumpre o texto do checklist ("tweaks do host saem").
> `panelHeader` **não** é código morto: `ph` (`index.html:2293`) escolhe entre três cabeçalhos do painel direito (`phA/phB/phC`, `:393/:458/:528`); só `hs` (`hdrA/B/C`) é fixo. Remover `ph` mudaria o painel de quem tem A ou C salvo, e o gate de pixels não vê isso (só renderiza com projeto). O plano da S3.4 mantém `ph` e `panelHeader` vivos (zero mudança visual); `bmAlpha: 15` entra na constante.

> [!DECISION] D2 — S3.3: formato e escopo dos tooltips
> - **Escopo aplicado no plano da S3.3**: Opção A (botões sem texto visível, mais os com tecla) **mais** o wrapper de "Ações ▾" (hoje herda o `title` "Recolher / expandir"). Ficam sem sufixo de tecla: "Todas", chips `L0…Ln`, "↑ Pai" e a linha da árvore (mantêm o título atual). Isto sobrescreve a lista de lacunas do esboço da S3.3.
> - **Formato**: literal "Ação · atalho" (como diz o checklist, regrava ~25 títulos) ou manter "Ação (K)" já usado e corrigir o texto do checklist (recomendado).
> - **Escopo**: só controles com atalho, ou todo botão de ação sem texto visível, inclusive os sem tecla, só com o nome (recomendado).
> - **Registro no core**: mover `SHORTCUTS` para `lib/layers-core.js` (recomendado; fecha a divergência do `M` e dá fonte única à S7.4) ou só ajustar strings (S7.4 passa a ler `index.html` por regex).

> [!DECISION] D3 — S4.7: janela completa ou memo
> Decidir depois da Task 1 (medição do teto, também com a V1 da S4.8 simulada): se o ganho do limite superior for < 10 % do frame, **parar e voltar ao usuário** para escolher entre (a) memo da reconstrução de `treeRows`/`elemRows` e não calcular a aba inativa, mais simples; (b) janela completa com espaçadores, linhas de código de altura variável e `revealInTree` por índice. Recomendação: tentar (a) primeiro. Não adicionar navegação por setas na árvore (colide com S3.3/S7.4).

> [!DECISION] D4 — S4.8: comportamento durante o drag
> V1 (`pointer-events:none` nos planos durante o drag) elimina o hit-test, e a única mudança real é o hover de plano sumir durante o arrasto (soltar já não seleciona hoje: `H.click` retorna em `this.dragged`, `:1560`). Aceitável? Se nenhuma variante barata fechar o orçamento de 50 fps, escolher entre aceitar ~42 fps com `test.fail` ou abrir uma leaf nova de "agrupamento de folhas" (mudança estrutural do DOM e do hit-test).

> [!DECISION] D5 — S7.4: cobertura e lacunas de `SHORTCUTS`
> Adicionar as linhas `M` (medir), `=` (alias de zoom) e o Esc completo à tabela `SHORTCUTS` (fonte única, 1-3 linhas em `index.html:829-835`). Cobrir também alt+clique, ⚡ Interagir e a ação `attr` em `shortcuts.md`, ou só linkar `docs/layers-json.md` (recomendado, sem duplicar). A doc deve dizer Ctrl/Cmd, já que `Meta` vale como Ctrl (`:1611`, `:1617`).

> [!DECISION] D6 — trailer dos commits
> O histórico da `develop` está dividido: os 37 commits da S2.22b-e levam `Claude-Session:`; da S2.22a para trás, S4.6 e S3.2 não levam. Os planos S3.2, S4.6 e S5.7 proíbem o trailer; o `CLAUDE.md` do projeto e o global proíbem atribuição a IA. **Recomendado: sem trailer** em todos os commits e PRs da Onda 3 (os planos não escrevem trailer nos comandos). Se você quiser manter a URL da sessão, diga e reverto a regra.

> [!DECISION] D7 — S4.7: foco durante a rolagem
> Se a janela for construída, a Option A congela a faixa montada enquanto houver foco dentro do contêiner (textarea ou botão de linha) e atualiza ao sair. Efeito visível: durante a rolagem com foco, a área fora da faixa fica vazia até o blur. Aceitar explicitamente, ou escolher blur automático ao mover a janela.

> [!DECISION] D8 — Esc no campo de propriedade
> `SHORTCUTS` diz "Esc (no campo): descartar a edição" (`index.html:833`), mas `index.html:2173` chama `delBuf(k)` e depois `blur()`, e o `onBlur` (`commit`) pode aplicar o valor. A S3.3 faz a checagem no navegador; se o valor for aplicado, corrigir o runtime ou o texto da linha, e a S7.4 não escreve "descarta". Quem corrige: leaf nova de runtime ou ajuste dentro da S3.3?

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — leaves independentes já rastreadas pelo roadmap; sem issue guarda-chuva nova (a #62 continua da S2.22).

> [!DECISION] phase-intake
> Classification: **macro** novo não; as 5 leaves ficam sob suas fases (`S3`, `S4`, `S7`), alvo **Unreleased**.
> Current tree (relevant slice): Unreleased › S3 (S3.3, S3.4 `registered`) · S4 (S4.7, S4.8 `registered`) · S7 (S7.3 pronta, S7.4 `registered`).
> Fork of an existing row? **No**.
> - **Option A**: manter as leaves nas fases atuais, sem fase "Onda 3" no tracker (recomendada; as ondas são só orquestração)
> - **Option B**: criar um macro "Onda 3" no tracker agrupando as 6

> [!DECISION] execution
> Method: **Subagent-driven** (planos de leaf primeiro; implementação em worktrees paralelos para S3.4 e S4.8, S4.7 em seguida, S3.3 e S7.4 em série).
