# Implementation Report — s7-4-shortcuts-doc

- **Branch:** `docs/261016-0-s7-4-shortcuts-doc`
- **Range:** `e1b05fb..HEAD`
- **Período:** 2026-10-16 22:42 → 2026-10-16 22:44
- **Status:** `final`
- **Gerado em:** 2026-10-16 22:44

## Resumo

Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.

## Mudanças

### Added (3)

- `changelog.d/docs-261016-0-s7-4-shortcuts-doc.md` (+16/-0, doc)
- `docs/shortcuts.md` (+152/-0, doc)
- `test/shortcuts.test.js` (+37/-0, test)

### Changed (6)

- `README.md` (+1/-0, doc)
- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/_index.md` (+1/-0, doc)
- `docs/roadmap.data.json` (+7/-7, doc)
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

### doc (8)

- [`README.md`](../../../README.md) — M (+1/-0)
- [`changelog.d/docs-261016-0-s7-4-shortcuts-doc.md`](../../../changelog.d/docs-261016-0-s7-4-shortcuts-doc.md) — A (+16/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/_index.md`](../../_index.md) — M (+1/-0)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+7/-7)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/shortcuts.md`](../../shortcuts.md) — A (+152/-0)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/shortcuts.test.js`](../../../test/shortcuts.test.js)

## Commits ↔ changelog

- **Docs:** Novo `docs/shortcuts.md`: as tabelas do painel `?` (geradas de `LayersCore.SHORTCUTS`) e os contextos que o painel não diz: campos de texto, Esc em cascata, Ctrl/Cmd+Enter, `R` com confirmação e menus; as interações de projeto apontam para `docs/layers-json.md`.
  - [`854fd08`](https://github.com/brunomaida/Layers/commit/854fd08c7c0867a4ee04dd26c440c7948ac56b16) docs: open the S7.4 leaf in the tracker (S7.4)
  - [`39e7785`](https://github.com/brunomaida/Layers/commit/39e7785f4208c1eb2c108e143d323f0efc07cba8) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
  - [`763bc69`](https://github.com/brunomaida/Layers/commit/763bc69af2d5d37b23c1f3eaa9383d8d514c75d2) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
- **Docs:** README (Estrutura) aponta para o doc; checklist G "Atalhos e interações" fechado.
  - [`763bc69`](https://github.com/brunomaida/Layers/commit/763bc69af2d5d37b23c1f3eaa9383d8d514c75d2) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
- **Tests:** `test/shortcuts.test.js`: `npm test` falha se as tabelas de `docs/shortcuts.md` divergirem de `LayersCore.SHORTCUTS` (grupos, linhas e ordem) ou se o item G for marcado sem o link do doc.
  - [`854fd08`](https://github.com/brunomaida/Layers/commit/854fd08c7c0867a4ee04dd26c440c7948ac56b16) docs: open the S7.4 leaf in the tracker (S7.4)
  - [`39e7785`](https://github.com/brunomaida/Layers/commit/39e7785f4208c1eb2c108e143d323f0efc07cba8) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
  - [`763bc69`](https://github.com/brunomaida/Layers/commit/763bc69af2d5d37b23c1f3eaa9383d8d514c75d2) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)
- **Perf:** N/A — documentação e um teste unitário de consistência; nenhum código de runtime mudou.
  - [`854fd08`](https://github.com/brunomaida/Layers/commit/854fd08c7c0867a4ee04dd26c440c7948ac56b16) docs: open the S7.4 leaf in the tracker (S7.4)
  - [`39e7785`](https://github.com/brunomaida/Layers/commit/39e7785f4208c1eb2c108e143d323f0efc07cba8) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
  - [`763bc69`](https://github.com/brunomaida/Layers/commit/763bc69af2d5d37b23c1f3eaa9383d8d514c75d2) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)

### Todos os commits

- [`854fd08`](https://github.com/brunomaida/Layers/commit/854fd08c7c0867a4ee04dd26c440c7948ac56b16) docs: open the S7.4 leaf in the tracker (S7.4)
- [`39e7785`](https://github.com/brunomaida/Layers/commit/39e7785f4208c1eb2c108e143d323f0efc07cba8) docs: add docs/shortcuts.md guarded by the shortcuts registry (S7.4)
- [`763bc69`](https://github.com/brunomaida/Layers/commit/763bc69af2d5d37b23c1f3eaa9383d8d514c75d2) docs: link docs/shortcuts.md and close checklist G shortcuts item (S7.4)

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
