---
adr: none
---

### Added
- Projetos ▾ › Analisar cobertura: varre o repositório sem rodar o app e abre um modal com a cobertura de Monovisual, Monovisual + states e Múltiplos layouts (`cob_reg · cob_el`, planos), a regra de decisão, a tabela de regiões e, com o veredito Múltiplos layouts, o trecho `layouts` com Copiar. Só leitura: nada é gravado e a carga do projeto não varre.
- Pasta local e `.zip` são varridos; GitHub e fixture HTTP não listam arquivos e dão cobertura parcial. `.ts/.js` entram por regex com selo de confiança baixa.
- Core puro em `LayersCore`: `COVERAGE`, `coverageScope`, `cssHiddenSelectors`, `htmlRegions`, `scanScriptMarkers`, `coverageModel`, `coverageVerdict`, `suggestLayouts`; `collectProjectFiles` extraído do `autoCreateLayersJson`; fixture `coverage-multi`.

### Tests
- Vitest: regiões, escopo, modelo, veredito e sugestão. Playwright: `coverage` e `coverage-modal` (26 testes) e o orçamento da análise em `perf`.

### Perf
- measured — Chromium, 2026-10-19: `htmlRegions` com 1.500 tags 2,2 ms e `coverageModel` com 200 HTMLs 26,7 ms (`npm run bench`); `analyzeCoverage` com 200 HTMLs e 1.500 tags, mediana 308 ms contra orçamento de 616 ms (`Coverage_Analyze_CostsUnderBudget`). Só roda sob demanda; o orçamento da carga não muda.
