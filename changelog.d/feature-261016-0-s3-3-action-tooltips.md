---
adr: none
---

### Added
- `title` "Ação (K)" nos Fechar dos modais (Esc), no Recarregar do banner, no Aplicar do código, no Registrar/× do repositório e no Isolar durante o isolamento. Só o nome, sem tecla: chevrons da árvore ("Recolher / expandir", "Nada para expandir"), Isolar fora do isolamento ("Isolar o ramo da seleção") e o gatilho "Ações ▾" (antes herdava "Recolher / expandir").
- Registro `LayersCore.ACTIONS`/`SHORTCUTS`/`keyAction`/`tooltip`; linhas `M` e `=` no painel `?`; `e2e/tooltips.spec.js` e `e2e/onkey-keys.spec.js` (caracterização das teclas globais).

### Changed
- `onKey` e painel `?` derivados do registro; Esc do painel com a cascata completa; textos unificados (Enquadrar, Recarregar "(R)"); o `▲` do dock perde " · shift: no plano", que não vale para o clique.
- Painel `?`: "Esc (no campo)" deixa de prometer "descartar". Checagem no navegador (axai, `.sum-stat` › Sombra): digitar `0 0 0 3px rgb(1, 2, 3)` e apertar Esc aplica o estilo inline, o contador de Ajustes vai a 1 e o campo mantém o valor. Runtime inalterado; correção em S3.6 (issue #73).
- Limite conhecido: `KeyMap_TeclaComHandler_EstaNoPainel` deriva de `ACTIONS`; o ramo Ctrl+Z/Y do `onKey` tem z/y fixos no código, sem ligação com o escopo `ctrl` do registro.

### Perf
- estimated — `keyRun` montado uma vez, em vez do mapa de teclas recriado a cada keydown. Ainda há 15 objetos `nb` por render do dock, e `tooltip()` roda a cada render (lookup em cache, sem concatenação).
