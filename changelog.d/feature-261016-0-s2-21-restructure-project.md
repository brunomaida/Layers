---
adr: none
---

### Added
- Deriva do layout: depois de cada carga o Layers lê o mtime dos `.ts`/`.js` citados em `data-src` e em `root.src` e, quando algum é mais novo que o mock, mostra o banner "Mock mais antigo que a fonte" com o botão "Reanalisar do 0". As fontes citadas passam a ser vigiadas ao focar a janela (`LayersCore.citedSources`, `layoutDrift`, `staleKind`).
- "Reanalisar do 0" (banner e `Projetos ▾`): confirma, guarda o `layers.json` e o mock carregados em `.design-history/layout-<carimbo>/` e relê a pasta como projeto novo (sem seleção, câmera, undo nem ajustes salvos). Se o backup falha, nada é recarregado.

### Changed
- O banner de arquivos mudados troca "Recarregar" por "Reanalisar do 0" quando o arquivo mudado é o mock, o `layers.json` ou uma fonte citada; mudança só em folha CSS mantém "Recarregar".

### Removed
- O item "Exemplos › Traval" do menu Projetos (`DEMOS`, `openDemo` e o estado `demoBase`): abria um mock fixo e desatualizado do Traval. O fixture `fixtures/traval/` continua para os testes e para `?layers=fixtures/traval/`.

### Perf
- estimated — no máximo 50 `getFile()` por carga (um por fonte citada), disparados sem `await` depois de a carga terminar; fora do caminho crítico da carga e do orbit.
