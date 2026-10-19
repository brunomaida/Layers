---
adr: none
---

### Added
- Espalhar layouts: `⊞ ESPALHAR ▾` (faixa LAYOUTS, 2+ layouts) mostra os layouts lado a lado no palco 3D, o ativo completo e os demais como retratos congelados em LOD (varredura rasa, borda tracejada). Popover Foco | Todos | 1–N com distância; clicar num plano LOD ativa o layout e seleciona o mesmo nó; aviso, sem bloquear, acima de 1.500 planos.
- Câmera de visão geral que enquadra todas as páginas (o zoom não aproxima o olho); a câmera normal é guardada e volta ao desligar. Seleção, distância e câmera persistem em `session › spread`.
- Core puro: `spreadPicked`, `spreadOffsets`, `lodNodes`, `spreadPlaneTotal`, `spreadSessionEntry`, `overviewFit`; `viewCuller` aceita `zs`. `loadProject` dividido em `buildMockDom`/`mountMockDom`/`scanRoot`; `readText(path, quiet)`.
- Só o ativo edita; edição, undo e watch entre layouts ficam na S9.1d.

### Tests
- Vitest: 644 testes (44 novos). Playwright: `spread` (106 testes) e os orçamentos do Espalhar em `perf`.

### Perf
- measured — 2026-10-19: em Node (`npm run bench`), `overviewFit` de 8 páginas 1,6 µs e `lodNodes` de 1.500 nós 3,7 µs; no Chromium (e2e), ligar com 3 layouts 373 ms (orçamento 746), órbita de 3 páginas 17,6 ms (36), pior caso de 3.303 planos 99 ms, ~10 fps (198), órbita em `main` pesado ligado 19,5 contra 20,8 ms desligado (a visão geral desenha menor; `scene()` custa 1,05 ms desligado e 0,89 ms ligado por chamada). Desligado, nada muda.
