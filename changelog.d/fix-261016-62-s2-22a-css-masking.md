---
adr: none
---

### Fixed
- No Traval real, o CSS copiado pelo snapshot mascarava as folhas reais de `styles`: editar a folha não mudava o palco. O snapshot passa a marcar cada `<style>` com `data-layers-origin` e o loader descarta a cópia de uma folha listada e lida, usando o texto vivo da folha na posição da cópia (cascata do mock preservada). Vale também com `base`.
- Folha listada que falhou ao ler mantém a cópia do snapshot; mock sem o atributo (snapshot antigo, mock autoral) carrega como antes. Gere um novo snapshot para se beneficiar.
- O aviso de `interactions` sem alvo passa a vir antes dos avisos de URL remota, para aparecer no toast da carga (que mostra só o primeiro aviso).

### Changed
- Em snapshot com bloco de CSS sem origem e com regras, a alteração de uma folha listada sugere "Reanalisar do 0" em vez de "Recarregar" (`maskedCss` entra em `structural`).

### Perf
- N/A — só remove CSS duplicado na carga do mock; sem medição, fora de qualquer caminho quente.
