---
title: "S9.1e — Varredura final da S9.1 e pendências"
type: plan
solution: Layers
status: draft
created: 2026-10-20
---

# S9.1e — Varredura final da S9.1 e resolução de pendências

## Context

S9.1d fechou a última leaf funcional da S9.1 (PR #94 mergeado). Ficaram pendências adiadas pelo usuário para uma varredura única (memory `project-s9-1-closing-pendencies`, limites de `docs/ARCHITECTURE.md`, `[~]` de `docs/RELEASE-CHECKLIST.md`). A S9.1e resolve o que o usuário aprovou e fecha a S9.1 (macro S9.1 → `done`, abre phase-close-gate seção B).

Decisões do usuário (2026-10-20):

| # | Decisão | Escolha |
|---|---|---|
| 1 | Código a corrigir | Bugs funcionais · Edição entre layouts · Lacunas de teste (fica de fora: caso silencioso 1.407 planos, `coverageModel` quadrático — seguem como limites documentados) |
| 2 | Regra 4 da Cobertura | Manter (só mono ≥ 85 %); fechar no doc |
| 3 | Chip ativo da faixa LAYOUTS | Manter o atual (variante não solo); fechar no doc |
| 4 | Limpeza | Apagar branch `worktree-agent-abed3f76c401c2618` · ignorar `bench/results/*.json` · confirmar texto do aviso de teto (R21) · corrigir README e linha S9.1d do roadmap |

Classificação: **micro `S9.1e`** sob **S9.1 Layouts newlogic** (meso, `in-progress`), alvo **Unreleased**. Não é fork. Branch `feature/261020-<issue>-s9-1e-varredura-final`.

## Design: Architecture & Flows

```
Aprovar x makeDraft (Task 2)            Badge/Diff/Export (Task 3)               LOD após gravar (Task 3)
┌────────────┐ drafting=true            ┌──────────────┐  layoutPend{id→n}       approve / rollback
│ makeDraft  │──────────────┐           │ changeBadge  │◀─ ativo + Σ outros          │
└────────────┘              ▼           └──────────────┘                              ▼
  loop writeText ──▶ planStale()=true   openDiff/exportFull ─▶ buildSaveSet      clearProbe()
        │            (approve/discard      (multiLayout e      (união fundida)    clearSpread()
        ▼             retornam cedo)        pendência fora)                         │
  finally drafting=false ─▶ Aprovar       1 layout: caminho antigo                   ▼
                            aparece                                            loadSpread() se ligado

Normalizador (Task 4)
 loader joinPath ─┐
 analyzeCoverage ─┼─▶ LayersCore.<normalizador> (barras invertidas, '/' inicial, '..' acima da raiz)
 coverageModel.fullPath ─┘   (resolvePosix → null cai no normalizador)
```

Sem componente novo e sem visual novo: só flag de estado (`modal.drafting`), mapa de estado (`layoutPend`), guardas de reentrada/teclado e um helper puro no core.

## Tasks (step → verify)

Regras de todas as tasks: visual congelado (nenhuma cor/tipografia/tamanho nova), `index.html` editado com âncoras únicas e contagem de matches, `npm test` ≥ 687, Playwright **um spec por vez, sozinho**, commits Conventional EN com sufixo `(S9.1e Task <n>)`, **sem trailer/Co-Authored-By/Claude-Session**, `git add` só de arquivos nomeados (nunca `docs/_index.md` nem o spec do Atlas untracked).

### Task 1 — Leaf e branch
- Reservar `S9.1e` (micro, parent S9.1, `registered`) em `docs/roadmap.md` + membro em `docs/roadmap.config.json`; rebuild `_build_proto.py`; criar a branch; primeiro commit `chore(roadmap): start S9.1e`. Link `plan` assim que o plano existir. → verify: `_build_proto.py --tree` mostra S9.1e.

### Task 2 — Bugs funcionais (`index.html`)
Âncoras: `makeDraft` ~3023, `approve` ~3039, `planStale` ~2972, template Aprovar ~1033, flags ~3494; `analyzeCoverage` ~1824, erro "projeto ainda carregando" ~1825, `loadedSeq` final ~1633; `onKey` ~2097.
1. **Aprovar durante makeDraft:** flag `modal.drafting` ligada no início de `makeDraft`, limpa em `finally`; `planStale()` passa a cobri-la (approve e discardDraft já o chamam); Aprovar e Descartar escondidos enquanto `drafting`. → verify: teste novo em `e2e/apply-flow.spec.js` (`writeText` lento): durante o rascunho Aprovar ausente e CSS em disco intacto.
2. **Cobertura:** guarda de reentrada no topo de `analyzeCoverage` (`coverage.status==='running'` → retorna); limpar o erro "projeto ainda carregando" ao fim da carga; `onKey` deixa passar só `Escape` (e fechar Atalhos) com `modal/diff/coverage.open/pending/shortcuts` abertos. → verify: 3 testes em `e2e/coverage-modal.spec.js` (duplo clique = uma varredura via `__reads`; overlay some após a carga; `?`/setas/`+` não mexem em `shortcuts`/câmera).

### Task 3 — Edição entre layouts (limites S9.1d b e k)
1. **Badge/Ver diff/Exportar:** novo mapa de estado `layoutPend` (só mudanças, irmão de `layoutBadges`, escrito nos mesmos pontos: ~1610, 1633, 1742, 2977, 3057); `changeBadge` = ativo + soma. `openDiff` (~3073) e `exportFull` (~3086) usam o conjunto fundido (`buildSaveSet`, assíncrono) quando `multiLayout()` e há pendência fora do ativo; caminho de 1 layout idêntico. → verify: `Salvar (N)` e "Ver diff" listando arquivos de `config` em `e2e/apply-flow.spec.js` (após `Apply_PendingInTwoLayouts_WritesOnceAndClearsBoth`); `Layouts_SingleLayoutProject_*` seguem verdes.
2. **Retratos LOD após Aplicar/Reverter:** em `approve` (após `clearProbe`, ~3055) e `rollback` (~3069): `clearSpread()` + `loadSpread` se o Espalhar estiver ligado (padrão de `spreadOn`/`setSpreadPick`). → verify: teste em `e2e/spread.spec.js` ao lado de `Spread_ReloadAndRestructure_ReReadEveryLayout`: entradas de `spreadFrozen` renovadas após approve e após rollback.

### Task 4 — Lacunas de teste e caminhos (Cobertura 8, 10, 16)
1. **Normalizador único** em `lib/layers-core.js` (junto de `safePath`/`resolvePosix`): `joinPath` do loader passa a chamá-lo (comportamento do loader preservado: `/x` → `x`, `..` acima da raiz colapsa); `coverageModel.fullPath` cai nele quando `resolvePosix` devolve `null` (fim da divergência do limite 16); `analyzeCoverage` normaliza `\` → `/` em `base0` (limite 10). → verify: Vitest em `test/layers-core.test.js` (`/` inicial, `..` acima da raiz, `\`), mais `analyzeCoverage_BaseWithBackslash_*` em `e2e/autocreate.spec.js`.
2. **Zip e tetos sem teste:** harness sintético (`window.__logic.zip = {files: Map<Uint8Array>, root}`) em `e2e/folder-helpers.js` (`connectZip`); testes `Coverage_Zip_BaseMissing_*`, `Coverage_Zip_OversizedFile_FlagsPartial`, `Coverage_Zip_ScriptCaps_*` (200 arquivos e 8 MB) e `Coverage_Folder_ScriptBytesCap_*` (8 MB, pasta). → verify: cada um falha com o cap desligado (mutante manual).
3. **Terceira cópia do harness OPFS:** `coverage.spec.js`, `coverage-modal.spec.js` e `autocreate.spec.js` passam a usar `connectEntries` de `e2e/folder-helpers.js`. → verify: os três specs com a mesma contagem de testes verdes.

### Task 5 — Housekeeping e decisões fechadas
- README ~l.66 (edição entre layouts já entregue) e linha S9.1d do roadmap (texto "Acompanhamento" velho).
- `.gitignore`: `bench/results/*.json`.
- Docs: regra 4 (limite 14) e chip ativo marcados como **decisão fechada** (ARCHITECTURE, design-decisions spec §58); aviso de teto de varredura (R21) confirmado como está.
- Apagar a branch `worktree-agent-abed3f76c401c2618` (`git branch -D`, o commit `ce43190` do plano S3.4 se perde — autorizado pelo usuário; listar o commit antes de apagar).
→ verify: `git branch -a` sem a branch; `git status` sem `bench/results`.

### Task 6 — Varredura manual no navegador e baseline visual
- Via Chrome automation em `npm run dev` (5180): `?layers=fixtures/multi-layout/` (faixa, trocar, badge, exportação agrupada, Espalhar Todos/1–N, clique no LOD, undo entre layouts, Salvar com 2 layouts, "também afeta", banner de stale), `fixtures/coverage-multi` (três barras, veredito, trecho), `fixtures/traval` (sem faixa, `Monovisual`), três temas, DevTools → Network sem requisição fora de `localhost:5180`.
- Regenerar baselines opt-in de `e2e/menu-visual.spec.js` (`LAYERS_VISUAL=1`: `hist` com "Analisar cobertura" e `acoes` com 2 itens).
- Marcar `[~]` → `[x]` no checklist só o que for **observado**; o que exige o seletor nativo de pasta (gravação dc em disco real; restauro do Espalhar em pasta conectada) fica `[~]` e vai para o usuário com passos curtos.
→ verify: lista item × resultado × evidência no relatório da task.

### Task 7 — Docs e fechamento
- ARCHITECTURE: remover/atualizar os limites corrigidos (Cobertura 8/10/11/12/13/16, S9.1d b/k, Espalhar 1); manter os aceitos. RELEASE-CHECKLIST: contagens e § C/§ E. Fragmento `changelog.d/feature-261020-<issue>-s9-1e-varredura-final.md` (≤ 2048 B, `### Perf` = `N/A` com motivo ≥ 20 chars). Roadmap: S9.1e e **S9.1 → `done`**; rebuild; impl-report; phase-close-gate (S9.1 vira grupo `done` → seção B1–B12).
- Memory: apagar `project-s9-1-closing-pendencies.md` e a linha do `MEMORY.md` (S9.1 fechada), exceto o que seguir pendente (itens manuais que o usuário ficar de executar) → mover para o checklist, não para memory.
→ verify: `npm test`, e2e do escopo, `docs-linkcheck` 0 quebrados, `precheck.py` sem BLOCKED (o spec do Atlas untracked trava o check 3 até ser commitado/movido pelo usuário).

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| 1, 5, 7 | gen | Standard | Workhorse (Sonnet) | roadmap, housekeeping, docs |
| 2, 3, 4 | gen | Standard | Workhorse (Sonnet) | testes primeiro, contratos claros; Task 3 mexe em approve/spread |
| 6 (navegador) | gen | Standard | Workhorse (Sonnet) | julgamento visual; `executor` não serve |
| `.gitignore` + `git branch -D` | exec | Mechanical | Executor (Haiku) | comando + `exit_code`; o chamador valida |
| revisão por task (2, 3, 4) e pré-merge | review | Architectural | Architect (`adversarial-reviewer`, Opus) | verifier ≥ generator; approve/spread/normalizador têm custo de erro alto |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — fecha a S9.1 com correções de comportamento visível (Aprovar, Cobertura, badge/diff/export, LOD) e testes.
> Title: `chore: close S9.1 sweep — functional fixes, test gaps and open decisions (S9.1e)`
> Labels: `enhancement`
> Milestone: (none)
> Body:
> ## Context
> S9.1d shipped cross-layout editing. Deferred items remain: Approve clickable while the draft is still being written, Coverage modal re-entry/keys/stale overlay, Save badge/diff/export ignoring other layouts, stale LOD snapshots after Apply, uncovered zip/caps paths and path normalization divergence, plus open decisions and housekeeping.
> ## Proposal
> One sweep leaf: fix the approved functional items with tests, close the open decisions in docs, run the pending manual browser checks, and mark S9.1 done.
> ## Acceptance criteria
> - [ ] Approve and Discard are unavailable while the parallel draft is being written
> - [ ] Coverage: no double scan, no stale "projeto ainda carregando", keys blocked under the modal
> - [ ] Save badge, Ver diff and Export include other layouts' pending
> - [ ] LOD snapshots refresh after Apply/Revert
> - [ ] Zip/caps/backslash/leading-slash paths covered by tests and one normalizer
> - [ ] Manual sweep recorded in the release checklist
> ## Refs
> `docs/ARCHITECTURE.md` limits, `docs/RELEASE-CHECKLIST.md` § C/§ E

> [!DECISION] phase-intake
> Classification: **micro** `S9.1e` under **S9.1 Layouts newlogic** (meso, `in-progress`), target **Unreleased**.
> Current tree (relevant slice): S9 (wip) › S9.1 (wip) — S9.1a–S9.1d `done`, S9.1e `registered` → `in-progress` (Task 1, first commit).
> Fork of an existing row? **No**.
> - **Option A**: micro S9.1e (escolhida pelo usuário)
> - **Option B**: pendências espalhadas por leaves futuras da S9.x

> [!DECISION] execution
> Method: **Subagent-driven** com ledger `.superpowers/sdd/…`, como na S9.1d (revisão Opus por task, re-revisão escopada das correções). Sem mockup novo: nenhum visual muda.

## Verification

- `npm test` (≥ 687 + novos) e, um por vez e sozinho: `apply-flow`, `coverage-modal`, `coverage`, `autocreate`, `spread`, `layouts`, `scope-all-equal`, `undo-redo`, `onkey-keys`; `perf.spec` só se a cena mudar (não deve).
- Varredura manual da Task 6 com evidência por item; DevTools → Network sem requisição fora de `localhost:5180`.
- `python ~/.claude/scripts/docs-linkcheck.py .` 0 quebrados; `precheck.py --root .` sem BLOCKED; phase-close-gate A + B antes do menu de merge (merge/push/delete só com resposta explícita).
