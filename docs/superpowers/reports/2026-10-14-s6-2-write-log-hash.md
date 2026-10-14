# Implementation Report — s6-2-write-log-hash

- **Branch:** `feature/261014-0-s6-2-write-log-hash`
- **Range:** `origin/devel..HEAD`
- **Período:** 2026-10-14 16:55 → 2026-10-14 16:56
- **Status:** `final`
- **Gerado em:** 2026-10-14 16:59

## Resumo

`layers-export.log` registra o SHA-256 do conteúdo antes e depois de cada gravação e ganha cabeçalho de versão (`# layers-export.log v2`). O hash "depois" confere com `sha256sum`/`Get-FileHash` do arquivo gravado. `LayersCore.contentHash` e `LayersCore.writeLogText` (testados).

## Mudanças

### Added (3)

- `changelog.d/feature-261014-0-s6-2-write-log-hash.md` (+14/-0, doc)
- `docs/superpowers/plans/2026-10-14-s6-2-write-log-hash.md` (+468/-0, doc)
- `e2e/write-log-hash.spec.js` (+141/-0, src)

### Changed (7)

- `docs/ARCHITECTURE.md` (+7/-0, doc)
- `docs/RELEASE-CHECKLIST.md` (+1/-1, doc)
- `docs/roadmap.data.json` (+18/-11, doc)
- `docs/roadmap.md` (+1/-1, doc)
- `index.html` (+4/-3, other)
- `lib/layers-core.js` (+35/-0, src)
- `test/layers-core.test.js` (+68/-1, test)

### Changelog fragment

**Added:**
- `layers-export.log` registra o SHA-256 do conteúdo antes e depois de cada gravação e ganha cabeçalho de versão (`# layers-export.log v2`). O hash "depois" confere com `sha256sum`/`Get-FileHash` do arquivo gravado. `LayersCore.contentHash` e `LayersCore.writeLogText` (testados).
- `e2e/write-log-hash.spec.js`: rascunho + exportação numa pasta OPFS; o log traz o hash e ele confere com o arquivo; um segundo rascunho mostra o "antes" igual ao hash do `.bak`.

**Fixed:**
- `layers-export.log`: o caminho sai com caracteres de controle e espaços duplos escapados (`\xNN`); um nome de arquivo com quebra de linha não forja nem parte mais uma linha do log. Se o digest falhar, só os hashes saem como `-` e os tamanhos em bytes ficam.
- `layers-export.log`: os tamanhos antes/depois passam a ser bytes UTF-8 (antes eram unidades UTF-16 rotuladas como `bytes`).

**Perf:**
- estimated — dois `crypto.subtle.digest` SHA-256 por gravação, depois da escrita (caminho frio, um clique); abaixo de 1 ms para uma folha de 200 KB. Memória: dois buffers UTF-8 (antes/depois) e a cópia interna do digest, de vida curta.

## Arquivos tocados

### src (2)

- [`e2e/write-log-hash.spec.js`](../../../e2e/write-log-hash.spec.js) — A (+141/-0)
- [`lib/layers-core.js`](../../../lib/layers-core.js) — M (+35/-0)

### test (1)

- [`test/layers-core.test.js`](../../../test/layers-core.test.js) — M (+68/-1)

### doc (6)

- [`changelog.d/feature-261014-0-s6-2-write-log-hash.md`](../../../changelog.d/feature-261014-0-s6-2-write-log-hash.md) — A (+14/-0)
- [`docs/ARCHITECTURE.md`](../../ARCHITECTURE.md) — M (+7/-0)
- [`docs/RELEASE-CHECKLIST.md`](../../RELEASE-CHECKLIST.md) — M (+1/-1)
- [`docs/roadmap.data.json`](../../roadmap.data.json) — M (+18/-11)
- [`docs/roadmap.md`](../../roadmap.md) — M (+1/-1)
- [`docs/superpowers/plans/2026-10-14-s6-2-write-log-hash.md`](../plans/2026-10-14-s6-2-write-log-hash.md) — A (+468/-0)

### other (1)

- [`index.html`](../../../index.html) — M (+4/-3)

## Testes

- **Atributos `[Fact]`/`[Theory]` em arquivos de teste tocados:** 0

**Arquivos:**
- [`test/layers-core.test.js`](../../../test/layers-core.test.js)

## Commits ↔ changelog

- **Added:** `layers-export.log` registra o SHA-256 do conteúdo antes e depois de cada gravação e ganha cabeçalho de versão (`# layers-export.log v2`). O hash "depois" confere com `sha256sum`/`Get-FileHash` do arquivo gravado. `LayersCore.contentHash` e `LayersCore.writeLogText` (testados).
  - [`eb63cb3`](https://github.com/brunomaida/Layers/commit/eb63cb353ff908c232a4137dc7f56a378bb97824) feat(core): add contentHash and writeLogText (S6.2 Task 1)
  - [`91393de`](https://github.com/brunomaida/Layers/commit/91393de2bff64c188859db2abb9839162c435f21) feat(io): log SHA-256 before and after each write in layers-export.log (S6.2 Task 2)
  - [`eb772ea`](https://github.com/brunomaida/Layers/commit/eb772ead8aa22c606e5f243d16cc61d1f55a78ab) fix(core): escape control chars in write log paths (S6.2 Task 2 fix round 1)
  - [`46b08eb`](https://github.com/brunomaida/Layers/commit/46b08eb9a2c5cb7c366d48e1c2a2e04040802bbd) fix(io): keep byte counts when the SHA-256 digest fails (S6.2 Task 2 fix round 1)
  - [`fec0584`](https://github.com/brunomaida/Layers/commit/fec0584dc740635d9f49fd76d5881949b5330ca0) docs: correct .bak condition and digest-failure wording for the write log (S6.2 Task 2 fix round 1)
  - [`f799d4e`](https://github.com/brunomaida/Layers/commit/f799d4eb652e7ba7c926076f694ac3187817f833) test(e2e): cover digest failure and hash on-disk bytes in write log spec (S6.2 Task 2 fix round 1)
- **Added:** `e2e/write-log-hash.spec.js`: rascunho + exportação numa pasta OPFS; o log traz o hash e ele confere com o arquivo; um segundo rascunho mostra o "antes" igual ao hash do `.bak`.
  - [`91393de`](https://github.com/brunomaida/Layers/commit/91393de2bff64c188859db2abb9839162c435f21) feat(io): log SHA-256 before and after each write in layers-export.log (S6.2 Task 2)
  - [`eb772ea`](https://github.com/brunomaida/Layers/commit/eb772ead8aa22c606e5f243d16cc61d1f55a78ab) fix(core): escape control chars in write log paths (S6.2 Task 2 fix round 1)
  - [`fec0584`](https://github.com/brunomaida/Layers/commit/fec0584dc740635d9f49fd76d5881949b5330ca0) docs: correct .bak condition and digest-failure wording for the write log (S6.2 Task 2 fix round 1)
  - [`f799d4e`](https://github.com/brunomaida/Layers/commit/f799d4eb652e7ba7c926076f694ac3187817f833) test(e2e): cover digest failure and hash on-disk bytes in write log spec (S6.2 Task 2 fix round 1)
- **Fixed:** `layers-export.log`: o caminho sai com caracteres de controle e espaços duplos escapados (`\xNN`); um nome de arquivo com quebra de linha não forja nem parte mais uma linha do log. Se o digest falhar, só os hashes saem como `-` e os tamanhos em bytes ficam.
  - [`91393de`](https://github.com/brunomaida/Layers/commit/91393de2bff64c188859db2abb9839162c435f21) feat(io): log SHA-256 before and after each write in layers-export.log (S6.2 Task 2)
  - [`eb772ea`](https://github.com/brunomaida/Layers/commit/eb772ead8aa22c606e5f243d16cc61d1f55a78ab) fix(core): escape control chars in write log paths (S6.2 Task 2 fix round 1)
  - [`46b08eb`](https://github.com/brunomaida/Layers/commit/46b08eb9a2c5cb7c366d48e1c2a2e04040802bbd) fix(io): keep byte counts when the SHA-256 digest fails (S6.2 Task 2 fix round 1)
  - [`fec0584`](https://github.com/brunomaida/Layers/commit/fec0584dc740635d9f49fd76d5881949b5330ca0) docs: correct .bak condition and digest-failure wording for the write log (S6.2 Task 2 fix round 1)
  - [`f799d4e`](https://github.com/brunomaida/Layers/commit/f799d4eb652e7ba7c926076f694ac3187817f833) test(e2e): cover digest failure and hash on-disk bytes in write log spec (S6.2 Task 2 fix round 1)
- **Fixed:** `layers-export.log`: os tamanhos antes/depois passam a ser bytes UTF-8 (antes eram unidades UTF-16 rotuladas como `bytes`).
  - [`91393de`](https://github.com/brunomaida/Layers/commit/91393de2bff64c188859db2abb9839162c435f21) feat(io): log SHA-256 before and after each write in layers-export.log (S6.2 Task 2)
  - [`eb772ea`](https://github.com/brunomaida/Layers/commit/eb772ead8aa22c606e5f243d16cc61d1f55a78ab) fix(core): escape control chars in write log paths (S6.2 Task 2 fix round 1)
  - [`fec0584`](https://github.com/brunomaida/Layers/commit/fec0584dc740635d9f49fd76d5881949b5330ca0) docs: correct .bak condition and digest-failure wording for the write log (S6.2 Task 2 fix round 1)
  - [`f799d4e`](https://github.com/brunomaida/Layers/commit/f799d4eb652e7ba7c926076f694ac3187817f833) test(e2e): cover digest failure and hash on-disk bytes in write log spec (S6.2 Task 2 fix round 1)
- **Perf:** estimated — dois `crypto.subtle.digest` SHA-256 por gravação, depois da escrita (caminho frio, um clique); abaixo de 1 ms para uma folha de 200 KB. Memória: dois buffers UTF-8 (antes/depois) e a cópia interna do digest, de vida curta.
  - [`91393de`](https://github.com/brunomaida/Layers/commit/91393de2bff64c188859db2abb9839162c435f21) feat(io): log SHA-256 before and after each write in layers-export.log (S6.2 Task 2)
  - [`46b08eb`](https://github.com/brunomaida/Layers/commit/46b08eb9a2c5cb7c366d48e1c2a2e04040802bbd) fix(io): keep byte counts when the SHA-256 digest fails (S6.2 Task 2 fix round 1)
  - [`fec0584`](https://github.com/brunomaida/Layers/commit/fec0584dc740635d9f49fd76d5881949b5330ca0) docs: correct .bak condition and digest-failure wording for the write log (S6.2 Task 2 fix round 1)
  - [`f799d4e`](https://github.com/brunomaida/Layers/commit/f799d4eb652e7ba7c926076f694ac3187817f833) test(e2e): cover digest failure and hash on-disk bytes in write log spec (S6.2 Task 2 fix round 1)

### Todos os commits

- [`a5cb037`](https://github.com/brunomaida/Layers/commit/a5cb037b32562e2f7d7fcb778ddd982aeb7eb5cb) docs: start S6.2 in the tracker (S6.2)
- [`2796270`](https://github.com/brunomaida/Layers/commit/27962702ed9a822afdd06d6abd5073af40729e59) docs: add S6.2 implementation plan (S6.2)
- [`a8cdc75`](https://github.com/brunomaida/Layers/commit/a8cdc7512d533ee466f4f9da4e709016d68a26aa) docs: apply plan review findings (S6.2)
- [`eb63cb3`](https://github.com/brunomaida/Layers/commit/eb63cb353ff908c232a4137dc7f56a378bb97824) feat(core): add contentHash and writeLogText (S6.2 Task 1)
- [`91393de`](https://github.com/brunomaida/Layers/commit/91393de2bff64c188859db2abb9839162c435f21) feat(io): log SHA-256 before and after each write in layers-export.log (S6.2 Task 2)
- [`d45e345`](https://github.com/brunomaida/Layers/commit/d45e345bf369fb365a7c05bd01335836764c3930) docs: close S6.2 with checklist, architecture note and changelog fragment (S6.2 Task 3)
- [`eb772ea`](https://github.com/brunomaida/Layers/commit/eb772ead8aa22c606e5f243d16cc61d1f55a78ab) fix(core): escape control chars in write log paths (S6.2 Task 2 fix round 1)
- [`46b08eb`](https://github.com/brunomaida/Layers/commit/46b08eb9a2c5cb7c366d48e1c2a2e04040802bbd) fix(io): keep byte counts when the SHA-256 digest fails (S6.2 Task 2 fix round 1)
- [`fec0584`](https://github.com/brunomaida/Layers/commit/fec0584dc740635d9f49fd76d5881949b5330ca0) docs: correct .bak condition and digest-failure wording for the write log (S6.2 Task 2 fix round 1)
- [`f799d4e`](https://github.com/brunomaida/Layers/commit/f799d4eb652e7ba7c926076f694ac3187817f833) test(e2e): cover digest failure and hash on-disk bytes in write log spec (S6.2 Task 2 fix round 1)

## Custo (tokens + tempo)

_Sem sessões Claude detectadas no range._
