---
adr: none
---

### Added
- Edição entre layouts (2+ layouts): o undo é uma pilha única com `layoutId` (Ctrl+Z num passo de outro layout troca para ele e desfaz); Salvar junta as pendências de todos os layouts num plano, com uma escrita por `arquivo|seletor|prop` (o ativo vence, conflito vira aviso); Todos iguais mostra `também afeta Config (3 usos)`; o watch vigia o mock de cada layout e o banner nomeia o layout.
- Sonda dos outros layouts: leitura quieta, em cache e só sob demanda. Core puro: `mergeLayoutChanges`, `countUses`, `useKey`, `undoStepApplies`, `staleLayouts`, `spreadDrawPlan`.

### Changed
- Acima de 1.500 planos a cheia congelada é desenhada como LOD; no arrasto os `LodPlane` são cortados e agrupados por `z`.
- Uma gravação que falha mantém a mudança cujo arquivo não foi gravado.
- Limite conhecido: 700 + 700 planos (1.407) orbita a ~47 fps, sem aviso (medido, não resolvido).

### Tests
- Vitest: 687 testes (43 novos). Playwright: `layouts` 65, `undo-redo` 8, `apply-flow` 17, `scope-all-equal` 6, `stale-banner` 4, `spread` 114, `perf` 43.

### Perf
- measured — 2026-10-20, Chromium: órbita do pior caso do Espalhar (3.303 planos) 101 → 23 ms/quadro (9,9 → 43 fps); na borda do aviso, 700 + 700 planos 21,2 ms (47 fps) e 800 + 800 18,9 ms (53 fps); em Node, `spreadDrawPlan` com 1.500 entradas 54,5 µs e `mergeLayoutChanges` 64,9 µs. Espalhar desligado e projeto de 1 layout: nada muda.
