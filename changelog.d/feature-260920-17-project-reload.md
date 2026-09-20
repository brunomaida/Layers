### feature/260920-17-project-reload — 2026-09-20

#### Added
- Recarregar projeto (#17): tecla `R` e item `Recarregar projeto (R)` em `Projetos ▾`, só para pasta local. Confirma antes de descartar `changes`/`codeBuf`; preserva câmera, seleção e isolamento (`pendingSel`).
- Aviso "Arquivos mudaram no disco" ao focar a janela, com ações Recarregar e Ignorar. Vigia `layers.json`, mock, folhas CSS e `dcSource`; editar `src/**/*.ts` não dispara.
- `LayersCore.staleFiles`, `hasUnsaved` e `pickWatched` (com testes); estado `stale`, `this.watch` e `this.loadedSeq`.

#### Changed
- `writeText` passa a atualizar `this.watch` após gravar, para o LAYERS não acusar as próprias escritas.
- `docs/ARCHITECTURE.md` documenta o fluxo de recarga, o conjunto vigiado e a guarda de conflito de `writeText` (`this.mtimes`), que já existia sem documentação.

#### Perf
- **estimated** — checagem só no foco da janela, com debounce de 300 ms: no máximo ~6 chamadas `getFile()` (sem ler conteúdo) mais uma `queryPermission` por foco.
- Nada no caminho quente de render; o `scan()` só roda numa recarga explícita.

#### Commits
- `cfbaba2` — feat: add reload watch helpers to layers-core
- `c1445c1` — feat: add project reload and disk-change banner
