---
title: "S7.4 — docs/shortcuts.md: atalhos e interações"
type: plan
solution: Layers
status: draft
created: 2026-10-16
---

# S7.4 — `docs/shortcuts.md` (atalhos e interações) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** fechar o item G "Atalhos e interações" do [checklist de release](../../RELEASE-CHECKLIST.md) com um `docs/shortcuts.md` novo. O doc traz as tabelas do painel `?`, iguais a `LayersCore.SHORTCUTS`, e uma seção "Contextos" com o que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus. As interações de projeto ficam num link para `docs/layers-json.md`. A guarda Vitest `test/shortcuts.test.js` impede a deriva entre o doc e o registro; a cobertura handler ↔ painel fica no teste `KeyMap › TeclaComHandler_EstaNoPainel` da S3.3, provado por mutação no Task 1 Step 0.

**Architecture:** o registro `LayersCore.SHORTCUTS` (movido para `lib/layers-core.js` pela S3.3) é a fonte única. As tabelas de `docs/shortcuts.md` são geradas dele por um comando `node` e coladas no doc; a guarda compara grupos e linhas, ordem incluída. A cobertura handler ↔ painel não é duplicada aqui: vive no teste `KeyMap` da S3.3 (uma só tabela de tokens). A prosa fora de `## Atalhos` é livre.

**Tech Stack:** Markdown (PT-BR), Vitest.

**Contexto:** [plano geral da Onda 3](2026-10-16-layers-plano-geral-da-onda-3.md) (§ Esboço por leaf, decisão D5); [plano da S3.3](2026-10-16-s3-3-action-tooltips.md); leaf S7.4 no [roadmap](../../roadmap.md).

## Pré-condições

- **Branch do plano geral `docs/261016-0-wave-3-plan` mesclada em `develop`.** Este plano chega à leaf por `origin/develop`; a leaf nunca copia arquivos de plano de outra ref (`git checkout <ref> -- docs/...`).
- **S3.3 mesclada em `develop`.** Ela move `SHORTCUTS` para o core como `LayersCore.SHORTCUTS` (com `ACTIONS`/`tooltip`), deriva o `onKey` do registro, acrescenta as linhas `M` (medir) e `=` (alias de zoom) e o Esc completo (D5), e traz o teste `KeyMap › TeclaComHandler_EstaNoPainel` endurecido (células com `(` fora do conjunto de tokens, célula exata `Esc` exigida, teclas das ações `global` e `ctrl`). O contrato abaixo é o esperado do plano da S3.3, e o Task 1 Step 0 o confere.
- **S7.3 mesclada em `develop`.** Ela traz `docs/support-matrix.md` (modelo de doc `type: reference`), a linha `docs/support-matrix.md` em README › Estrutura e o item G "Matriz de suporte" fechado. O padrão do checklist e do fragmento vem dela.

Contrato consumido (Task 1 Step 0 confere):

| Símbolo | Forma esperada | Uso |
|---|---|---|
| `LayersCore.SHORTCUTS` | `Array<[grupo: string, linhas: Array<[teclas: string, descrição: string]>]>`, a forma da constante de hoje (`index.html`, `shortcutGroups` a mapeia no `render`) | tabelas do doc e guarda |
| `KeyMap › TeclaComHandler_EstaNoPainel` (`test/layers-core.test.js`, da S3.3) | toda tecla das ações `global` e `ctrl` de `ACTIONS` vira token presente nas células de teclas, sem as células com `(`; célula exata `Esc` exigida | cobertura handler ↔ painel, provada pelas mutações M-a, M-b, M-c e M-h |

## Global Constraints

- Branch `docs/261016-0-s7-4-shortcuts-doc` (stem = este plano), num worktree próprio criado de `origin/develop` (já com o plano geral, S3.3 e S7.3), seguido de `npm ci`. Nunca commitar em `develop` ou `master`.
- Nenhum código de runtime muda: `index.html`, `lib/layers-core.js` e `support.js` intocados (as mutações do Task 1 e do Task 2 são revertidas antes de qualquer commit). Visual congelado.
- Docs, README, checklist e fragmento em PT-BR; comentários de teste e commits em EN. Testes `Metodo_Cenario_Esperado`.
- Tabelas de `## Atalhos` iguais ao registro, letra por letra: o "Ctrl/Cmd" vai na prosa acima das tabelas, nunca nas células (as células dizem `Ctrl + Z`). Nenhuma célula com `|`: a guarda divide as linhas por `|`.
- Frontmatter só de metadados (`title`/`type: reference`/`solution: Layers`/`created`); nada de `related:`; links relativos no corpo. `docs/_index.md` só pelo hook ou por `retrofit_docs.py`, nunca à mão.
- Âncoras por texto, nunca por número de linha: S4.7, S3.3 e S3.4 deslocam `index.html` e o checklist. **Não editar a linha 8 do checklist** (contador): a recontagem é única, na Task E do plano geral.
- `npm test` verde antes de cada commit. Conventional Commits em EN terminando em `(S7.4)`, sem trailer no texto dos comandos de commit (regra única da Onda 3: o harness acrescenta o trailer exigido), sem `Co-Authored-By`.
- Nunca `git add bench/results` por inteiro: os resultados locais de bench ficam fora dos commits desta leaf.
- Fragmento `changelog.d/docs-261016-0-s7-4-shortcuts-doc.md` com `### Perf` (≥20 caracteres).

## Review Focus

- **Registro no core.** Se a S3.3 não moveu `SHORTCUTS` (`const SHORTCUTS = [` ainda em `index.html`), o Step 0 do Task 1 para e cai no fallback documentado: avaliar `const SHORTCUTS = [ … ];` de `index.html` dá 7 grupos e 51 linhas em `develop@0da02d6`. O fallback é desvio de plano e vai ao usuário antes de ser codificado.
- **`=` literal.** A linha `=` é própria da S3.3 (Task 2 Step 3 do plano dela) e `zoomIn.keys` contém `'='`. O teste `KeyMap` da S3.3 não tem alias: sem a linha `=`, ele fica vermelho, de acordo com D5 (que pede a linha `=` em `SHORTCUTS`). O plano geral não prevê alias. Ver decisão abaixo.
- **Handler ↔ painel só na S3.3.** A guarda de teclas desta leaf saiu: repetia `TeclaComHandler_EstaNoPainel` (mesma tabela de tokens, mesma fonte `global` + `ctrl`) e deixava passar remoções (a linha `Esc` de Seleção, porque `Esc (no campo)` fornecia o token `ESC`; `Ctrl + Z`, porque `Ctrl + Shift + Z` fornecia `Z`). Remover e citar o teste endurecido da S3.3 custa menos que endurecer uma cópia: uma tabela de tokens só, sem sincronia entre duas. Se a mutação M-h do Task 1 Step 0 passar verde, a S3.3 não endureceu o teste: parar e reportar (leaf de correção da S3.3), sem reintroduzir a guarda aqui.
- **Guarda vermelha pelo motivo certo.** Com a S3.3 mesclada, só `Shortcuts_DocTables_MatchShortcutsConstant` falha antes do Task 2 (doc ausente); `Shortcuts_ChecklistG_ClosedOnlyWithDoc` já passa.
- **Contextos certos.** Esc no prompt "Aplicar em" equivale a "Só este" (`decide(false)`), não a cancelar. `R` com diff, modal ou prompt aberto só mostra toast; o painel `?` aberto não bloqueia; sem pasta conectada ou durante uma carga, `R` não faz nada. Num `<select>`, Ctrl/Cmd+Z ainda desfaz o ajuste global; num campo de texto, fica com o navegador.
- **Esc no campo de propriedade.** O registro diz `Esc (no campo) | descartar a edição`, mas o handler `key:` do campo chama `delBuf(k)` e depois `e.target.blur()`. O `onBlur` (`p.commit`) roda dentro do mesmo keydown e lê o `s.buf[k]` do render anterior, onde o valor ainda existe; `applyEdit` pode aplicá-lo. Nenhum teste cobre. O Task 2 Step 1 confere no navegador; se o valor for aplicado, a prosa não diz "descarta" (decisão abaixo).
- **Esc completo na linha do registro.** A guarda não confere a descrição do Esc; a ordem da cascata fica na prosa de "Contextos", relida de `escape()` no Task 2 Step 1.

## Design: Architecture & Flows

```
lib/layers-core.js  LayersCore.SHORTCUTS  (S3.3: fonte única)
     │                               │
     │ render(): shortcutGroups      │ node: gera as tabelas (Task 2 Step 2)
     ▼                               ▼
painel ? (index.html)          docs/shortcuts.md
                                ├── ## Atalhos  ── ### <grupo> + tabela "Tecla ou gesto | Ação"
                                │                   (igual ao registro, ordem incluída)
                                ├── ## Contextos ─ prosa livre (campos, Esc, Ctrl/Cmd+Enter, R, menus)
                                └── link ──▶ docs/layers-json.md § interactions, § attr

test/shortcuts.test.js
  DocTables:   ## Atalhos ── parse ──▶ [[grupo, [[teclas, desc]…]]…]  ==  LayersCore.SHORTCUTS
  ChecklistG:  item G "Atalhos e interações (exportar…" com [x] ⇒ linha linka (shortcuts.md)
test/layers-core.test.js (S3.3, só mutação no Task 1 Step 0)
  KeyMap › TeclaComHandler_EstaNoPainel: teclas global + ctrl ── token ──▶ células de teclas
```

## Implementation Outline

- **Task 0** — abrir a leaf no tracker.
- **Task 1** — contrato e guarda primeiro (vermelha).
- **Task 2** — escrever `docs/shortcuts.md` (guarda verde).
- **Task 3** — links, checklist e fragmento.
- **Task 4** — fechamento.

## Critical Files

`lib/layers-core.js` (`SHORTCUTS`, só leitura), `index.html` (só leitura: `onKey`, `escape()`, `reloadProject`, `menuEscape`, handlers locais `key`/`treeQKey`/`propQKey`/`pcKey`/`histRepoKey`, `H.click`/`H.dbl`, `onWheel`/`onDown`/`onStageDbl`), `test/setup.js` (import do core), `test/layers-core.test.js` (teste `KeyMap` da S3.3, só mutação revertida), `test/shortcuts.test.js`, `docs/shortcuts.md`, `README.md`, `docs/RELEASE-CHECKLIST.md`, `docs/roadmap.md`, `docs/layers-json.md` (alvo dos links, só leitura), `changelog.d/docs-261016-0-s7-4-shortcuts-doc.md`.

### Task 0: Abrir a leaf no tracker

Pré-condição: branch do plano geral `docs/261016-0-wave-3-plan` mesclada em `develop` (este plano já está em `origin/develop`). A S7.4 já está registrada: `roadmap.config.json` já a lista como membro de `S7` e a linha em `docs/roadmap.md` está `registered`. Este task só liga o plano e marca `in-progress`; a config fica intocada.

**Files:**
- Modify: `docs/roadmap.md` (linha S7.4), `docs/roadmap.data.json` (rebuild)

- [ ] **Step 1: Criar o worktree**

Invocar `branch-lifecycle` antes de criar a branch e rodar o gate que ele indicar.

```bash
git fetch origin
git worktree add ../Layers-s7-4 -b docs/261016-0-s7-4-shortcuts-doc origin/develop
cd ../Layers-s7-4
npm ci
test -f docs/superpowers/plans/2026-10-16-s7-4-shortcuts-doc.md && echo PLAN-OK
```

Verificar: `git branch --show-current` imprime `docs/261016-0-s7-4-shortcuts-doc` e o último comando imprime `PLAN-OK`. Sem `PLAN-OK`, a branch do plano geral não foi mesclada: parar e reportar; nunca trazer o plano com `git checkout <ref> -- docs/...`.

- [ ] **Step 2: Ligar o plano e marcar `in-progress`**

Âncora: `grep -c '^| S7.4 | 2 | S7 | docs/shortcuts.md | checklist G | — | — | — | — | registered |$' docs/roadmap.md` imprime `1`. Trocar a linha por:

```md
| S7.4 | 2 | S7 | docs/shortcuts.md | checklist G | — | [](superpowers/plans/2026-10-16-s7-4-shortcuts-doc.md) | — | — | in-progress |
```

- [ ] **Step 3: Rebuild e commit**

```bash
python ~/.claude/design/_build_proto.py .
git status --short
npm test
git add docs/roadmap.md docs/roadmap.data.json
git commit -m "docs: open the S7.4 leaf in the tracker (S7.4)"
```

Expected: `git status --short` lista só ` M docs/roadmap.md` e ` M docs/roadmap.data.json`; `npm test` PASS.

### Task 1: Contrato e guarda primeiro (vermelha)

**Files:**
- Create: `test/shortcuts.test.js`

**Interfaces:**
- Consumes: `core` de `./setup.js` (mesmo import de `test/layers-core.test.js`); `core.SHORTCUTS`.

- [ ] **Step 0: Fixar o contrato na ponta da branch**

```bash
node --input-type=module -e "import * as c from 'css-tree'; globalThis.csstree = c; await import('./lib/layers-core.js'); const S = globalThis.LayersCore.SHORTCUTS; console.log(Array.isArray(S), S && S.length, S && S.reduce((a, g) => a + g[1].length, 0))"
grep -c 'const SHORTCUTS = \[' index.html
grep -c 'TeclaComHandler_EstaNoPainel' test/layers-core.test.js
```

Expected: `true <grupos> <linhas>` com linhas ≥ 53 (51 de hoje + `M` + `=`); `const SHORTCUTS = [` em `index.html` dá `0`; o teste da S3.3 existe (`1`). Referência: em `develop@0da02d6` (sem S3.3) imprime `false undefined undefined`, `1` e `0`. Se `SHORTCUTS` não é array ou o teste da S3.3 falta: parar e reportar (fallback do Review Focus).

Mutações do teste handler ↔ painel da S3.3, uma por vez, editando `lib/layers-core.js` à mão e rodando `npx vitest run test/layers-core.test.js -t TeclaComHandler`:
- M-a: apagar a linha `M` de `SHORTCUTS` → FAIL citando `m`.
- M-b: tirar o token `=` da célula que o contém → FAIL citando `=`.
- M-c: trocar `PgUp / PgDn` por `PageUp / PageDown` → FAIL citando `PageUp` e `PageDown`.
- M-h: apagar a linha `Esc` de `### Seleção` → FAIL citando `Escape` (a célula `Esc (no campo)` não conta).

Depois de cada uma: `git checkout -- lib/layers-core.js`. Expected final: `git status --short lib/` vazio. Mutação que passar verde = teste da S3.3 não endurecido: parar e reportar (leaf de correção da S3.3), sem ajustar a mutação e sem guarda de teclas nesta leaf.

- [ ] **Step 1: Escrever a guarda**

`test/shortcuts.test.js`:

```js
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { core } from './setup.js';

// S7.4: docs/shortcuts.md mirrors LayersCore.SHORTCUTS; handler-to-panel coverage is S3.3's KeyMap test
const root = path.resolve(import.meta.dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const HEADER = '| Tecla ou gesto | Ação |';
const registry = () => {
  expect(Array.isArray(core.SHORTCUTS), 'LayersCore.SHORTCUTS missing: is S3.3 merged?').toBe(true);
  return core.SHORTCUTS;
};
const tables = (md) => {
  const sec = md.split(/^## /m).find((s) => s.startsWith('Atalhos\n')) || '';
  return sec.split(/^### /m).slice(1).map((s) => {
    const [title, ...lines] = s.split('\n');
    const t = lines.filter((l) => l.startsWith('|'));
    expect(t[0], `header of ${title}`).toBe(HEADER);
    return [title.trim(), t.slice(2).map((l) => l.slice(1, -1).split('|').map((c) => c.trim()))];
  });
};

describe('shortcuts doc', () => {
  it('Shortcuts_DocTables_MatchShortcutsConstant', () => {
    const reg = registry();
    expect(JSON.stringify(reg).includes('|'), 'a SHORTCUTS cell contains |').toBe(false);
    expect(fs.existsSync(path.join(root, 'docs/shortcuts.md')), 'docs/shortcuts.md missing').toBe(true);
    expect(tables(read('docs/shortcuts.md'))).toEqual(reg.map(([g, rows]) => [g, rows.map(([k, d]) => [k, d])]));
  });

  it('Shortcuts_ChecklistG_ClosedOnlyWithDoc', () => {
    const line = read('docs/RELEASE-CHECKLIST.md').split('\n').find((l) => l.includes('Atalhos e interações (exportar'));
    expect(line, 'checklist G item').toBeDefined();
    if (/^- \[[xX]\]/.test(line)) expect(line).toContain('(shortcuts.md)');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run test/shortcuts.test.js`
Expected: FAIL só em `Shortcuts_DocTables_MatchShortcutsConstant` (`docs/shortcuts.md missing`); a outra PASS. Sem commit neste task (o gate exige `npm test` verde; a guarda entra com o doc no Task 2).

### Task 2: Escrever `docs/shortcuts.md`

**Files:**
- Create: `docs/shortcuts.md`
- Modify (hook): `docs/_index.md`
- Commit também: `test/shortcuts.test.js` (Task 1)

- [ ] **Step 1: Reconferir os contextos na ponta da branch**

Ler em `index.html`, por nome e não por linha: `this.onKey` (o que é campo de texto; Ctrl/Meta antes das teclas simples), `escape()` (ordem da cascata), `reloadProject` (toast e modal de confirmação), `menuEscape`, os handlers `key:` do campo de propriedade, `treeQKey`, `propQKey`, `pcKey`, a `key:` do textarea de regra, `histRepoKey`, `H.click`/`H.dbl`, `onWheel`, `onDown`, `onStageDbl`. Expected: os fatos da seção Contextos do Step 3 batem; divergência vira texto corrigido e nota no relatório.

```bash
grep -n "this.onKey = \|  escape() {\|menuEscape = \|treeQKey: \|propQKey: \|pcKey: \|histRepoKey: \|onStageDbl: \|onWheel: \|onDown: " index.html | cut -c1-120
```

Conferência no navegador do Esc no campo de propriedade (nenhum teste cobre): `npm run dev`, abrir `http://localhost:5180/?layers=fixtures/<nome>/`, selecionar um elemento, digitar um valor novo num campo de propriedade, apertar Esc e olhar o painel Ajustes (valor do campo e marca de editada). Expected, um de dois:
- Valor descartado: a prosa de Campos de texto diz "Esc descarta a edição".
- Valor aplicado: a prosa não diz "descarta"; descreve o que acontece e registra que diverge da linha `Esc (no campo) | descartar a edição` (a tabela fica igual ao registro por causa da guarda). A divergência vai ao relatório, abre-se uma leaf de correção (runtime do campo ou linha da S3.3) e a escolha vai ao usuário (decisão "Esc no campo de propriedade").

- [ ] **Step 2: Gerar as tabelas do registro**

```bash
node --input-type=module -e "import * as c from 'css-tree'; globalThis.csstree = c; await import('./lib/layers-core.js'); for (const [g, rows] of globalThis.LayersCore.SHORTCUTS) { console.log('### ' + g + '\n\n| Tecla ou gesto | Ação |\n|---|---|'); for (const [k, d] of rows) console.log('| ' + k + ' | ' + d + ' |'); console.log(''); }" > /tmp/s7-4-tables.md
```

Expected: um bloco `### <grupo>` por grupo, na ordem do registro.

- [ ] **Step 3: Escrever o doc**

Estrutura (prosa PT-BR final; o bloco gerado no Step 2 entra inteiro sob `## Atalhos`, sem retoque):

```md
---
title: "LAYERS — Atalhos e interações"
type: reference
solution: Layers
created: <data do Task 2>
---

# LAYERS — Atalhos e interações

Conteúdo do painel `?` do editor (a tecla `?` abre e fecha o painel) e o que ele não diz: onde as teclas não valem, a ordem do Esc, os campos com teclas próprias e os menus. As ações que cada projeto define no menu ⚡ Interagir estão em <link layers-json.md § interactions>.

Ctrl vale também como Cmd no macOS: o editor trata Meta como Ctrl nos atalhos de teclado e no arrasto. As tabelas repetem o painel ao pé da letra e por isso dizem só Ctrl.

## Atalhos

Geradas de `LayersCore.SHORTCUTS` (`lib/layers-core.js`); `test/shortcuts.test.js` falha se divergirem.

<bloco de /tmp/s7-4-tables.md>

## Contextos

### Campos de texto
### Esc em cascata
### Ctrl/Cmd + Enter
### Recarregar com `R`
### Menus
### Interações do projeto

## Como manter
```

Conteúdo de cada seção de Contextos (fatos de `develop@0da02d6`, reconferidos no Step 1):
- **Campos de texto:** com o foco em qualquer controle de formulário (`<input>` de qualquer tipo, `<textarea>`, `<select>`), nenhuma tecla simples dispara. Ctrl/Cmd+Z e Ctrl/Cmd+Y ficam com o navegador num campo de texto e num `<textarea>`. Em controles não textuais (slider, cor, checkbox) e no `<select>`, Ctrl/Cmd+Z/Y desfazem e refazem o ajuste global, e o Esc não faz nada (o `onKey` ignora controles de formulário e eles não têm handler próprio). Com Ctrl ou Cmd pressionado, as teclas simples não disparam. Campo de propriedade: Enter aplica; o Esc segue a conferência do Step 1 ("descarta a edição" só se o navegador confirmar; senão, o comportamento real e a nota de divergência com a linha do painel). ⌕ Buscar camada e ⌕ Buscar propriedade: Esc limpa a busca e sai do campo. Campo do repositório GitHub: Enter registra, Esc cancela.
- **Esc em cascata:** vale com o foco fora dos controles de formulário (num campo de texto, age o Esc do próprio campo; em slider, cor, checkbox e `<select>`, o Esc não faz nada). Cada Esc fecha só o primeiro item aberto, nesta ordem: 1. painel de atalhos; 2. prompt "Aplicar em" (Esc equivale a "Só este"); 3. diff; 4. modal; 5. dropdown de valor; 6. menu (o foco volta ao gatilho se estava dentro do menu); 7. isolamento (sai e recentra); 8. camada solo; 9. seleção (volta à raiz e à camada 0).
- **Ctrl/Cmd + Enter:** nos textareas de código: regra (Elementos), elemento (Hierarquia) e painel Propriedades, aplica o código; Esc só sai do campo.
- **Recarregar com `R`:** sem pasta conectada, não faz nada; durante uma carga, também não. Com diff, modal ou prompt "Aplicar em" aberto, só avisa ("feche o painel aberto antes de recarregar"); o painel `?` aberto não bloqueia. Com edições não salvas, pede confirmação ("Recarregar projeto?") e descarta as edições ao confirmar.
- **Menus:** Projetos, Aparência, ⚡ Interagir e Ações abrem por hover e fixam por clique. Fecham com Esc, clique fora, foco saindo, item de ação ou 260 ms depois de o mouse sair (se não fixados). Tab e Enter são os nativos do navegador; não há navegação por setas nos itens.
- **Interações do projeto:** alt + clique (ou o modo ⚡ Interagir) dispara o clique nativo do elemento no mock; nesse modo, o duplo clique no palco não isola (na linha da árvore, o duplo clique continua isolando). Os chips (`toggle`, `show`, `hide`, `class`, `click`, `attr`, `hint`) estão em <link layers-json.md § interactions>, e a ação `attr` em <link layers-json.md § attr>.
- **Como manter:** mudar um atalho = editar `LayersCore.SHORTCUTS` e o handler juntos, regenerar as tabelas com o comando `node` do plano da S7.4 (citado pelo caminho, em backticks), rodar `npm test`.

Links do corpo (relativos a `docs/`): `layers-json.md#interactions`, `layers-json.md#attr`.

- [ ] **Step 4: Índice dos docs**

Se o hook não regenerou `docs/_index.md` com a entrada nova:

```bash
python -X utf8 ~/.claude/scripts/retrofit_docs.py .
git checkout -- README.md
git status --short
```

Expected: só `docs/shortcuts.md`, `docs/_index.md` e `test/shortcuts.test.js` alterados. O bloco "Related" que o retrofit anexa ao `README.md` é revertido; a linha de Estrutura entra no Task 3.

- [ ] **Step 5: Rodar e ver passar; mutações do doc**

Run: `npx vitest run test/shortcuts.test.js`
Expected: PASS (2 testes).

Salvar uma cópia (`cp docs/shortcuts.md /tmp/s7-4-doc.md`). Depois, uma mutação por vez em `docs/shortcuts.md`, rodando `npx vitest run test/shortcuts.test.js -t DocTables` e restaurando com `cp /tmp/s7-4-doc.md docs/shortcuts.md`:
- M-d: trocar a ordem de duas linhas de `### Câmera` → FAIL.
- M-e: renomear `### Seleção` para `### Selecao` → FAIL.
- M-f: apagar a última linha de `### Geral` → FAIL.
- M-g: escrever `Tecla | Ação` no cabeçalho de uma tabela → FAIL (`header of …`).

Expected final: `diff -q /tmp/s7-4-doc.md docs/shortcuts.md` sem saída.

- [ ] **Step 6: Commit**

```bash
npm test
git add test/shortcuts.test.js docs/shortcuts.md docs/_index.md
git commit -m "docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)"
```

### Task 3: Links, checklist e fragmento

**Files:**
- Modify: `README.md`, `docs/RELEASE-CHECKLIST.md`, `docs/ARCHITECTURE.md` (opcional)
- Create: `changelog.d/docs-261016-0-s7-4-shortcuts-doc.md`

- [ ] **Step 1: README › Estrutura**

Depois da linha `- docs/support-matrix.md — …` (da S7.3; se ausente, depois de `- docs/layers-json.md — …`), inserir:

```md
- docs/shortcuts.md — atalhos de teclado e mouse do painel ? e contextos (campos de texto, Esc, menus)
```

Âncora: `grep -c '^- docs/support-matrix.md' README.md` imprime `1`.

- [ ] **Step 2: Checklist G**

Item "Atalhos e interações". Âncora por texto: `grep -c '^- \[ \] Atalhos e interações (exportar o conteúdo do painel `?` para `docs/shortcuts.md`).$' docs/RELEASE-CHECKLIST.md` imprime `1`. Trocar a linha por:

```md
- [x] Atalhos e interações (exportar o conteúdo do painel `?` para `docs/shortcuts.md`): [docs/shortcuts.md](shortcuts.md) traz uma tabela por grupo do painel `?` e os contextos (campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação, menus); as interações de projeto ficam em [layers-json.md](layers-json.md#interactions), e `test/shortcuts.test.js` mantém as tabelas iguais a `LayersCore.SHORTCUTS` (a cobertura das teclas do handler é do teste `KeyMap` da S3.3).
```

Item `README.md` do G (o da frase "Matriz de suporte fica na S7.3.", que a S7.3 não altera). Âncora por texto: `grep -c '^- \[x\] `README.md`: .*Matriz de suporte fica na S7.3.$' docs/RELEASE-CHECKLIST.md` imprime `1`. Trocar a linha por (sem a expressão "Atalhos e interações", que a guarda usa para achar o outro item):

```md
- [x] `README.md`: o que é, requisitos (Chrome/Edge), como rodar, como conectar um projeto (cinco origens, auto-criação do `layers.json`, rascunho → aprovar). Matriz de suporte em [docs/support-matrix.md](support-matrix.md); atalhos e contextos em [docs/shortcuts.md](shortcuts.md).
```

A linha 8 (contador) não muda.

- [ ] **Step 3: ARCHITECTURE (opcional)**

Se `docs/ARCHITECTURE.md` tem uma linha da tabela de componentes para o registro de atalhos (escrita pela S3.3), acrescentar ao fim da célula: `Exportado em [shortcuts.md](shortcuts.md).` Sem essa linha, não editar. `docs/TOPOLOGY.md` não tem mapa de docs: sem mudança.

- [ ] **Step 4: Fragmento**

`changelog.d/docs-261016-0-s7-4-shortcuts-doc.md`:

```md
---
adr: none
---

### Docs

- Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.
- README (Estrutura) aponta para o doc; checklist G "Atalhos e interações" fechado, e o item `README.md` do G aponta para a matriz de suporte e para os atalhos.

### Tests

- `test/shortcuts.test.js`: `npm test` falha se as tabelas de `docs/shortcuts.md` divergirem de `LayersCore.SHORTCUTS` (grupos, linhas e ordem) ou se o item G for marcado sem o link do doc.

### Perf

- N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
```

- [ ] **Step 5: Gates de docs e commit**

```bash
python ~/.claude/scripts/docs-doctor.py .
python -X utf8 ~/.claude/scripts/docs-linkcheck.py .
python -X utf8 ~/.claude/scripts/gates/precheck.py --root .
npm test
git add README.md docs/RELEASE-CHECKLIST.md docs/ARCHITECTURE.md changelog.d/docs-261016-0-s7-4-shortcuts-doc.md
git commit -m "docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)"
```

Expected: docs-doctor sem achado novo; linkcheck sem link quebrado (inclui `#interactions`, `#attr`, `support-matrix.md` e `shortcuts.md`); precheck sem FAIL; `npm test` PASS com `Shortcuts_ChecklistG_ClosedOnlyWithDoc` verde.

### Task 4: Fechamento

**Files:**
- Modify: `docs/roadmap.md`, `docs/roadmap.data.json`
- Create: `docs/superpowers/reports/<data>-s7-4-shortcuts-doc.md` (+ `.html`)

- [ ] **Step 1: Relatório**

Skill `impl-report`: relatório com o contrato fixado no Task 1 Step 0, as mutações M-a, M-b, M-c e M-h (contra o teste `KeyMap` da S3.3) e M-d a M-g (contra a guarda do doc) com o resultado, e qualquer divergência de contexto do Task 2 Step 1, incluindo o resultado da conferência do Esc no campo de propriedade.

- [ ] **Step 2: Fechar a leaf**

Skill `phase-close-gate`: linha S7.4 com `report` = `[](../changelog.d/docs-261016-0-s7-4-shortcuts-doc.md)` e status `done`; rebuild com `python ~/.claude/design/_build_proto.py .`.

- [ ] **Step 3: Rodar e commitar**

Run: `npm test`
Expected: PASS.

```bash
git add docs changelog.d
git commit -m "docs: close S7.4 in the tracker (S7.4)"
```

Invocar `branch-lifecycle` (fim da branch) antes de push ou PR. Merge, rebase e `_index.md` seguem a Task E do plano geral (S7.4 é a última da ordem de merge).

## Model Routing

| Step | Role | Tier | Model | Rationale |
|---|---|---|---|---|
| Task 0. worktree, linha do roadmap e rebuild | gen | Mechanical | Executor | âncora `grep -c` + troca de uma linha + comando; caller valida `exit_code` e o `git status --short` |
| Task 1. contrato, guarda e mutações | gen | Standard | Workhorse | autoria de teste e julgamento sobre o contrato da S3.3 |
| Task 2. doc, reconferência dos contextos e conferência no navegador | gen | Standard | Workhorse | prosa técnica com leitura de código |
| Task 3. links, checklist, fragmento e gates | gen | Standard | Workhorse | prosa de docs |
| Task 4. relatório e fechamento | gen | Standard | Workhorse | relatório e gate do tracker |
| Pre-merge review | review | Architectural | Architect | verificador ≥ gerador, via `adversarial-reviewer` |

Executor: Task 0, com formato, tokens de recusa (`NOT FOUND` se a âncora não der `1` ou faltar `PLAN-OK`, `COULD NOT RUN`) e validação pelo caller; desvio volta ao Workhorse.

> [!DECISION] D5 — cobertura (aplicada)
> `M`, `=` e o Esc completo entram em `SHORTCUTS` na S3.3; o teste `KeyMap` da S3.3 pega a ausência (provado pelas mutações do Task 1 Step 0). Interações por link a `docs/layers-json.md` (§ interactions, § attr), sem duplicar. O doc diz Ctrl/Cmd (Meta vale como Ctrl no `onKey` e no arrasto).

> [!DECISION] alias de `=` (teste `KeyMap` da S3.3)
> - **Opção A (recomendada, aplicada neste plano)**: token `=` literal, sem alias. A linha `=` é própria (plano da S3.3, Task 2 Step 3) e `zoomIn.keys` contém `'='`, então a ausência da linha deixa o teste vermelho, como D5 pede (a linha `=` em `SHORTCUTS`).
> - **Opção B**: alias `'=' → '+'` (hipótese; não está no plano geral); a linha `=` deixa de ser exigida.

> [!DECISION] Esc no campo de propriedade (só se a conferência do Task 2 Step 1 mostrar o valor aplicado)
> - **Opção A (recomendada)**: entregar a S7.4 com a prosa fiel ao comportamento observado e a divergência com a linha `Esc (no campo) | descartar a edição` anotada no doc e no relatório; abrir uma leaf de correção (runtime do campo ou linha da S3.3).
> - **Opção B**: segurar a S7.4 até a leaf de correção mesclar, para o doc não registrar a divergência.

> [!DECISION] gh-issue-gate
> Issue-worthy: **No** — leaf de docs já rastreada no roadmap.

> [!DECISION] phase-intake
> Classification: **micro** `S7.4` sob **S7**, alvo **Unreleased**. Fork of an existing row? **No**.

> [!DECISION] execution
> Method: **Inline** (4 tasks sequenciais, um doc e um teste).
