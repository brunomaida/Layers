---
adr: none
---

### Added
- Undo/redo global: Ctrl+Z desfaz e Ctrl+Shift+Z / Ctrl+Y refaz ajustes de propriedade e de código ainda não gravados, com toast por passo. `LayersCore.inlineDelta` e `LayersCore.pushSnapshot` (puros, testados); pilha de 100 passos, zerada ao recarregar, trocar de projeto ou aplicar nos arquivos. Em campos de texto vale o undo nativo; com a pergunta de escopo, o modal ou o diff abertos o atalho não age; um arrasto de slider conta como um passo.
- `e2e/undo-redo.spec.js`: ida e volta, escopo "Todos iguais", pergunta de escopo aberta, foco em campo de texto, diff aberto, rajada de slider e foco no slider.

### Perf
- N/A — um clone de `changes[]` por edição; nada no caminho de câmera.
