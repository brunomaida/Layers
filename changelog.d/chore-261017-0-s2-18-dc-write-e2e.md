---
adr: none
---

### Added
- `e2e/dc-write.spec.js` (4 casos) cobre a gravação do template dc numa cópia OPFS de `fixtures/dc-template`: `DcWrite_EditarEstiloInline_GravaSoOAtributo` (só o `style=""` do `h1` muda, `.bak` e `.design-history` guardam o original), `DcWrite_ValorComBinding_RecusaSemTocarOArquivo` (`VALUE_HAS_BINDING`, hash do arquivo igual), `DcWrite_SemStyleInline_RecusaSemTocarOArquivo` (`NO_INLINE_STYLE`, arquivo intocado) e `DcWrite_ArquivoMudouNoDisco_RecusaSourceChanged`. A prova é o conteúdo do arquivo, não o toast.
- Item manual aberto no checklist B e roteiro de 5 passos em `docs/LOCAL-SETUP.md` § Verificação manual da gravação dc: a conferência em disco real continua com o usuário.

### Perf
- N/A — só testes E2E e docs, nenhum código do app muda.
