---
adr: none
---

### Docs

- Plano da Onda 3 deixa de descrever o histórico dividido por `Claude-Session:`: os 86 commits foram reescritos em 2026-10-17 e a regra é nenhum trailer.

### Tests

- Novo `.githooks/commit-msg`: delega ao hook global de `~/.git-hooks`, que remove `Claude-Session:` e linhas `claude.ai/code/session` da mensagem do commit.

### Perf

- N/A — documentação e um hook de git; nenhum código de runtime mudou.
