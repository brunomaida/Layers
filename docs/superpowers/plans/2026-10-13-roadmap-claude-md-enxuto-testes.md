---
title: "Layers — roadmap, CLAUDE.md enxuto, testes de perf de UI e benchmark — Implementation Plan"
type: plan
solution: Layers
status: draft
created: 2026-10-13
---

# Layers — roadmap, CLAUDE.md enxuto, testes de perf de UI e benchmark — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (Native, decidido em `[!DECISION] execution`) para implementar task a task. Passos usam checkbox (`- [ ]`).

**Goal:** Dar ao Layers um roadmap rastreável, um `CLAUDE.md` enxuto e correto, uma suite de benchmark JS com disciplina BenchmarkDotNet e testes de performance de UI em Playwright.

**Architecture:** Cinco frentes sequenciais, cada uma em branch própria e PR contra `origin/develop`; nenhuma altera `index.html`/`support.js`. Os harnesses de medição emitem `*.bench.json` no schema do `bench-report`, ingerido por `bench-history-cli`.

**Tech Stack:** Node 24 / npm 12, Vitest 4 (`vitest bench`, tinybench 2.9), `@playwright/test` 1.63, Vite 8 (dev server), css-tree, Python (`~/.claude` tooling).

**Spec:** [2026-10-13-roadmap-claude-md-enxuto-testes-design.md](../specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) · Issue [#23](https://github.com/brunomaida/Layers/issues/23)

## Global Constraints

- Visual congelado: `index.html` e `support.js` não são editados (`support.js` é gerado; o `pre-push` recusa).
- Commits: Conventional Commits em EN, sem `Co-Authored-By` nem atribuição a IA; prosa de docs em PT-BR.
- `npm test` (128 casos) verde antes de cada commit; `pr-precheck` clear antes de cada push.
- Nunca commitar/push em `develop`/`master`; uma branch por frente, slug com o token da leaf (`s7-5` para `S7.5`).
- Leaf antes da branch: a 1ª commit de cada branch (a partir de W2) registra/atualiza a leaf em `docs/roadmap.md` e reconstrói `docs/roadmap.data.json`.
- Medição: sem `DateTime`/`IClock` (N/A em JS); numeros são `unit:"ns"` (bench) ou `"ms"` (UI) no schema `bench-report`.
- Fragmento `changelog.d/<slug>.md` por branch de código (W3a, W3b), ≤ 2 KB, com `### Perf`.

## Review Focus

- Zip inválido/vazio em `openZip` no bench: o harness não pode mascarar a exceção como "0 ns".
- Fixture sem `layers/mock.html` ou sem `<body>` no teste de 1.500 nós: falhar com mensagem clara, não medir uma página vazia.
- Execução do bench em máquina ocupada/primeira vez: sem histórico anterior o `gate` não pode reprovar nem aprovar em falso (`init` antes de `ingest`).
- Aba oculta/`requestAnimationFrame` estrangulado: o teste de orbit deve falhar com "rAF não rodou" em vez de reportar 0 fps como PASS.
- `develop` local resetado com commits ainda não cobertos por PR: W0 não pode perdê-los (verificar `git cherry` antes de qualquer reset).

## Design: Architecture & Flows

```
 W0 develop local ──cherry-pick──► PR docs ──merge──► origin/develop ──► develop local = origin
                                                          │
        ┌─────────────────────────────────────────────────┤
        ▼ W2 (S7.5)        ▼ W1 (S7.6)          ▼ W3a (S4.3)            ▼ W3b (S4.4)
 docs/roadmap.md     CLAUDE.md lean       bench/*.bench.js        e2e/perf.spec.js
 roadmap.config.json LOCAL-SETUP.md       bench/run.mjs           playwright.config.js
 proto/layers.json   .claude/settings     test/bench-convert      e2e/perf-helpers.js
        │                                       │                       │
        └── leaves p/ W1,W3a,W3b                └──► bench/results/*.bench.json
                                                    └► bench-history-cli ingest ► docs/reports/bench-history/
```

## Implementation Outline

Ordem: W0 → W2 → W1 → W3a → W3b. As branches de W1/W3a/W3b só abrem depois do merge de W2 (precisam da leaf).

| Frente | Branch | Leaf | Tasks |
|---|---|---|---|
| W0 | `docs/<yyMMdd>-23-publish-doc-sync` | — (higiene) | W0.1, W0.2, W0.3 |
| W2 | `docs/<yyMMdd>-23-s7-5-roadmap-bootstrap` | S7.5 | W2.1, W2.2 |
| W1 | `docs/<yyMMdd>-23-s7-6-claude-md-lean` | S7.6 | W1.1, W1.2 |
| W3a | `feature/<yyMMdd>-23-s4-3-bench-suite` | S4.3 | W3a.1, W3a.2, W3a.3 |
| W3b | `feature/<yyMMdd>-23-s4-4-ui-perf-tests` | S4.4 | W3b.1, W3b.2 |

`<yyMMdd>` = data do dia em que a branch é aberta.

## Critical Files

- `CLAUDE.md`, `.claude/settings.json`, `docs/LOCAL-SETUP.md` (W1)
- `docs/roadmap.md`, `docs/roadmap.config.json`, `docs/roadmap.data.json`, `~/.claude/design/proto/layers.json` (W2)
- `bench/core.bench.js`, `bench/workloads.js`, `bench/alloc.mjs`, `bench/to-bench-json.js`, `bench/run.mjs`, `test/bench-convert.test.js`, `package.json` (W3a)
- `playwright.config.js`, `e2e/perf-helpers.js`, `e2e/perf.spec.js`, `package.json` (W3b)
- `docs/RELEASE-CHECKLIST.md` (marcar D/E ao fim de W3)

---

## W0 — Reconciliar `develop`

### Task W0.1: Classificar commits locais não publicados

**Files:** nenhum (somente leitura).

**Interfaces:**
- Produces: tabela `sha | assunto | coberto-em-origin (sim/não)` que W0.2 usa para escolher o que publicar.

- [ ] **Step 1: Listar divergência**

Run: `git fetch origin && git log --oneline origin/develop..develop && git cherry origin/develop develop`
Expected: 8 commits de docs + 1 merge (`e26e4d9`); `git cherry` marca os 8 com `+`. Se algum vier com `-`, já está no upstream (descartar).

- [ ] **Step 2: Conferir cobertura pelas branches remotas**

Run: `git log --oneline origin/develop..origin/docs/260922-0-frontmatter-vocab` e, para cada SHA local, `git patch-id --stable < <(git show <sha>)` comparado com os patch-ids dessa branch.
Expected: tabela marcando quais dos 8 já existem em `origin/docs/260922-0-frontmatter-vocab` (provável: `07c9e57`, `76352de`).

- [ ] **Step 3: Registrar a tabela na conversa** (sem commit). Critério de aceite do chamador: todo SHA citado existe (`git cat-file -t <sha>`), `exit_code` 0 nos comandos.

### Task W0.2: Publicar os commits inéditos por branch + PR

**Files:** os arquivos tocados pelos commits (docs, `CLAUDE.md`, `CHANGELOG.md`, `changelog.d/`).

**Interfaces:**
- Consumes: lista de SHAs inéditos da W0.1, em ordem cronológica.
- Produces: PR aberto contra `develop`; branch remota `docs/<yyMMdd>-23-publish-doc-sync`.

- [ ] **Step 1: Criar a branch a partir do upstream**

```bash
git checkout -b docs/<yyMMdd>-23-publish-doc-sync origin/develop
git branch --unset-upstream
```

- [ ] **Step 2: Cherry-pick na ordem** (ajuste a lista ao resultado da W0.1; ordem do `git log --reverse`)

```bash
git cherry-pick 07c9e57 76352de 2abb2ad 1ea7043 1fb7f49 fb41cd5 19bfcb9 9c65845
```
Expected: sem conflito, ou conflito só em `CLAUDE.md`/`CHANGELOG.md`/`docs/_index.md`. Em conflito: manter a versão do upstream e reaplicar só a intenção do commit; `docs/_index.md` se regenera (Step 3).

- [ ] **Step 3: Regenerar índice e rodar os gates**

```bash
python -X utf8 ~/.claude/scripts/retrofit_docs.py "C:/Development/Layers"
git status --short
```
Reverta alterações em `README.md`/`docs/TOPOLOGY.md` produzidas pelo retrofit (fora do escopo): `git checkout -- README.md docs/TOPOLOGY.md`. Commit do índice se mudou: `git commit -am "docs: regenerate docs index"`.

Run: `npm test` → Expected: 128 passed. Run: `python -X utf8 ~/.claude/scripts/gates/precheck.py --root "$(git rev-parse --show-toplevel)"` → Expected: `pr-precheck: clear`.

- [ ] **Step 4: Push e PR**

```bash
git push -u origin docs/<yyMMdd>-23-publish-doc-sync
gh pr create --base develop --title "docs: publish doc-sync commits (frontmatter vocab, topology, claude md)" --body "Publishes docs commits that existed only on local develop. Refs #23."
```
Expected: URL do PR. Parar e pedir o merge ao usuário (merge = decisão humana; depois `post-merge-close`).

### Task W0.3: Alinhar o `develop` local (destrutivo, só com confirmação)

**Files:** nenhum.

- [ ] **Step 1: Verificar que nada se perde**

Run: `git fetch origin && git cherry origin/develop develop`
Expected: nenhuma linha `+` (tudo coberto por patch-id ou descartado de propósito). Se houver `+`, parar e relatar ao usuário.

- [ ] **Step 2: Pedir confirmação explícita** ("resetar `develop` local para `origin/develop`; 9 commits locais serão descartados, já cobertos pelo PR").

- [ ] **Step 3: Executar (após o "sim")**

```bash
git checkout docs/<yyMMdd>-23-publish-doc-sync   # fora de develop
git branch -f develop origin/develop
git rev-list --left-right --count origin/develop...develop
```
Expected: `0	0`.

---

## W2 — Roadmap (leaf S7.5)

### Task W2.1: Manifest, config e registry

**Files:**
- Create: `docs/roadmap.md`, `docs/roadmap.config.json`, `~/.claude/design/proto/layers.json`
- Modify: `docs/_index.md` (hook), `CHANGELOG.md` → **não** (bandas via `releases{}`)

**Interfaces:**
- Consumes: `~/.claude/design/_build_proto.py` (lê `docs/roadmap.md` + config; escreve `docs/roadmap.data.json`).
- Produces: ids `S1..S8` usados nos slugs de branch das frentes seguintes (`S4.3`, `S4.4`, `S7.5`, `S7.6`).

- [ ] **Step 1: Criar a branch e ver o template do Atlas**

```bash
git checkout -b docs/<yyMMdd>-23-s7-5-roadmap-bootstrap origin/develop
git branch --unset-upstream
ls changelog.d
sed -n 30,200p /c/Development/Atlas/docs/roadmap.config.json | head -80
```
Expected: lista de fragmentos reais (ajustar os caminhos do Step 2 aos nomes que existirem) e as chaves restantes do config do Atlas (`aliases`, `phase_docs`, `domain`, `domain_fallback`, `releases`).

- [ ] **Step 2: Escrever `docs/roadmap.md`** (frontmatter `type: report`, `status: draft` é injetado pelo hook; 10 colunas)

```markdown
# Layers — Roadmap

| id | level | parent | title | reason | spec | plan | report | issue | status |
|---|---|---|---|---|---|---|---|---|---|
| S1 | 1 | — | Baseline e setup | Repo, fontes/React versionados, baseline sem projeto embutido | — | — | — | — | done |
| S1.1 | 2 | S1 | Setup do repo e recursos versionados | checklist A | — | — | [](../changelog.d/setup-260912-project-setup.md) | — | done |
| S1.2 | 2 | S1 | Histórico de projetos (0.23) | Dropdown de projetos recentes | — | — | [](../changelog.d/feature-260912-v2-23-project-history.md) | — | done |
| S1.3 | 2 | S1 | Baseline sem projeto embutido (0.24) | Mock do Traval removido | — | — | [](../changelog.d/feature-260912-v2-24-baseline-loader.md) | — | done |
| S2 | 1 | — | Loader de projeto | Abrir e editar projetos reais (checklist B) | — | — | — | — | in-progress |
| S2.1 | 2 | S2 | Loader layers.json e rede zero | PR #3 | — | — | [](../changelog.d/feature-260912-2-loader-baseline-rede-zero.md) | — | done |
| S2.2 | 2 | S2 | Motor CSS por AST | PR #4 | — | — | [](../changelog.d/feature-260913-2-motor-css-ast.md) | — | done |
| S2.3 | 2 | S2 | Ingestão de .zip e GitHub | PR #5 | — | — | [](../changelog.d/feature-260913-2-ingestao-zip-github.md) | — | done |
| S2.4 | 2 | S2 | Persistência layers/v1 | PR #6 | — | — | [](../changelog.d/feature-260913-2-persistencia-layers-v1.md) | — | done |
| S2.5 | 2 | S2 | Spike de superfícies latentes | PR #7 | [](reports/2026-09-13-spike-superficies-latentes.md) | — | [](../changelog.d/feature-260913-2-spike-superficies-latentes.md) | — | done |
| S2.6 | 2 | S2 | Fixtures reais, lote 1 | PR #9 | — | — | [](../changelog.d/feature-260914-8-fixtures-reais-html-css-js-ts-jsx.md) | #8 | done |
| S2.7 | 2 | S2 | Fixtures reais, lote 2 | PR #11 | — | [](superpowers/plans/2026-09-14-fixtures-reais-batch-2.md) | [](../changelog.d/feature-260914-10-fixtures-reais-batch-2.md) | #10 | done |
| S2.8 | 2 | S2 | Auto-criação de layers.json | PR #14 | — | [](superpowers/plans/2026-09-18-layers-auto-criacao-de-layers-json-quando.md) | [](../changelog.d/feature-260918-13-auto-create-layers-json.md) | #13 | done |
| S2.9 | 2 | S2 | Mapeador de template dc + writer em camadas | PR #16, slices 0-2 | — | [](superpowers/plans/2026-09-18-layers-editar-apps-renderizados-por-js-no.md) | [](../changelog.d/feature-260918-15-dc-template-writer.md) | #15 | done |
| S2.10 | 2 | S2 | Recarregar projeto + banner disco mudou | PR #18 | — | [](superpowers/plans/2026-09-20-layers-spec-recarregar-projeto-banner-disco-mudou.md) | [](../changelog.d/feature-260920-17-project-reload.md) | #17 | done |
| S2.11 | 2 | S2 | Parâmetro ?project= (lançamento pelo Atlas) | PR #21 | — | — | [](../changelog.d/feature-260925-project-param.md) | — | done |
| S2.12 | 2 | S2 | Aviso de interactions mortas | checklist B L27 | [](superpowers/reports/2026-09-13-spike-superficies-latentes.md) | — | — | — | registered |
| S2.13 | 2 | S2 | Undo/redo global | checklist B L28 | — | — | — | — | registered |
| S2.14 | 2 | S2 | Persistência de changes pendentes | checklist B L29; exige decisão própria | — | — | — | — | registered |
| S2.15 | 2 | S2 | Marcador "manual" para TS/JS | checklist B L30 | — | — | — | — | registered |
| S3 | 1 | — | Ferramentas e UI | Checklist C + ferramentas 0.25 | — | — | — | — | in-progress |
| S3.1 | 2 | S3 | Medir, Box Model e Tokens | PR #12 | — | — | [](../changelog.d/feature-260916-v2-24b-tools-reconcile.md) | — | done |
| S3.2 | 2 | S3 | Padrão único de abertura de menus | checklist C L37; decisão de produto | — | — | — | — | registered |
| S3.3 | 2 | S3 | Tooltips ação · atalho | checklist C L38 | — | — | — | — | registered |
| S3.4 | 2 | S3 | Fonte única de aparência | checklist C L39 | — | — | — | — | registered |
| S4 | 1 | — | Performance | Checklist D; orçamentos scan/orbit | — | — | — | — | in-progress |
| S4.1 | 2 | S4 | contain/will-change só em drag | v2.22 | — | — | — | — | done |
| S4.2 | 2 | S4 | Medição da travessia do scan | Spike da fatia 5 (~2,5 µs/nó) | [](superpowers/reports/2026-09-13-spike-superficies-latentes.md) | — | — | — | done |
| S4.3 | 2 | S4 | Suite de benchmark do core | Disciplina BDN em JS | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | — | #23 | registered |
| S4.4 | 2 | S4 | Testes de performance de UI | Playwright: scan/orbit/explode | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | — | #23 | registered |
| S4.5 | 2 | S4 | Culling de planos fora do viewport | checklist D L44 | — | — | — | — | registered |
| S4.6 | 2 | S4 | Cache de getComputedStyle por nó | checklist D L45 | — | — | — | — | registered |
| S4.7 | 2 | S4 | Árvore virtualizada | checklist D L46 | — | — | — | — | registered |
| S5 | 1 | — | Testes | Checklist E | — | — | — | — | in-progress |
| S5.1 | 2 | S5 | Unit do core (Vitest, 128 casos) | patchCssAt, parseSheet, scopeAst, zip, dc | — | — | — | — | done |
| S5.2 | 2 | S5 | Snapshot de árvore por fixture | checklist E L57 | — | — | — | — | registered |
| S5.3 | 2 | S5 | Origem de 30 nós amostrados | checklist E L58 | — | — | — | — | registered |
| S5.4 | 2 | S5 | Escopo "todos iguais" | checklist E L60 | — | — | — | — | registered |
| S5.5 | 2 | S5 | lineDiff testável | checklist E L61; extrair de index.html:898 | — | — | — | — | registered |
| S5.6 | 2 | S5 | E2E Playwright | checklist E L62; infra nasce em S4.4 | — | — | — | — | registered |
| S5.7 | 2 | S5 | Compatibilidade de navegadores | checklist E L63 | — | — | — | — | registered |
| S6 | 1 | — | Segurança | Checklist F | — | — | — | — | in-progress |
| S6.1 | 2 | S6 | Superfície de gravação e ingestão | checklist F, 9 itens | — | — | — | — | done |
| S6.2 | 2 | S6 | Hash no log de gravação | checklist F L75 | — | — | — | — | registered |
| S7 | 1 | — | Release e governança | Checklist G + docs do projeto | — | — | — | — | in-progress |
| S7.1 | 2 | S7 | README atualizado | checklist G L80 | — | — | — | — | registered |
| S7.2 | 2 | S7 | CHANGELOG por versão | checklist G L81 | — | — | — | — | registered |
| S7.3 | 2 | S7 | Matriz de suporte | checklist G L82 | — | — | — | — | registered |
| S7.4 | 2 | S7 | docs/shortcuts.md | checklist G L83 | — | — | — | — | registered |
| S7.5 | 2 | S7 | Bootstrap do roadmap | Este tracker | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | — | #23 | in-progress |
| S7.6 | 2 | S7 | CLAUDE.md enxuto | Revisão de duplicatas e fatos stale | [](superpowers/specs/2026-10-13-roadmap-claude-md-enxuto-testes-design.md) | [](superpowers/plans/2026-10-13-roadmap-claude-md-enxuto-testes.md) | — | #23 | registered |
| S8 | 1 | — | Trilha MCP/plugin | Ideia gravada no checkpoint de 2026-09-18 | [](superpowers/reports/2026-09-18-wnext-checkpoint-mcp-plugin-track.md) | — | — | — | registered |
| S8.1 | 2 | S8 | Spike de servidor MCP stdio sobre o core | find_rule, get_rule_text, propose_css_patch | — | — | — | — | registered |
| S8.2 | 2 | S8 | Spike Playwright: data-vite-dev-id sobrevive? | Apps Vite+React | — | — | — | — | registered |
| S8.3 | 2 | S8 | Snapshot headless (slice 3) | Depende de S8.1 e S8.2 | — | — | — | — | registered |
| S8.4 | 2 | S8 | apply_patch + porta Node de writeText | Modelo de confiança primeiro | — | — | — | — | registered |
```

Se `ls changelog.d` mostrar que algum fragmento citado não existe (arquivado), apontar a célula `report` para o fragmento correto ou deixar `—`.

- [ ] **Step 3: Escrever `docs/roadmap.config.json`**

```json
{
  "title": "Layers — Roadmap",
  "source": { "type": "manifest", "path": "docs/roadmap.md" },
  "tree": [
    { "id": "S1", "name": "Baseline e setup", "members": ["S1.1", "S1.2", "S1.3"] },
    { "id": "S2", "name": "Loader de projeto", "members": ["S2.1", "S2.2", "S2.3", "S2.4", "S2.5", "S2.6", "S2.7", "S2.8", "S2.9", "S2.10", "S2.11", "S2.12", "S2.13", "S2.14", "S2.15"] },
    { "id": "S3", "name": "Ferramentas e UI", "members": ["S3.1", "S3.2", "S3.3", "S3.4"] },
    { "id": "S4", "name": "Performance", "members": ["S4.1", "S4.2", "S4.3", "S4.4", "S4.5", "S4.6", "S4.7"] },
    { "id": "S5", "name": "Testes", "members": ["S5.1", "S5.2", "S5.3", "S5.4", "S5.5", "S5.6", "S5.7"] },
    { "id": "S6", "name": "Segurança", "members": ["S6.1", "S6.2"] },
    { "id": "S7", "name": "Release e governança", "members": ["S7.1", "S7.2", "S7.3", "S7.4", "S7.5", "S7.6"] },
    { "id": "S8", "name": "Trilha MCP/plugin", "members": ["S8.1", "S8.2", "S8.3", "S8.4"] }
  ],
  "aliases": {},
  "phase_docs": {
    "S8": [["docs/superpowers/reports/2026-09-18-wnext-checkpoint-mcp-plugin-track.md", "report"]]
  },
  "releases": {
    "0.24.0": { "date": "2026-09-12", "ids": ["S1.3", "S2.1"] },
    "0.25.0": { "date": "2026-09-16", "ids": ["S3.1"] }
  }
}
```

Acrescentar `domain`/`domain_fallback` somente se o builder (Step 5) reclamar, copiando o formato do config do Atlas lido no Step 1.

- [ ] **Step 4: Registrar o projeto no Atlas**

```bash
printf '{"repo": "C:/Development/Layers"}\n' > ~/.claude/design/proto/layers.json
```

- [ ] **Step 5: Construir e validar**

```bash
python ~/.claude/design/_build_proto.py "C:/Development/Layers"
python -X utf8 ~/.claude/scripts/docs-linkcheck.py "C:/Development/Layers"
```
Expected: `docs/roadmap.data.json` criado, linkcheck sem links quebrados (corrigir células `report`/`plan` apontando para arquivos inexistentes).

- [ ] **Step 6: Commit (leaf primeiro)**

```bash
git add docs/roadmap.md docs/roadmap.config.json docs/roadmap.data.json docs/_index.md
git commit -m "docs(roadmap): bootstrap layers roadmap tree and tracker data (S7.5, #23)"
```

### Task W2.2: Gates e PR

**Files:** nenhum novo.

- [ ] **Step 1: Rodar o precheck**

Run: `python -X utf8 ~/.claude/scripts/gates/precheck.py --root "$(git rev-parse --show-toplevel)"`
Expected: checks 7 (roadmap row) e 8 (tracker fresh) deixam de ser N/A; `pr-precheck: clear`. Check 7 só passa se o slug da branch carrega `s7-5` (por isso o nome da branch).

- [ ] **Step 2: Fechar a leaf** — pelo `phase-close-gate`: `S7.5` → `done`, rebuild do tracker, commit `docs(roadmap): close S7.5`.

- [ ] **Step 3: Push + PR**

```bash
git push -u origin docs/<yyMMdd>-23-s7-5-roadmap-bootstrap
gh pr create --base develop --title "docs(roadmap): bootstrap layers roadmap (S7.5)" --body "Adds docs/roadmap.md, roadmap.config.json and generated tracker data. Refs #23."
```
Expected: URL; parar para o merge do usuário.

---

## W1 — CLAUDE.md enxuto (leaf S7.6)

### Task W1.1: Verificar fatos e reescrever `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (reescrita completa)
- Modify: `docs/LOCAL-SETUP.md` (nova seção "Hooks do git")
- Modify: `.claude/settings.json` (remover as duas chaves — Option A do callout `settings-model-keys`)
- Modify: `docs/roadmap.md` (S7.6 → `in-progress`, 1ª commit) e `docs/roadmap.data.json`

**Interfaces:** Consumes ids/linhas de `docs/roadmap.md` (W2). Produces `CLAUDE.md` ≤ 60 linhas.

- [ ] **Step 1: Branch + leaf**

```bash
git fetch origin && git checkout -b docs/<yyMMdd>-23-s7-6-claude-md-lean origin/develop
git branch --unset-upstream
# editar a linha S7.6 de docs/roadmap.md: status registered -> in-progress
python ~/.claude/design/_build_proto.py "C:/Development/Layers"
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs(roadmap): mark S7.6 in-progress (#23)"
```

- [ ] **Step 2: Conferir cada afirmação antes de escrevê-la**

```bash
grep -n "connect-src" index.html | head -3
grep -n "fonts.googleapis\|unpkg" .githooks/pre-push | head
grep -c "support.js" .githooks/pre-push
ls lib test fixtures tools scripts docs | head -60
git config --get core.hooksPath
node -v && npm -v
```
Expected: CSP com `api.github.com` e `raw.githubusercontent.com`; guardas de rede e de `support.js` presentes no `pre-push`; `lib/layers-core.js`, `test/`, `tools/`, `scripts/install-hooks.sh` existem.

- [ ] **Step 3: Escrever o novo `CLAUDE.md`** (conteúdo integral)

```markdown
# LAYERS — instruções para o Claude Code

Leia primeiro: docs/ARCHITECTURE.md e docs/roadmap.md (tracker; o gate da v1 é docs/RELEASE-CHECKLIST.md).

## Regras

- index.html + support.js são o app inteiro (arquivo único, CSS inline, classe React via runtime support.js). Não converter para framework/bundler sem decisão explícita. `support.js` é gerado: não editar.
- Estilo inline; só @font-face, @keyframes e resets no <style> do <helmet>.
- Visual congelado: não alterar cores, tipografia, espaçamentos ou tamanhos do dock/painéis sem pedido. Paletas em THEMES/ACCENTS/SELECTS; defaults visuais e limpeza das chaves `layers/v1/*` em docs/LOCAL-SETUP.md.
- Toda gravação em disco passa por writeInto/writeText; nunca fora da pasta conectada.
- Toda branch nasce de uma leaf de docs/roadmap.md (token do id no slug, ex.: `s4-3`).

## Stack (override do global: JS puro, sem .NET)

- HTML + CSS inline + JS, sem TypeScript e sem bundler em produção; Vite só como dev server e para testes (`npm run dev`, porta 5180).
- React 18.3.1 UMD em `vendor/`, css-tree no loader; Vitest (unit, `npm test`) e Playwright (E2E/perf, `npm run test:e2e`).
- Node 22.22.2+ ou 24.15.0+ com npm 12+ (verificado em Node 24.19.0).
- Não se aplicam do global: IClock, `DateTime`, BenchmarkDotNet, zero-alloc/`Unsafe`/NUMA e path-tiers (.NET). Tier de performance = General; orçamentos em docs/RELEASE-CHECKLIST.md § D, medição em `bench/` e `e2e/`.

## Recursos sem rede (hard)

- Nenhuma requisição externa no carregamento: fontes e React são versionados em `fonts/` e `vendor/` (gerados por `scripts/vendor-assets.py`; não editar `fonts/fonts.css` à mão).
- Única saída de rede: o loader de repositório público do GitHub, iniciado pelo usuário (CSP `connect-src` api.github.com e raw.githubusercontent.com).
- Nunca reintroduzir `<link>` do Google Fonts nem `<script>` do unpkg. As `<script>` de `vendor/` e `lib/` vêm antes de `support.js` no `<head>`; não reordenar.
- Ao mexer no `<head>`: DevTools → Network sem requisições fora de `localhost:5180` no carregamento.

## Git

- Commit gate: `npm test` passando. Ao clonar, rode `bash scripts/install-hooks.sh`; o `pre-push` bloqueia push em develop/master e delega ao hook global (detalhes em docs/LOCAL-SETUP.md).
- Fragmento `changelog.d/<slug>.md` por branch (skill `changelog-draft`), com bloco `### Perf` (measured | estimated | N/A, ≥1 bullet de ≥20 caracteres); CHANGELOG.md só no release.

## Layout

index.html (app) · support.js (runtime gerado) · lib/layers-core.js (lógica pura do loader) · test/ (Vitest) · bench/ e e2e/ (medição) · fixtures/ (projetos-alvo, `?layers=fixtures/<nome>/`) · tools/ (spikes da fatia 5) · scripts/ (vendor-assets, install-hooks) · docs/ (mapa em docs/TOPOLOGY.md e docs/_index.md).

## Testes

- Vitest em `test/`, nomes `Metodo_Cenario_Esperado`; fixtures em `fixtures/`, casos em docs/RELEASE-CHECKLIST.md § E.
- Gates: unit = commit; E2E/perf = manual enquanto não houver CI.

## Estilo

- Prosa PT-BR nos docs (o corpus é PT-BR); comentários de código e commits em EN. Conventional Commits; nunca `Co-Authored-By` nem atribuição a IA.
- index.html é grande: edite com âncoras únicas e confira a contagem de matches antes de substituir.

## Manutenção

- Atualizar docs/ARCHITECTURE.md ao mudar componente, fluxo ou protocolo; docs/LOCAL-SETUP.md ao mexer em fontes, vendor/ ou defaults; docs/RELEASE-CHECKLIST.md e docs/roadmap.md ao concluir; README.md no release; revisar este arquivo a cada 90 dias.
```

(`bench/` e `e2e/` só existem após W3; se W1 mergear antes, manter as menções — W3a/W3b fecham a referência no mesmo ciclo.)

- [ ] **Step 4: Acrescentar a seção ao `docs/LOCAL-SETUP.md`** (antes de "## Reinicie o dev server…")

```markdown
## Hooks do git

- Branch protection no GitHub está inativa (exige GitHub Pro em repo privado); a regra "nunca commitar em develop/master" é local, via `.githooks/pre-push`.
- Este ambiente tem `core.hooksPath` global (`~/.git-hooks`), que vence o `.git/hooks/` do repositório. `bash scripts/install-hooks.sh` aponta `core.hooksPath` para `.githooks/`.
- `.githooks/pre-push` delega ao hook global antes das guardas locais (o gate de `changelog.d` continua valendo) e também recusa referências externas (Google Fonts/unpkg) e alteração de `support.js`.
- O hook é versionado: em uma branch que ainda não tem `.githooks/`, o git não roda hook nenhum, nem o global.
```

- [ ] **Step 5: Remover chaves de modelo por repositório**

Substituir o conteúdo de `.claude/settings.json` por:

```json
{}
```

- [ ] **Step 6: Medir e auditar**

```bash
wc -l -c CLAUDE.md
python -X utf8 ~/.claude/scripts/docs-linkcheck.py "C:/Development/Layers"
npm test
```
Expected: ≤ 60 linhas e ≈ ≤ 1.500 tokens (bytes/4); linkcheck limpo; 128 passed. Rodar também `claude-md-review` e corrigir findings.

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md docs/LOCAL-SETUP.md .claude/settings.json
git commit -m "docs(claude): lean project CLAUDE.md, fix stale facts, move hook mechanics to LOCAL-SETUP (S7.6, #23)"
```

### Task W1.2: Fechar leaf, gates e PR

**Files:** `docs/roadmap.md`, `docs/roadmap.data.json`.

- [ ] **Step 1:** `phase-close-gate`: S7.6 → `done`, rebuild do tracker, commit `docs(roadmap): close S7.6`.
- [ ] **Step 2:** `precheck.py` → `clear`; `git push -u origin docs/<yyMMdd>-23-s7-6-claude-md-lean`; `gh pr create --base develop --title "docs(claude): lean CLAUDE.md (S7.6)" --body "Refs #23."`. Parar para o merge.

---

## W3a — Benchmark com disciplina BDN (leaf S4.3)

### Task W3a.1: Conversor tinybench → `bench.json` (TDD)

**Files:**
- Create: `bench/to-bench-json.js`, `test/bench-convert.test.js`

**Interfaces:**
- Produces: `toBenchJson(raw, meta) -> { schemaVersion, suite, tag, timestampUtc, env, git, benchmarks[] }` onde `raw` é o JSON de `vitest bench --outputJson` (`files[].groups[].benchmarks[]`, tempos em ms) e `meta = { suite, tag, env, git, alloc }`; `alloc` é `{ [benchId]: bytesPerOp }`.

- [ ] **Step 1: Branch + leaf** (mesmo padrão da W1.1 Step 1, slug `feature/<yyMMdd>-23-s4-3-bench-suite`, S4.3 → `in-progress`).

- [ ] **Step 2: Escrever o teste que falha**

```js
// test/bench-convert.test.js
import { describe, it, expect } from 'vitest';
import { toBenchJson } from '../bench/to-bench-json.js';

const raw = {
  files: [{
    filepath: 'bench/core.bench.js',
    groups: [{
      fullName: 'bench/core.bench.js > parseSheet',
      benchmarks: [{ name: 'plain-admin/materialdesignicons', mean: 2.5, sd: 0.1, hz: 400 }],
    }],
  }],
};
const meta = { suite: 'layers-core', tag: 'micro', env: { cpu: 'x' }, git: { sha: 'abc', dirty: false }, alloc: { 'parseSheet/plain-admin/materialdesignicons': 1024 } };

describe('toBenchJson', () => {
  it('Convert_MeanMs_BecomesNs', () => {
    const out = toBenchJson(raw, meta);
    expect(out.schemaVersion).toBe(1);
    expect(out.benchmarks).toEqual([{
      benchId: 'parseSheet/plain-admin/materialdesignicons',
      unit: 'ns',
      value: 2500000,
      stddev: 100000,
      extra: { throughputOpsSec: 400, allocBytesPerOp: 1024 },
    }]);
  });

  it('Convert_NoAlloc_OmitsAllocField', () => {
    const out = toBenchJson(raw, { ...meta, alloc: {} });
    expect(out.benchmarks[0].extra).toEqual({ throughputOpsSec: 400 });
  });

  it('Convert_EmptyRaw_Throws', () => {
    expect(() => toBenchJson({ files: [] }, meta)).toThrow(/no benchmarks/);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run test/bench-convert.test.js`
Expected: FAIL — `Failed to resolve import "../bench/to-bench-json.js"`.

- [ ] **Step 4: Implementar**

```js
// bench/to-bench-json.js
// Converts `vitest bench --outputJson` into the *.bench.json schema read by ~/.claude bench-report.
export function toBenchJson(raw, meta) {
  const benchmarks = [];
  for (const file of raw.files || []) {
    for (const group of file.groups || []) {
      const groupName = group.fullName.split(' > ').pop();
      for (const b of group.benchmarks || []) {
        const benchId = `${groupName}/${b.name}`;
        const extra = { throughputOpsSec: b.hz };
        if (meta.alloc && meta.alloc[benchId] !== undefined) extra.allocBytesPerOp = meta.alloc[benchId];
        benchmarks.push({ benchId, unit: 'ns', value: b.mean * 1e6, stddev: b.sd * 1e6, extra });
      }
    }
  }
  if (benchmarks.length === 0) throw new Error('no benchmarks found in raw output');
  return {
    schemaVersion: 1,
    suite: meta.suite,
    tag: meta.tag,
    timestampUtc: new Date().toISOString(),
    env: meta.env,
    git: meta.git,
    benchmarks,
  };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run test/bench-convert.test.js`
Expected: 3 passed.

- [ ] **Step 6: Commit**

```bash
git add bench/to-bench-json.js test/bench-convert.test.js
git commit -m "feat(bench): convert vitest bench output to bench-report schema (S4.3, #23)"
```

### Task W3a.2: Workloads e benchmarks do core

**Files:**
- Create: `bench/workloads.js`, `bench/core.bench.js`, `vitest.bench.config.js`
- Modify: `package.json` (scripts `bench`)

**Interfaces:**
- Consumes: `core` de `test/setup.js` (`LayersCore` com `parseSheet(file,text,lineOffset)`, `buildIndex(sheets)`, `varIndex(sheets)`, `scopeAst(text, rootClass)`, `patchCssAt(text,selector,prop,value,file)`, `isUtilitySheet(text)`, `mapDcTemplate(text)`, `patchDc(loadText,freshText,list)`, `deriveManifest(files)`, `openZip(buffer)`).
- Produces: `workloads` = `{ css: [{id, file, text}], html: [{id, text}], dc: {text, items}, zip: ArrayBuffer }` com ids estáveis (viram `benchId`).

- [ ] **Step 1: `vitest.bench.config.js`** (isola do `vite.config.js`, que serve fixtures)

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: [],
    benchmark: { include: ['bench/**/*.bench.js'] },
  },
});
```

- [ ] **Step 2: `bench/workloads.js`**

```js
import fs from 'node:fs';
import path from 'node:path';

const root = new URL('../fixtures/', import.meta.url);
const read = (rel) => fs.readFileSync(new URL(rel, root), 'utf8');

function findFile(dir, name) {
  for (const e of fs.readdirSync(new URL(dir + '/', root), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) { const hit = findFile(rel, name); if (hit) return hit; }
    else if (e.name === name) return rel;
  }
  return null;
}

function must(rel, what) {
  if (!rel) throw new Error(`bench workload missing: ${what}`);
  return rel;
}

export function loadWorkloads() {
  const css = [
    { id: 'plain-admin/materialdesignicons', rel: must(findFile('plain-admin', 'materialdesignicons.min.css'), 'materialdesignicons.min.css') },
    { id: 'ecommerce-jsx/app', rel: must(findFile('ecommerce-jsx', 'app.css'), 'ecommerce-jsx app.css') },
    { id: 'traval/components', rel: 'traval/src/styles/components.css' },
    { id: 'axai/painel', rel: 'axai/wwwroot/painel.css' },
  ].map((w) => ({ id: w.id, file: path.basename(w.rel), text: read(w.rel) }));

  const marketview = read('marketview/index.html');
  const inline = [...marketview.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
  if (!inline) throw new Error('bench workload missing: marketview inline <style>');
  css.push({ id: 'marketview/inline', file: 'index.html', text: inline });

  const traval = JSON.parse(read('traval/layers.json'));
  const travalSheets = traval.styles.map((p) => ({ file: path.basename(p), text: read('traval/' + p), lineOffset: 0 }));

  const dcText = read('dc-template/index.html');

  const manifestFiles = [
    { path: 'index.html', kind: 'html', text: read('plain-admin/index.html') },
    { path: 'assets/css/materialdesignicons.min.css', kind: 'css', text: css[0].text },
  ];

  const zipBytes = fs.readFileSync(new URL('zip/evil.zip', root));
  const zip = zipBytes.buffer.slice(zipBytes.byteOffset, zipBytes.byteOffset + zipBytes.byteLength);

  return { css, travalSheets, dcText, manifestFiles, zip };
}
```

- [ ] **Step 3: `bench/core.bench.js`**

```js
import { bench, describe } from 'vitest';
import { core } from '../test/setup.js';
import { loadWorkloads } from './workloads.js';

const w = loadWorkloads();
const opts = { warmupIterations: 5, warmupTime: 200, iterations: 20, time: 1000 };

describe('parseSheet', () => {
  for (const c of w.css) bench(c.id, () => { core.parseSheet(c.file, c.text, 0); }, opts);
});

describe('scopeAst', () => {
  for (const c of w.css) bench(c.id, () => { core.scopeAst(c.text); }, opts);
});

describe('isUtilitySheet', () => {
  for (const c of w.css) bench(c.id, () => { core.isUtilitySheet(c.text); }, opts);
});

describe('buildIndex', () => {
  bench('traval/4-sheets', () => { core.buildIndex(w.travalSheets); }, opts);
});

describe('varIndex', () => {
  bench('traval/4-sheets', () => { core.varIndex(w.travalSheets); }, opts);
});

describe('patchCssAt', () => {
  const c = w.css.find((x) => x.id === 'ecommerce-jsx/app');
  const rules = core.parseSheet(c.file, c.text, 0);
  const sel = rules.find((r) => r.simple && r.decls && r.decls.length)?.selector;
  if (!sel) throw new Error('bench workload missing: simple rule in ecommerce-jsx/app');
  bench('ecommerce-jsx/app/color', () => { core.patchCssAt(c.text, sel, 'color', 'red', c.file); }, opts);
});

describe('mapDcTemplate', () => {
  bench('dc-template/index', () => { core.mapDcTemplate(w.dcText); }, opts);
});

describe('patchDc', () => {
  const map = core.mapDcTemplate(w.dcText);
  const tplId = Object.keys(map).find((k) => map[k].styleRange);
  if (!tplId) throw new Error('bench workload missing: dc element with inline style');
  const item = { tplId, prop: 'padding', to: '12px' };
  bench('dc-template/one-item', () => { core.patchDc(w.dcText, w.dcText, [item]); }, opts);
});

describe('deriveManifest', () => {
  bench('plain-admin/html+css', () => { core.deriveManifest(w.manifestFiles); }, opts);
});

describe('openZip', () => {
  // cold path, ~1 KB archive: kept to catch regressions in the EOCD scan and inflate setup
  bench('zip/evil', async () => {
    const r = await core.openZip(w.zip);
    if (!r.files.length) throw new Error('openZip returned no files');
  }, opts);
});
```

- [ ] **Step 4: Script npm e execução**

Em `package.json`, em `scripts`: `"bench": "node bench/run.mjs"` (criado na W3a.3).

Run: `npx vitest bench --run --config vitest.bench.config.js --outputJson bench/results/raw.json`
Expected: exit 0; tabela com `hz`/`mean` por benchmark; `bench/results/raw.json` existe com `files[].groups[].benchmarks[]` e `mean`/`sd`/`hz` em ms (se a forma diferir, ajustar `toBenchJson` e `test/bench-convert.test.js` juntos). Se `patchCssAt` falhar por seletor sem regra simples, escolher outro seletor com `core.parseSheet(...).find(...)` — a falha é explícita pela mensagem do `throw`.

- [ ] **Step 5: Ignorar saída bruta e commit**

Acrescentar a `.gitignore`: `bench/results/raw.json`. Manter `bench/results/*.bench.json` versionados (histórico imutável).

```bash
git add bench/workloads.js bench/core.bench.js vitest.bench.config.js package.json .gitignore
git commit -m "feat(bench): core microbenchmarks over real fixtures (S4.3, #23)"
```

### Task W3a.3: Sonda de alocação, runner e ingestão

**Files:**
- Create: `bench/alloc.mjs`, `bench/run.mjs`, `bench/results/.gitkeep`
- Create: `changelog.d/feature-<yyMMdd>-23-s4-3-bench-suite.md`
- Modify: `docs/RELEASE-CHECKLIST.md` (§ D: orçamento aponta para `bench/`), `docs/roadmap.md` (S4.3 → done)

**Interfaces:**
- Consumes: `toBenchJson` (W3a.1), `loadWorkloads` (W3a.2).
- Produces: `bench/results/<timestamp>-layers-core.bench.json`; `docs/reports/bench-history/*` via CLI.

- [ ] **Step 1: `bench/alloc.mjs`** (executado com `node --expose-gc`; imprime JSON `{benchId: bytesPerOp}`)

```js
import './../test/setup.js';
import { loadWorkloads } from './workloads.js';

if (typeof global.gc !== 'function') throw new Error('run with node --expose-gc');
const core = globalThis.LayersCore;
const w = loadWorkloads();
const N = 30;

function probe(fn) {
  fn(); // warm
  global.gc();
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < N; i++) fn();
  const after = process.memoryUsage().heapUsed;
  return Math.max(0, Math.round((after - before) / N));
}

const out = {};
for (const c of w.css) {
  out[`parseSheet/${c.id}`] = probe(() => core.parseSheet(c.file, c.text, 0));
  out[`scopeAst/${c.id}`] = probe(() => core.scopeAst(c.text));
}
out['buildIndex/traval/4-sheets'] = probe(() => core.buildIndex(w.travalSheets));
out['mapDcTemplate/dc-template/index'] = probe(() => core.mapDcTemplate(w.dcText));
process.stdout.write(JSON.stringify(out));
```

Nota: `heapUsed` sem GC entre iterações subestima/superestima; é uma aproximação por op documentada (Node não tem `[MemoryDiagnoser]`). Só vale para comparar a mesma máquina e versão do Node.

- [ ] **Step 2: `bench/run.mjs`**

```js
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { toBenchJson } from './to-bench-json.js';

const sh = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: process.platform === 'win32', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}\n${r.stderr}`);
  return r.stdout;
};

fs.mkdirSync('bench/results', { recursive: true });
sh('npx', ['vitest', 'bench', '--run', '--config', 'vitest.bench.config.js', '--outputJson', 'bench/results/raw.json']);
const raw = JSON.parse(fs.readFileSync('bench/results/raw.json', 'utf8'));
const alloc = JSON.parse(sh(process.execPath, ['--expose-gc', 'bench/alloc.mjs']));

const sha = sh('git', ['rev-parse', 'HEAD']).trim();
const dirty = sh('git', ['status', '--porcelain']).trim().length > 0;
const out = toBenchJson(raw, {
  suite: 'layers-core',
  tag: 'micro',
  env: { cpu: os.cpus()[0].model, cores: os.cpus().length, os: `${os.platform()} ${os.release()}`, runtime: `node ${process.version}`, gc: 'V8', tool: 'vitest-bench/tinybench' },
  git: { sha, dirty },
  alloc,
});
const file = `bench/results/${out.timestampUtc.replace(/[:.]/g, '-')}-layers-core.bench.json`;
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${file} (${out.benchmarks.length} benchmarks)`);
```

- [ ] **Step 3: Rodar de ponta a ponta**

Run: `npm run bench`
Expected: `wrote bench/results/<ts>-layers-core.bench.json (N benchmarks)`, exit 0. Rodar duas vezes e comparar `value` do mesmo `benchId`: variação ≪ 5 % (dentro de 2σ); se ruidosa, aumentar `time`/`iterations` em `core.bench.js`.

- [ ] **Step 4: Ingerir e renderizar**

```bash
python ~/.claude/hooks/bench-history-cli.py init --repo .
python ~/.claude/hooks/bench-history-cli.py ingest --repo .
python ~/.claude/hooks/bench-history-cli.py render --repo .
```
Expected: `docs/reports/bench-history/bench-history.md` com a linha de base (`·`, sem delta na 1ª execução). Commit dos artefatos: `bench/results/*.bench.json` e `docs/reports/bench-history/`.

- [ ] **Step 5: Fragmento, checklist e leaf**

`changelog.d/feature-<yyMMdd>-23-s4-3-bench-suite.md` (≤ 2 KB):

```markdown
### Added
- `bench/` suite (vitest bench + tinybench) over `lib/layers-core.js` with warmup, fixed iterations and per-op allocation probe; output as `*.bench.json` for `bench-report`.

### Perf
- measured — baseline numbers recorded in `docs/reports/bench-history/bench-history.md` (first run has no delta); no production code changed.
```

Em `docs/RELEASE-CHECKLIST.md` § D, no item `[~] Budget`, acrescentar "(medição do core: `npm run bench`; UI: ver S4.4)". Marcar S4.3 `done` no manifest, rebuild do tracker.

- [ ] **Step 6: Gates e PR**

```bash
npm test
python -X utf8 ~/.claude/scripts/gates/precheck.py --root "$(git rev-parse --show-toplevel)"
git push -u origin feature/<yyMMdd>-23-s4-3-bench-suite
gh pr create --base develop --title "feat(bench): core benchmark suite with BDN discipline (S4.3)" --body "Refs #23."
```
Expected: 131 passed (128 + 3); `clear`. Revisão da metodologia por `adversarial-reviewer` antes do push. Parar para o merge.

---

## W3b — Testes de performance de UI (leaf S4.4)

### Task W3b.1: Config do Playwright e helpers de medição

**Files:**
- Create: `playwright.config.js`, `e2e/perf-helpers.js`
- Modify: `package.json` (sem novo script; `test:e2e` já existe), `.gitignore` (`test-results/`, `playwright-report/`)

**Interfaces:**
- Produces (`e2e/perf-helpers.js`): `instrument(page)` — instala via `addInitScript` o contador de rAF e o observador de longtask e envolve `getComputedStyle`; `scanBursts(page)` → `[{ count, ms }]`; `frameStats(page, steps)` → `{ fps, p95FrameMs, frames }`; `writeBench(results)` → grava `bench/results/<ts>-layers-ui.bench.json`.

- [ ] **Step 1: Branch + leaf** (S4.4 → `in-progress`, slug `feature/<yyMMdd>-23-s4-4-ui-perf-tests`).

- [ ] **Step 2: Garantir o Chromium compatível** (precisa de rede e de aprovação do usuário)

Run: `npx playwright install chromium`
Expected: baixa a build que o Playwright 1.63 espera; sem isso o teste falha com "Executable doesn't exist".

- [ ] **Step 3: `playwright.config.js`**

```js
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://localhost:5180', viewport: { width: 1280, height: 760 }, browserName: 'chromium' },
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
```

- [ ] **Step 4: `e2e/perf-helpers.js`**

```js
import fs from 'node:fs';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Runs before any page script: wraps getComputedStyle (scan() calls it once per node) and records
// longtasks. A "burst" is a run of getComputedStyle calls with gaps < 100 ms.
export async function instrument(page) {
  await page.addInitScript(() => {
    const w = window;
    w.__perf = { bursts: [], longtasks: [] };
    const orig = w.getComputedStyle.bind(w);
    let cur = null;
    w.getComputedStyle = function (...a) {
      const t = performance.now();
      if (!cur || t - cur.last > 100) { cur = { start: t, last: t, count: 0 }; w.__perf.bursts.push(cur); }
      cur.last = t; cur.count++;
      return orig(...a);
    };
    new PerformanceObserver((l) => { for (const e of l.getEntries()) w.__perf.longtasks.push(e.duration); })
      .observe({ type: 'longtask', buffered: true });
  });
}

export async function waitForScan(page, minNodes = 5, timeout = 20_000) {
  await page.waitForFunction((n) => {
    const b = window.__perf.bursts;
    return b.length && b[b.length - 1].count >= n && performance.now() - b[b.length - 1].last > 400;
  }, minNodes, { timeout });
  return page.evaluate(() => {
    const b = window.__perf.bursts.reduce((m, x) => (x.count > m.count ? x : m));
    return { nodes: b.count, ms: b.last - b.start };
  });
}

// Drives a real orbit drag from inside the page, one mousemove per animation frame.
export async function orbitFps(page, frames = 90) {
  return page.evaluate(async (n) => {
    const stage = [...document.querySelectorAll('div[tabindex="0"]')].find((el) => getComputedStyle(el).backgroundImage.includes('radial-gradient'));
    if (!stage) throw new Error('stage element not found');
    const r = stage.getBoundingClientRect();
    const x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
    const fire = (type, x, y) => stage.dispatchEvent(new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0 }));
    const times = [];
    fire('mousedown', x0, y0);
    await new Promise((resolve) => {
      let i = 0, last = performance.now();
      const step = (t) => {
        times.push(t - last); last = t;
        fire('mousemove', x0 + (i % 60) * 2, y0 + Math.sin(i / 8) * 40);
        if (++i < n) requestAnimationFrame(step); else resolve();
      };
      requestAnimationFrame(step);
    });
    fire('mouseup', x0, y0);
    times.shift();
    if (times.length < n - 2) throw new Error('rAF did not run (hidden tab?)');
    const sorted = [...times].sort((a, b) => a - b);
    const mean = times.reduce((a, b) => a + b, 0) / times.length;
    return { fps: 1000 / mean, p95FrameMs: sorted[Math.floor(sorted.length * 0.95)], frames: times.length };
  }, frames);
}

export function writeBench(benchmarks) {
  const sha = execSync('git rev-parse HEAD').toString().trim();
  const dirty = execSync('git status --porcelain').toString().trim().length > 0;
  const ts = new Date().toISOString();
  const out = {
    schemaVersion: 1, suite: 'layers-ui', tag: 'latency', timestampUtc: ts,
    env: { cpu: os.cpus()[0].model, cores: os.cpus().length, os: `${os.platform()} ${os.release()}`, runtime: 'chromium (playwright)', gc: 'V8', tool: 'playwright' },
    git: { sha, dirty }, benchmarks,
  };
  fs.mkdirSync('bench/results', { recursive: true });
  const file = `bench/results/${ts.replace(/[:.]/g, '-')}-layers-ui.bench.json`;
  fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  return file;
}
```

- [ ] **Step 5: Commit**

```bash
git add playwright.config.js e2e/perf-helpers.js .gitignore
git commit -m "test(e2e): playwright config and perf instrumentation helpers (S4.4, #23)"
```

### Task W3b.2: Cenários de performance e orçamentos

**Files:**
- Create: `e2e/perf.spec.js`, `changelog.d/feature-<yyMMdd>-23-s4-4-ui-perf-tests.md`
- Modify: `docs/RELEASE-CHECKLIST.md` (§ D e § E L62), `docs/roadmap.md` (S4.4 → done; S5.6 permanece registered com nota "infra pronta")

**Interfaces:** Consumes `instrument`, `waitForScan`, `orbitFps`, `writeBench`.

- [ ] **Step 1: Escrever o spec**

```js
import { test, expect } from '@playwright/test';
import { instrument, waitForScan, orbitFps, writeBench } from './perf-helpers.js';

const results = [];
const rec = (benchId, value, unit = 'ms') => results.push({ benchId, unit, value, stddev: 0, extra: {} });

test.describe.configure({ mode: 'serial' });

test('Load_TravalFixture_ReportsFirstScan', async ({ page }) => {
  await instrument(page);
  const t0 = Date.now();
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page);
  rec('load/traval/first-scan-ms', scan.ms);
  rec('load/traval/wall-ms', Date.now() - t0);
  rec('load/traval/nodes', scan.nodes, 'count');
  expect(scan.nodes).toBeGreaterThan(100);
});

test('Scan_1500Nodes_UnderBudget', async ({ page }) => {
  await instrument(page);
  // Replicate the real Traval mock body until ~1,500 elements; nothing new is committed.
  await page.route('**/fixtures/traval/layers/mock.html', async (route) => {
    const res = await route.fetch();
    const html = await res.text();
    const m = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    if (!m) throw new Error('traval mock has no <body>');
    const perCopy = (m[1].match(/<[a-z][^>]*>/gi) || []).length;
    const copies = Math.max(1, Math.ceil(1500 / perCopy));
    await route.fulfill({ body: html.replace(m[1], m[1].repeat(copies)), contentType: 'text/html' });
  });
  await page.goto('/?layers=fixtures/traval/');
  const scan = await waitForScan(page, 1000, 40_000);
  rec('scan/1500-nodes-ms', scan.ms);
  rec('scan/1500-nodes-count', scan.nodes, 'count');
  expect(scan.nodes).toBeGreaterThanOrEqual(1000);
  expect(scan.ms, `scan of ${scan.nodes} nodes`).toBeLessThan(300);
});

test('Orbit_DragOnStage_Above50Fps', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const o = await orbitFps(page, 90);
  rec('orbit/traval/fps', o.fps, 'fps');
  rec('orbit/traval/p95-frame-ms', o.p95FrameMs);
  expect(o.fps, `p95 frame ${o.p95FrameMs.toFixed(1)} ms`).toBeGreaterThan(50);
});

test('Explode_Toggle_ReportsFrameCost', async ({ page }) => {
  await instrument(page);
  await page.goto('/?layers=fixtures/traval/');
  await waitForScan(page);
  const ms = await page.evaluate(async () => {
    const btn = [...document.querySelectorAll('button')].find((b) => /explodid/i.test(b.textContent || ''));
    if (!btn) throw new Error('Explodido button not found');
    const t0 = performance.now();
    btn.click();
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    return performance.now() - t0;
  });
  rec('explode/traval/toggle-ms', ms);
});

test.afterAll(() => {
  const file = writeBench(results);
  console.log(`wrote ${file}`);
});
```

- [ ] **Step 2: Rodar**

Run: `npx playwright test e2e/perf.spec.js`
Expected: 4 testes; os dois com orçamento passam ou falham **com o número** (`scan of N nodes`, `p95 frame`). O botão "Explodido" é localizado por texto; se o rótulo diferir, `grep -n "Explodido" index.html | head -3` e ajustar a regex — a falha é explícita (`Explodido button not found`).

- [ ] **Step 3: Estabilidade** — rodar 3 vezes seguidas: `for i in 1 2 3; do npx playwright test e2e/perf.spec.js; done`. Expected: mesmo veredito nas 3; se `orbit` oscilar perto de 50 fps, registrar a causa (rAF em headless) no relatório em vez de relaxar o orçamento.

- [ ] **Step 4: Ingestão e docs**

```bash
python ~/.claude/hooks/bench-history-cli.py ingest --repo .
python ~/.claude/hooks/bench-history-cli.py render --repo .
```
`docs/RELEASE-CHECKLIST.md`: em § D, no item Budget, trocar "medir com os `bench/` no padrão do Traval" por "medido por `npm run bench` (core) e `npx playwright test e2e/perf.spec.js` (UI)"; em § E L62, anotar "infra Playwright pronta (S4.4); faltam specs funcionais". Fragmento:

```markdown
### Added
- `playwright.config.js` and `e2e/perf.spec.js`: load, 1,500-node scan (< 300 ms), orbit (> 50 fps) and explode timing against real fixtures, results ingested as `*.bench.json`.

### Perf
- measured — see docs/reports/bench-history/bench-history.md; instrumentation lives in the test harness only, `index.html` untouched.
```

- [ ] **Step 5: Gates, leaf e PR**

```bash
npm test
python -X utf8 ~/.claude/scripts/gates/precheck.py --root "$(git rev-parse --show-toplevel)"
```
`phase-close-gate` (S4.4 → `done`), `git push -u origin feature/<yyMMdd>-23-s4-4-ui-perf-tests`, `gh pr create --base develop --title "test(e2e): UI performance tests with budgets (S4.4)" --body "Refs #23."`. Revisão da metodologia (Architect) antes do push. Parar para o merge e então `post-merge-close` (fecha #23 quando todas as frentes mergearem).

---

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| W0.1 | gen | Mechanical | Executor | comandos git + resumo; chamador valida SHAs com `git cat-file` e `exit_code` |
| W0.2, W0.3 | gen | Standard | Workhorse | cherry-pick com conflitos e ação destrutiva sob confirmação |
| W2.1, W2.2 | gen | Standard | Workhorse | redação do manifest/config e gates |
| W1.1, W1.2 | gen | Standard | Workhorse | edição de docs com verificação factual |
| W3a.1, W3a.2, W3a.3 | gen | Standard | Workhorse | código novo de teste/bench, sem hot path de produção |
| W3b.1, W3b.2 | gen | Standard | Workhorse | specs Playwright e instrumentação |
| W3a.3, W3b.2. revisão da metodologia de medição | review | Architectural | Architect | alto custo de erro: número enganoso vira orçamento |
| Pre-merge review (cada PR) | review | Architectural | Architect | verifier ≥ generator |

> [!DECISION] gh-issue-gate
> Issue-worthy: **Yes** — decidido e criado: [#23](https://github.com/brunomaida/Layers/issues/23) `chore: roadmap, lean CLAUDE.md, UI perf tests and benchmark suite`.

> [!DECISION] phase-intake
> Classification: **macro bootstrap** — W2 cria a árvore S1–S8; W1 = leaf `S7.6`, W3a = `S4.3`, W3b = `S4.4`, W2 = `S7.5`, target **Unreleased**.
> Current tree: (inexistente até W2).
> Fork of an existing row? **No**.
> - **Option A**: W2 primeiro, depois as leaves das demais frentes (recommended; adotada)
> - **Option B**: executar sem leaf e registrar depois (viola "leaf antes da branch")

> [!DECISION] execution
> Method: **Native** (inline; W0.1 vai ao subagente `executor`). Frentes são sequenciais por dependência de leaf e de merge.
