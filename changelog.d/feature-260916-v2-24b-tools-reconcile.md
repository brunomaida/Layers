### feature/260916-v2-24b-tools-reconcile — 2026-09-16

#### Added
- ⟷ Medir (M): redlines entre a seleção e o elemento sob o cursor no palco; sem hover, mede até o pai.
- Box Model: painel expansível (margin/border/padding/conteúdo) com valores do estilo computado e sync visual no palco por hover.
- Tokens: custom properties da regra selecionada, resolvidas por AST (`LayersCore.varIndex`) com arquivo/linha/seletor de origem.
- Menu de projeto: seção "Exemplos" (fixture Traval) e "Zerar interface (sem projeto)".

#### Changed
- Botão Medir padronizado no mesmo estilo (ícone + texto, cor selectColor quando ativo) de Explodido/Foco.

#### Perf
- **N/A** — cold path only (UI de edição, sem path-tiers.json no projeto; nenhum loop de alta frequência tocado).

#### Commits
- `1f1246b` — feat: add Medir, Box Model and Tokens tools with Exemplos/Zerar interface menu
