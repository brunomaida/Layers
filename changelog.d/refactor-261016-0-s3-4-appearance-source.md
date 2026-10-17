---
adr: updated
---

### Changed
- Aparência com uma fonte só: `LayersCore.APPEARANCE_DEFAULTS` (Gray · 1 Grafite, acento 5 · Cinza médio, seleção Coral, origem Mono · cor de seleção, cabeçalho B, slider 85 %, fonte 1). O menu Aparência grava por cima; `theme`, `accent`, `selectColor`, `originColors`, `sliderScale` e `panelHeader` saíram de `data-props` e a regra "último que mudou" acabou. Visual idêntico (variáveis `--*` de 173 combinações e `menu-visual` com diff zero).

### Removed
- Código morto `DEFAULT_GRAD`, `randGrad` e a chave `logoGrad` (fora de `CFG_KEYS`): um `logoGrad` salvo deixa de ser lido.

### Tests
- `AppearanceDefaults_*` e `MigrateConfig_LogoGradAntigo_NaoMigra` (Vitest); `e2e/appearance-defaults.spec.js` (10 casos, incluindo os cabeçalhos A/B/C do painel).

### Perf
- N/A — `applyTheme` faz os mesmos `setProperty`; só a origem do default muda (constante em vez de prop).
