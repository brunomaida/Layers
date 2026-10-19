---
adr: none
---

### Added
- Projetos ▾ › Analisar cobertura: varre o repositório sem rodar o app e abre um modal com a cobertura de Monovisual, Monovisual + states e Múltiplos layouts (`cob_reg · cob_el`, planos), a regra de decisão, a tabela de regiões e, com o veredito Múltiplos layouts, o trecho `layouts` com Copiar. Só leitura: nada é gravado e a carga do projeto não varre.
- Pasta local e `.zip` são varridos; GitHub e fixture HTTP não listam arquivos e dão cobertura parcial. `.ts/.js` entram por regex com selo de confiança baixa.
- Core puro em `LayersCore`: `COVERAGE`, `coverageScope`, `cssHiddenSelectors`, `htmlRegions`, `scanScriptMarkers`, `coverageModel`, `coverageVerdict`, `suggestLayouts`; `collectProjectFiles` extraído do `autoCreateLayersJson`; fixture `coverage-multi`.

### Tests
- Vitest: regiões, escopo, modelo, veredito e sugestão. Playwright: `coverage` e `coverage-modal` (32 testes) e o orçamento da análise em `perf`.

### Perf
- measured — 2026-10-19: em Node (`npm run bench`), `coverageModel` sobre 1 HTML de 1.500 tags 2,3 ms e sobre 200 HTMLs 15,6 ms; no Chromium (e2e), `analyzeCoverage` com 200 HTMLs e 1.500 tags, mediana 218 ms contra orçamento de 616 ms (`Coverage_Analyze_CostsUnderBudget`). Só roda sob demanda; o orçamento da carga não muda.
