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

  it('FolhaDeUtilitarios_Marca', () => {
    expect(core.isUtilitySheet(fixture('tailwind/utilities.css'))).toBe(true);
  });

  it('LayerUtilitiesAutoral_NaoMarca', () => {
    // uma folha autoral pode declarar a camada com duas regras; marcar por causa disso
    // desabilitaria Aplicar sem motivo
    expect(core.isUtilitySheet('@layer utilities { .p-1 { padding: 1px } }')).toBe(false);
    expect(core.isUtilitySheet(fixture('nested-oklch/style.css'))).toBe(false);
  });

  it('FolhaAutoral_NaoMarca', () => {
    expect(core.isUtilitySheet(fixture('traval/src/styles/components.css'))).toBe(false);
    expect(core.isUtilitySheet(fixture('axai/wwwroot/painel.css'))).toBe(false);
    expect(core.isUtilitySheet(fixture('plain-css/style.css'))).toBe(false);
  });
});

describe('OpenZip', () => {
  const evil = () => {
    const b = fs.readFileSync(new URL('../fixtures/zip/evil.zip', import.meta.url));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  };

  it('EntradaComTravessia_Rejeita', async () => {
    const { files, skipped } = await core.openZip(evil());
    // o vetor real: um .zip que o usuario baixou pode trazer caminhos que saem da pasta
    expect(skipped).toContain('../../evil.css');
    expect(skipped).toContain('/abs.css');
    expect(skipped).toContain('C:\\win.css');
    expect([...files.keys()]).not.toContain('../../evil.css');
  });

  it('DeflateRaw_Descomprime', async () => {
    const { files } = await core.openZip(evil());
    expect([...files.keys()].sort()).toEqual(['index.html', 'layers.json', 'ok/nested.css', 'style.css']);
    expect(new TextDecoder().decode(files.get('style.css'))).toContain('.box { padding: 20px;');
    expect(JSON.parse(new TextDecoder().decode(files.get('layers.json'))).name).toBe('Zip de teste');
  });

  it('NaoEhZip_Erro', async () => {
    await expect(core.openZip(new TextEncoder().encode('isto nao e um zip').buffer)).rejects.toThrow(/nao parece um \.zip/);
  });
});

describe('ZipRoot', () => {
  it('ManifestoNaRaiz_SemPrefixo', () => {
    expect(core.zipRoot(new Map([['layers.json', 1], ['index.html', 1]]))).toBe('');
  });

  it('PastaUnicaNoTopo_ViraRaiz', () => {
    // baixar um repositorio do GitHub embrulha tudo em '<repo>-<ref>/'
    const m = new Map([['Layers-develop/layers.json', 1], ['Layers-develop/index.html', 1]]);
    expect(core.zipRoot(m)).toBe('Layers-develop/');
  });

  it('VariasPastasNoTopo_SemPrefixo', () => {
    const m = new Map([['a/layers.json', 1], ['b/x.css', 1]]);
    expect(core.zipRoot(m)).toBe('');
  });

  it('PastaUnicaSemManifesto_SemPrefixo', () => {
    expect(core.zipRoot(new Map([['so-css/x.css', 1]]))).toBe('');
  });
});

// Storage de mentira: os mesmos 4 metodos que o localStorage expoe, o suficiente para
// migrateConfig/readConfig/writeConfig rodarem sem DOM.
const fakeStorage = (seed) => {
  const m = new Map(Object.entries(seed || {}));
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
    keys: () => [...m.keys()],
    raw: m,
  };
};

describe('MigrateConfig', () => {
  it('TresChavesAtuais_ProduzLayersV1', () => {
    const s = fakeStorage({
      'layers-cfg': JSON.stringify({ theme: 'Bright · 1 Papel', fontScale: 1.2, lixo: 1 }),
      'layers-hist': JSON.stringify([{ id: 'folder:Traval', kind: 'folder', name: 'Traval', pinned: true }]),
      'layers-inter-size': JSON.stringify({ w: 620, h: 300, split: 240 }),
    });
    const cfg = core.migrateConfig(s);

    expect(cfg.ui.theme).toBe('Bright · 1 Papel');
    expect(cfg.ui.fontScale).toBe(1.2);
    expect(cfg.ui.lixo).toBeUndefined();
    expect(cfg.ui.interSize).toEqual({ w: 620, h: 300, split: 240 });
    expect(cfg.projects).toHaveLength(1);
    expect(cfg.projects[0].id).toBe('folder:Traval');
    expect(cfg.session.lastProjectId).toBeNull();

    expect(JSON.parse(s.getItem('layers/v1/meta')).schema).toBe(1);
    expect(JSON.parse(s.getItem('layers/v1/ui')).theme).toBe('Bright · 1 Papel');
    expect(JSON.parse(s.getItem('layers/v1/projects'))).toHaveLength(1);
  });

  it('ChavesAntigas_NaoSaoApagadas', () => {
    // removidas na v2.26 com uma linha no CHANGELOG, nao aqui: um downgrade do index.html
    // ainda precisa encontrar o que era dele.
    const s = fakeStorage({ 'layers-cfg': JSON.stringify({ theme: 'Dark' }) });
    core.migrateConfig(s);
    expect(s.getItem('layers-cfg')).toBe(JSON.stringify({ theme: 'Dark' }));
    expect(JSON.parse(s.getItem('layers/v1/meta')).migratedFrom).toContain('layers-cfg');
  });

  it('JaMigrado_NaoRefaz', () => {
    const s = fakeStorage({
      'layers/v1/meta': JSON.stringify({ schema: 1, savedAt: 1 }),
      'layers/v1/ui': JSON.stringify({ theme: 'Dark' }),
      'layers-cfg': JSON.stringify({ theme: 'Bright · 1 Papel' }),
    });
    const cfg = core.migrateConfig(s);
    expect(cfg.ui.theme).toBe('Dark');
    expect(JSON.parse(s.getItem('layers/v1/meta')).savedAt).toBe(1);
  });

  it('StorageVazio_ProduzConfigVazia', () => {
    const s = fakeStorage();
    const cfg = core.migrateConfig(s);
    expect(cfg.ui).toEqual({});
    expect(cfg.projects).toEqual([]);
    expect(cfg.session.lastProjectId).toBeNull();
  });

  it('StorageQueLanca_NaoQuebra', () => {
    const s = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
    expect(() => core.migrateConfig(s)).not.toThrow();
    expect(core.migrateConfig(s).projects).toEqual([]);
  });
});

describe('WriteConfig', () => {
  it('LastProjectIdNull_Persiste', () => {
    // null e valor legitimo: significa 'nenhum projeto', e reabrir vazio e o esperado.
    const s = fakeStorage();
    core.writeConfig(s, { ui: { theme: 'Dark' }, projects: [], session: { lastProjectId: null, selId: '3', isoId: null } });
    const back = core.readConfig(s);
    expect(back.session.lastProjectId).toBeNull();
    expect('lastProjectId' in back.session).toBe(true);
    expect(back.session.selId).toBe('3');
  });

  it('RoundTrip_PreservaUiProjectsSession', () => {
    const s = fakeStorage();
    const cfg = {
      ui: { theme: 'Gray · 1 Grafite', wireAlpha: 35, interSize: { w: 580, h: 0, split: 210 } },
      projects: [{ id: 'zip:x.zip', kind: 'zip', name: 'x.zip', pinned: false }],
      session: { lastProjectId: 'zip:x.zip', selId: '0', isoId: null, camera: { yaw: 12, tilt: -4, zoom: 1.5, panX: 3, panY: 0, flat: true } },
    };
    core.writeConfig(s, cfg);
    expect(core.readConfig(s)).toEqual(cfg);
  });

  it('DepoisDaMigracao_PreservaMigratedFrom', () => {
    // a primeira gravacao comum vem 400 ms depois da migracao: nao pode apagar o registro
    const s = fakeStorage({ 'layers-cfg': JSON.stringify({ theme: 'Dark' }) });
    const cfg = core.migrateConfig(s);
    core.writeConfig(s, cfg);
    expect(JSON.parse(s.getItem('layers/v1/meta')).migratedFrom).toContain('layers-cfg');
  });

  it('JsonCorrompido_CaiParaVazio', () => {
    const s = fakeStorage({ 'layers/v1/ui': '{nao é json', 'layers/v1/projects': 'null' });
    const back = core.readConfig(s);
    expect(back.ui).toEqual({});
    expect(back.projects).toEqual([]);
  });
});

describe('ExportConfig', () => {
  it('SchemaEData_NoArquivo', () => {
    const blob = core.exportConfig({ ui: { theme: 'Dark' }, projects: [], session: { lastProjectId: null } });
    expect(blob.schema).toBe(1);
    expect(typeof blob.exportedAt).toBe('string');
    expect(blob.ui.theme).toBe('Dark');
  });

  it('SessaoFicaDeFora_DoArquivo', () => {
    // o import descarta sessao por contrato; exportar camera e ultimo projeto seria dado morto
    const blob = core.exportConfig({ ui: {}, projects: [], session: { lastProjectId: 'folder:X' } });
    expect('session' in blob).toBe(false);
  });

  it('SessaoDoArquivo_Ignorada', () => {
    const atual = { ui: {}, projects: [], session: { lastProjectId: 'folder:Traval', selId: '7' } };
    const out = core.importConfig({ schema: 1, ui: {}, session: { lastProjectId: 'folder:Outro', selId: '1' } }, atual);
    expect(out.session).toEqual(atual.session);
  });

  it('UiNaoObjeto_MantemALocal', () => {
    const atual = { ui: { theme: 'Dark' }, projects: [], session: {} };
    expect(core.importConfig({ schema: 1, ui: 'nao é objeto' }, atual).ui).toEqual({ theme: 'Dark' });
  });

  it('SchemaErrado_Recusa', () => {
    expect(() => core.importConfig({ schema: 2 }, { ui: {}, projects: [] })).toThrow();
    expect(() => core.importConfig(null, { ui: {}, projects: [] })).toThrow();
  });

  it('MergePorId_PreservaPinned', () => {
    const atual = { ui: { theme: 'Dark' }, projects: [{ id: 'folder:Traval', kind: 'folder', name: 'Traval', pinned: true, last: 9 }], session: {} };
    const arquivo = { schema: 1, ui: { theme: 'Bright · 1 Papel' }, projects: [{ id: 'folder:Traval', kind: 'folder', name: 'Traval', pinned: false, last: 1 }, { id: 'zip:novo.zip', kind: 'zip', name: 'novo.zip' }] };
    const out = core.importConfig(arquivo, atual);
    expect(out.ui.theme).toBe('Bright · 1 Papel');
    expect(out.projects.find(p => p.id === 'folder:Traval').pinned).toBe(true);
    expect(out.projects.find(p => p.id === 'zip:novo.zip')).toBeTruthy();
  });

  it('SemProjects_MantemOsAtuais', () => {
    const atual = { ui: {}, projects: [{ id: 'folder:A', name: 'A' }], session: {} };
    const out = core.importConfig({ schema: 1, ui: { theme: 'Dark' } }, atual);
    expect(out.projects).toHaveLength(1);
  });
});

describe('DeriveManifest', () => {
  it('LinkExterno_UsaComoStyles', () => {
    const files = [
      { path: 'index.html', kind: 'html', text: '<html><head><link rel="stylesheet" href="styles.css"></head><body><div>a</div><div>b</div></body></html>' },
      { path: 'styles.css', kind: 'css', text: 'body{}' }
    ];
    const out = core.deriveManifest(files);
    expect(out.mock).toBe('index.html');
    expect(out.base).toBe('');
    expect(out.styles).toEqual(['styles.css']);
    expect(out.classification).toBe('HTML estático');
  });

  it('StyleInlineSemCssExterno_StylesVazio', () => {
    const files = [
      { path: 'index.html', kind: 'html', text: '<html><head><style>.a{color:red}</style></head><body><div>a</div><div>b</div></body></html>' }
    ];
    const out = core.deriveManifest(files);
    expect(out.mock).toBe('index.html');
    expect(out.styles).toEqual([]);
    expect(out.classification).toBe('HTML único com <style> inline');
  });

  it('MultiplosHtml_VenceMaisElementos', () => {
    const files = [
      { path: 'a.html', kind: 'html', text: '<body><div>a</div></body>' },
      { path: 'sub/b.html', kind: 'html', text: '<body><div>a</div><div>b</div><div>c</div></body>' }
    ];
    const out = core.deriveManifest(files);
    expect(out.mock).toBe('b.html');
    expect(out.base).toBe('sub');
  });

  it('MultiplosHtml_EmpateDesempataPorCaminhoCurto', () => {
    const files = [
      { path: 'sub/longo.html', kind: 'html', text: '<body><div>a</div><div>b</div></body>' },
      { path: 'a.html', kind: 'html', text: '<body><div>a</div><div>b</div></body>' }
    ];
    const out = core.deriveManifest(files);
    expect(out.mock).toBe('a.html');
    expect(out.base).toBe('');
  });

  it('NenhumHtml_MockNulo', () => {
    const files = [{ path: 'style.css', kind: 'css', text: 'body{}' }];
    const out = core.deriveManifest(files);
    expect(out.mock).toBeNull();
    expect(out.styles).toEqual([]);
    expect(out.classification).toBe('nenhum HTML com corpo');
  });

  it('CssReferenciadoAusente_Filtrado', () => {
    const files = [
      { path: 'index.html', kind: 'html', text: '<html><head><link rel="stylesheet" href="missing.css"></head><body><div>a</div></body></html>' }
    ];
    const out = core.deriveManifest(files);
    expect(out.styles).toEqual([]);
  });

  it('MockEmSubpasta_DerivaBase', () => {
    const files = [
      { path: 'src/ui/shell.html', kind: 'html', text: '<html><head><link rel="stylesheet" href="layout.css"></head><body><div>a</div></body></html>' },
      { path: 'src/ui/layout.css', kind: 'css', text: 'body{}' }
    ];
    const out = core.deriveManifest(files);
    expect(out.base).toBe('src/ui');
    expect(out.mock).toBe('shell.html');
    expect(out.styles).toEqual(['layout.css']);
  });

  it('PastaLayers_BaseVaziaMockCompleto', () => {
    const files = [
      { path: 'layers/mock.html', kind: 'html', text: '<html><head><link rel="stylesheet" href="mock.css"></head><body><div>a</div></body></html>' },
      { path: 'layers/mock.css', kind: 'css', text: 'body{}' }
    ];
    const out = core.deriveManifest(files);
    expect(out.base).toBe('');
    expect(out.mock).toBe('layers/mock.html');
    expect(out.styles).toEqual(['layers/mock.css']);
  });

  it('HrefExternoOuDataOuQuery_Filtrado', () => {
    const files = [
      { path: 'index.html', kind: 'html', text: '<html><head>' +
        '<link rel="stylesheet" href="https://cdn.example/x.css">' +
        '<link rel="stylesheet" href="//cdn.example/y.css">' +
        '<link rel="stylesheet" href="data:text/css;base64,AAAA">' +
        '<link rel="stylesheet" href="local.css?v=2">' +
        '</head><body><div>a</div></body></html>' },
      { path: 'local.css', kind: 'css', text: 'body{}' }
    ];
    const out = core.deriveManifest(files);
    expect(out.styles).toEqual(['local.css']);
  });

  it('HrefForaDoBase_Descartado', () => {
    const files = [
      { path: 'src/ui/shell.html', kind: 'html', text: '<html><head><link rel="stylesheet" href="../../shared.css"></head><body><div>a</div></body></html>' },
      { path: 'shared.css', kind: 'css', text: 'body{}' }
    ];
    const out = core.deriveManifest(files);
    expect(out.base).toBe('src/ui');
    expect(out.styles).toEqual([]);
  });

  it('HrefAbsoluto_Recusado', () => {
    const files = [
      { path: 'index.html', kind: 'html', text: '<html><head><link rel="stylesheet" href="/shared.css"></head><body><div>a</div></body></html>' },
      { path: 'shared.css', kind: 'css', text: 'body{}' }
    ];
    const out = core.deriveManifest(files);
    expect(out.styles).toEqual([]);
  });

  it('CorpoShell_Classifica', () => {
    const files = [
      { path: 'index.html', kind: 'html', text: '<html><body><div id="app"></div></body></html>' }
    ];
    const out = core.deriveManifest(files);
    expect(out.classification).toBe('shell de app (precisa de snapshot)');
    expect(out.mock).toBe('index.html');
  });
});

describe('ShouldAutoCreate', () => {
  it('NotFoundComPasta_True', () => {
    expect(core.shouldAutoCreate({ name: 'NotFoundError' }, true)).toBe(true);
  });

  it('NotFoundSemPasta_False', () => {
    expect(core.shouldAutoCreate({ name: 'NotFoundError' }, false)).toBe(false);
  });

  it('TypeMismatch_False', () => {
    expect(core.shouldAutoCreate({ name: 'TypeMismatchError' }, true)).toBe(false);
  });

  it('NotAllowed_False', () => {
    expect(core.shouldAutoCreate({ name: 'NotAllowedError' }, true)).toBe(false);
  });

  it('ErroGenericoOrigemReadOnly_False', () => {
    expect(core.shouldAutoCreate(new Error('404 layers.json'), true)).toBe(false);
  });

  it('ErroNulo_False', () => {
    expect(core.shouldAutoCreate(null, true)).toBe(false);
  });
});

// Template dc: o runtime carimba data-dc-tpl="N" em cada elemento em ordem de documento.
// O mapper tem de contar igual, so olhando o texto, para achar o style="" de cada elemento.
const dcSrc = (body) => '<!doctype html><html><head></head>\n<x-dc>\n' + body + '\n</x-dc>\n<script>var a = "<b>" < 1;</script>';
const tagsOf = (map) => map.map((e) => e.tag);

describe('MapDcTemplate', () => {
  it('TemplateSimples_IndicesETagsEmOrdem', () => {
    const map = core.mapDcTemplate(dcSrc('<div class="a" style="padding:8px">\n <span>oi</span>\n <input type="text">\n</div>'));
    expect(tagsOf(map)).toEqual(['div', 'span', 'input']);
    expect(map.map((e) => e.tplId)).toEqual([0, 1, 2]);
  });

  it('SemBlocoDc_RetornaVazio', () => {
    expect(core.mapDcTemplate('<html><body><div style="a:b"></div></body></html>')).toEqual([]);
  });

  it('ScriptDepoisDoBloco_NaoEntraNoMapa', () => {
    const map = core.mapDcTemplate(dcSrc('<div></div>'));
    expect(tagsOf(map)).toEqual(['div']);
  });

  it('AtributoComGtEmAspas_NaoQuebraTokenizacao', () => {
    const map = core.mapDcTemplate(dcSrc('<div title="a > b" style="margin:1px"><p style="{{ x > y }}">t</p></div>'));
    expect(tagsOf(map)).toEqual(['div', 'p']);
  });

  it('ComentarioStyleETextarea_NaoContamContagem', () => {
    const map = core.mapDcTemplate(dcSrc(
      '<!-- <div> --><helmet><style>.a > b { color: red }\n<i>x</i></style></helmet>' +
      '<textarea value="{{ v }}"><b>cru</b></textarea><section></section>'));
    expect(tagsOf(map)).toEqual(['helmet', 'style', 'textarea', 'section']);
  });

  it('SvgAutoFechado_ContaComoElemento', () => {
    const map = core.mapDcTemplate(dcSrc('<svg viewBox="0 0 1 1"><path d="M0 0"/><circle r="1"/></svg><b></b>'));
    expect(tagsOf(map)).toEqual(['svg', 'path', 'circle', 'b']);
  });

  it('AtributoNaoQuotado_NaoQuebraTokenizacao', () => {
    const map = core.mapDcTemplate(dcSrc('<div id=a class=b style="x:1"><i></i></div>'));
    expect(tagsOf(map)).toEqual(['div', 'i']);
  });

  it('HtmlHeadBodyDentroDoBloco_NaoContam', () => {
    const map = core.mapDcTemplate(dcSrc('<body><div></div></body>'));
    expect(tagsOf(map)).toEqual(['div']);
  });

  it('StyleRange_ApontaParaOValorEntreAspas', () => {
    const src = dcSrc('<div style="padding:8px;color:red"></div><p style=\'margin:0\'></p><b></b>');
    const [d, p, b] = core.mapDcTemplate(src);
    expect(src.slice(d.styleRange[0], d.styleRange[1])).toBe('padding:8px;color:red');
    expect(src.slice(p.styleRange[0], p.styleRange[1])).toBe('margin:0');
    expect(b.styleRange).toBeNull();
  });

  it('Line_ContaLinhasDoArquivoInteiro', () => {
    const map = core.mapDcTemplate(dcSrc(['<div>', ' <span></span>', '', ' <b></b></div>'].join('\n')));
    // dcSrc abre o bloco na linha 2: doctype na 1, <x-dc> na 2, primeiro filho na 3
    expect(map.map((e) => e.line)).toEqual([3, 4, 6]);
  });

  it('AttrNames_ListaNomesEmMinusculas', () => {
    const [d] = core.mapDcTemplate(dcSrc('<div CLASS="a" data-X="1" style="a:b"></div>'));
    expect(d.attrNames).toEqual(['class', 'data-x', 'style']);
  });
});

describe('StyleDeclAt', () => {
  const at = (attr) => { const s = dcSrc('<div style="' + attr + '"></div>'); return [s, core.mapDcTemplate(s)[0].styleRange]; };

  it('PropExistente_RetornaValorSemEspacos', () => {
    const [s, r] = at('color:red; padding : 8px ;margin:0');
    expect(core.styleDeclAt(s, r, 'padding')).toEqual({ value: '8px', binding: false });
  });

  it('PropAusente_RetornaNulo', () => {
    const [s, r] = at('color:red');
    expect(core.styleDeclAt(s, r, 'padding')).toBeNull();
  });

  it('PropComBinding_MarcaBinding', () => {
    const [s, r] = at('padding:{{ p }}px;color:red');
    expect(core.styleDeclAt(s, r, 'padding').binding).toBe(true);
  });

  it('PontoEVirgulaDentroDeUrl_NaoDivideDeclaracao', () => {
    const [s, r] = at('background:url(data:image/png;base64,AAA);color:red');
    expect(core.styleDeclAt(s, r, 'color').value).toBe('red');
  });
});

describe('PatchAttrAt', () => {
  const at = (attr, q) => { const s = dcSrc('<div style=' + (q || '"') + attr + (q || '"') + '></div>'); return [s, core.mapDcTemplate(s)[0].styleRange]; };

  it('StyleExistente_PreservaOrdemEEspacos', () => {
    const [s, r] = at('color:red; padding : 8px ;margin:0');
    const out = core.patchAttrAt(s, r, 'padding', '8px', '12px');
    expect(out.ok).toBe(true);
    expect(out.text).toBe(s.replace('padding : 8px ;', 'padding : 12px ;'));
  });

  it('ValorDivergente_RecusaSemAlterarTexto', () => {
    const [s, r] = at('padding:8px');
    const out = core.patchAttrAt(s, r, 'padding', '9px', '12px');
    expect(out.ok).toBe(false);
    expect(out.code).toBe('SOURCE_CHANGED');
    expect(out.text).toBeUndefined();
  });

  it('PropAusente_RecusaSourceChanged', () => {
    const [s, r] = at('color:red');
    expect(core.patchAttrAt(s, r, 'padding', '8px', '12px').code).toBe('SOURCE_CHANGED');
  });

  it('ValorComBinding_RecusaValueHasBinding', () => {
    const [s, r] = at('padding:{{ p }}px');
    const out = core.patchAttrAt(s, r, 'padding', '{{ p }}px', '12px');
    expect(out.ok).toBe(false);
    expect(out.code).toBe('VALUE_HAS_BINDING');
  });

  it('SemStyleAttr_RecusaNoInlineStyle', () => {
    const out = core.patchAttrAt('<div></div>', null, 'padding', '8px', '12px');
    expect(out.code).toBe('NO_INLINE_STYLE');
  });

  it('ImportantPreservado', () => {
    const [s, r] = at('padding:8px !important');
    expect(core.patchAttrAt(s, r, 'padding', '8px', '12px').text).toContain('padding:12px !important');
  });

  it('NovoValorComAspasDoAtributo_RecusaValueUnsafe', () => {
    const [s, r] = at('font-family:Geist');
    expect(core.patchAttrAt(s, r, 'font-family', 'Geist', '"Geist Mono"').code).toBe('VALUE_UNSAFE');
  });

  it('NovoValorComPontoEVirgulaOuBinding_RecusaValueUnsafe', () => {
    const [s, r] = at('padding:8px');
    expect(core.patchAttrAt(s, r, 'padding', '8px', '1px;color:red').code).toBe('VALUE_UNSAFE');
    expect(core.patchAttrAt(s, r, 'padding', '8px', '{{ x }}').code).toBe('VALUE_UNSAFE');
  });

  it('AspasSimples_AceitaValorComAspasDuplas', () => {
    const [s, r] = at('font-family:Geist', "'");
    expect(core.patchAttrAt(s, r, 'font-family', 'Geist', '"Geist Mono"').text).toContain('font-family:"Geist Mono"');
  });

  it('DcCodes_EnumCongelado', () => {
    expect(Object.isFrozen(core.DC_CODES)).toBe(true);
    for (const c of ['VALUE_HAS_BINDING', 'MAP_MISALIGNED', 'SOURCE_CHANGED', 'SOURCE_NOT_CSS', 'UTILITY_SHEET',
      'HELMET_PLACEHOLDER', 'SNAPSHOT_STYLE', 'READONLY_ORIGIN', 'TPL_FANOUT', 'NO_INLINE_STYLE', 'PROP_NOT_INLINE', 'VALUE_UNSAFE']) {
      expect(core.DC_CODES[c]).toBe(c);
    }
  });
});

describe('CheckDcMap', () => {
  const map = () => core.mapDcTemplate(dcSrc('<div><span></span><input></div>'));

  it('TagsBatem_Ok', () => {
    const out = core.checkDcMap(map(), [{ tplId: 0, tag: 'DIV' }, { tplId: 2, tag: 'input' }]);
    expect(out.ok).toBe(true);
  });

  it('TagDivergente_RetornaMapaDesalinhado', () => {
    const out = core.checkDcMap(map(), [{ tplId: 1, tag: 'div' }]);
    expect(out.ok).toBe(false);
    expect(out.code).toBe('MAP_MISALIGNED');
    expect(out.detail.bad).toEqual([{ tplId: 1, expected: 'span', found: 'div' }]);
  });

  it('TplIdForaDoMapa_RetornaMapaDesalinhado', () => {
    const out = core.checkDcMap(map(), [{ tplId: 9, tag: 'div' }]);
    expect(out.code).toBe('MAP_MISALIGNED');
  });
});

describe('PatchDc', () => {
  const tpl = '<div style="padding:8px;color:red"><span style="margin:0">a</span><i style="width:{{ w }}px"></i><b></b></div>';
  const item = (tplId, prop, to) => ({ tplId, prop, to });

  it('EdicaoValida_AplicaEContaAplicadas', () => {
    const src = dcSrc(tpl);
    const out = core.patchDc(src, src, [item(0, 'padding', '12px')]);
    expect(out.applied).toBe(1);
    expect(out.refused).toEqual([]);
    expect(out.text).toBe(src.replace('padding:8px', 'padding:12px'));
  });

  it('DuasEdicoesNoMesmoElemento_RemapeiaOffsets', () => {
    const src = dcSrc(tpl);
    const out = core.patchDc(src, src, [item(0, 'padding', '12px 16px'), item(0, 'color', 'blue'), item(1, 'margin', '4px')]);
    expect(out.applied).toBe(3);
    expect(out.text).toBe(src.replace('padding:8px;color:red', 'padding:12px 16px;color:blue').replace('margin:0', 'margin:4px'));
  });

  it('TemplateReestruturado_RecusaMapMisaligned', () => {
    const loaded = dcSrc(tpl);
    const fresh = dcSrc('<section>' + tpl + '</section>');
    const out = core.patchDc(loaded, fresh, [item(0, 'padding', '12px')]);
    expect(out.applied).toBe(0);
    expect(out.text).toBe(fresh);
    expect(out.refused[0].code).toBe('MAP_MISALIGNED');
  });

  it('ValorMudouDesdeOLoad_RecusaSourceChanged', () => {
    const loaded = dcSrc(tpl);
    const fresh = loaded.replace('padding:8px', 'padding:9px');
    const out = core.patchDc(loaded, fresh, [item(0, 'padding', '12px')]);
    expect(out.refused[0].code).toBe('SOURCE_CHANGED');
    expect(out.text).toBe(fresh);
  });

  it('PropForaDoStyle_RecusaPropNotInline', () => {
    const src = dcSrc(tpl);
    expect(core.patchDc(src, src, [item(0, 'gap', '4px')]).refused[0].code).toBe('PROP_NOT_INLINE');
  });

  it('ElementoSemStyle_RecusaNoInlineStyle', () => {
    const src = dcSrc(tpl);
    expect(core.patchDc(src, src, [item(3, 'padding', '4px')]).refused[0].code).toBe('NO_INLINE_STYLE');
  });

  it('ValorComBinding_RecusaValueHasBinding', () => {
    const src = dcSrc(tpl);
    expect(core.patchDc(src, src, [item(2, 'width', '10px')]).refused[0].code).toBe('VALUE_HAS_BINDING');
  });

  it('TplIdForaDoMapa_RecusaMapMisaligned', () => {
    const src = dcSrc(tpl);
    expect(core.patchDc(src, src, [item(99, 'padding', '1px')]).refused[0].code).toBe('MAP_MISALIGNED');
  });

  it('RecusaParcial_AplicaAsOutrasEDevolveOItemRecusado', () => {
    const src = dcSrc(tpl);
    const out = core.patchDc(src, src, [item(2, 'width', '10px'), item(0, 'padding', '12px')]);
    expect(out.applied).toBe(1);
    expect(out.refused).toHaveLength(1);
    expect(out.refused[0].item.tplId).toBe(2);
    expect(out.text).toContain('padding:12px');
  });
});
