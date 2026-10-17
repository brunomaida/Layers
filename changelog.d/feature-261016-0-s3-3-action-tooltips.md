---
adr: none
---

### Added
- `title` "Ação (K)" nos chevrons da árvore, nos Fechar dos modais, no Recarregar do banner, no Aplicar do código, no Registrar/× do repositório e no Isolar; `title` próprio no gatilho "Ações ▾" (antes herdava "Recolher / expandir").
- Registro `LayersCore.ACTIONS`/`SHORTCUTS`/`keyAction`/`tooltip`; linhas `M` e `=` no painel `?`.
- `e2e/tooltips.spec.js` e `e2e/onkey-keys.spec.js` (caracterização das teclas globais).

### Changed
- `onKey` e painel `?` derivados do registro; Esc do painel com a cascata completa; textos unificados (Enquadrar, Recarregar "(R)"); o `▲` do dock perde o " · shift: no plano", que não vale para o clique.
- Painel `?`: a linha "Esc (no campo)" deixa de prometer "descartar a edição", porque o valor digitado é aplicado ao sair do campo (comportamento do runtime, inalterado).

### Perf
- estimated — o mapa de teclas deixa de ser recriado a cada keydown (keyRun montado uma vez); os títulos são strings cacheadas no core, sem alocação nova por render do dock.
