# Implementation Report — s3-2-menu-open-pattern

- **Branch:** `feature/261014-0-s3-2-menu-open-pattern`
- **Range:** `develop..HEAD`
- **Período:** 2026-10-14 20:44 → 2026-10-14 21:54
- **Status:** `final`
- **Gerado em:** 2026-10-14 21:54

## Resumo

Padrão único de abertura de menus: Projetos, Aparência, Interagir e Ações abrem no hover e fixam no clique (Projetos e Ações só abriam por clique). Clique fora, Esc, foco saindo e item de ação fecham; um menu aberto por vez; toque abre fixado; arrastar o palco com o botão pressionado não abre menu. `LayersCore.menuStep` (puro, testado) decide; tempos em `LayersCore.MENU_TIMING` (0 ms para abrir, 260 ms de tolerância ao sair).

## Mudanças

### Added (4)

- `changelog.d/feature-261014-0-s3-2-menu-open-pattern.md` (+16/-0, doc)
- `docs/superpowers/plans/2026-10-14-s3-2-menu-open-pattern.md` (+1084/-0, doc)
- `e2e/menu-open.spec.js` (+291/-0, src)
- `e2e/menu-visual.spec.js` (+62/-0, src)

### Changed (7)

- `docs/ARCHITECTURE.md` (+1/-1, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/roadmap.data.json` (+21/-14, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+60/-34, other)
- `lib/layers-core.js` (+30/-0, src)
- `test/layers-core.test.js` (+116/-0, test)

### Changelog fragment

**Changed:**
- Padrão único de abertura de menus: Projetos, Aparência, Interagir e Ações abrem no hover e fixam no clique (Projetos e Ações só abriam por clique). Clique fora, Esc, foco saindo e item de ação fecham; um menu aberto por vez; toque abre fixado; arrastar o palco com o botão pressionado não abre menu. `LayersCore.menuStep` (puro, testado) decide; tempos em `LayersCore.MENU_TIMING` (0 ms para abrir, 260 ms de tolerância ao sair).
- Um menu fixado não troca por hover em outro gatilho (antes, passar o mouse em Interagir com a Aparência fixada trocava de menu e soltava a fixação).
- Esc fecha primeiro o dropdown de valor aberto, depois o menu, e devolve o foco ao gatilho: o anel `:focus-visible` do gatilho aparece depois do Esc pelo teclado (mudança intencional de acessibilidade). Com o foco num `<input>` dentro do menu (o controle de Fonte), Esc segue sem efeito, como hoje.
- Fechar um menu (Esc, foco saindo, clique fora) limpa o campo de registrar repositório e um dropdown de valor aberto dentro da Aparência; apertar num item do popover de Ações o fixa, como nos outros menus.

**Added:**
- `e2e/menu-open.spec.js`: hover, fixar, clique fora, teclado, foco saindo, aninhado, redimensionar, arrasto e toque nos quatro menus.
- `e2e/menu-visual.spec.js`: gate manual (`LAYERS_VISUAL=1`) que compara pixel a pixel os quatro menus abertos (clique e hover) e fechados com a captura de antes da mudança; as capturas ficam locais e não entram no repositório.

**Perf:**
- estimated — uma chamada de `menuStep` por entrada, saída ou clique nos quatro gatilhos e um `contains()` por `pointerdown` só com menu aberto; os manipuladores de menu são criados uma vez (`menuH`), sem alocação por render; nada no caminho de câmera, scan ou render dos planos.

## Arquivos tocados

### src (3)

- [`e2e/menu-open.spec.js`](../../../e2e/menu-open.spec.js) — A (+291/-0)
- [`e2e/menu-visual.spec.js`](../../../e2e/menu-visual.spec.js) — A (+62/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+30/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+116/-0)

### doc (6)

- [`changelog.d/feature-261014-0-s3-2-menu-open-pattern.md`](../../../changelog.d/feature-261014-0-s3-2-menu-open-pattern.md) — A (+16/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+1/-1)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+21/-14)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s3-2-menu-open-pattern.md`](../plans/2026-10-14-s3-2-menu-open-pattern.md) — A (+1084/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+60/-34)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Changed:** Padrão único de abertura de menus: Projetos, Aparência, Interagir e Ações abrem no hover e fixam no clique (Projetos e Ações só abriam por clique). Clique fora, Esc, foco saindo e item de ação fecham; um menu aberto por vez; toque abre fixado; arrastar o palco com o botão pressionado não abre menu. `LayersCore.menuStep` (puro, testado) decide; tempos em `LayersCore.MENU_TIMING` (0 ms para abrir, 260 ms de tolerância ao sair).
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`ff002f7`](https://github.com/brunomaida/Layers/commit/ff002f7c74555de8e0496ccf6f70af1889c040cb) test(e2e): add pixel freeze spec for the four menus (S3.2 Task 2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- **Changed:** Um menu fixado não troca por hover em outro gatilho (antes, passar o mouse em Interagir com a Aparência fixada trocava de menu e soltava a fixação).
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- **Changed:** Esc fecha primeiro o dropdown de valor aberto, depois o menu, e devolve o foco ao gatilho: o anel `:focus-visible` do gatilho aparece depois do Esc pelo teclado (mudança intencional de acessibilidade). Com o foco num `<input>` dentro do menu (o controle de Fonte), Esc segue sem efeito, como hoje.
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- **Changed:** Fechar um menu (Esc, foco saindo, clique fora) limpa o campo de registrar repositório e um dropdown de valor aberto dentro da Aparência; apertar num item do popover de Ações o fixa, como nos outros menus.
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`ff002f7`](https://github.com/brunomaida/Layers/commit/ff002f7c74555de8e0496ccf6f70af1889c040cb) test(e2e): add pixel freeze spec for the four menus (S3.2 Task 2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- **Added:** `e2e/menu-open.spec.js`: hover, fixar, clique fora, teclado, foco saindo, aninhado, redimensionar, arrasto e toque nos quatro menus.
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`ff002f7`](https://github.com/brunomaida/Layers/commit/ff002f7c74555de8e0496ccf6f70af1889c040cb) test(e2e): add pixel freeze spec for the four menus (S3.2 Task 2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- **Added:** `e2e/menu-visual.spec.js`: gate manual (`LAYERS_VISUAL=1`) que compara pixel a pixel os quatro menus abertos (clique e hover) e fechados com a captura de antes da mudança; as capturas ficam locais e não entram no repositório.
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`ff002f7`](https://github.com/brunomaida/Layers/commit/ff002f7c74555de8e0496ccf6f70af1889c040cb) test(e2e): add pixel freeze spec for the four menus (S3.2 Task 2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- **Perf:** estimated — uma chamada de `menuStep` por entrada, saída ou clique nos quatro gatilhos e um `contains()` por `pointerdown` só com menu aberto; os manipuladores de menu são criados uma vez (`menuH`), sem alocação por render; nada no caminho de câmera, scan ou render dos planos.
  - [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
  - [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
  - [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
  - [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
  - [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
  - [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern

### Todos os commits

- [`dc28f01`](https://github.com/brunomaida/Layers/commit/dc28f014b717ce0bb1b22d6ba70b509c0ebee276) docs: mark S3.2 in progress with its plan (S3.2 Task 1)
- [`8038b8c`](https://github.com/brunomaida/Layers/commit/8038b8c5d759bdd96716900893fbc7521a4e1b62) docs: add reviewed S3.2 menu open pattern plan (S3.2)
- [`ff002f7`](https://github.com/brunomaida/Layers/commit/ff002f7c74555de8e0496ccf6f70af1889c040cb) test(e2e): add pixel freeze spec for the four menus (S3.2 Task 2)
- [`4230fc8`](https://github.com/brunomaida/Layers/commit/4230fc8d3eb0fc20d5aaa12a3c9f7c8926e6a9d8) feat(core): add menuStep reducer for the shared menu pattern (S3.2 Task 3)
- [`1b23b01`](https://github.com/brunomaida/Layers/commit/1b23b0128e5e6e2ed0bafbcdffefe81a94b9567c) test(e2e): specify the shared hover-and-pin menu pattern (S3.2 Task 4)
- [`931f98d`](https://github.com/brunomaida/Layers/commit/931f98dbb3a9f72fde7b5089c754a8bd0df77d74) feat(editor): open every menu on hover and pin on click (S3.2 Task 5)
- [`f8eb570`](https://github.com/brunomaida/Layers/commit/f8eb570fc141b7f63ae7bd78c0865ebff5707b7f) docs: point the S3.4 constraint at aparRef (S3.2)
- [`8775e47`](https://github.com/brunomaida/Layers/commit/8775e47cf6f63b1df24b174e8c55e87cba2e1865) fix(editor): pin Ações on item pointerdown, reset repo input and nested combobox on menu close, build menu handlers once (S3.2 Task 5)
- [`615b3a1`](https://github.com/brunomaida/Layers/commit/615b3a18cd3736502f5fa3c587a1757fce75cbc2) Merge branch 'develop' into feature/261014-0-s3-2-menu-open-pattern
- [`20ec0a8`](https://github.com/brunomaida/Layers/commit/20ec0a822c8637239a150cb7d7521c61f0a4a573) docs: close S3.2 with changelog fragment, checklist and architecture note (S3.2 Task 7)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
