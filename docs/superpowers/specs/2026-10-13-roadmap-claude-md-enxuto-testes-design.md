---
title: "Layers — roadmap, CLAUDE.md enxuto, testes de performance de UI e benchmark"
type: spec
solution: Layers
status: draft
created: 2026-10-13
---

# Layers — roadmap, CLAUDE.md enxuto, testes de performance de UI e benchmark

## Context

Layers (editor visual de camadas, JS puro + Vite só para dev/teste) não tem roadmap: o tracker real é `docs/RELEASE-CHECKLIST.md` (25 feitos / 3 parciais / 19 abertos) e o Atlas indexa o repo com 0 leaves. O `CLAUDE.md` do projeto envelheceu (afirma "nenhum teste" com 128 testes, "zero requisições externas" com CSP/`fetch` GitHub liberados, layout e versões desatualizados) e não declara o que ignora das regras globais, que são .NET. A meta de performance (checklist D: scan < 300 ms em 1.500 nós, orbit > 50 fps) está documentada mas sem harness: não existe `bench/`, nem `playwright.config.*`, nem spec E2E. O `develop` local diverge de `origin/develop` (ahead 9 / behind 12, 8 commits de docs não publicados).

Issue de rastreio: [#23](https://github.com/brunomaida/Layers/issues/23).

Decisões já tomadas pelo usuário: (1) "benchmark BDN" = suite JS com disciplina BenchmarkDotNet (warmup, iterações, baseline, memória), sem projeto .NET; (2) passo 0 reconcilia o `develop` antes de tudo.

## Design: Architecture & Flows

Macro: 4 frentes independentes em docs/tooling; nenhuma altera `index.html`/`support.js` (visual congelado).

```
 W0 reconciliar develop ──► develop real (origin)
                                │
        ┌───────────────────────┼─────────────────────────┐
        ▼                       ▼                         ▼
 W2 roadmap              W1 CLAUDE.md              W3 perf (2 sub-branches)
 docs/roadmap.md         lean + overrides          ┌───────────────┬──────────────────┐
 roadmap.config.json     documentados              ▼               ▼
 proto/layers.json                                 W3a bench/      W3b e2e/perf
        │                                          (Node, V8)      (Playwright, Chromium)
        └──► leaves S<n>.<m> p/ W1, W3a, W3b             │               │
                                                         ▼               ▼
                                                  *.bench.json ──► bench-history-cli ingest
                                                                  docs/reports/bench-history/
```

Fluxo de medição:

```
 fixtures/* (reais) + sintéticos (replicação p/ 1.5k nós)
      │                              │
      ▼ import LayersCore            ▼ page.route / ?layers=fixtures/<n>/
 vitest bench (tinybench)       Playwright chromium (rAF, longtask, mousemove)
 parseSheet buildIndex ...      load→scan, orbit fps, explode, tree 1.5k
      └──────── converter → bench/results/*.bench.json (schema do bench-report)
```

## Implementation Outline

Ordem: W0 → W2 → W1 → W3a → W3b. Cada frente = 1 branch + PR contra `origin/develop`; a 1ª commit de cada branch registra a leaf no roadmap (a partir de W2).

| Step | Entrega | O que muda |
|---|---|---|
| W0 | Reconciliar `develop` | `git cherry -v origin/develop develop` + comparar com `origin/docs/260922-0-frontmatter-vocab` e branch local `docs/260921-5-doc-sync`; o que for inédito sai por branch `docs/…` + PR (rebase sobre origin; conflitos prováveis em CLAUDE.md/CHANGELOG), o que já está coberto é descartado; depois `develop` local = `origin/develop` (reset só após confirmação). Nenhum push em `develop`. |
| W2 | Roadmap | `docs/roadmap.md` (manifest 10 colunas, `status`/`type` no frontmatter), `docs/roadmap.config.json` (`tree`, `aliases`, `phase_docs`, `releases`), registry `~/.claude/design/proto/layers.json` `{"repo":"C:/Development/Layers"}`, `roadmap.data.json` via `_build_proto.py`. Estrutura abaixo. |
| W1 | CLAUDE.md enxuto | Alvo ≤ ~60 linhas / ≤ 1.500 tokens; tabela de mudanças abaixo. |
| W3a | Benchmark (disciplina BDN) | `bench/core.bench.js` (`vitest bench`, tinybench 2.9 já instalado), `bench/to-bench-json.js`, script `npm run bench`. |
| W3b | Testes de perf de UI | `playwright.config.js`, `e2e/perf.spec.js`, script `test:e2e` passa a ter spec. Destrava também checklist E (L62). |

### W2 — árvore proposta (confirmar na execução)

| Macro | Origem | Leaves (exemplos) |
|---|---|---|
| S1 Baseline & setup | checklist A, 0.21–0.24 | done |
| S2 Loader de projeto | checklist B + PRs #3–#7, #9, #11, #14, #16, #18, #21 | done; abertas: aviso `interactions` (L27), undo/redo global (L28), persistência de `changes` pendentes (L29), marcador "manual" TS/JS (L30) |
| S3 Ferramentas & UI | 0.25 (Medir, Box Model, Tokens) + checklist C | abertas L37–L39 |
| S4 Performance | checklist D + W3a/W3b | culling (L44), cache `getComputedStyle` (L45), árvore virtual (L46), orçamento (L47) |
| S5 Testes | checklist E | snapshot por fixture, `lineDiff`, E2E |
| S6 Segurança | checklist F | hash no log de gravação (L75) |
| S7 Release docs | checklist G | README, CHANGELOG por versão, matriz, shortcuts |
| S8 Trilha MCP/plugin | checklist do report 2026-09-18 | 4 itens pendentes (spike MCP, spike Playwright `data-vite-dev-id`, slice 3, `apply_patch`) |

Notas: leaves entregues levam `report` = fragmento em `changelog.d/`; bandas de versão via `releases{}` do config, porque os headings do CHANGELOG (`## 0.25.0 — data`, `## Não lançado`) não casam o regex de `versions.py` (exige `[x.y.z]`/`Unreleased`) e reescrevê-los está fora de escopo.

### W1 — mudanças no CLAUDE.md

| Seção/linha atual | Ação | Motivo |
|---|---|---|
| "Recursos sem rede" (L21-23) | Corrigir: sem requisição externa **no boot**; única saída é o loader GitHub iniciado pelo usuário (CSP `connect-src` api.github.com/raw) | contradita por `index.html:11,1352,1656` |
| Defaults visuais (L30-38) | Reduzir a 1 linha + ponteiro p/ `docs/LOCAL-SETUP.md` | duplica doc; `fontScale` nem é data-prop |
| Git Workflow (L41-46) | Manter só: gate de commit, hook local, `install-hooks.sh`; mecânica de hooksPath vai para LOCAL-SETUP; remover caveat de branch de setup (stale) | hooks já em develop/master |
| Changelog (L11, L95 vs L48-52) | Uma única regra: fragmento em `changelog.d/`, CHANGELOG.md só no release | duplicata e conflito com `fact-git-conventions` |
| Project Layout (L54-71) | Cortar para mapa de 6–8 linhas (app, lib, test, fixtures, docs, scripts, tools) + ponteiro `docs/TOPOLOGY.md` | derivável; versão/KB/contagens stale |
| Testing (L73-81) | Reescrever: Vitest 128 casos em `test/`, Playwright sem specs até W3b, gates | "nenhum teste" é falso; loader existe |
| Prioridade B→E→F→D (L9) | Trocar por ponteiro para `docs/roadmap.md` (após W2) | evita duplicar ordem |
| **Novo**: Stack/overrides | Declarar: JS puro, sem .NET; itens .NET do global (IClock, BDN, DateTime, zero-alloc, `Unsafe`) N/A; tier de perf = General; benchmarks = W3a | global G:38 exige override documentado |
| **Novo**: Roadmap | 1 linha: `docs/roadmap.md` + leaf antes da branch | regra global hard |

Fora do CLAUDE.md (apenas relatar, não alterar nesta frente): `package.json` 0.22.0 vs CHANGELOG 0.25.0 vs "v2.24"; `CHANGELOG.md` "Não lançado" sem os itens pós-0.25; fragmentos antigos > 2 KB / sem `adr:`.

> [!DECISION] security-surface
> Layers grava em disco via File System Access, parseia HTML não confiável, ingere zip e busca GitHub. Declarar `security-surface:` ativa o gate bloqueante de release (4a, exige teste na categoria Security).
> - **Option A**: não declarar agora (mantém o estado atual; revisitar na checklist F) (recommended — escopo desta entrega é enxugar)
> - **Option B**: declarar `public` em W1 e criar a categoria de teste

> [!DECISION] settings-model-keys
> `Layers/.claude/settings.json` fixa `"model": "sonnet"` e `"advisorModel": "fable"`, o que contraria a regra global (modelo por repo proibido; `fable` só com confirmação).
> - **Option A**: remover as duas chaves em W1 (recommended)
> - **Option B**: manter e documentar o override

### W3a — benchmark (disciplina BDN)

- Alvo: `lib/layers-core.js` importado como em `test/setup.js` (`globalThis.csstree` + `await import`), mesmo V8 do navegador.
- Funções: `parseSheet`, `buildIndex`, `varIndex`, `scopeAst`, `patchCssAt`, `isUtilitySheet`, `mapDcTemplate`, `patchDc`, `deriveManifest`, `openZip` (zip gerado em memória; `fixtures/zip` tem 1 KB).
- Workloads reais: `plain-admin` (materialdesignicons 274 KB / 5.984 regras), `ecommerce-jsx/app.css` (1.569 regras), `traval` (4 folhas), `marketview` (230 KB inline), `vcard-portfolio` (HTML 33 KB); sintético: replicação de regras ×N para curva de escala.
- Disciplina: warmup fixo, iterações/tempo mínimo explícitos, `baseline` por comparação (ex.: `parseSheet` com vs sem recursão em `Raw`), alocação por op via `--expose-gc` + delta de `heapUsed` (aproximação documentada; Node não tem `[MemoryDiagnoser]`).
- Saída: converter tinybench → `bench/results/<suite>.bench.json` no schema do `bench-report` (`schemaVersion, suite, tag, env, git, benchmarks[{benchId, unit:"ns", value, stddev, extra{throughputOpsSec, allocBytesPerOp}}]`); ingestão com `python ~/.claude/hooks/bench-history-cli.py ingest --repo .`; relatórios em `docs/reports/bench-history/`. `*.bench.json` fica em `bench/results/` (não em `node_modules`).
- Sem CI (`.github/` não existe): gate é manual (`bench-history-cli gate`), documentado.

### W3b — testes de performance de UI (Playwright, Chromium)

- `playwright.config.js`: projeto chromium, `webServer: npm run dev` com `--strictPort` 5180 e `reuseExistingServer`.
- Sem alterar `index.html` (sem `data-testid`/hooks hoje): instrumentação por `page.addInitScript` (contador de rAF, `PerformanceObserver` longtask) e entrada por `?layers=fixtures/<nome>/`.
- Cenários e orçamento: 

| # | Cenário | Métrica | Orçamento |
|---|---|---|---|
| 1 | Carregar fixture (`traval`, `plain-admin`) | tempo até 1º scan; longtasks | registrar |
| 2 | Scan em 1.500 nós (fixture replicada via `page.route`, nada novo commitado) | duração do `scan()` | < 300 ms (checklist D) |
| 3 | Orbit: N `mousemove` no stage | fps médio, p95 de frame | > 50 fps (checklist D) |
| 4 | Explodir ligado/desligado | tempo até frame estável | registrar |
| 5 | Selecionar nó / árvore com 1.500 linhas (baseline p/ virtualização, L46) | tempo de render | registrar |

- Os cenários gravam o mesmo `*.bench.json` (`unit:"ms"`) para o histórico; só 2 e 3 afirmam orçamento.
- Riscos: aba oculta limita rAF (por isso Chromium headless com viewport fixo, validado no 1º spec); Playwright 1.63 pode exigir build de Chromium ausente (instalados: 1234/1243) → `npx playwright install chromium` precisa de rede e de aprovação.

## Critical Files

- `CLAUDE.md` (W1) · `.claude/settings.json` (W1, se Option A)
- `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json` (W2) · `~/.claude/design/proto/layers.json` (W2, fora do repo)
- `docs/LOCAL-SETUP.md` (recebe mecânica de hooks/defaults) · `docs/RELEASE-CHECKLIST.md` (marcar D/E após W3)
- `bench/core.bench.js`, `bench/to-bench-json.js`, `package.json` (scripts `bench`) (W3a)
- `playwright.config.js`, `e2e/perf.spec.js` (W3b)
- Reuso: `test/setup.js` (import do core), `vite.config.js` (`serveFixturesRaw`), `fixtures/*`, `lib/layers-core.js:50,128,147,200,242,304,681,847`

## Verification

- W0: `git rev-list --left-right --count origin/develop...develop` = `0 0` ao final; `git cherry` sem `+` órfãos.
- W2: `python ~/.claude/design/_build_proto.py C:/Development/Layers` gera `roadmap.data.json` sem erro; `pr-precheck` checks 7/8 deixam de ser N/A e passam; Atlas lista leaves > 0 para `layers`.
- W1: `claude-md-review` sem findings de duplicata/stale; toda afirmação factual conferida (grep/ls/wc); tamanho dentro do alvo.
- W3a: `npm run bench` termina com exit 0, gera `.bench.json` válido; `bench-history-cli ingest` + `render` produzem `bench-history.md`; duas execuções seguidas dão variação dentro do ruído (σ).
- W3b: `npx playwright test` verde em chromium; cenários 2 e 3 cumprem 300 ms / 50 fps ou falham com número; `.bench.json` ingerido.
- Em todas: `npm test` (128) verde; `pr-precheck` clear antes de cada push.

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| W0. listar `git cherry`/comparar branches e resumir | gen | Mechanical | Executor | comando + resumo; chamador valida `exit_code` e SHAs |
| W0. decidir descarte/publicação, rebase | gen | Standard | Workhorse | julgamento sobre conflitos |
| W1, W2. redação de CLAUDE.md, roadmap, config | gen | Standard | Workhorse | edição de docs com verificação factual |
| W3a, W3b. harness de bench e specs Playwright | gen | Standard | Workhorse | código novo de teste, sem hot path de produção |
| W3a, W3b. revisão da metodologia de medição | review | Architectural | Architect | alto custo de erro: número enganoso vira "orçamento" |
| Pre-merge review (cada PR) | review | Architectural | Architect | verifier ≥ generator |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — iniciativa multi-branch (roadmap + guia + 2 harnesses), rastreável.
> Draft to be created (via `gh-issue-gate`):
> - **Title**: `chore: roadmap, lean CLAUDE.md, UI perf tests and benchmark suite` (≤72 chars)
> - **Labels**: enhancement
> - **Milestone**: (none)
> - **Body**: Context (checklist D sem harness, CLAUDE.md stale, develop divergente) / Proposal (W0–W3b acima) / Acceptance criteria (verificações da seção Verification).

> [!DECISION] phase-intake
> Classification: **macro bootstrap** — Layers ainda não é roadmap-tracked; W2 cria a árvore S1–S8 e W1, W3a, W3b entram como leaves (`S4.x`, `S5.x`, `S7.x`) sob **S4 Performance**/**S5 Testes**, target **Unreleased**.
> Current tree: (inexistente — `docs/roadmap.md` ausente).
> Fork of an existing row? **No**.
> - **Option A**: W2 primeiro, depois leaves das demais frentes (recommended)
> - **Option B**: executar W1/W3 sem leaf e registrar depois (viola regra "leaf antes da branch")

> [!DECISION] execution
> Method: **Native** (inline; passos Mechanical de W0 vão ao subagente `executor`). Frentes são sequenciais por dependência de leaf, sem ganho em paralelizar.
