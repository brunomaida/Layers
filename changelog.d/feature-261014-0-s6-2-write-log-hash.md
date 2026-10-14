---
adr: none
---

### Added
- `layers-export.log` registra o SHA-256 do conteúdo antes e depois de cada gravação e ganha cabeçalho de versão (`# layers-export.log v2`). O hash "depois" confere com `sha256sum`/`Get-FileHash` do arquivo gravado. `LayersCore.contentHash` e `LayersCore.writeLogText` (testados).
- `e2e/write-log-hash.spec.js`: rascunho + exportação numa pasta OPFS; o log traz o hash e ele confere com o arquivo; um segundo rascunho mostra o "antes" igual ao hash do `.bak`.

### Fixed
- `layers-export.log`: o caminho sai com caracteres de controle e espaços duplos escapados (`\xNN`); um nome de arquivo com quebra de linha não forja nem parte mais uma linha do log. Se o digest falhar, só os hashes saem como `-` e os tamanhos em bytes ficam.
- `layers-export.log`: os tamanhos antes/depois passam a ser bytes UTF-8 (antes eram unidades UTF-16 rotuladas como `bytes`).

### Perf
- estimated — dois `crypto.subtle.digest` SHA-256 por gravação, depois da escrita (caminho frio, um clique); abaixo de 1 ms para uma folha de 200 KB. Memória: dois buffers UTF-8 (antes/depois) e a cópia interna do digest, de vida curta.
