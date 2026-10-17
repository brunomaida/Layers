# Implementation Report — s7-4-shortcuts-doc

- **Branch:** `docs/261016-0-s7-4-shortcuts-doc`
- **Range:** `origin/develop..HEAD`
- **Período:** 2026-10-16 22:55 → 2026-10-16 22:55
- **Status:** `final`
- **Gerado em:** 2026-10-16 22:55

## Resumo

Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.

## Mudanças

### Added (5)

- `changelog.d/docs-261016-0-s7-4-shortcuts-doc.md` (+16/-0, doc)
- `docs/shortcuts.md` (+152/-0, doc)
- `docs/superpowers/reports/2026-10-16-s7-4-shortcuts-doc.html` (+677/-0, doc)
- `docs/superpowers/reports/2026-10-16-s7-4-shortcuts-doc.md` (+103/-0, doc)
- `test/shortcuts.test.js` (+37/-0, test)

### Changed (6)

- `README.md` (+1/-0, doc)
- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/_index.md` (+3/-2, doc)
- `docs/roadmap.data.json` (+19/-7, doc)
- `docs/roadmap.md` (+1/-1, doc)

### Changelog fragment

**Docs:**
- Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.
- README (Estrutura) aponta para o doc; checklist G "Atalhos e interações" fechado.

**Tests:**
- `test/shortcuts.test.js`: `npm test` falha se as tabelas de `docs/shortcuts.md` divergirem de `LayersCore.SHORTCUTS` (grupos, linhas e ordem) ou se o item G for marcado sem o link do doc.

**Perf:**
- N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.

## Arquivos tocados

### test (1)

- [`test/shortcuts.test.js`](../../../test/shortcuts.test.js) — A (+37/-0)

### doc (10)

- [`README.md`](../../../README.md) — M (+1/-0)
- [`changelog.d/docs-261016-0-s7-4-shortcuts-doc.md`](../../../changelog.d/docs-261016-0-s7-4-shortcuts-doc.md) — A (+16/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+3/-2)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+19/-7)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/shortcuts.md`](../../shortcuts.md) — A (+152/-0)
- [`docs/superpowers/reports/2026-10-16-s7-4-shortcuts-doc.html`](2026-10-16-s7-4-shortcuts-doc.html) — A (+677/-0)
- [`docs/superpowers/reports/2026-10-16-s7-4-shortcuts-doc.md`](2026-10-16-s7-4-shortcuts-doc.md) — A (+103/-0)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/shortcuts.test.js`](../../../test/shortcuts.test.js)

## Commits ↔ changelog

- **Docs:** Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.
  - [`3c75b8f`](https://github.com/brunomaida/Layers/commit/3c75b8fbfccbcb11ae30cfdea265bd803c605f61) docs: open the S7.4 leaf in the tracker (S7.4)
  - [`c2ed11e`](https://github.com/brunomaida/Layers/commit/c2ed11e6b7a5a5f895c253120d091639dd8ebadd) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
  - [`ef95df4`](https://github.com/brunomaida/Layers/commit/ef95df4eb551f952d2fa4e17470ea007aa09e502) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
  - [`ae10a01`](https://github.com/brunomaida/Layers/commit/ae10a01e3cfb36f790595a16352795ba983055f6) docs: close S7.4 in the tracker (S7.4)
- **Docs:** README (Estrutura) aponta para o doc; checklist G "Atalhos e interações" fechado.
  - [`ef95df4`](https://github.com/brunomaida/Layers/commit/ef95df4eb551f952d2fa4e17470ea007aa09e502) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
- **Tests:** `test/shortcuts.test.js`: `npm test` falha se as tabelas de `docs/shortcuts.md` divergirem de `LayersCore.SHORTCUTS` (grupos, linhas e ordem) ou se o item G for marcado sem o link do doc.
  - [`3c75b8f`](https://github.com/brunomaida/Layers/commit/3c75b8fbfccbcb11ae30cfdea265bd803c605f61) docs: open the S7.4 leaf in the tracker (S7.4)
  - [`c2ed11e`](https://github.com/brunomaida/Layers/commit/c2ed11e6b7a5a5f895c253120d091639dd8ebadd) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
  - [`ef95df4`](https://github.com/brunomaida/Layers/commit/ef95df4eb551f952d2fa4e17470ea007aa09e502) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
  - [`ae10a01`](https://github.com/brunomaida/Layers/commit/ae10a01e3cfb36f790595a16352795ba983055f6) docs: close S7.4 in the tracker (S7.4)
- **Perf:** N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
  - [`3c75b8f`](https://github.com/brunomaida/Layers/commit/3c75b8fbfccbcb11ae30cfdea265bd803c605f61) docs: open the S7.4 leaf in the tracker (S7.4)
  - [`c2ed11e`](https://github.com/brunomaida/Layers/commit/c2ed11e6b7a5a5f895c253120d091639dd8ebadd) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
  - [`ef95df4`](https://github.com/brunomaida/Layers/commit/ef95df4eb551f952d2fa4e17470ea007aa09e502) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
  - [`ae10a01`](https://github.com/brunomaida/Layers/commit/ae10a01e3cfb36f790595a16352795ba983055f6) docs: close S7.4 in the tracker (S7.4)

### Todos os commits

- [`3c75b8f`](https://github.com/brunomaida/Layers/commit/3c75b8fbfccbcb11ae30cfdea265bd803c605f61) docs: open the S7.4 leaf in the tracker (S7.4)
- [`c2ed11e`](https://github.com/brunomaida/Layers/commit/c2ed11e6b7a5a5f895c253120d091639dd8ebadd) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
- [`ef95df4`](https://github.com/brunomaida/Layers/commit/ef95df4eb551f952d2fa4e17470ea007aa09e502) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
- [`ae10a01`](https://github.com/brunomaida/Layers/commit/ae10a01e3cfb36f790595a16352795ba983055f6) docs: close S7.4 in the tracker (S7.4)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._

## Verificação da S7.4

- **Contrato (Task 1 Step 0):** sobre a branch da S3.3 (`e1b05fb`), `LayersCore.SHORTCUTS` é array de 7 grupos e 53 linhas, todas `[teclas, descrição]`; `const SHORTCUTS = [` ausente de `index.html` (0); `TeclaComHandler_EstaNoPainel` presente (1). Forma igual à esperada pelo plano.
- **Mutações contra o teste `KeyMap` da S3.3** (`lib/layers-core.js` restaurado após cada uma; `git status --short lib/` vazio): M-a (apagar a linha `M`) FAIL citando `m`; M-b (tirar o token `=`) FAIL citando `=`; M-c (`PageUp / PageDown`) FAIL citando `PageUp PageDown`; M-h (apagar a linha `Esc` de Seleção) FAIL citando `Escape`.
- **Guarda vermelha (Task 1 Step 2):** só `Shortcuts_DocTables_MatchShortcutsConstant` falhou (`docs/shortcuts.md missing`); `Shortcuts_ChecklistG_ClosedOnlyWithDoc` passou. Verde com o doc (2 testes).
- **Mutações contra a guarda do doc** (cópia restaurada, `diff -q` sem saída): M-d (trocar duas linhas de Câmera), M-e (`Selecao`), M-f (apagar a última linha de Geral) FAIL em `DocTables`; M-g (cabeçalho `Tecla | Ação`) FAIL `header of Câmera`.
- **Contextos reconferidos** em `index.html` (`onKey`, `escape()`, `reloadProject`, `menuEscape`/`menuStep`, handlers `key`, `treeQKey`, `propQKey`, `pcKey`, `histRepoKey`, `H.click`/`H.dbl`, `onDown`, `onStageDbl`): os fatos do plano batem, sem divergência.
- **Esc no campo de propriedade:** o handler faz `delBuf(k)` e `blur()`, e o `commit` do `onBlur` lê o `buf` do render anterior, então o valor é aplicado. A S3.3 confirmou isso no navegador e já corrigiu a linha do registro para "sair do campo (o valor digitado é aplicado)"; a prosa do doc diz o mesmo e não afirma "descarta". Sem divergência entre doc e registro. A conferência no navegador não foi repetida nesta leaf.
- **Desvios:** worktree criado da branch local da S3.3 (não mesclada); S7.3 não mesclada, então `docs/support-matrix.md` não existe, não é linkado e o item `README.md` do G (frase "Matriz de suporte fica na S7.3.") ficou intocado.

Plano: [S7.4 — docs/shortcuts.md](../plans/2026-10-16-s7-4-shortcuts-doc.md).

- **Rebase (S3.3 mesclada, PR #74, `2419343`):** a leaf foi rebaseada em `origin/develop` sem conflito; o registro manteve a forma (7 grupos, 53 linhas) e a guarda continuou verde sem regerar o doc. A linha do Esc segue "sair do campo (o valor digitado é aplicado)", igual à prosa; a correção do runtime ficou na leaf S3.6 (issue #73).
