---
adr: none
---

### Fixed
- "Reanalisar do 0" não deixava claro o que fez: no Traval real o backup era gravado (4 pastas em `.design-history/layout-*`), mas nada o dizia, o mock do disco nunca mudava, a UI nova não aparecia e o aviso voltava a cada carga. Agora o toast da carga nomeia a pasta do backup.
- Com `layers.json` e o mock iguais aos da carga, o modal diz "O mock não mudou", explica que reler não traz UI nova e manda gerar o snapshot (`tools/layers-snapshot.js`); só recarrega e salva backup com "Reler mesmo assim".
- A deriva reconhecida pelo "×" ou pelo Reanalisar não volta na sessão enquanto a fonte não for editada de novo (`LayersCore.layoutDrift` ganha o parâmetro `ack`).

### Changed
- O botão "Reanalisar do 0" do banner ganha borda `--warn` e o texto da deriva aponta para o snapshot.

### Perf
- N/A — texto de aviso e uma leitura de mtime de 2 arquivos ao clicar em Reanalisar; fora de qualquer caminho quente.
