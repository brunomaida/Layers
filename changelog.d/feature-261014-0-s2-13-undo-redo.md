---
adr: none
---

### Added
- Undo/redo global: Ctrl+Z desfaz e Ctrl+Shift+Z / Ctrl+Y refaz ajustes de propriedade e de código ainda não gravados, com toast por passo. `LayersCore.inlineDelta` e `LayersCore.pushSnapshot` (puros, testados); pilha de 100 passos, zerada ao recarregar, trocar de projeto ou aplicar nos arquivos. Em `input`/`textarea` vale o undo nativo; com a pergunta de escopo aberta o atalho não age.
- `e2e/undo-redo.spec.js`: ida e volta, escopo "Todos iguais", pergunta de escopo aberta e foco em campo de texto.

### Perf
- N/A — um clone de `changes[]` por edição; nada no caminho de câmera.
