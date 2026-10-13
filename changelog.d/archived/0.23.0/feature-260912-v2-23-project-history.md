# Histórico de projetos no painel superior

Branch `feature/260912-v2-23-project-history`.

### Added

- Dropdown "Projetos recentes" no canto esquerdo do painel superior, substituindo o botão de pasta. Mesmo padrão visual dos comboboxes (borda `rgba(var(--selRgb),.6)` aberto, hover `rgba(var(--selRgb),.16)`, item atual `var(--sel)`).
- Persistência: lista em `localStorage` (`traval-layer-editor-hist`) e `FileSystemDirectoryHandle` em IndexedDB (`layers-hist`, store `h`). Reconexão chama `requestPermission({mode:'readwrite'})` e cai para `showDirectoryPicker` se negada ou sem handle.
- Entradas `kind: 'repo'` (URL github.com/owner/repo) só registram; abrir mostra toast apontando para o loader.
- Ações por item: fixar (não conta no limite nem é removido por "Limpar"), remover. Rodapé: conectar pasta, registrar repositório, limpar histórico.
- Tweak `histMax` (int, 3–20, padrão 10).

### Changed

- `connectDir` passou a `pickDir()` → `useDir(dir)`, que também alimenta o histórico.
- Cabeçalho: `z-index` vira 70 enquanto o dropdown de projetos ou o menu Aparência estiver aberto (antes o dock, z 35, cobria os menus do cabeçalho).
- Grupo esquerdo do cabeçalho sem `overflow:hidden`; ellipsis movido para os spans internos.

### Perf

**N/A** — listener único de `mousedown` no documento para fechar ao clicar fora; IndexedDB só é tocado em conectar/reconectar/remover.
