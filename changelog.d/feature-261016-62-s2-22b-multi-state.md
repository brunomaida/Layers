---
adr: none
---

### Added
- `layers.json › states` (`[{ name, mock }]`): um projeto declara um mock por estado da interface. Com 2+ estados, o menu ⚡ Interagir › Modo interativo ganha o grupo "Estado do mock"; escolher um relê as camadas do zero e pede confirmação se há edições não salvas. Sem `states`, o campo `mock` vale como antes.
- O CLI de snapshot aceita `--state <nome>` (captura `<url-do-app>/gallery.html#/<nome>`) e `--url <url-do-app>`; nome fora de letras, dígitos, `.`, `_` e `-` é recusado antes de abrir o navegador.

### Perf
- N/A — só escolhe qual mock ler na carga e acrescenta um grupo de itens ao menu; sem medição, fora de qualquer caminho quente.
