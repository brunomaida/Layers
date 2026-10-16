---
title: "Layers — Plano geral da Onda 1 (S2.19, S4.5, S5.6, S6.2, S7.1)"
type: plan
solution: Layers
status: draft
created: 2026-10-14
---

# Layers — Plano geral da Onda 1 (S2.19, S4.5, S5.6, S6.2, S7.1)

Executar em paralelo as 5 leaves meso da Onda 1 a partir dos planos já escritos em `docs/superpowers/plans/`, integrar em `develop` numa ordem que minimiza conflito e fechar o tracker uma vez só.

## Context

A avaliação de paralelismo (investigação de regiões de código por leaf) separou as leaves abertas em duas ondas. Onda 1 = leaves com regiões de código disjuntas; Onda 2 (S5.7, S7.3, S3.2→S3.4, S4.6→S4.7→S3.3→S7.4) espera os merges da Onda 1. Cada leaf da Onda 1 já tem branch, worktree e plano commitados (2 commits, sem push, sem issue).

| Leaf | Checklist | Branch | Plano (`docs/superpowers/plans/`) | Tasks |
|---|---|---|---|---|
| S2.19 | B | `fix/261014-0-s2-19-dc-reserved-codes` | `2026-10-14-s2-19-dc-reserved-codes.md` | 4 |
| S5.6 | E | `feature/261014-0-s5-6-e2e-functional` | `2026-10-14-s5-6-e2e-functional.md` | 4 |
| S6.2 | F | `feature/261014-0-s6-2-write-log-hash` | `2026-10-14-s6-2-write-log-hash.md` | 3 |
| S4.5 | D | `feature/261014-0-s4-5-viewport-culling` | `2026-10-14-s4-5-viewport-culling.md` | 6 |
| S7.1 | G | `docs/261014-0-s7-1-readme` | `2026-10-14-s7-1-readme.md` | 4 |

Estado atual a respeitar:
- Os planos não passaram por `plan-concision-review` nem por revisão no Architect.
- Nenhum worktree tem `node_modules`: nada de `npm test` ou Playwright foi executado ainda.
- Pontos de colisão garantidos mesmo com código disjunto: contador do `RELEASE-CHECKLIST.md` (linha 8, já errado: 31/3/13 vs 34/2/11 contados), `docs/roadmap.md`, `docs/roadmap.data.json`, `docs/_index.md`, `ARCHITECTURE.md`.
- `retrofit_docs.py` anexa bloco "Related" ao `README.md` em toda branch; deve ficar só na S7.1.
- `_build_proto.py` gera entrada de docs corrompida (`path: "/[](...)"`) para S2.15 e S2.19: bug existente, fora de escopo.

Reuses: os 5 planos e suas branches/worktrees; `e2e/stale-banner.spec.js` (stub OPFS) e `e2e/folder-helpers.js` (nasce na S5.6); skills `pre-change-audit`, `phase-close-gate`, `pr-precheck`, `superpowers:finishing-a-development-branch`, `post-merge-close`; agente `adversarial-reviewer`.
Out of scope: Onda 2; S2.18 (verificação manual humana); S8.x; S3.2/S3.4 (decisão de produto); achado "bytes vs unidades UTF-16" do log; `HELMET_PLACEHOLDER` (só entra se a opção B da S2.19 for escolhida).

## Design: Architecture & Flows

Cinco branches paralelas a partir de `develop@8f74cb4`, cada uma em seu worktree, convergindo por merge serial com gate humano. Regiões de código tocadas por cada uma (a disjunção é o que permite o paralelismo):

```
                      develop @ 8f74cb4
   ┌────────────┬────────────┬────────────┬────────────┬────────────┐
   ▼            ▼            ▼            ▼            ▼
┌────────┐ ┌─────────┐ ┌──────────┐ ┌────────┐ ┌─────────┐
│ S2.19  │ │  S5.6   │ │  S6.2    │ │ S4.5   │ │  S7.1   │
│ core   │ │ e2e/    │ │ writeText│ │ scene  │ │ README  │
│ DC_CODES│ │ novos   │ │ exportFull│ │ Plane  │ │         │
│ hoist  │ │ specs   │ │ +core    │ │ +core  │ │         │
└───┬────┘ └────┬────┘ └────┬─────┘ └───┬────┘ └────┬────┘
    │ (1)       │ (2)       │ (3)       │ (4)       │ (5)
    ▼           ▼           ▼           ▼           ▼
 ┌──────────────────────────────────────────────────────┐
 │  merge serial em develop (gate humano a cada um)     │
 │  rebase + rebuild roadmap.data.json antes de cada    │
 └──────────────────────────────────────────────────────┘
                          │
                          ▼
              recontagem única do checklist (Task G)
```

Ordem de merge `(1)→(5)` e motivo:

| # | Leaf | Por quê nesta posição |
|---|---|---|
| 1 | S2.19 | Menor; só remove código e fixa comentário. Reduz ruído para os demais |
| 2 | S5.6 | Cria `e2e/folder-helpers.js`; o spec da S6.2 pode reusá-lo; asserções não leem o log |
| 3 | S6.2 | Muda o formato do log (`v2` + hash); depois da S5.6 para o e2e dela reusar o helper |
| 4 | S4.5 | Mede perf: entra com `develop` estável para o before/after ser limpo |
| 5 | S7.1 | README descreve o fluxo de gravação já com o log `v2` |

Regiões compartilhadas por par (resolução esperada):

| Par | Região | Tratamento |
|---|---|---|
| S4.5 × S2.19 | `index.html` comentário ~905-908 vs ~1280 | Hunks distantes; merge automático |
| S6.2 × S5.6 | nenhuma em código; log não é asserido | Sem conflito |
| S6.2 × S2.19 | `exportFull` (1933) é guarda da S2.19 intacta | Sem conflito |
| todas | contador e tracker | Task G + rebuild, ver abaixo |

## Implementation Outline

Passos de orquestração, expandidos em tasks abaixo:
- **A. Pré-voo** — revisar os 5 planos no Architect e aplicar decisões → planos finais e `node_modules` prontos.
- **B–F. Executar cada leaf** — em paralelo, subagentes Workhorse seguindo o plano da leaf → branch verde local, sem push.
- **G. Integração serial** — merge na ordem acima com gate humano → `develop` com as 5 leaves e tracker consistente.
- **H. Fechamento** — verificação final e limpeza de worktrees/branches.

### Task A: Pré-voo dos 5 planos

Escopo: leitura e pequenos ajustes de plano; sem código de produto.
1. `npm ci` em cada um dos 5 worktrees (ou um `npm ci` e `node_modules` ligado por junction), para `npm test` e Playwright rodarem de fato. → verificar: `npm test` verde em cada worktree sobre o commit do plano.
2. Revisão adversarial de cada plano (`adversarial-reviewer`, Architect, somente leitura), mais `plan-concision-review`. → verificar: findings registrados; plano ajustado ou finding descartado com motivo.
3. Aplicar nos planos as decisões do usuário (callout `leaf-decisions`) e a regra do contador: **nenhuma leaf edita a linha 8 do checklist**; a Task G recontou uma vez com `grep -c`. → verificar: `grep -n "RELEASE-CHECKLIST" docs/superpowers/plans/2026-10-14-*.md` não mostra edição de contador nas 5.
4. Ajustar S6.2 Task 2 para reusar `e2e/folder-helpers.js` se a S5.6 mergear antes (senão manter independente). → verificar: spec da S6.2 sem stub OPFS duplicado.

### Task B: Executar S2.19

Seguir `docs/superpowers/plans/2026-10-14-s2-19-dc-reserved-codes.md` (Tasks 1–4) no worktree `agent-a1d0a7c44997f896f`. → verificar: `npm test` verde; `git diff develop --stat` só nos arquivos listados no plano.

### Task C: Executar S5.6

Seguir `2026-10-14-s5-6-e2e-functional.md` (Tasks 1–4) no worktree `agent-a9aacf68a001d493b`. → verificar: `npx playwright test e2e/apply-flow.spec.js` verde; spec falha se a gravação for omitida (teste de sanidade negativo).

### Task D: Executar S6.2

Seguir `2026-10-14-s6-2-write-log-hash.md` (Tasks 1–3) no worktree `agent-a4cdf00c6711dadb7`. → verificar: `npm test` (vetores SHA-256 de `''`, `'abc'`, `'ç'`) e `e2e/write-log-hash.spec.js`.

### Task E: Executar S4.5

Seguir `2026-10-14-s4-5-viewport-culling.md` (Tasks 1–6) no worktree `agent-ac7fc5517d70bcb72`. Task 1 é go/no-go: se menos de 10% dos planos saem da tela com zoom, parar e devolver ao usuário em vez de seguir. → verificar: before/after com 3 execuções (mediana) em `bench/results/`; `e2e/viewport-culling.spec.js` verde.

### Task F: Executar S7.1

Seguir `2026-10-14-s7-1-readme.md` (Tasks 1–4) no worktree `agent-a189dff53ae5e657f`. → verificar: todo path, script npm e link citado no README resolvido por grep/execução; `npm test` verde.

### Task G: Integração serial

Para cada leaf na ordem 1→5, depois que o usuário autoriza o merge dela:
1. `pre-change-audit`/`phase-close-gate` da leaf (status `done`, colunas spec/plan/report do roadmap, changelog fragment com `### Perf`).
2. `git rebase develop`, rebuild de `docs/roadmap.data.json`, resolver `_index.md` regenerando.
3. `pr-precheck`, depois `superpowers:finishing-a-development-branch`: PR ou merge só com resposta explícita; nunca push em `develop`.
4. Após o merge da 5ª: recontar contador do checklist (`grep -c` por estado) numa única edição e atualizar `ARCHITECTURE.md` se algum fragmento ficou para trás. → verificar: `npm test` verde em `develop`; contador igual ao `grep`.

### Task H: Fechamento

`post-merge-close` (uma confirmação da lista completa): fechar issues se houver, apagar branches remotas/locais, `git worktree remove` dos 5 worktrees, prune, rebuild do tracker. → verificar: `git worktree list` só com `develop`; `git branch -a` sem as 5 branches.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| A.1 `npm ci` nos worktrees | gen | Mechanical | Executor | comando + resumo, caller valida `exit_code` |
| A.2 revisão dos 5 planos | review | Architectural | Architect | verifier ≥ generator (planos escritos em Opus; revisão no mesmo tier, via `adversarial-reviewer`) |
| A.3, A.4 ajuste de planos | gen | Architectural | Architect | prosa de plano nunca é Executor |
| B, C, D, F implementação | gen | Standard | Workhorse | implementação e testes |
| E implementação (Tasks 2–3: projeção e `Plane`) | gen | Standard | Workhorse | com row de review Architect abaixo |
| E. review do caminho quente (`scene`/`Plane`) | review | Architectural | Architect | hot path, regra 5 |
| D. review da gravação/hash | review | Architectural | Architect | superfície de segurança, regra 5 |
| G.1–G.3 gates e rebase | gen | Standard | Workhorse | julgamento de conflito |
| G.4 recontagem do contador | gen | Mechanical | Executor | `grep -c` + edição de uma linha, caller valida |
| H limpeza | gen | Mechanical | Executor | comandos git; exige a confirmação do usuário antes |
| Revisão pré-merge de cada leaf | review | Architectural | Architect | `adversarial-reviewer`, verifier ≥ generator |

Executor: não aplicável às Tasks B–F (todas exigem julgamento ou autoria de teste).

> [!DECISION] merge-order
> Ordem de integração das 5 leaves.
> - **Option A** (recomendada): S2.19 → S5.6 → S6.2 → S4.5 → S7.1 (motivos na tabela do Design).
> - **Option B**: por tamanho/risco crescente, S7.1 → S2.19 → S5.6 → S6.2 → S4.5 (README sai antes e fica sem o log `v2`; exigiria segundo toque no README).

> [!DECISION] counter-ownership
> Contador do checklist, linha 8, hoje 31/3/13 (conteúdo conta 34/2/11).
> - **Option A** (recomendada): nenhuma leaf toca o contador; Task G recontou uma vez com `grep -c`.
> - **Option B**: cada leaf recontou na sua docs task; conflito certo em 4 dos 5 merges.

> [!DECISION] leaf-decisions
> Decisões abertas herdadas dos planos; sem resposta, vale a recomendação.
> - **S4.5 `culling-criterion`**: A só viewport, reescrever o item do checklist (recomendada) / B `op===0` exato / C texto literal, muda o visual.
> - **S4.5 `culled-selectable`**: A cull só durante drag, nunca `sel`/`hov`, soltar restaura tudo (recomendada).
> - **S6.2 `hash-algorithm`**: SHA-256 via `crypto.subtle.digest` (recomendada) / cyrb53 reusado.
> - **S6.2 `hash-scope`**: hash de antes e depois (recomendada) / só depois.
> - **S6.2 `log-format-version`**: cabeçalho `# layers-export.log v2` (recomendada) / sem versão.
> - **S2.19 `reserved-codes`**: apagar `UTILITY_SHEET` e `READONLY_ORIGIN` (recomendada) / ligar via `dcWhy`; **Option B de escopo**: incluir `HELMET_PLACEHOLDER`.
> - **S2.19 `attr-names`**: apagar (recomendada).
> - **S2.19 `hoistfaces-order`**: manter a ordem atual e documentar (recomendada) / restaurar a antiga com splice.
> - **S5.6 `rollback-spec`**: incluir a Task 3, 2 testes (recomendada).
> - **S5.6 `select-helper-home`**: `selectLayer` no helper novo (recomendada).
> - **S7.1 `readme-structure`**: README único com links para `docs/` (recomendada).

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — orquestração de leaves já rastreadas no roadmap; cada plano de leaf já traz o veredicto "sem issue".
> Draft to be created (via `gh-issue-gate`): none.
> - **Title**: n/a
> - **Labels**: n/a
> - **Milestone**: (none)
> - **Body**: n/a

> [!DECISION] phase-intake
> Classification: **not a new row** — orquestração das 5 leaves meso já registradas: S2.19 (S2), S4.5 (S4), S5.6 (S5), S6.2 (S6), S7.1 (S7). Release band: **Unreleased**.
> Current tree (relevant slice): S2 Loader de projeto › S2.19 / S4 Performance › S4.5 / S5 Testes › S5.6 / S6 Segurança › S6.2 / S7 Release e governança › S7.1 (todas `in-progress` nas respectivas branches).
> Fork of an existing row? **No**.
> - **Option A** (recomendada): sem novo id; este plano vive como documento de coordenação.
> - **Option B**: registrar um micro/meso "Onda 1" no tracker (não recomendado: duplica as 5 linhas).

> [!DECISION] execution
> Method: **Subagent-driven**. Tasks B–F em paralelo, um subagente Workhorse por worktree, cada um com apenas o brief da sua leaf; Task G serial na sessão principal; Mechanical rows vão ao subagente `executor`. Nenhum `git push`, PR ou merge sem resposta explícita.
