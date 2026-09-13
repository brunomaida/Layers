import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import { core } from './setup.js';

const fixture = (p) => fs.readFileSync(new URL('../fixtures/' + p, import.meta.url), 'utf8');

describe('SafePath', () => {
  it('DotDot_Rejeita', () => {
    expect(core.safePath('../../evil.css')).toBeNull();
    expect(core.safePath('src/../../evil.css')).toBeNull();
    expect(core.safePath('a/./b.css')).toBeNull();
  });

  it('Absoluto_Rejeita', () => {
    expect(core.safePath('/etc/passwd')).toBeNull();
    expect(core.safePath('C:/Windows/system.ini')).toBeNull();
    expect(core.safePath('C:\\Windows\\system.ini')).toBeNull();
  });

  it('EsquemaUrl_Rejeita', () => {
    expect(core.safePath('http://evil.test/x.css')).toBeNull();
    expect(core.safePath('file:///etc/passwd')).toBeNull();
    expect(core.safePath('javascript:alert(1)')).toBeNull();
  });

  it('Backslash_Normaliza', () => {
    expect(core.safePath('src\\styles\\layout.css')).toBe('src/styles/layout.css');
  });

  it('CaminhoValido_Devolve', () => {
    expect(core.safePath('layers/mock.html')).toBe('layers/mock.html');
    expect(core.safePath('')).toBeNull();
    expect(core.safePath(null)).toBeNull();
  });
});

describe('ParseSheet', () => {
  const css = [
    '/* comentario',
    '   com } chave e varias linhas */',
    '.a { color: red; }',
    '',
    '@media (min-width: 700px) {',
    '  .a { color: blue; }',
    '  .b { margin: 0 }',
    '}',
    '',
    '@layer utilities {',
    '  .c { padding: 1px; }',
    '}',
    '',
    '.d {',
    '  color: green;',
    '  .e { color: teal; }',
    '}'
  ].join('\n');

  it('RegraTopLevel_ArquivoSeletorLinha', () => {
    const r = core.findRule(css, '.a');
    expect(r.line).toBe(3);
    expect(r.media).toBe('');
    expect(r.decls).toEqual(['color']);
  });

  it('ComentarioAntes_NaoDeslocaALinha', () => {
    // o comentario de duas linhas contem '}' — a varredura por contagem de chaves
    // dependia de zerar comentarios antes de contar; o parser nao precisa disso
    expect(core.findRule(css, '.a').line).toBe(3);
  });

  it('DentroDeMedia_RegistraConditionText', () => {
    const rules = core.parseSheet('x.css', css, 0).filter((r) => r.selector === '.b');
    expect(rules).toHaveLength(1);
    expect(rules[0].media).toBe('(min-width: 700px)');
    expect(rules[0].line).toBe(7);
  });

  it('Layer_NaoPerdeARegra', () => {
    const r = core.parseSheet('x.css', css, 0).find((x) => x.selector === '.c');
    expect(r).toBeTruthy();
    expect(r.layer).toBe('utilities');
    expect(r.line).toBe(11);
  });

  it('Nesting_MarcaNested', () => {
    const r = core.parseSheet('x.css', css, 0).find((x) => x.selector === '.e');
    expect(r).toBeTruthy();
    expect(r.nested).toBe(true);
    expect(core.findRule(css, '.d').nested).toBe(false);
  });

  it('LineOffset_SomaNaLinha', () => {
    // bloco <style> dentro de um .html: a linha tem de ser absoluta no arquivo
    expect(core.parseSheet('page.html', css, 40).find((r) => r.selector === '.a').line).toBe(43);
  });

  it('SeletorMantemOEspacamentoDoAutor', () => {
    const r = core.findRule('.x > .y { color: red }', '.x > .y');
    expect(r).toBeTruthy();
    expect(r.selector).toBe('.x > .y');
  });
});

describe('BuildIndex', () => {
  it('Traval_ReproduzOIndiceAnterior', () => {
    const sheets = ['tokens', 'layout', 'components', 'dashboard'].map((n) => ({
      file: 'src/styles/' + n + '.css',
      text: fixture('traval/src/styles/' + n + '.css')
    }));
    const idx = core.buildIndex(sheets);
    // 128 classes era exatamente o que o indice por contagem de chaves produzia
    expect(Object.keys(idx.byClass)).toHaveLength(128);
    expect(idx.byClass['.toolbar']).toMatchObject({ file: 'src/styles/layout.css', selector: '.toolbar', line: 8 });
  });

  it('SeletorSimples_VenceComposto', () => {
    const idx = core.buildIndex([{ file: 'a.css', text: '.k .deep { color: red }\n.k { color: blue }' }]);
    expect(idx.byClass['.k'].selector).toBe('.k');
  });
});

describe('PatchCssAt', () => {
  it('PropExistente_PreservaFormatacao', () => {
    const src = '.a {\n    color:   red;   /* nota */\n    margin: 0;\n}\n';
    const out = core.patchCssAt(src, '.a', 'color', 'blue');
    expect(out).toBe('.a {\n    color: blue;   /* nota */\n    margin: 0;\n}\n');
  });

  it('Important_Mantem', () => {
    const src = '.a { color: red !important; }';
    expect(core.patchCssAt(src, '.a', 'color', 'blue')).toBe('.a { color: blue !important; }');
  });

  it('Shorthand_NaoDuplicaLonghand', () => {
    const src = '.a {\n  padding: 4px;\n}\n';
    const out = core.patchCssAt(src, '.a', 'padding', '8px');
    expect(out).toBe('.a {\n  padding: 8px;\n}\n');
    expect(out).not.toMatch(/padding-top/);
  });

  it('PropAusente_EntraNoFimDoBloco', () => {
    const src = '.a {\n  color: red;\n}\n';
    expect(core.patchCssAt(src, '.a', 'margin', '0')).toBe('.a {\n  color: red;\n  margin: 0;\n}\n');
  });

  it('RegraInexistente_Append', () => {
    const src = '.a { color: red; }\n';
    const out = core.patchCssAt(src, '.zz', 'color', 'blue');
    expect(out).toBe('.a { color: red; }\n\n.zz {\n  color: blue;\n}\n');
  });

  it('DentroDeMedia_AcertaOBloco', () => {
    const src = '.a { color: red; }\n@media (min-width: 700px) {\n  .a { color: green; }\n}\n';
    const out = core.patchCssAt(src, '.a', 'color', 'blue');
    // a regra base muda, a de dentro do @media nao
    expect(out).toBe('.a { color: blue; }\n@media (min-width: 700px) {\n  .a { color: green; }\n}\n');
  });

  it('RoundTrip_SemMudancaDevolveOMesmoTexto', () => {
    const src = fixture('traval/src/styles/layout.css');
    const r = core.findRule(src, '.toolbar');
    expect(r).toBeTruthy();
    const prop = r.decls[0];
    const value = /([\w-]+)\s*:\s*([^;]+);/.exec(src.slice(r.bodyStart, r.bodyEnd))[2].trim();
    expect(core.patchCssAt(src, '.toolbar', prop, value)).toBe(src);
  });
});

describe('RuleText', () => {
  it('RegraComBlocoAninhado_NaoCorta', () => {
    const src = '.d {\n  color: green;\n  .e { color: teal; }\n}\n';
    // a versao por regex parava no primeiro '}' e devolvia a regra pela metade
    expect(core.ruleText(src, '.d')).toBe('.d {\n  color: green;\n  .e { color: teal; }\n}');
  });

  it('RegraAusente_Null', () => {
    expect(core.ruleText('.a { color: red }', '.zz')).toBeNull();
  });
});

describe('DeclaredIn', () => {
  it('ComentarioNoBloco_NaoViraPropriedade', () => {
    const set = core.declaredIn('.a {\n  /* margin: 0; */\n  color: red;\n}', '.a');
    expect([...set]).toEqual(['color']);
  });

  it('RegraAusente_Null', () => {
    expect(core.declaredIn('.a { color: red }', '.zz')).toBeNull();
  });
});

describe('ScopeAst', () => {
  it('RootViraHost', () => {
    expect(core.scopeAst(':root { --a: 1px; }').css).toBe(':host { --a: 1px; }');
  });

  it('HtmlBodyViramRaiz', () => {
    expect(core.scopeAst('html, body { margin: 0 }').css).toBe('.__layers-root, .__layers-root { margin: 0 }');
    expect(core.scopeAst('body .card { color: red }').css).toBe('.__layers-root .card { color: red }');
  });

  it('UniversalViraDescendente', () => {
    expect(core.scopeAst('* { box-sizing: border-box }').css)
      .toBe('.__layers-root, .__layers-root * { box-sizing: border-box }');
  });

  it('RootDentroDeString_NaoReescreve', () => {
    // a substituicao por regex trocava isto e quebrava o content
    const src = '.a::before { content: ":root html body"; }';
    expect(core.scopeAst(src).css).toBe(src);
  });

  it('SeletorDeAtributo_NaoReescreve', () => {
    const src = '[data-x="body"] { color: red }';
    expect(core.scopeAst(src).css).toBe(src);
  });

  it('ComentarioComBody_NaoReescreve', () => {
    const src = '/* body e html aqui sao texto */\n.a { color: red }';
    expect(core.scopeAst(src).css).toBe(src);
  });

  it('FontFace_ExtraiNaoEscopa', () => {
    const src = "@font-face { font-family: 'X'; src: url(x.woff2); }\n.a { color: red }";
    const out = core.scopeAst(src);
    expect(out.faces).toHaveLength(1);
    expect(out.faces[0]).toContain('font-family');
    expect(out.css).not.toContain('@font-face');
    expect(out.css).toContain('.a { color: red }');
  });

  it('Keyframes_NaoViraRaiz', () => {
    const src = '@keyframes spin { from { opacity: 0 } to { opacity: 1 } }';
    expect(core.scopeAst(src).css).toBe(src);
  });

  it('Axai_ProduzCssValido', () => {
    const out = core.scopeAst(fixture('axai/wwwroot/painel.css'));
    expect(out.css).toContain(':host');
    expect(out.css).not.toContain(':root');
    // escopar nao pode perder regra; o universal vira dois seletores, entao so pode crescer
    const before = core.parseSheet('a', fixture('axai/wwwroot/painel.css'), 0).length;
    const after = core.parseSheet('a', out.css, 0).length;
    expect(after).toBeGreaterThanOrEqual(before);
    expect(after - before).toBeLessThanOrEqual(2);
  });
});

describe('IsUtilitySheet', () => {
  it('DiretivaTailwind_Marca', () => {
    expect(core.isUtilitySheet('@tailwind base;\n@tailwind utilities;')).toBe(true);
  });

  it('LayerUtilities_Marca', () => {
    expect(core.isUtilitySheet('@layer utilities { .p-1 { padding: 1px } }')).toBe(true);
  });

  it('FolhaAutoral_NaoMarca', () => {
    expect(core.isUtilitySheet(fixture('traval/src/styles/components.css'))).toBe(false);
  });
});
