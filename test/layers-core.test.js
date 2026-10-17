import { describe, it, expect, vi } from 'vitest';
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

  it('ScopeAst_RootComAtributo_EmiteHostFuncional', () => {
    const out = core.scopeAst(":root[data-theme='light'] .a { x: 1 }").css;
    expect(out).toContain(":host([data-theme='light']) .a");
    expect(out).not.toContain(':host[');
  });

  it('ScopeAst_HtmlComAtributoEClasse_EmiteHostFuncional', () => {
    expect(core.scopeAst('html[data-theme=dark] .b { x: 1 }').css).toContain(':host([data-theme=dark]) .b');
    expect(core.scopeAst(':root.dark { x: 1 }').css).toContain(':host(.dark)');
  });

  it('ScopeAst_RootEHtmlSimples_MantemEscopoAtual', () => {
    expect(core.scopeAst(':root { --c: red }').css).toBe(':host { --c: red }');
    expect(core.scopeAst('html { x: 1 }').css).toBe('.__layers-root { x: 1 }');
    expect(core.scopeAst('html .x { x: 1 }').css).toBe('.__layers-root .x { x: 1 }');
  });

  it('ScopeAst_RootComHas_MantemEscopoAntigo', () => {
    expect(core.scopeAst(':root:has(.m) .a { x: 1 }').css).toContain(':host:has(.m) .a');
    expect(core.scopeAst('html:has(dialog[open]) { overflow: hidden }').css).toContain('.__layers-root:has(dialog[open])');
    expect(core.scopeAst('html:has(.m)[data-theme=x] { x: 1 }').css).not.toContain(':host(');
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

describe('HostAttrsFromHtml', () => {
  const at = (name, value) => ({ name, value });

  it('HostAttrsFromHtml_AllowlistDeAtributos_MantemDataLangDir', () => {
    const r = core.hostAttrsFromHtml([at('data-theme', 'light'), at('lang', 'pt-BR'), at('dir', 'ltr'), at('class', 'dark x-1'),
      at('onclick', 'a()'), at('data-src', 'y'), at('data-layers-frozen', 'z'), at('id', 'i')]);
    expect(r.attrs).toEqual([at('data-theme', 'light'), at('lang', 'pt-BR'), at('dir', 'ltr'), at('class', 'dark x-1')]);
    expect(r.vars).toEqual([]);
  });

  it('HostAttrsFromHtml_StyleComUrlOuExpression_DescartaADeclaracao', () => {
    const r = core.hostAttrsFromHtml([at('style', '--a:#fff;--b:url(http://x/y);--c: expression(1);color:red')]);
    expect(r.vars).toEqual([at('--a', '#fff')]);
    expect(r.attrs).toEqual([]);
  });

  it('HostAttrsFromHtml_ValorQueFechaOuAbreBloco_DescartaADeclaracao', () => {
    const r = core.hostAttrsFromHtml([at('style', '--a:red}body{display:none;--b:1 !important;--c:<x;--ok:#000')]);
    expect(r.vars).toEqual([at('--ok', '#000')]);
  });

  it('HostAttrsFromHtml_ClassComCaractereFora_DescartaOAtributo', () => {
    expect(core.hostAttrsFromHtml([at('class', 'a"b')]).attrs).toEqual([]);
    expect(core.hostAttrsFromHtml([at('class', 'a<b')]).attrs).toEqual([]);
  });

  it('HostAttrsFromHtml_SemAtributos_DevolveListasVazias', () => {
    expect(core.hostAttrsFromHtml([])).toEqual({ attrs: [], vars: [] });
    expect(core.hostAttrsFromHtml(undefined)).toEqual({ attrs: [], vars: [] });
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

  it('MigrateConfig_LogoGradAntigo_NaoMigra', () => {
    const s = fakeStorage({ 'layers-cfg': JSON.stringify({ theme: 'Dark', logoGrad: 'x' }) });
    expect(core.migrateConfig(s).ui).toEqual({ theme: 'Dark' });
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

describe('StaleFiles', () => {
  it('StaleFiles_SemMudanca_RetornaVazio', () => {
    expect(core.staleFiles({ 'a.css': 1, 'b.css': 2 }, { 'a.css': 1, 'b.css': 2 })).toEqual([]);
  });

  it('StaleFiles_MtimeDiferente_RetornaPath', () => {
    expect(core.staleFiles({ 'a.css': 1, 'b.css': 2 }, { 'a.css': 1, 'b.css': 3 })).toEqual(['b.css']);
  });

  it('StaleFiles_Missing_RetornaPath', () => {
    expect(core.staleFiles({ 'a.css': 1 }, { 'a.css': 'missing' })).toEqual(['a.css']);
  });

  it('StaleFiles_Indeterminado_Ignora', () => {
    expect(core.staleFiles({ 'a.css': 1 }, {})).toEqual([]);
  });

  it('StaleFiles_CurrentComExtra_Ignora', () => {
    expect(core.staleFiles({ 'a.css': 1 }, { 'a.css': 1, 'novo.css': 9 })).toEqual([]);
  });
});

describe('HasUnsaved', () => {
  it('HasUnsaved_SoCodeBuf_RetornaTrue', () => {
    expect(core.hasUnsaved([], { 'a.css': 'x' })).toBe(true);
  });

  it('HasUnsaved_BufSemChanges_RetornaFalse', () => {
    expect(core.hasUnsaved([], {})).toBe(false);
  });

  it('HasUnsaved_SoChanges_RetornaTrue', () => {
    expect(core.hasUnsaved([{ id: 1 }], {})).toBe(true);
  });
});

describe('PickWatched', () => {
  it('PickWatched_ArtefatosDesignDraft_Excluidos', () => {
    const mtimes = { 'a.css': 1, '.design-draft.css': 2, '.design-history/x': 3 };
    expect(core.pickWatched(mtimes, ['a.css'])).toEqual({ 'a.css': 1 });
  });

  it('PickWatched_PathAusenteNoMapa_Ignora', () => {
    expect(core.pickWatched({ 'a.css': 1 }, ['a.css', 'b.css', undefined, null])).toEqual({ 'a.css': 1 });
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

  it('TemplateAninhado_NaoContaElementosDoConteudo', () => {
    // o runtime so carimba childNodes; o conteudo de <template> mora em .content e fica sem carimbo
    const src = dcSrc('<div><template><span style="color:red">h</span></template><span style="color:blue">v</span></div>');
    const map = core.mapDcTemplate(src);
    expect(tagsOf(map)).toEqual(['div', 'template', 'span']);
    expect(src.slice(map[2].styleRange[0], map[2].styleRange[1])).toBe('color:blue');
  });

  it('TemplatesAninhadosEntreSi_ContaSoAExterna', () => {
    const map = core.mapDcTemplate(dcSrc('<template><template><i></i></template><b></b></template><u></u>'));
    expect(tagsOf(map)).toEqual(['template', 'u']);
  });

  it('TagComNomeDeObjectPrototype_ContaComoElemento', () => {
    const map = core.mapDcTemplate(dcSrc('<div><constructor></constructor><tostring></tostring></div>'));
    expect(tagsOf(map)).toEqual(['div', 'constructor', 'tostring']);
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

  it('Entrada_SoCamposConsumidos_StyleAindaDetectado', () => {
    const [d] = core.mapDcTemplate(dcSrc('<div CLASS="a" data-X="1" STYLE="a:b"></div>'));
    expect(Object.keys(d).sort()).toEqual(['line', 'styleRange', 'tag', 'tplId']);
    expect(d.styleRange).not.toBeNull();
  });
});

describe('StyleDecls', () => {
  it('Declaracoes_RetornaPropValorEBinding', () => {
    const s = dcSrc('<div style="color:red; Padding : 8px ;margin:{{ m }}px"></div>');
    const out = core.styleDecls(s, core.mapDcTemplate(s)[0].styleRange);
    expect(out).toEqual([
      { prop: 'color', value: 'red', binding: false },
      { prop: 'padding', value: '8px', binding: false },
      { prop: 'margin', value: '{{ m }}px', binding: true }
    ]);
  });

  it('SemRange_RetornaListaVazia', () => {
    expect(core.styleDecls('<div></div>', null)).toEqual([]);
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
    const codes = ['VALUE_HAS_BINDING', 'MAP_MISALIGNED', 'SOURCE_CHANGED', 'SOURCE_NOT_CSS', 'HELMET_PLACEHOLDER',
      'SNAPSHOT_STYLE', 'TPL_FANOUT', 'NO_INLINE_STYLE', 'PROP_NOT_INLINE', 'VALUE_UNSAFE'];
    expect(Object.keys(core.DC_CODES).sort()).toEqual([...codes].sort());
    for (const c of codes) expect(core.DC_CODES[c]).toBe(c);
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

  it('TemplateAninhado_EditaOElementoVisivelENaoOEscondido', () => {
    // regressao: o mapa contava o span de dentro do <template>, o runtime nao, e o patch caia no errado
    const src = dcSrc('<div><template><span style="color:red">h</span></template><span style="color:blue">v</span></div>');
    const out = core.patchDc(src, src, [item(2, 'color', 'green')]);
    expect(out.applied).toBe(1);
    expect(out.text).toBe(src.replace('color:blue', 'color:green'));
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

describe('ProjectBase', () => {
  it('DirAbsoluto_DevolveRotaCodificada', () => {
    expect(core.projectBase('?project=' + encodeURIComponent('C:\\Development\\Atlas'))).toBe('/@project/C%3A%5CDevelopment%5CAtlas/');
    expect(core.projectBase('?project=%2Fhome%2Fme%2Fapp')).toBe('/@project/%2Fhome%2Fme%2Fapp/');
  });

  it('SemParametroOuRelativo_DevolveNull', () => {
    expect(core.projectBase('')).toBeNull();
    expect(core.projectBase('?project=relativo/pasta')).toBeNull();
  });
});

describe('ProjectRequest', () => {
  it('RotaValida_DevolveDirERel', () => {
    expect(core.projectRequest('/@project/C%3A%5CDevelopment%5CAtlas/web/css/tokens%20x.css?v=1'))
      .toEqual({ dir: 'C:\\Development\\Atlas', rel: 'web/css/tokens x.css' });
  });

  it('Traversal_Rejeita', () => {
    expect(core.projectRequest('/@project/C%3A%5CA/../secret')).toBeNull();
    expect(core.projectRequest('/@project/C%3A%5CA/web/%2e%2e/%2e%2e/secret')).toBeNull();
    expect(core.projectRequest('/@project/C%3A%5CA/web/..%5C..%5Csecret')).toBeNull();
    expect(core.projectRequest('/@project/C%3A%5CA/C%3A%2Fx')).toBeNull();
  });

  it('DirRelativoOuMalformado_Rejeita', () => {
    expect(core.projectRequest('/@project/relativo/x.css')).toBeNull();
    expect(core.projectRequest('/@project/%E0%A4%A/x.css')).toBeNull();
    expect(core.projectRequest('/@project/C%3A%5CA/')).toBeNull();
    expect(core.projectRequest('/fixtures/x.css')).toBeNull();
  });

  it('DirUnc_Rejeita', () => {
    expect(core.projectRequest('/@project/%2F%2Fh%2Fs/x')).toBeNull();
    expect(core.projectRequest('/@project/' + encodeURIComponent('\\\\h\\s') + '/x')).toBeNull();
    expect(core.projectBase('?project=' + encodeURIComponent('//h/s'))).toBeNull();
  });
});

describe('DismissWatch', () => {
  it('Dismiss_NumericMtime_AcceptsNewValue', () => {
    expect(core.dismissWatch({ 'a.css': 1, 'b.css': 2 }, { 'a.css': 1, 'b.css': 9 })).toEqual({ 'a.css': 1, 'b.css': 9 });
  });

  it('Dismiss_MissingFile_StaysWatchedAsMissing', () => {
    expect(core.dismissWatch({ 'a.css': 1 }, { 'a.css': 'missing' })).toEqual({ 'a.css': 'missing' });
  });

  it('Dismiss_PathNotInCurrent_KeepsPreviousValue', () => {
    expect(core.dismissWatch({ 'a.css': 1, 'b.css': 2 }, { 'a.css': 5 })).toEqual({ 'a.css': 5, 'b.css': 2 });
  });

  it('Dismiss_DoesNotMutateInput', () => {
    const w = { 'a.css': 1 };
    core.dismissWatch(w, { 'a.css': 7 });
    expect(w).toEqual({ 'a.css': 1 });
  });
});

describe('StaleFilesAfterMissingDismiss', () => {
  it('StaleFiles_StillMissingAfterDismiss_IsQuiet', () => {
    expect(core.staleFiles({ 'a.css': 'missing' }, { 'a.css': 'missing' })).toEqual([]);
  });

  it('StaleFiles_ReappearsAfterMissingDismiss_IsStale', () => {
    expect(core.staleFiles({ 'a.css': 'missing' }, { 'a.css': 123 })).toEqual(['a.css']);
  });
});

describe('LineDiff', () => {
  const lines = (n, from = 1) => Array.from({ length: n }, (_, i) => 'l' + (from + i)).join('\n');
  const kinds = (d) => d.map((l) => l.kind).join('');

  it('MudancaNoMeio_ContextoDeTresLinhas', () => {
    const a = lines(12);
    const b = a.replace('l6', 'L6');
    const d = core.lineDiff(a, b);
    expect(kinds(d)).toBe('   -+   ');
    expect(d.map((l) => l.no)).toEqual(['3', '4', '5', '6', '6', '7', '8', '9']);
    expect(d[3]).toEqual({ no: '6', text: 'l6', kind: '-' });
    expect(d[4]).toEqual({ no: '6', text: 'L6', kind: '+' });
  });

  it('MudancaNaPrimeiraLinha_SemContextoAntes', () => {
    const d = core.lineDiff(lines(6), lines(6).replace('l1', 'L1'));
    expect(kinds(d)).toBe('-+   ');
    expect(d[0].no).toBe('1');
  });

  it('MudancaNaUltimaLinha_SemContextoDepois', () => {
    const d = core.lineDiff(lines(6), lines(6).replace('l6', 'L6'));
    expect(kinds(d)).toBe('   -+');
  });

  it('Identicos_RetornaLinhaSemAlteracoes', () => {
    const d = core.lineDiff(lines(5), lines(5));
    expect(kinds(d)).toBe('    ');
    expect(d[d.length - 1]).toEqual({ no: '', text: '(sem alterações)', kind: ' ' });
  });

  it('ArquivoNovo_TodasLinhasAdicionadas', () => {
    const d = core.lineDiff('', 'a\nb');
    expect(d.filter((l) => l.kind === '+').map((l) => l.text)).toEqual(['a', 'b']);
    expect(d.some((l) => l.kind === '-' && l.text !== '')).toBe(false);
  });

  it('LinhaRemovida_ApenasMenos', () => {
    const d = core.lineDiff('a\nb\nc', 'a\nc');
    expect(kinds(d)).toBe(' - ');
    expect(d[1]).toEqual({ no: '2', text: 'b', kind: '-' });
  });
});

describe('CheckOrigin', () => {
  const css = [
    '.a {',
    '  color: red;',
    '}',
    '',
    '.h2,',
    '.h3,',
    '.h4 {',
    '  margin: 0;',
    '}',
    '.card-title { color: blue; }',
  ].join('\n');
  const files = { 'a.css': css, 'page.html': '<style>\n.in { x: 1 }\n</style>' };

  it('SelectorNaLinha_Ok', () => {
    expect(core.checkOrigin('a.css|.a|1', files, ['a'], '')).toBe('ok');
  });

  it('ListaDeSeletoresComecandoAntes_Ok', () => {
    expect(core.checkOrigin('a.css|.h4|5', files, ['h4'], '')).toBe('ok');
  });

  it('LinhaDeOutraRegra_Stale', () => {
    expect(core.checkOrigin('a.css|.a|5', files, ['a'], '')).toBe('stale');
  });

  it('LinhaForaDoArquivo_Stale', () => {
    expect(core.checkOrigin('a.css|.a|99', files, ['a'], '')).toBe('stale');
  });

  it('PrefixoDeOutraClasse_Stale', () => {
    expect(core.checkOrigin('a.css|.card|10', files, ['card'], '')).toBe('stale');
  });

  it('ClasseDoNoNaLinha_Ok', () => {
    expect(core.checkOrigin('a.css|.old-name|1', files, ['a'], '')).toBe('ok');
  });

  it('ArquivoNaoCarregado_External', () => {
    expect(core.checkOrigin('src/ui/shell.ts|.shell|3', files, ['shell'], '')).toBe('external');
  });

  it('StyleEmbutidoNoHtml_UsaLinhaAbsoluta', () => {
    expect(core.checkOrigin('page.html|.in|2', files, ['in'], '')).toBe('ok');
    expect(core.checkOrigin('page.html|.in|3', files, ['in'], '')).toBe('stale');
  });

  it('TemplateDc_Ok', () => {
    expect(core.checkOrigin('index.html|tpl:3|7', { 'index.html': 'x' }, [], '')).toBe('ok');
  });

  it('SemFormatoArquivoSeletorLinha_Ok', () => {
    expect(core.checkOrigin('qualquer coisa', files, [], '')).toBe('ok');
  });
});

describe('IsManualSource', () => {
  it('ExtensoesTsJs_True', () => {
    for (const f of ['src/ui/shell.ts', 'App.tsx', 'a.js', 'b.jsx', 'c.mjs', 'd.cjs', 'e.mts', 'f.cts', 'types.d.ts']) {
      expect(core.isManualSource(f), f).toBe(true);
    }
  });

  it('ExtensaoMaiuscula_True', () => {
    expect(core.isManualSource('App.TSX')).toBe(true);
  });

  it('CssHtmlScss_False', () => {
    for (const f of ['a.css', 'index.html', 'a.scss', 'page.htm']) {
      expect(core.isManualSource(f), f).toBe(false);
    }
  });

  it('PastaComExtensaoTs_False', () => {
    expect(core.isManualSource('a.ts/style.css')).toBe(false);
  });

  it('VazioNuloIndefinido_FalseSemLancar', () => {
    expect(core.isManualSource('')).toBe(false);
    expect(core.isManualSource(null)).toBe(false);
    expect(core.isManualSource(undefined)).toBe(false);
  });
});

describe('DismissWatchSeen', () => {
  it('Dismiss_OwnWriteBetweenCheckAndDismiss_KeepsWrittenValue', () => {
    // checkStale saw a.css at 1 and found 5 on disk; our own write then moved watch[a.css] to 6
    const seen = { 'a.css': 1 };
    const watch = { 'a.css': 6 };
    expect(core.dismissWatch(watch, { 'a.css': 5 }, seen)).toEqual({ 'a.css': 6 });
  });

  it('Dismiss_UnchangedSinceCheck_AcceptsNewValue', () => {
    expect(core.dismissWatch({ 'a.css': 1, 'b.css': 2 }, { 'a.css': 5, 'b.css': 9 }, { 'a.css': 1, 'b.css': 2 })).toEqual({ 'a.css': 5, 'b.css': 9 });
  });

  it('Dismiss_WithoutSeen_KeepsPreviousBehavior', () => {
    expect(core.dismissWatch({ 'a.css': 1 }, { 'a.css': 5 })).toEqual({ 'a.css': 5 });
  });
});

describe('StaleBannerBox', () => {
  const clear = (b, vw, col, right) => b.left >= col && b.left + b.width <= vw - right;

  it('Viewport1024PainelAberto_NaoCobreColunaNemPainelDireito', () => {
    const b = core.staleBannerBox(1024, 384, 340);
    expect(clear(b, 1024, 384, 340)).toBe(true);
    expect(b.width).toBeGreaterThanOrEqual(240);
  });

  it('Viewport1280_UsaLarguraMaxima', () => {
    const b = core.staleBannerBox(1280, 384, 340);
    expect(b.width).toBe(520);
    expect(clear(b, 1280, 384, 340)).toBe(true);
  });

  it('PainelDireitoFechado_CentralizaNaJanela', () => {
    const b = core.staleBannerBox(1600, 30, 30);
    expect(b.left + b.width / 2).toBe(800);
  });

  it('JanelaEstreita_MantemLarguraMinimaDentroDaJanela', () => {
    const b = core.staleBannerBox(600, 384, 340);
    expect(b.width).toBe(240);
    expect(b.left).toBeGreaterThanOrEqual(0);
    expect(b.left + b.width).toBeLessThanOrEqual(600);
  });
});

describe('ViewCuller', () => {
  const base = { pageW: 1000, pageH: 600, stageW: 800, stageH: 600, persp: 1600, S: 1, yaw: 0, tilt: 0, tx: 0, ty: 0, fx: 0, fy: 0, fz: 0, margin: 0 };
  const cull = (o) => core.viewCuller({ ...base, ...o });

  it('PlanoNoCentro_NaoCorta', () => {
    expect(cull({})(450, 250, 100, 100, 0)).toBe(false);
  });

  it('PlanoInteiroADireita_Corta', () => {
    expect(cull({})(950, 250, 50, 50, 0)).toBe(true);
  });

  it('MargemCobreBorda_NaoCorta', () => {
    expect(cull({ margin: 120 })(950, 250, 50, 50, 0)).toBe(false);
  });

  it('PlanoAtravessaOPalco_NaoCorta', () => {
    expect(cull({})(-1000, 250, 3000, 50, 0)).toBe(false);
  });

  it('ZoomEmpurraParaFora_Corta', () => {
    expect(cull({})(700, 250, 50, 50, 0)).toBe(false);
    expect(cull({ S: 4 })(700, 250, 50, 50, 0)).toBe(true);
  });

  it('PanParaEsquerda_Corta', () => {
    expect(cull({ tx: -500 })(450, 250, 100, 100, 0)).toBe(true);
  });

  it('PerspectivaAmpliaPlanoProximo_Corta', () => {
    expect(cull({})(800, 250, 50, 50, 0)).toBe(false);
    expect(cull({})(800, 250, 50, 50, 800)).toBe(true);
  });

  it('CantoAtrasDoOlho_NaoCorta', () => {
    expect(cull({})(950, 250, 50, 50, 2000)).toBe(false);
  });

  it('Yaw90_ProfundidadeViraX', () => {
    // rotateY(90deg): x' = z, so a plane at the page centre pushed to z = 1000 lands right of the stage
    expect(cull({ yaw: 90 })(450, 250, 100, 100, 0)).toBe(false);
    expect(cull({ yaw: 90, persp: 100000 })(450, 250, 100, 100, 1000)).toBe(true);
  });

  it('Yaw90_PanCompensaX_NaoCorta', () => {
    // sign check: x' = +1000 and tx = -1000 bring it back to the centre; x' = -z would give -2000 (culled)
    expect(cull({ yaw: 90, persp: 100000, tx: -1000 })(450, 250, 100, 100, 1000)).toBe(false);
  });

  it('Tilt90_ProfundidadeViraY', () => {
    // rotateX(90deg): y' = -z, so z = 1000 lands above the stage
    expect(cull({ tilt: 90, persp: 100000 })(450, 250, 100, 100, 1000)).toBe(true);
  });

  it('Tilt90_PanCompensaY_NaoCorta', () => {
    // sign check: y' = -1000 and ty = +1000 bring it back to the centre; y' = +z would give +2000 (culled)
    expect(cull({ tilt: 90, persp: 100000, ty: 1000 })(450, 250, 100, 100, 1000)).toBe(false);
  });

  it('YawTiltCombinados_OrdemRotateXRotateY', () => {
    // corners (231.2,-506) (354.1,-551.2) (237.7,-396.3) (364.6,-438.2); reversed rotation order: max y -326.8, kept at 60
    expect(cull({ yaw: -32, tilt: 20, margin: 60 })(900, 50, 100, 100, 300)).toBe(true);
    expect(cull({ yaw: -32, tilt: 20, margin: 110 })(900, 50, 100, 100, 300)).toBe(false);
  });

  it('FocoDesloca_Corta', () => {
    expect(cull({ fx: 900 })(450, 250, 100, 100, 0)).toBe(true);
  });
});

describe('TreeWindow', () => {
  const rows = (n, h) => Array(n).fill(h);

  it('TreeWindow_ScrollNoMeio_DevolveFaixaComOverscan', () => {
    expect(core.treeWindow({ scrollTop: 440, viewH: 220, rowH: 22, rows: rows(100, null), overscan: 5 }))
      .toEqual({ start: 15, end: 35, top: 330, bottom: 1430, total: 2200, scrollTo: null });
  });

  it('TreeWindow_LinhaDeCodigoAltura_SomaOffsets', () => {
    const r = [null, null, 200, ...rows(20, null)];
    expect(core.treeWindow({ scrollTop: 0, viewH: 100, rowH: 22, rows: r, overscan: 0 }))
      .toEqual({ start: 0, end: 3, top: 0, bottom: 440, total: 684, scrollTo: null });
    expect(core.treeWindow({ scrollTop: 250, viewH: 100, rowH: 22, rows: r, overscan: 0 }))
      .toEqual({ start: 3, end: 8, top: 244, bottom: 330, total: 684, scrollTo: null });
  });

  it('TreeWindow_ListaCurta_NaoCorta', () => {
    const w = { start: 0, end: 5, top: 0, bottom: 0, total: 110, scrollTo: null };
    expect(core.treeWindow({ scrollTop: 0, viewH: 400, rowH: 22, rows: rows(5, null), overscan: 10 })).toEqual(w);
    // stale scrollTop after Filtrar shrank the list
    expect(core.treeWindow({ scrollTop: 900, viewH: 400, rowH: 22, rows: rows(5, null), overscan: 10 })).toEqual(w);
  });

  it('TreeWindow_IndiceDoSelecionado_ReveladoNoTopoOuBase', () => {
    const at = (reveal) => core.treeWindow({ scrollTop: 440, viewH: 220, rowH: 22, rows: rows(100, null), overscan: 0, reveal }).scrollTo;
    expect(at(50)).toBe(924); // below: bottom edge lands rowH above the view bottom
    expect(at(5)).toBe(88); // above: top edge lands rowH below the view top
    expect(at(25)).toBeNull(); // inside the padded view
  });

  it('TreeWindow_RevelarLinhaZero_NaoMoveDoTopo', () => {
    const at = (scrollTop, reveal) => core.treeWindow({ scrollTop, viewH: 220, rowH: 22, rows: rows(100, null), overscan: 0, reveal }).scrollTo;
    expect(at(0, 0)).toBeNull(); // already at the top: the 4 px padding must stay visible
    expect(at(-50, 0)).toBeNull(); // negative scrollTop clamps to 0
    expect(at(300, 0)).toBe(0); // far below: the top edge lands at 0
  });

  it('TreeWindow_ListaVazia_JanelaVazia', () => {
    expect(core.treeWindow({ scrollTop: 0, viewH: 220, rowH: 22, rows: [], overscan: 10, reveal: 0 }))
      .toEqual({ start: 0, end: 0, top: 0, bottom: 0, total: 0, scrollTo: null });
  });
});

describe('MovedSince', () => {
  it('Rollback_ExternalChangeAfterApprove_ListsPath', () => {
    expect(core.movedSince({ 'a.css': 10, 'b.css': 20 }, { 'a.css': 10, 'b.css': 25 })).toEqual(['b.css']);
  });

  it('Rollback_NothingMoved_Empty', () => {
    expect(core.movedSince({ 'a.css': 10 }, { 'a.css': 10 })).toEqual([]);
  });

  it('Rollback_FileUnreadableOrNotRecorded_IsNotMoved', () => {
    expect(core.movedSince({ 'a.css': 10 }, {})).toEqual([]);
    expect(core.movedSince(undefined, { 'a.css': 5 })).toEqual([]);
  });
});

describe('DeadInteractions', () => {
  const alive = new Set(['.panel', '#menu', '.btn']);
  const count = (sel) => (alive.has(sel) ? 1 : 0);

  it('SuperficieSemAlvo_ListaComRotuloDoItem', () => {
    const items = [{ key: 'p', label: 'Painel', show: '.gone' }];
    expect(core.deadInteractions(items, count)).toEqual([{ label: 'Painel', sel: '.gone' }]);
  });

  it('ChipsComSeletoresMortos_ListaCadaUm', () => {
    const items = [{
      label: 'Menu',
      groups: [{ label: 'Estado', items: [
        { label: 'Abrir', toggle: '#menu' },
        { label: 'Fechar', hide: '.nope' },
        { label: 'Marcar', class: { selector: '.nada', name: 'on' } },
        { label: 'Clicar', click: '.btn' },
      ] }],
    }];
    expect(core.deadInteractions(items, count)).toEqual([
      { label: 'Menu › Fechar', sel: '.nope' },
      { label: 'Menu › Marcar', sel: '.nada' },
    ]);
  });

  it('ClassComoString_UsaOSeletor', () => {
    const items = [{ label: 'X', groups: [{ items: [{ label: 'Ativar', class: '.ghost' }] }] }];
    expect(core.deadInteractions(items, count)).toEqual([{ label: 'X › Ativar', sel: '.ghost' }]);
  });

  it('SeletorRepetido_AparecePorItem', () => {
    const items = [{ label: 'A', show: '.x' }, { label: 'B', show: '.x' }];
    expect(core.deadInteractions(items, count).map((d) => d.label)).toEqual(['A', 'B']);
  });

  it('SeparadorEManifestoVazio_SemAvisos', () => {
    expect(core.deadInteractions([{ sep: 'Superfícies' }], count)).toEqual([]);
    expect(core.deadInteractions(undefined, count)).toEqual([]);
  });

  it('ContadorQueLanca_ContaComoMorto', () => {
    const boom = () => { throw new Error('invalid selector'); };
    expect(core.deadInteractions([{ label: 'A', show: '::bad(' }], boom)).toEqual([{ label: 'A', sel: '::bad(' }]);
  });
});

const ch = (prop, to, fromInline) => ({ key: 'k|' + prop, prop, to, ids: Object.keys(fromInline), fromInline });

describe('InlineDelta', () => {
  it('TargetComValor_EscreveTo', () => {
    const target = [ch('color', 'red', { a: 'blue' })];
    expect(core.inlineDelta([], target)).toEqual([{ id: 'a', prop: 'color', value: 'red' }]);
  });

  it('SoNoCur_RestauraFromInline', () => {
    const cur = [ch('color', 'red', { a: 'blue' })];
    expect(core.inlineDelta(cur, [])).toEqual([{ id: 'a', prop: 'color', value: 'blue' }]);
  });

  it('SoNoCurSemInlineOriginal_LimpaOValor', () => {
    const cur = [ch('color', 'red', { a: undefined })];
    expect(core.inlineDelta(cur, [])).toEqual([{ id: 'a', prop: 'color', value: '' }]);
  });

  it('EscopoAll_RestauraTodosOsIds', () => {
    const cur = [ch('color', 'red', { a: '1', b: '', c: '3' })];
    expect(core.inlineDelta(cur, [])).toEqual([
      { id: 'a', prop: 'color', value: '1' },
      { id: 'b', prop: 'color', value: '' },
      { id: 'c', prop: 'color', value: '3' },
    ]);
  });

  it('ValorDiferente_PrevaleceOTarget', () => {
    const cur = [ch('color', 'red', { a: 'blue' })];
    const target = [ch('color', 'green', { a: 'blue' })];
    expect(core.inlineDelta(cur, target)).toEqual([{ id: 'a', prop: 'color', value: 'green' }]);
  });

  it('AmbosVazios_SemEscrita', () => {
    expect(core.inlineDelta([], [])).toEqual([]);
    expect(core.inlineDelta(null, undefined)).toEqual([]);
  });
});

describe('PushSnapshot', () => {
  it('AcimaDoCap_DescartaMaisAntigo', () => {
    expect(core.pushSnapshot([1, 2, 3], 4, 3)).toEqual([2, 3, 4]);
  });

  it('AbaixoDoCap_AcrescentaSemMutarAOriginal', () => {
    const stack = [1, 2];
    expect(core.pushSnapshot(stack, 3, 5)).toEqual([1, 2, 3]);
    expect(stack).toEqual([1, 2]);
    expect(core.pushSnapshot(undefined, 1, 5)).toEqual([1]);
  });
});

const pendingChange = (o) => ({ key: '0.1|color', id: '0.1', ids: ['0.1'], name: '.a', src: 'a.css|.a|3', prop: 'color', from: 'red', fromInline: { '0.1': '' }, to: 'blue', scope: 'one', decided: false, scopedSel: null, ...o });
const pendingRequest = (o) => ({ id: 'r1', layoutId: 'L1', nodeKey: '0.1', path: 'body>div', text: 'make it bigger', createdAt: 1000, ...o });
const memStorage = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } }; };
const DAY = 24 * 60 * 60 * 1000;

describe('SourceHash', () => {
  it('MesmasPartes_MesmoHash', () => {
    expect(core.sourceHash(['a', 'b'])).toBe(core.sourceHash(['a', 'b']));
  });

  it('PartesTrocadasDeFronteira_HashDiferente', () => {
    expect(core.sourceHash(['ab', 'c'])).not.toBe(core.sourceHash(['a', 'bc']));
  });

  it('DcNuloVsVazio_HashDiferente', () => {
    expect(core.sourceHash(['x', null])).not.toBe(core.sourceHash(['x', '']));
  });

  it('ManMudou_HashDiferente', () => {
    const a = core.sourceHash([JSON.stringify({ rules: { a: 1 } }), 'mock.html', '<p>']);
    const b = core.sourceHash([JSON.stringify({ rules: { a: 2 } }), 'mock.html', '<p>']);
    expect(a).not.toBe(b);
  });
});

describe('ContentHash', () => {
  it('Vazio_VetorSha256', async () => {
    expect(await core.contentHash('')).toEqual({ sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', bytes: 0 });
  });

  it('Abc_VetorSha256', async () => {
    expect(await core.contentHash('abc')).toEqual({ sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', bytes: 3 });
  });

  it('DigestRejeita_HashNuloEBytesMantidos', async () => {
    const spy = vi.spyOn(globalThis.crypto.subtle, 'digest').mockRejectedValue(new Error('no digest'));
    try {
      expect(await core.contentHash('ç')).toEqual({ sha256: null, bytes: 2 });
    } finally { spy.mockRestore(); }
  });

  it('NaoAscii_HashEBytesUtf8', async () => {
    expect(await core.contentHash('ç')).toEqual({ sha256: '8bfa829b8119a6f39b91fd8decec63830b556e4d88a9da29334d7b0558829f2d', bytes: 2 });
  });
});

describe('WriteLogText', () => {
  const H0 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  const H1 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad';
  const entry = (o) => ({ at: '2026-10-14T12:00:00.000Z', path: 'style.css', from: 0, to: 3, fromHash: H0, toHash: H1, bak: false, ...o });

  it('Cabecalho_PrimeiraLinhaComVersao', () => {
    expect(core.writeLogText([entry({})]).split('\n')[0]).toMatch(/^# layers-export\.log v2 /);
    expect(core.WRITE_LOG_VERSION).toBe(2);
  });

  it('Entrada_LinhaComTamanhosEHashes', () => {
    expect(core.writeLogText([entry({})]).split('\n')[1]).toBe('2026-10-14T12:00:00.000Z  style.css  0 -> 3 bytes  sha256 ' + H0 + ' -> ' + H1);
  });

  it('ComBak_SufixoBakGuardado', () => {
    expect(core.writeLogText([entry({ bak: true })]).split('\n')[1]).toMatch(/ -> [0-9a-f]{64}  \.bak guardado$/);
  });

  it('HashNulo_TracoNoLugarDoHashMantemTamanho', () => {
    expect(core.writeLogText([entry({ fromHash: null, toHash: null })]).split('\n')[1]).toBe('2026-10-14T12:00:00.000Z  style.css  0 -> 3 bytes  sha256 - -> -');
  });

  it('TamanhoNulo_TracoNoLugarDoTamanho', () => {
    expect(core.writeLogText([entry({ from: null, to: null })]).split('\n')[1]).toMatch(/^2026-10-14T12:00:00\.000Z {2}style\.css {2}- -> - bytes {2}sha256 /);
  });

  it('PathComQuebraDeLinha_UmaLinhaPorEntrada', () => {
    const text = core.writeLogText([entry({ path: 'a\n2026-10-14T00:00:00.000Z  forged.css\t\x00b' }), entry({ path: 'x  y' })]);
    const lines = text.trimEnd().split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[1]).toContain(String.raw`  a\x0a2026-10-14T00:00:00.000Z\x20\x20forged.css\x09\x00b  `);
    expect(lines[2]).toContain(String.raw`  x\x20\x20y  `);
    expect(text).not.toMatch(/[\x09\x00]/);
  });

  it('PathComum_ImpressoSemAlteracao', () => {
    expect(core.writeLogText([entry({ path: 'css/ação café.css' })]).split('\n')[1]).toContain('  css/ação café.css  ');
  });

  it('VariasEntradas_UmaLinhaPorEntradaETerminaComNovaLinha', () => {
    const text = core.writeLogText([entry({}), entry({ path: 'b.css' })]);
    expect(text.endsWith('\n')).toBe(true);
    expect(text.trimEnd().split('\n')).toHaveLength(3);
  });
});

describe('RestorePlan', () => {
  it('HashIgual_RestauraTudoDecidedTrue', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({}), pendingChange({ key: '0.2|color', id: '0.2', ids: ['0.2'] })] };
    const plan = core.restorePlan(entry, 'h');
    expect(plan.dropped).toBe(0);
    expect(plan.keep.map((c) => c.decided)).toEqual([true, true]);
    expect(plan.keep[0]).not.toBe(entry.changes[0]);
  });

  it('HashIgual_PreservaOrdem', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({ key: 'b|x', prop: 'x' }), pendingChange({ key: 'a|x', prop: 'x' })] };
    expect(core.restorePlan(entry, 'h').keep.map((c) => c.key)).toEqual(['b|x', 'a|x']);
  });

  it('HashDiferente_DescartaTudo', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({}), pendingChange({ key: 'k2' })] };
    expect(core.restorePlan(entry, 'outro')).toEqual({ keep: [], dropped: 2, requests: [], confirm: true });
  });

  it('EntryNula_VazioSemDescarte', () => {
    expect(core.restorePlan(null, 'h')).toEqual({ keep: [], dropped: 0, requests: [], confirm: false });
  });

  it('HashDiferente_MantemRequestsComConfirm', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({})], requests: [pendingRequest({ texts: ['a'] }), pendingRequest({ id: 'r2' })] };
    const plan = core.restorePlan(entry, 'outro');
    expect(plan.keep).toEqual([]);
    expect(plan.dropped).toBe(1);
    expect(plan.confirm).toBe(true);
    expect(plan.requests.map((r) => r.id)).toEqual(['r1', 'r2']);
    expect(plan.requests[0]).not.toBe(entry.requests[0]);
    expect(plan.requests[0].texts).toEqual(['a']);
    expect(plan.requests[0].texts).not.toBe(entry.requests[0].texts);
  });

  it('HashIgual_ConfirmFalse', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({})], requests: [pendingRequest({ texts: ['a'] })] };
    const plan = core.restorePlan(entry, 'h');
    expect(plan.confirm).toBe(false);
    expect(plan.dropped).toBe(0);
    expect(plan.keep).toHaveLength(1);
    expect(plan.requests).toEqual(entry.requests);
    expect(plan.requests[0]).not.toBe(entry.requests[0]);
    expect(plan.requests[0].texts).toEqual(['a']);
    expect(plan.requests[0].texts).not.toBe(entry.requests[0].texts);
  });

  it('RequestsNaoArrayOuElementoInvalido_Ignora', () => {
    const base = { savedAt: 1, hash: 'h', changes: [pendingChange({})] };
    expect(core.restorePlan({ ...base, requests: 'x' }, 'h').requests).toEqual([]);
    expect(core.restorePlan({ ...base, requests: [null, 'x', pendingRequest({})] }, 'outro').requests).toEqual([pendingRequest({})]);
  });

  it('EntradaSemRequests_RequestsVazio', () => {
    const entry = { savedAt: 1, hash: 'h', changes: [pendingChange({})] };
    expect(core.restorePlan(entry, 'h').requests).toEqual([]);
    expect(core.restorePlan(entry, 'outro').requests).toEqual([]);
  });
});

describe('ValidRequest', () => {
  it('CamposObrigatorios_Valida', () => {
    expect(core.validRequest(pendingRequest({}))).toBe(true);
  });

  it('CampoObrigatorioAusenteOuTipoErrado_Rejeita', () => {
    ['id', 'layoutId', 'nodeKey', 'path', 'text', 'createdAt'].forEach((k) => {
      expect(core.validRequest(pendingRequest({ [k]: undefined }))).toBe(false);
      expect(core.validRequest(pendingRequest({ [k]: k === 'createdAt' ? '1' : 1 }))).toBe(false);
    });
  });

  it('AncorasOpcionaisValidas_Aceita', () => {
    expect(core.validRequest(pendingRequest({ name: 'n', depth: 2, alvo: 'a', caixa: 'c', estilos: 'e', uses: 3, texts: ['x'], pendente: 'p' }))).toBe(true);
    expect(core.validRequest(pendingRequest({ pendente: null }))).toBe(true);
  });

  it('AncoraOpcionalTipoErrado_Rejeita', () => {
    const bad = { name: 1, depth: '2', alvo: 1, caixa: 1, estilos: 1, uses: '3', texts: 'x', pendente: 1 };
    Object.keys(bad).forEach((k) => {
      expect(core.validRequest(pendingRequest({ [k]: bad[k] }))).toBe(false);
    });
    expect(core.validRequest(pendingRequest({ texts: ['x', 1] }))).toBe(false);
  });

  it('ChaveExtraDesconhecida_Ignora', () => {
    expect(core.validRequest(pendingRequest({ extra: 1 }))).toBe(true);
  });

  it('ArrayOuNaoObjeto_Rejeita', () => {
    [null, undefined, 'x', 1, true, [], [pendingRequest({})]].forEach((v) => {
      expect(core.validRequest(v)).toBe(false);
    });
  });
});

describe('SetPending / GetPending', () => {
  it('RoundTrip_DevolveEntrada', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    const e = core.getPending(st, 'fx:a');
    expect(e.hash).toBe('h');
    expect(e.savedAt).toBe(1000);
    expect(e.changes).toHaveLength(1);
  });

  it('EntryNull_RemoveSoDoProjeto', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:b', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:a', null, 2000);
    expect(core.getPending(st, 'fx:a')).toBeNull();
    expect(core.getPending(st, 'fx:b')).not.toBeNull();
  });

  it('OutraChave_Preserva', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h1', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:b', { hash: 'h2', changes: [pendingChange({})] }, 1000);
    expect(core.getPending(st, 'fx:a').hash).toBe('h1');
  });

  it('AcimaDoTeto_RemoveEntrada', () => {
    const st = memStorage();
    const many = Array.from({ length: core.PENDING_CAP + 1 }, (_, i) => pendingChange({ key: 'k' + i }));
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:a', { hash: 'h', changes: many }, 2000);
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('Expirada_Remove', () => {
    const st = memStorage();
    core.setPending(st, 'fx:old', { hash: 'h', changes: [pendingChange({})] }, 0);
    core.setPending(st, 'fx:new', { hash: 'h', changes: [pendingChange({})] }, 31 * DAY);
    expect(core.getPending(st, 'fx:old')).toBeNull();
    expect(core.getPending(st, 'fx:new')).not.toBeNull();
  });

  it('GravacaoFalha_NaoDeixaEntradaAntigaRessuscitar', () => {
    const m = new Map(); let full = false;
    const st = { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (full) throw new Error('quota'); m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } };
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    full = true;
    expect(core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({ to: 'green' })] }, 2000)).toBe(false);
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('JsonCorrompido_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', '{nao e json');
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('ChangeSemIds_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({ ids: 'nao-array' })] } } }));
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('PropSomenteLeitura_DevolveNull', () => {
    const st = memStorage();
    ['length', 'parentRule', '0'].forEach((prop) => {
      st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({ prop })] } } }));
      expect(core.getPending(st, 'fx:a')).toBeNull();
    });
  });

  it('PropCssText_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({ prop: 'cssText' })] } } }));
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('SemRequests_LeComoVazio', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({})] } } }));
    const e = core.getPending(st, 'fx:a');
    expect(e.requests).toEqual([]);
    expect(e.changes).toHaveLength(1);
  });

  it('RequestInvalida_DescartaSoRequests', () => {
    const st = memStorage();
    const reqs = [pendingRequest({}), pendingRequest({ id: 5 }), null, 'x', [], pendingRequest({ id: 'r3', depth: 'x' }), pendingRequest({ id: 'r4' })];
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({})], requests: reqs } } }));
    const e = core.getPending(st, 'fx:a');
    expect(e.requests.map((r) => r.id)).toEqual(['r1', 'r4']);
    expect(e.changes).toHaveLength(1);
  });

  it('RequestsNaoArray_LeComoVazio', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({})], requests: 'x' } } }));
    expect(core.getPending(st, 'fx:a').requests).toEqual([]);
  });

  it('ChangeInvalidaComRequests_DevolveNull', () => {
    const st = memStorage();
    st.setItem('layers/v1/pending', JSON.stringify({ schema: 1, byProject: { 'fx:a': { savedAt: 1, hash: 'h', changes: [pendingChange({ ids: 'x' })], requests: [pendingRequest({})] } } }));
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('RoundTripRequests_PreservaAncoras', () => {
    const st = memStorage();
    const r = pendingRequest({ name: 'n', texts: ['a'], pendente: null });
    core.setPending(st, 'fx:a', { hash: 'h', changes: [], requests: [r] }, 1000);
    expect(core.getPending(st, 'fx:a').requests).toEqual([r]);
  });

  it('SoRequests_NaoApaga', () => {
    const st = memStorage();
    expect(core.setPending(st, 'fx:a', { hash: 'h', changes: [], requests: [pendingRequest({})] }, 1000)).toBe(true);
    const e = core.getPending(st, 'fx:a');
    expect(e.changes).toEqual([]);
    expect(e.requests).toHaveLength(1);
  });

  it('SemChangesNemRequests_NaoGrava', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    core.setPending(st, 'fx:a', { hash: 'h', changes: [], requests: [] }, 2000);
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('SemCampoRequests_TrataComoVazio', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [pendingChange({})] }, 1000);
    expect(core.getPending(st, 'fx:a').requests).toEqual([]);
  });

  it('Teto200Changes_NaoDerrubaRequests', () => {
    const st = memStorage();
    const many = Array.from({ length: core.PENDING_CAP + 1 }, (_, i) => pendingChange({ key: 'k' + i }));
    core.setPending(st, 'fx:a', { hash: 'h', changes: many, requests: [pendingRequest({})] }, 1000);
    const e = core.getPending(st, 'fx:a');
    expect(e.changes).toEqual([]);
    expect(e.requests).toHaveLength(1);
  });

  it('RequestsAcimaDoTeto_TruncaNas200Primeiras', () => {
    const st = memStorage();
    const many = Array.from({ length: core.PENDING_CAP + 5 }, (_, i) => pendingRequest({ id: 'r' + i }));
    core.setPending(st, 'fx:a', { hash: 'h', changes: [], requests: many }, 1000);
    const e = core.getPending(st, 'fx:a');
    expect(e.requests).toHaveLength(core.PENDING_CAP);
    expect(e.requests[0].id).toBe('r0');
    expect(e.requests[core.PENDING_CAP - 1].id).toBe('r' + (core.PENDING_CAP - 1));
  });

  it('EntryNullComRequests_RemoveEntrada', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [], requests: [pendingRequest({})] }, 1000);
    core.setPending(st, 'fx:a', null, 2000);
    expect(core.getPending(st, 'fx:a')).toBeNull();
  });

  it('OutroProjetoSoComRequests_Preserva', () => {
    const st = memStorage();
    core.setPending(st, 'fx:a', { hash: 'h', changes: [], requests: [pendingRequest({})] }, 1000);
    core.setPending(st, 'fx:b', { hash: 'h', changes: [pendingChange({})] }, 2000);
    expect(core.getPending(st, 'fx:a').requests).toHaveLength(1);
  });
});

describe('MenuStep', () => {
  const step = (menu, pin, ev, t, pending = null) => core.menuStep({ menu, pin, pending }, ev, t);
  const enter = (key, extra) => ({ type: 'enter', key, pointer: 'mouse', buttons: 0, ...extra });
  const leave = (key, extra) => ({ type: 'leave', key, pointer: 'mouse', ...extra });
  const DELAY = { openDelay: 120, closeGrace: 260 };
  const SHUT = { menu: null, pin: false, timer: null };

  it('Timing_Default_ZeroOpenDelayAnd260Grace', () => {
    expect(core.MENU_TIMING).toEqual({ openDelay: 0, closeGrace: 260 });
  });

  it('Enter_NothingOpen_OpensUnpinnedNow', () => {
    expect(step(null, false, enter('apar'))).toEqual({ menu: 'apar', pin: false, timer: null });
  });

  it('Enter_NothingOpenWithDelay_SchedulesOpen', () => {
    expect(step(null, false, enter('apar'), DELAY)).toEqual({ menu: null, pin: false, timer: { kind: 'open', key: 'apar', ms: 120 } });
  });

  it('EnterLeave_Touch_Ignored', () => {
    expect(step(null, false, enter('hist', { pointer: 'touch' }))).toBeNull();
    expect(step('hist', false, leave('hist', { pointer: 'touch' }))).toBeNull();
  });

  it('Enter_ButtonPressed_Ignored', () => {
    expect(step(null, false, enter('inter', { buttons: 1 }))).toBeNull();
  });

  it('Enter_SameMenuOpen_CancelsCloseTimer', () => {
    expect(step('inter', false, enter('inter'))).toEqual({ menu: 'inter', pin: false, timer: null });
  });

  it('Enter_OtherUnpinnedOpen_SwitchesNowEvenWithDelay', () => {
    expect(step('apar', false, enter('inter'), DELAY)).toEqual({ menu: 'inter', pin: false, timer: null });
  });

  it('Enter_OtherPinnedOpen_Ignored', () => {
    expect(step('apar', true, enter('inter'))).toBeNull();
  });

  it('Leave_UnpinnedOpen_SchedulesCloseGrace', () => {
    expect(step('acoes', false, leave('acoes'))).toEqual({ menu: 'acoes', pin: false, timer: { kind: 'close', key: 'acoes', ms: 260 } });
  });

  it('Leave_Pinned_Ignored', () => {
    expect(step('acoes', true, leave('acoes'))).toBeNull();
  });

  it('Leave_OtherMenuOpen_Ignored', () => {
    expect(step('apar', false, leave('inter'))).toBeNull();
  });

  it('Leave_NothingOpenPendingSameKey_CancelsPendingOpen', () => {
    expect(step(null, false, leave('hist'), DELAY, 'hist')).toEqual(SHUT);
  });

  it('Leave_NothingOpenNoOrOtherPending_Ignored', () => {
    expect(step(null, false, leave('hist'))).toBeNull();
    expect(step(null, false, leave('hist'), DELAY, 'apar')).toBeNull();
  });

  it('TimerOpen_NothingOpen_OpensUnpinned', () => {
    expect(step(null, false, { type: 'timer', kind: 'open', key: 'hist' })).toEqual({ menu: 'hist', pin: false, timer: null });
  });

  it('TimerOpen_SomethingOpen_Ignored', () => {
    expect(step('apar', true, { type: 'timer', kind: 'open', key: 'hist' })).toBeNull();
  });

  it('TimerClose_StillUnpinned_Closes', () => {
    expect(step('inter', false, { type: 'timer', kind: 'close', key: 'inter' })).toEqual(SHUT);
  });

  it('TimerClose_PinnedMeanwhile_Ignored', () => {
    expect(step('inter', true, { type: 'timer', kind: 'close', key: 'inter' })).toBeNull();
  });

  it('TimerClose_OtherMenuNow_Ignored', () => {
    expect(step('apar', false, { type: 'timer', kind: 'close', key: 'inter' })).toBeNull();
  });

  it('Click_Closed_OpensPinned', () => {
    expect(step(null, false, { type: 'click', key: 'hist' })).toEqual({ menu: 'hist', pin: true, timer: null });
  });

  it('Click_UnpinnedOpen_Pins', () => {
    expect(step('hist', false, { type: 'click', key: 'hist' })).toEqual({ menu: 'hist', pin: true, timer: null });
  });

  it('Click_Pinned_Closes', () => {
    expect(step('hist', true, { type: 'click', key: 'hist' })).toEqual(SHUT);
  });

  it('Click_OtherPinned_SwitchesPinned', () => {
    expect(step('apar', true, { type: 'click', key: 'acoes' })).toEqual({ menu: 'acoes', pin: true, timer: null });
  });

  it('Inside_Unpinned_Pins', () => {
    expect(step('inter', false, { type: 'inside', key: 'inter' })).toEqual({ menu: 'inter', pin: true, timer: null });
  });

  it('Inside_PinnedOrOther_Ignored', () => {
    expect(step('inter', true, { type: 'inside', key: 'inter' })).toBeNull();
    expect(step('apar', false, { type: 'inside', key: 'inter' })).toBeNull();
  });

  it('Close_OpenOrPending_ClosesEvenWhenPinned', () => {
    expect(step('apar', true, { type: 'close' })).toEqual(SHUT);
    expect(step(null, false, { type: 'close' }, DELAY, 'hist')).toEqual(SHUT);
  });

  it('Close_NothingOpen_Ignored', () => {
    expect(step(null, false, { type: 'close' })).toBeNull();
  });
});

describe('HostAttrsFromHtmlAllowlist', () => {
  const at = (name, value) => ({ name, value });
  const vars = (style) => core.hostAttrsFromHtml([at('style', style)]).vars.map((v) => v.name);

  it('HostAttrsFromHtml_ValorFora_DaAllowlist', () => {
    expect(vars('--c:image-set("http://e/x.png" 1x)')).toEqual([]);
    expect(vars('--a:/*;--b:1')).toEqual(['--b']);
    expect(vars('--d:"a')).toEqual([]);
    expect(vars("--d:'a")).toEqual([]);
    expect(vars('--e:foo(1)')).toEqual([]);
    expect(vars('--f:paint(x)')).toEqual([]);
  });

  it('HostAttrsFromHtml_ValorLegitimo_Fica', () => {
    const style = '--a:#fff;--b:rgb(1 2 3 / 50%);--c:calc(1px + 2px);--d:var(--x);--e:"Inter", sans-serif;--f:0 1px 2px rgba(0,0,0,.2);--g:1.5rem;--h:linear-gradient(90deg, #000, #fff)';
    expect(vars(style)).toEqual(['--a', '--b', '--c', '--d', '--e', '--f', '--g', '--h']);
  });

  it('HostAttrsFromHtml_NomeDataInvalido_Sai', () => {
    const r = core.hostAttrsFromHtml([at('data-a<b', '1'), at('data-x"y', '1'), at('data-theme', 'light'), at('data-bs-theme', 'dark')]);
    expect(r.attrs.map((a) => a.name)).toEqual(['data-theme', 'data-bs-theme']);
  });
});

describe('SnapshotCaptureLongUrl', () => {
  it('SnapshotCapture_UrlAcimaDe4000_AindaEhSnapshotComCapturaInteira', () => {
    const url = 'http://localhost:5173/gallery.html#/' + 'y'.repeat(5000);
    const r = core.snapshotCapture('<!doctype html>\n<!-- snapshot LAYERS · ' + url + ' · 2026-10-16T00:00:00.000Z · viewport 600×300 -->\n<html></html>');
    expect(r.snapshot).toBe(true);
    expect(r.capture).toBe(url + ' · 2026-10-16T00:00:00.000Z · viewport 600×300');
  });

  it('SnapshotCapture_ComentarioSemFechar_EhSnapshotSemCaptura', () => {
    expect(core.snapshotCapture('<!-- snapshot LAYERS · sem fim\n<html></html>')).toEqual({ snapshot: true, capture: '' });
  });
});

describe('HostAttrsFromHtmlHardening', () => {
  const at = (name, value) => ({ name, value });
  const vars = (style) => core.hostAttrsFromHtml([at('style', style)]).vars.map((v) => v.name);

  it('HostAttrsFromHtml_ValorHostilGigante_RecusaRapido', () => {
    const t0 = performance.now();
    expect(vars('--a:' + 'a'.repeat(100000))).toEqual([]);
    expect(vars('--a:' + 'a'.repeat(3000))).toEqual([]);
    expect(performance.now() - t0).toBeLessThan(200);
    expect(vars('--a:' + 'a'.repeat(1999))).toEqual(['--a']);
  });

  it('HostAttrsFromHtml_FuncoesModernasLegitimas_Ficam', () => {
    const ok = ['light-dark(#fff, #000)', 'env(safe-area-inset-top)', 'translate(1px, 2px)', 'blur(4px)', 'drop-shadow(0 0 2px #000)', 'steps(4, end)', 'repeat(2, 1fr)', 'minmax(0, 1fr)', 'rotate(45deg)', 'scale(1.2)'];
    ok.forEach((v, i) => expect(vars('--v' + i + ':' + v), v).toEqual(['--v' + i]));
    expect(vars('--x:url(a)')).toEqual([]);
    expect(vars('--x:image-set(a)')).toEqual([]);
  });
});

describe('SnapshotCapture', () => {
  it('SnapshotCapture_UrlLonga_DevolveCapturaInteira', () => {
    const url = 'http://localhost:5173/gallery.html#/' + 'x'.repeat(1500);
    const html = '<!doctype html>\n<!-- snapshot LAYERS · ' + url + ' · 2026-10-16T00:00:00.000Z · viewport 600×300 -->\n<html></html>';
    const r = core.snapshotCapture(html);
    expect(r.snapshot).toBe(true);
    expect(r.capture).toBe(url + ' · 2026-10-16T00:00:00.000Z · viewport 600×300');
  });

  it('SnapshotCapture_SemComentarioOuAlemDoTopo_NaoEhSnapshot', () => {
    expect(core.snapshotCapture('<!doctype html><html></html>')).toEqual({ snapshot: false, capture: '' });
    expect(core.snapshotCapture('x'.repeat(4100) + '<!-- snapshot LAYERS · u -->')).toEqual({ snapshot: false, capture: '' });
    expect(core.snapshotCapture(undefined)).toEqual({ snapshot: false, capture: '' });
  });
});

describe('WatchGlobs', () => {
  it('WatchGlobs_EntradasInvalidas_SaemEValidasFicam', () => {
    expect(core.watchGlobs({ watch: ['src/**/*.ts', '', 7, '../x', 'a/../b', '/abs', 'a\\b', null] })).toEqual(['src/**/*.ts']);
    expect(core.watchGlobs({})).toEqual([]);
    expect(core.watchGlobs({ watch: 'x' })).toEqual([]);
    expect(core.watchGlobs(undefined)).toEqual([]);
    const many = Array.from({ length: 25 }, (_, i) => 'src/f' + i + '.ts');
    expect(core.watchGlobs({ watch: many })).toEqual(many.slice(0, 20));
  });
});

describe('GlobMatch', () => {
  it('GlobMatch_AsteriscoNaoCruzaBarra', () => {
    expect(core.globMatch('src/*.ts', 'src/a.ts')).toBe(true);
    expect(core.globMatch('src/*.ts', 'src/ui/a.ts')).toBe(false);
  });

  it('GlobMatch_DoubleStarCruzaZeroOuMaisPastas', () => {
    expect(core.globMatch('src/**/*.ts', 'src/a.ts')).toBe(true);
    expect(core.globMatch('src/**/*.ts', 'src/ui/x/a.ts')).toBe(true);
    expect(core.globMatch('**/*.ts', 'a.ts')).toBe(true);
    expect(core.globMatch('**/*.ts', 'src/a.ts')).toBe(true);
    expect(core.globMatch('src/**', 'src/ui/a.ts')).toBe(true);
    expect(core.globMatch('src/**/*.ts', 'lib/a.ts')).toBe(false);
  });

  it('GlobMatch_PontoEMaisSaoLiterais', () => {
    expect(core.globMatch('src/a.b+c.ts', 'src/a.b+c.ts')).toBe(true);
    expect(core.globMatch('src/a.b+c.ts', 'src/aXb+c.ts')).toBe(false);
    expect(core.globMatch('src/?.ts', 'src/a.ts')).toBe(true);
    expect(core.globMatch('src/?.ts', 'src//.ts')).toBe(false);
  });
});

describe('WatchGlobsLimits', () => {
  it('WatchGlobs_GlobLongoOuComMuitosCuringas_Sai', () => {
    expect(core.watchGlobs({ watch: ['a/' + 'b'.repeat(200) + '.ts'] })).toEqual([]);
    expect(core.watchGlobs({ watch: ['a/'.repeat(100) + 'x.ts'] })).toEqual([]);
    expect(core.watchGlobs({ watch: ['*a*a*a*a*a*a*a*a*b.ts'] })).toEqual([]);
    expect(core.watchGlobs({ watch: ['**a**a**a**a**a**a**a**a**a**b'] })).toEqual([]);
    expect(core.watchGlobs({ watch: ['*a*a*a*a*a*a*a*b.ts'] })).toEqual(['*a*a*a*a*a*a*a*b.ts']);
    expect(core.watchGlobs({ watch: ['src/**/**/**/*.ts'] })).toEqual(['src/**/**/**/*.ts']);
  });
});

describe('CompileGlob', () => {
  it('CompileGlob_MesmoResultadoQueGlobMatchEGlobDirMayMatch', () => {
    const globs = ['src/**/*.ts', 'src/a**/x.ts', 'src/*/x.ts', 'src/ui/*.ts', '**/*.ts', 'src/a?c/**', 'a/**/b/**/c.ts'];
    const paths = ['src/a.ts', 'src/ab/cd/x.ts', 'src/q/x.ts', 'src/ui/o.ts', 'x/y/z.ts', 'src/abc/d/e.ts', 'a/q/b/r/c.ts'];
    const dirs = ['', 'src', 'src/ui', 'src/ab', 'docs', 'a/q/b', 'src/a/b/c'];
    for (const g of globs) {
      const c = core.compileGlob(g);
      for (const p of paths) expect(c.match(p), g + ' ' + p).toBe(core.globMatch(g, p));
      for (const d of dirs) expect(c.dirMayMatch(d), g + ' dir ' + d).toBe(core.globDirMayMatch(g, d));
    }
  });

  it('CompileGlob_UsaORegexJaCompilado_NaoRecompila', () => {
    const c = core.compileGlob('src/**/*.ts');
    const t0 = performance.now();
    for (let i = 0; i < 20000; i++) { c.match('src/ui/f' + (i % 50) + '.ts'); c.dirMayMatch('src/ui'); }
    expect(performance.now() - t0).toBeLessThan(500);
  });
});

describe('GlobConsistency', () => {
  it('GlobMatch_DoubleStarDentroDeSegmento_ViraAsterisco', () => {
    expect(core.globMatch('src/a**/x.ts', 'src/ab/cd/x.ts')).toBe(false);
    expect(core.globMatch('src/**.ts', 'src/a/b.ts')).toBe(false);
    expect(core.globMatch('src/a**b/x.ts', 'src/aXXb/x.ts')).toBe(true);
    expect(core.globMatch('src/**/x.ts', 'src/a/b/x.ts')).toBe(true);
  });

  it('GlobDirMayMatch_QuemCasaArquivo_NaoPodaNenhumAncestral', () => {
    const globs = ['src/**/*.ts', 'src/a**/x.ts', 'src/**.ts', 'src/*/x.ts', 'src/ui/*.ts', '**/*.ts', 'src/a?c/**', 'a/**/b/**/c.ts'];
    const paths = ['src/a.ts', 'src/ab/cd/x.ts', 'src/a/b.ts', 'src/q/x.ts', 'src/ui/o.ts', 'x/y/z.ts', 'src/abc/d/e.ts', 'a/q/b/r/c.ts', 'a/b/c.ts'];
    for (const g of globs) for (const f of paths) {
      if (!core.globMatch(g, f)) continue;
      const segs = f.split('/').slice(0, -1);
      for (let n = 0; n <= segs.length; n++) expect(core.globDirMayMatch(g, segs.slice(0, n).join('/')), g + ' vs dir of ' + f).toBe(true);
    }
  });
});

describe('GlobDirMayMatch', () => {
  it('GlobDirMayMatch_PodaPastasForaDoGlob', () => {
    for (const d of ['', 'src', 'src/ui']) expect(core.globDirMayMatch('src/ui/*.ts', d)).toBe(true);
    for (const d of ['src/ui/x', 'docs', 'lib']) expect(core.globDirMayMatch('src/ui/*.ts', d)).toBe(false);
    expect(core.globDirMayMatch('src/**/*.ts', 'src/a/b/c')).toBe(true);
    expect(core.globDirMayMatch('src/**/*.ts', 'docs')).toBe(false);
  });
});

describe('CitedSources', () => {
  const known = ['layers.json', 'layers/mock.html', 'src/a.css'];

  it('DataSrcComTs_DevolveArquivoUnicoNaRaiz', () => {
    const out = core.citedSources(['src/ui/shell.ts|.shell|3', 'src/ui/shell.ts|.x|9', 'src/ui/tab.ts|.t|1'], known);
    expect(out).toEqual(['src/ui/shell.ts', 'src/ui/tab.ts']);
  });

  it('CitedSources_ExtrasDepoisDosCitadosRespeitamCapEConhecidos', () => {
    expect(core.citedSources(['a.ts|.x|1'], ['known.ts'], 3, ['a.ts', 'b.ts', 'known.ts', 'c.ts', 'd.ts', 'x.css'])).toEqual(['a.ts', 'b.ts', 'c.ts']);
  });

  it('FolhaCssEMock_FicamForaPorNaoSeremFonteManual', () => {
    expect(core.citedSources(['src/a.css|.a|1', 'layers/mock.html|.b|2'], known)).toEqual([]);
  });

  it('ArquivoJaConhecido_NaoRepete', () => {
    expect(core.citedSources(['src/known.ts|.a|1'], ['src/known.ts'])).toEqual([]);
  });

  it('SeletorTpl_Ignorado', () => {
    expect(core.citedSources(['index.html|tpl:3|10', 'src/x.ts|tpl:3|10'], known)).toEqual([]);
  });

  it('ValorSemFormatoOuVazio_Ignorado', () => {
    expect(core.citedSources([undefined, '', 'sem-pipes.ts', null, 7], known)).toEqual([]);
    expect(core.citedSources(undefined, known)).toEqual([]);
  });

  it('AcimaDoTeto_CortaNoCap', () => {
    const srcs = Array.from({ length: 80 }, (_, i) => 'src/f' + i + '.ts|.a|1');
    expect(core.citedSources(srcs, known, 50)).toHaveLength(50);
    expect(core.citedSources(srcs, known)).toHaveLength(50);
  });
});

describe('LayoutDrift', () => {
  it('FonteMaisNovaQueOMock_Acusa', () => {
    expect(core.layoutDrift(100, { 'src/a.ts': 150, 'src/b.ts': 50 })).toEqual(['src/a.ts']);
  });

  it('MtimeIgualAoDoMock_NaoAcusa', () => {
    expect(core.layoutDrift(100, { 'src/a.ts': 100 })).toEqual([]);
  });

  it('MissingOuNaoNumerico_NuncaConta', () => {
    expect(core.layoutDrift(100, { 'src/a.ts': 'missing', 'src/b.ts': undefined, 'src/c.ts': null })).toEqual([]);
  });

  it('MtimeJaReconhecido_NaoAcusaDeNovo', () => {
    expect(core.layoutDrift(100, { 'src/a.ts': 150 }, { 'src/a.ts': 150 })).toEqual([]);
  });

  it('FonteEditadaDepoisDoReconhecimento_VoltaAAcusar', () => {
    expect(core.layoutDrift(100, { 'src/a.ts': 200, 'src/b.ts': 150 }, { 'src/a.ts': 150, 'src/b.ts': 150 })).toEqual(['src/a.ts']);
  });

  it('MockSemMtime_DevolveVazio', () => {
    expect(core.layoutDrift(undefined, { 'src/a.ts': 999 })).toEqual([]);
    expect(core.layoutDrift('missing', { 'src/a.ts': 999 })).toEqual([]);
    expect(core.layoutDrift(100, undefined)).toEqual([]);
  });
});

describe('StaleKind', () => {
  const structural = ['layers.json', 'layers/mock.html', 'src/ui/shell.ts'];

  it('SoFolhaCss_EhStyle', () => {
    expect(core.staleKind(['src/styles/layout.css'], structural)).toBe('style');
  });

  it('MockNaLista_EhLayout', () => {
    expect(core.staleKind(['src/styles/layout.css', 'layers/mock.html'], structural)).toBe('layout');
  });

  it('FonteCitadaOuManifesto_EhLayout', () => {
    expect(core.staleKind(['src/ui/shell.ts'], structural)).toBe('layout');
    expect(core.staleKind(['layers.json'], structural)).toBe('layout');
  });

  it('ListaVaziaOuSemEstrutural_EhStyle', () => {
    expect(core.staleKind([], structural)).toBe('style');
    expect(core.staleKind(['a.css'], undefined)).toBe('style');
  });
});

describe('LayoutBackupPaths', () => {
  it('MockAninhado_UsaSoOBasenameSobODiretorioDoCarimbo', () => {
    expect(core.layoutBackupPaths('20261016-130000', 'app/layers/mock.html')).toEqual({
      dir: '.design-history/layout-20261016-130000',
      manifest: '.design-history/layout-20261016-130000/layers.json',
      mock: '.design-history/layout-20261016-130000/mock.html'
    });
  });

  it('MockNaRaiz_MantemONome', () => {
    expect(core.layoutBackupPaths('s', 'mock.html').mock).toBe('.design-history/layout-s/mock.html');
  });
});

describe('SnapshotOriginCovered', () => {
  it('UrlAbsolutaComQuery_Casa', () => {
    expect(core.snapshotOriginCovered('http://localhost:5173/src/styles/layout.css?t=1', ['src/styles/layout.css'])).toBe(true);
  });
  it('IdViteWindowsComBarraInvertida_Casa', () => {
    expect(core.snapshotOriginCovered('C:\\Dev\\WAVE\\src\\styles\\layout.css', ['src/styles/layout.css'])).toBe(true);
  });
  it('SufixoSemFronteira_NaoCasa', () => {
    expect(core.snapshotOriginCovered('/a/xlayout.css', ['layout.css'])).toBe(false);
  });
  it('CaminhoDiferenteMesmoBasename_NaoCasa', () => {
    expect(core.snapshotOriginCovered('/a/src/styles/layout.css', ['other/layout.css'])).toBe(false);
  });
  it('OrigemVaziaOuNula_NaoCasa', () => {
    expect(core.snapshotOriginCovered('', ['a.css'])).toBe(false);
    expect(core.snapshotOriginCovered(null, ['a.css'])).toBe(false);
  });
  it('OrigemUndefined_NaoCasa', () => {
    expect(core.snapshotOriginCovered(undefined, ['a.css'])).toBe(false);
  });
  it('PercentInvalido_NaoLancaECasaPeloTextoCru', () => {
    expect(() => core.snapshotOriginCovered('/a/100%.css', ['100%.css'])).not.toThrow();
    expect(core.snapshotOriginCovered('/a/100%.css', ['100%.css'])).toBe(true);
  });
  it('OrigemComHash_Casa', () => {
    expect(core.snapshotOriginCovered('/a/x.css#frag', ['x.css'])).toBe(true);
  });
  it('FolhaDuplicadaNaLista_Casa', () => {
    expect(core.snapshotOriginCovered('/a/x.css', ['x.css', 'x.css'])).toBe(true);
  });
});

describe('MaskedSheets', () => {
  it('SnapshotMisto_BlocoSemOrigemEOutroComOrigem_DevolveVazio', () => {
    expect(core.maskedSheets(true, [{ origin: 'x', text: '.a{}' }, { origin: null, text: '.b{}' }], ['a.css'])).toEqual([]);
  });
  it('TodosComOrigem_DevolveVazio', () => {
    expect(core.maskedSheets(true, [{ origin: 'x', text: '.a{}' }, { origin: 'y', text: '.b{}' }], ['a.css'])).toEqual([]);
  });
  it('NaoSnapshot_DevolveVazio', () => {
    expect(core.maskedSheets(false, [{ origin: null, text: '.a{color:red}' }], ['a.css'])).toEqual([]);
  });
  it('BlobLegadoComRegras_DevolveAsFolhas', () => {
    expect(core.maskedSheets(true, [{ origin: null, text: '.a{color:red}' }], ['a.css'])).toEqual(['a.css']);
  });
  it('ComentarioPuroSemOrigem_DevolveVazio', () => {
    expect(core.maskedSheets(true, [{ origin: null, text: '/* NÃO LIDO */' }], ['a.css'])).toEqual([]);
  });
  it('BlobLegadoMaisComentarioPuro_DevolveAsFolhas', () => {
    expect(core.maskedSheets(true, [{ origin: null, text: '.a{color:red}' }, { origin: null, text: '/* NÃO LIDO */' }], ['a.css'])).toEqual(['a.css']);
  });
  it('TextoNuloOuIndefinido_ContaComoVazioSemLancar', () => {
    expect(core.maskedSheets(true, [{ origin: null, text: null }, { origin: null }], ['a.css'])).toEqual([]);
  });
  it('OrigemVazia_ContaComoSemOrigem', () => {
    expect(core.maskedSheets(true, [{ origin: '', text: '.a{color:red}' }], ['a.css'])).toEqual(['a.css']);
  });
  it('FolhasDuplicadas_DevolveCopiaDaLista', () => {
    expect(core.maskedSheets(true, [{ origin: null, text: '.a{color:red}' }], ['a.css', 'a.css'])).toEqual(['a.css', 'a.css']);
  });
  it('SnapshotSemBlocos_DevolveVazio', () => {
    expect(core.maskedSheets(true, [], ['a.css'])).toEqual([]);
  });
});

describe('PlaceDeadWarning', () => {
  it('ExisteAvisoDeUrlRemota_InsereAntes', () => {
    const warn = ['URL remota removida: href="//x"', 'outro'];
    core.placeDeadWarning(warn, 'dead');
    expect(warn).toEqual(['dead', 'URL remota removida: href="//x"', 'outro']);
  });
  it('ExisteAvisoDeUrlRemotaNeutralizada_InsereAntes', () => {
    const warn = ['css não encontrado: a.css', 'url() remota neutralizada no CSS: //x'];
    core.placeDeadWarning(warn, 'dead');
    expect(warn).toEqual(['css não encontrado: a.css', 'dead', 'url() remota neutralizada no CSS: //x']);
  });
  it('SemAvisoDeUrlRemota_Acrescenta', () => {
    const warn = ['a', 'b'];
    core.placeDeadWarning(warn, 'dead');
    expect(warn[warn.length - 1]).toBe('dead');
  });
  it('AvisoDeCssNaoEncontrado_ContinuaPrimeiro', () => {
    const warn = ['css não encontrado: a.css', 'URL remota removida: x'];
    core.placeDeadWarning(warn, 'dead');
    expect(warn.indexOf('dead')).toBe(1);
  });
});

describe('ProjectStates', () => {
  it('SemStates_DevolveVazio', () => {
    expect(core.projectStates({ mock: 'a.html' })).toEqual([]);
    expect(core.projectStates(null)).toEqual([]);
  });
  it('StatesForaDeArray_DevolveVazio', () => {
    expect(core.projectStates({ states: { name: 'a', mock: 'a.html' } })).toEqual([]);
    expect(core.projectStates({ states: 'a' })).toEqual([]);
  });
  it('EntradasInvalidas_Descarta', () => {
    const man = { states: [null, 'x', { name: '', mock: 'a.html' }, { name: 'a' }, { name: 'b', mock: 3 }, { name: 'ok', mock: 'ok.html', extra: 1 }] };
    expect(core.projectStates(man)).toEqual([{ name: 'ok', mock: 'ok.html' }]);
  });
  it('NomeIgualAPropriedadeDoPrototipo_Mantem', () => {
    const man = { states: [{ name: 'constructor', mock: 'c.html' }, { name: 'toString', mock: 't.html' }] };
    expect(core.projectStates(man).map((s) => s.name)).toEqual(['constructor', 'toString']);
  });
  it('NomeRepetido_MantemOPrimeiro', () => {
    const man = { states: [{ name: 'a', mock: '1.html' }, { name: 'a', mock: '2.html' }, { name: 'b', mock: '3.html' }] };
    expect(core.projectStates(man)).toEqual([{ name: 'a', mock: '1.html' }, { name: 'b', mock: '3.html' }]);
  });
});

describe('PickState', () => {
  const list = [{ name: 'empty', mock: 'e.html' }, { name: 'csv', mock: 'c.html' }];
  it('NomeExistente_DevolveEsseEstado', () => {
    expect(core.pickState(list, 'csv')).toBe(list[1]);
  });
  it('NomeInexistenteOuNulo_DevolveOPrimeiro', () => {
    expect(core.pickState(list, 'gone')).toBe(list[0]);
    expect(core.pickState(list, null)).toBe(list[0]);
  });
  it('ListaVazia_DevolveNulo', () => {
    expect(core.pickState([], 'csv')).toBeNull();
  });
});

describe('AttrAction', () => {
  const fake = (attrs) => ({
    getAttribute: (n) => (n in attrs ? attrs[n] : null),
    setAttribute: (n, v) => { attrs[n] = String(v); },
    removeAttribute: (n) => { delete attrs[n]; },
  });

  it('DataEAria_Normaliza', () => {
    expect(core.attrAction({ selector: '.dock', name: 'data-dock', value: 'left' }))
      .toEqual({ selector: '.dock', name: 'data-dock', value: 'left', off: null });
    expect(core.attrAction({ selector: '#b', name: 'ARIA-Expanded', value: true, off: false }))
      .toEqual({ selector: '#b', name: 'aria-expanded', value: 'true', off: 'false' });
    expect(core.attrAction({ selector: '#b', name: 'data-n', value: 3 }).value).toBe('3');
  });

  it('NomeForaDeDataAria_Rejeita', () => {
    ['onclick', 'style', 'class', 'href', 'data-', 'aria-', 'data-a b', 'xdata-a', 'data-<x>', '', undefined, 7]
      .forEach((name) => expect(core.attrAction({ selector: '.a', name, value: 'x' })).toBeNull());
  });

  it('EntradaMalformada_Rejeita', () => {
    expect(core.attrAction(undefined)).toBeNull();
    expect(core.attrAction('data-x')).toBeNull();
    expect(core.attrAction({ name: 'data-x', value: 'v' })).toBeNull();
    expect(core.attrAction({ selector: '', name: 'data-x', value: 'v' })).toBeNull();
    expect(core.attrAction({ selector: '.a', name: 'data-x' })).toBeNull();
    expect(core.attrAction({ selector: '.a', name: 'data-x', value: {} })).toBeNull();
    expect(core.attrAction({ selector: '.a', name: 'data-x', value: 'x'.repeat(201) })).toBeNull();
    expect(core.attrAction({ selector: '.a', name: 'data-x', value: 'v', off: {} })).toBeNull();
    expect(core.attrAction({ selector: '.a', name: 'data-x', value: 'x'.repeat(200) })).not.toBeNull();
  });

  it('ToggleSemOff_AlternaEntreValorEAusente', () => {
    const at = core.attrAction({ selector: '.a', name: 'data-collapsed', value: 'true' });
    const attrs = {}; const el = fake(attrs);
    expect(core.attrIsOn(el, at)).toBe(false);
    core.attrToggle(el, at);
    expect(attrs).toEqual({ 'data-collapsed': 'true' });
    expect(core.attrIsOn(el, at)).toBe(true);
    core.attrToggle(el, at);
    expect(attrs).toEqual({});
  });

  it('ToggleComOff_AlternaEntreDoisValores', () => {
    const at = core.attrAction({ selector: '.a', name: 'aria-expanded', value: 'true', off: 'false' });
    const attrs = { 'aria-expanded': 'false' }; const el = fake(attrs);
    core.attrToggle(el, at);
    expect(attrs['aria-expanded']).toBe('true');
    core.attrToggle(el, at);
    expect(attrs['aria-expanded']).toBe('false');
  });

  it('ToggleComOutroValor_SubstituiPeloValor', () => {
    const at = core.attrAction({ selector: '.a', name: 'data-dock', value: 'left' });
    const attrs = { 'data-dock': 'right' }; const el = fake(attrs);
    core.attrToggle(el, at);
    expect(attrs['data-dock']).toBe('left');
  });

  it('DeadInteractions_AttrSemAlvo_ListaOSeletor', () => {
    const alive = new Set(['.dock']); const count = (sel) => (alive.has(sel) ? 1 : 0);
    const items = [{ label: 'Dock', groups: [{ items: [
      { label: 'Esq', attr: { selector: '.dock', name: 'data-dock', value: 'left' } },
      { label: 'Dir', attr: { selector: '.nada', name: 'data-dock', value: 'right' } },
      { label: 'Ruim', attr: { selector: '.nada2', name: 'onclick', value: 'x' } },
    ] }] }];
    expect(core.deadInteractions(items, count)).toEqual([{ label: 'Dock › Dir', sel: '.nada' }]);
  });
});

describe('AppearanceDefaults', () => {
  it('AppearanceDefaults_Valores_IguaisAosDataPropsAntigos', () => {
    expect(core.APPEARANCE_DEFAULTS).toEqual({
      theme: 'Gray · 1 Grafite', accent: '5 · Cinza médio', selectColor: 'Coral', originColors: 'Mono · cor de seleção',
      panelHeader: 'B · Faixas rotuladas', sliderScale: 85, fontScale: 1, bmAlpha: 15,
    });
  });

  it('AppearanceDefaults_CfgKeys_TodaChaveTemDefault', () => {
    expect(core.CFG_KEYS).not.toContain('logoGrad');
    for (const k of core.CFG_KEYS) expect(core.APPEARANCE_DEFAULTS).toHaveProperty(k);
  });

  it('AppearanceDefaults_Objeto_Congelado', () => {
    expect(core.APPEARANCE_DEFAULTS).toBeTypeOf('object');
    expect(Object.isFrozen(core.APPEARANCE_DEFAULTS)).toBe(true);
  });
});

describe('Tooltip', () => {
  it('AcaoComAtalho_RetornaAcaoEAtalho', () => {
    expect(core.tooltip('orbitLeft')).toBe('Girar à esquerda (Q)');
    expect(core.tooltip('panUp')).toBe('Pan para cima (↑)');
    expect(core.tooltip('zoomIn')).toBe('Zoom + (+)');
    expect(core.tooltip('rightPanel', 'Recolher o painel de propriedades')).toBe('Recolher o painel de propriedades (P)');
    expect(core.tooltip('codeApply')).toBe('Aplicar (Ctrl+Enter)');
    expect(core.tooltip('escape', 'Fechar')).toBe('Fechar (Esc)');
    expect(core.tooltip('measure', 'Medidas ligadas')).toBe('Medidas ligadas (M)');
  });

  it('AcaoSemAtalho_RetornaSoAcao', () => {
    expect(core.tooltip('toggleNode')).toBe('Recolher / expandir');
    expect(core.tooltip('isolate')).toBe('Isolar o ramo da seleção');
    expect(core.tooltip('nope')).toBe('');
    expect(core.tooltip('nope', 'X')).toBe('');
  });
});

describe('Shortcuts', () => {
  it('Registro_SemTeclaDuplicada', () => {
    const ids = core.ACTIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const scope of ['global', 'ctrl']) {
      const keys = core.ACTIONS.filter((a) => a.scope === scope).flatMap((a) => a.keys.map((k) => k.toLowerCase()));
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('Registro_SemTeclaSemDescricao', () => {
    expect(core.SHORTCUTS).toHaveLength(7);
    for (const [group, rows] of core.SHORTCUTS) {
      expect(group).toBeTypeOf('string');
      for (const row of rows) {
        expect(row).toHaveLength(2);
        for (const cell of row) {
          expect(cell).toBeTypeOf('string');
          expect(cell.length).toBeGreaterThan(0);
          expect(cell).not.toContain('|');
        }
      }
    }
    for (const a of core.ACTIONS) {
      expect(a.label, a.id).toBeTruthy();
      if (a.scope === 'none') { expect(a.keys, a.id).toEqual([]); expect(a.hint, a.id).toBeUndefined(); }
      else expect(a.hint, a.id).toBeTruthy();
      if (a.scope === 'global' || a.scope === 'ctrl') expect(a.keys.length, a.id).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('KeyAction', () => {
  it('TeclaGlobal_ResolveId', () => {
    for (const a of core.ACTIONS.filter((x) => x.scope === 'global')) {
      for (const k of a.keys) {
        expect(core.keyAction(k), k).toBe(a.id);
        if (k.length === 1) expect(core.keyAction(k.toUpperCase()), k.toUpperCase()).toBe(a.id);
      }
    }
    for (const k of ['x', 'Enter', 'z', 'constructor']) expect(core.keyAction(k), k).toBeNull();
  });
});

describe('GroupPlanesByZ', () => {
  it('MesmoZ_UmGrupoNaOrdemDeEntrada', () => {
    const g = core.groupPlanesByZ([{ id: '0.2', z: 90 }, { id: '0.1', z: 90 }, { id: '0.3', z: 90 }]);
    expect(g).toEqual([{ z: 90, ids: ['0.2', '0.1', '0.3'] }]);
  });

  it('ZDiferente_GruposOrdenadosPorZ', () => {
    const g = core.groupPlanesByZ([{ id: 'a', z: 180 }, { id: 'b', z: 0 }, { id: 'c', z: 90 }, { id: 'd', z: 0 }, { id: 'e', z: -0.5 }]);
    expect(g).toEqual([{ z: -0.5, ids: ['e'] }, { z: 0, ids: ['b', 'd'] }, { z: 90, ids: ['c'] }, { z: 180, ids: ['a'] }]);
  });

  it('ZProximo_ArredondaA001', () => {
    const g = core.groupPlanesByZ([{ id: 'a', z: 90.001 }, { id: 'b', z: 89.996 }, { id: 'c', z: 90.02 }]);
    expect(g).toEqual([{ z: 90, ids: ['a', 'b'] }, { z: 90.02, ids: ['c'] }]);
  });

  it('ZNegativoQuaseZero_NaoViraMenosZero', () => {
    const g = core.groupPlanesByZ([{ id: 'a', z: -0.001 }, { id: 'b', z: 0 }]);
    expect(g).toHaveLength(1);
    expect(Object.is(g[0].z, 0)).toBe(true);
    expect(g[0].ids).toEqual(['a', 'b']);
  });

  it('ListaVazia_SemGrupos', () => {
    expect(core.groupPlanesByZ([])).toEqual([]);
  });
});

describe('KeyMap', () => {
  it('TeclaComHandler_EstaNoPainel', () => {
    const token = { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', PageUp: 'PgUp', PageDown: 'PgDn', Escape: 'Esc', '-': '−' };
    const cells = core.SHORTCUTS.flatMap(([, rows]) => rows.map(([keys]) => keys));
    const panel = new Set(cells.filter((c) => !c.includes('(')).flatMap((c) => c.split(' ').map((t) => t.toLowerCase())));
    const handled = core.ACTIONS.filter((a) => a.scope === 'global' || a.scope === 'ctrl').flatMap((a) => a.keys);
    const missing = handled.filter((k) => !panel.has((token[k] || k).toLowerCase()));
    expect(missing, 'teclas tratadas ausentes do painel: ' + missing.join(' ')).toEqual([]);
    expect(cells).toContain('Esc');
  });
});

describe('BranchZ', () => {
  it('SemCollapse_ProfundidadeRelativaARaiz', () => {
    expect(core.branchZ(5, 3, null, 10)).toBe(20);
    expect(core.branchZ(3, 3, null, 10)).toBe(0);
  });

  it('BranchZ_CollapseAt_ClampaProfundidade', () => {
    expect(core.branchZ(7, 3, 5, 10)).toBe(20);
    expect(core.branchZ(4, 3, 5, 10)).toBe(10);
    expect(core.branchZ(5, 3, 5, 10)).toBe(20);
  });

  it('CollapseAtZero_NaoEhTratadoComoAusente', () => {
    expect(core.branchZ(4, 0, 0, 10)).toBe(0);
  });
});

describe('BranchOf', () => {
  const nodes = [
    { id: '0', depth: 0 }, { id: '0.0', depth: 1 }, { id: '0.0.0', depth: 2 },
    { id: '0.1', depth: 1 }, { id: '0.10', depth: 1 }
  ];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  it('Raiz_IncluiRaizEDescendentesPorPrefixo', () => {
    expect([...core.branchOf(nodes, byId, '0.0')].sort()).toEqual(['0.0', '0.0.0']);
  });

  it('PrefixoNumerico_NaoVazaParaIrmaos', () => {
    expect([...core.branchOf(nodes, byId, '0.1')]).toEqual(['0.1']);
  });

  it('ByIdObjetoSimples_NaoLanca', () => {
    expect([...core.branchOf(nodes, {}, '0.1')]).toEqual(['0.1']);
  });

  it('BranchOf_RaizInexistente_Null', () => {
    expect(core.branchOf(nodes, byId, '9.9')).toBeNull();
    expect(core.branchOf(nodes, byId, null)).toBeNull();
    expect(core.branchOf(nodes, byId, '')).toBeNull();
  });
});

describe('InBranchOf', () => {
  it('RaizEDescendentes_PorPrefixoComPonto', () => {
    expect(core.inBranchOf('0.1', '0.1')).toBe(true);
    expect(core.inBranchOf('0.1.2', '0.1')).toBe(true);
    expect(core.inBranchOf('0.10', '0.1')).toBe(false);
  });
});

describe('CtxMenuModel', () => {
  const nodes = [
    { id: '0', depth: 0, name: '.shell' },
    { id: '0.0', depth: 1, name: '.workspace' },
    { id: '0.0.0', depth: 2, name: '.stage' },
    { id: '0.0.0.0', depth: 3, name: '.toolbar' },
    { id: '0.0.0.0.0', depth: 4, name: '.chip-a' },
    { id: '0.0.0.0.1', depth: 4, name: '.chip-b' },
    { id: '0.0.0.0.0.0', depth: 5, name: '.label' },
    { id: '0.0.1', depth: 2, name: '.side' },
    { id: '0.0.1.0', depth: 3, name: '.side-item' }
  ];
  const ids = (m) => m.items.map((i) => i.id);

  it('Flat_SemRamo_OferecaExplodirERequisicao', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.0.0', flat: true, explodeFrom: null, collapseAt: null });
    expect(ids(m)).toEqual(['explode', 'request']);
    expect(m.items[0]).toEqual({ id: 'explode', label: 'Explodir daqui', hint: 'só o ramo' });
    expect(m.items[1]).toEqual({ id: 'request', label: 'Requisição', hint: '→ Ajustes' });
    expect(m.header).toEqual({ name: '.toolbar', depth: 3 });
  });

  it('Explodido_DockOn_SemExplodir', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.0.0', flat: false, explodeFrom: null, collapseAt: null });
    expect(ids(m)).toEqual(['request']);
    const inBranch = core.ctxMenuModel({ nodes, selId: '0.0.0.0.0', flat: false, explodeFrom: '0.0.0.0', collapseAt: null });
    expect(ids(inBranch)).toEqual(['request']);
  });

  it('NoDoRamo_OferecaRecolherERequisicao', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.0.0.0', flat: true, explodeFrom: '0.0.0.0', collapseAt: null });
    expect(ids(m)).toEqual(['collapse', 'request']);
    expect(m.items[0]).toEqual({ id: 'collapse', label: 'Recolher até aqui', hint: 'L5+ → L4' });
  });

  it('RaizDoRamo_RecolherDesfazExplodir', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.0.0', flat: true, explodeFrom: '0.0.0.0', collapseAt: null });
    expect(ids(m)).toEqual(['collapse', 'request']);
    expect(m.items[0].hint).toBe('L4+ → L3');
  });

  it('FueraDoRamo_NaoOfereceRecolher', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.1.0', flat: true, explodeFrom: '0.0.0.0', collapseAt: null });
    expect(ids(m)).toEqual(['explode', 'request']);
  });

  it('LayersKinds_AncestorSelectedDescendantOutside', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.0.0', flat: true, explodeFrom: null, collapseAt: null });
    expect(m.layers).toEqual([
      { d: 0, kind: 'ancestor', count: 1 }, { d: 1, kind: 'ancestor', count: 1 },
      { d: 2, kind: 'ancestor', count: 2 }, { d: 3, kind: 'selected', count: 2 },
      { d: 4, kind: 'descendant', count: 2, inBranch: 2 }, { d: 5, kind: 'descendant', count: 1, inBranch: 1 }
    ]);
    const o = core.ctxMenuModel({ nodes, selId: '0.0.1', flat: true, explodeFrom: null, collapseAt: null });
    expect(o.layers.map((l) => [l.d, l.kind, l.count, l.inBranch])).toEqual([
      [0, 'ancestor', 1, undefined], [1, 'ancestor', 1, undefined], [2, 'selected', 2, undefined],
      [3, 'descendant', 2, 1], [4, 'outside', 2, undefined], [5, 'outside', 1, undefined]
    ]);
  });

  it('GhostPlane_DeeperThanCollapseAt_NoCollapseItem', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.0.0.0.0', flat: true, explodeFrom: '0.0.0.0', collapseAt: 4 });
    expect(ids(m)).toEqual(['request']);
    const at = core.ctxMenuModel({ nodes, selId: '0.0.0.0.0', flat: true, explodeFrom: '0.0.0.0', collapseAt: 4 });
    expect(ids(at)).toEqual(['collapse', 'request']);
  });

  it('DepthsSemDescendentes_Outside', () => {
    const m = core.ctxMenuModel({ nodes, selId: '0.0.1', flat: true, explodeFrom: null, collapseAt: null });
    expect(m.layers.map((l) => [l.d, l.kind])).toEqual([
      [0, 'ancestor'], [1, 'ancestor'], [2, 'selected'], [3, 'descendant'], [4, 'outside'], [5, 'outside']
    ]);
  });

  it('SelecaoInexistente_Null', () => {
    expect(core.ctxMenuModel({ nodes, selId: 'x', flat: true, explodeFrom: null, collapseAt: null })).toBeNull();
  });
});

describe('RequestsMarkdown', () => {
  const base = { project: 'Traval', version: '0.25', stamp: '17/10/2026 14:32', mock: 'layers/mock.html', layouts: 1, confirm: false };
  const r1 = {
    id: 'R1', layoutId: 'main', nodeKey: 'k1', path: '.shell > .workspace > .chart-stage > .studies-toolbar',
    text: 'Agrupar TF e Visual à esquerda e levar os chips para a direita.', createdAt: 1,
    name: '.studies-toolbar', depth: 3, uses: 1,
    alvo: 'src/ui/studies.css › .studies-toolbar · L41', caixa: '612×28 px · 1 uso',
    estilos: 'display:flex; gap:6px; padding:4px 12px; background:#353a41'
  };
  const r3 = {
    id: 'R3', layoutId: 'main', nodeKey: 'k3', path: '… > .studies-toolbar > .studies-toolbar-chips > .chip:nth-of-type(1–4)',
    text: 'O chip ativo precisa de contraste maior.', createdAt: 3, name: '.chip.studies-toolbar-chip', depth: 5, uses: 4,
    alvo: 'src/ui/studies.css › .studies-toolbar-chip · L88', caixa: '64×22 px',
    texts: ['EMA 9', 'RSI', 'VWAP', '+'], estilos: 'background:#3f454d; border-radius:3px', pendente: 'border-radius 3px → 999px'
  };
  const lines = (s) => s.split('\n');

  it('RequestsMarkdown_UmaRequest_FormatoDoBoard', () => {
    expect(core.requestsMarkdown({ ...base, requests: [r1] })).toBe([
      '## Requisições Manuais · Traval · 1',
      '<!-- Layers 0.25 · 17/10/2026 14:32 · mock layers/mock.html -->',
      '',
      '### R1 · .studies-toolbar (L3)',
      '- alvo: src/ui/studies.css › .studies-toolbar · L41',
      '- caminho: .shell > .workspace > .chart-stage > .studies-toolbar',
      '- caixa: 612×28 px · 1 uso',
      '- estilos: display:flex; gap:6px; padding:4px 12px; background:#353a41',
      '- pedido: Agrupar TF e Visual à esquerda e levar os chips para a direita.'
    ].join('\n'));
  });

  it('RequestsMarkdown_VariosUsos_MarcaXN', () => {
    const out = core.requestsMarkdown({ ...base, requests: [r1, r3] });
    expect(out).toContain('### R3 · .chip.studies-toolbar-chip (L5) ×4\n');
    expect(out).toContain('### R1 · .studies-toolbar (L3)\n');
    expect(out).toContain('\n\n### R3 ');
    expect(out.startsWith('## Requisições Manuais · Traval · 2\n')).toBe(true);
  });

  it('RequestsMarkdown_BlocoR3_TextosEPendente_Ordem', () => {
    const out = core.requestsMarkdown({ ...base, requests: [r3] });
    expect(lines(out).slice(3)).toEqual([
      '### R3 · .chip.studies-toolbar-chip (L5) ×4',
      '- alvo: src/ui/studies.css › .studies-toolbar-chip · L88',
      '- caminho: … > .studies-toolbar > .studies-toolbar-chips > .chip:nth-of-type(1–4)',
      '- texto: “EMA 9”, “RSI”, “VWAP”, “+”',
      '- caixa: 64×22 px',
      '- estilos: background:#3f454d; border-radius:3px',
      '- ajuste pendente: border-radius 3px → 999px',
      '- pedido: O chip ativo precisa de contraste maior.'
    ]);
  });

  it('RequestsMarkdown_TextoComCercaECrases_NaoQuebra', () => {
    const text = 'Usar `a | b` e "aspas"\n```css\n.x { color: red }\n```\n# titulo\n- item\n\nfim';
    const out = core.requestsMarkdown({ ...base, requests: [{ ...r1, text }] });
    lines(out).forEach((l) => {
      expect(/^(#|```|- )/.test(l)).toBe(l.startsWith('## ') || l.startsWith('### ') || /^- (alvo|caminho|caixa|estilos|pedido): /.test(l));
    });
    expect(out).toContain('- pedido: Usar `a | b` e "aspas"\n    ```css\n    .x { color: red }\n    ```\n    # titulo\n    - item\n    \n    fim');
  });

  it('RequestsMarkdown_PedidoMultilinha_IndentaContinuacao', () => {
    const out = core.requestsMarkdown({ ...base, requests: [{ ...r1, text: 'a\r\nb\rc' }] });
    expect(out.endsWith('- pedido: a\n    b\n    c')).toBe(true);
  });

  it('RequestsMarkdown_TextoLongo_NaoTrunca', () => {
    const text = 'x'.repeat(10240);
    const out = core.requestsMarkdown({ ...base, requests: [{ ...r1, text }] });
    expect(out.endsWith('- pedido: ' + text)).toBe(true);
  });

  it('RequestsMarkdown_NomeComQuebraDeLinha_Colapsa', () => {
    const out = core.requestsMarkdown({ ...base, requests: [{ ...r1, name: 'span\n# x\r\nfim', alvo: 'a\nb' }] });
    expect(lines(out)[3]).toBe('### R1 · span # x fim (L3)');
    expect(out).toContain('\n- alvo: a b\n');
  });

  it('RequestsMarkdown_SemNome_UsaUltimoSegmentoDoCaminho', () => {
    const { name: _n, ...noName } = r1;
    expect(lines(core.requestsMarkdown({ ...base, requests: [noName] }))[3]).toBe('### R1 · .studies-toolbar (L3)');
    const bare = { id: 'R9', layoutId: 'm', nodeKey: 'k', path: '', text: 't', createdAt: 1 };
    const out = core.requestsMarkdown({ ...base, requests: [bare] });
    expect(lines(out).slice(3)).toEqual(['### R9 · R9', '- pedido: t']);
  });

  it('RequestsMarkdown_SemEstilos_OmiteLinha', () => {
    const { estilos: _e, ...noStyle } = r1;
    const out = core.requestsMarkdown({ ...base, requests: [noStyle, { ...r3, id: 'R2', estilos: '', pendente: null, texts: [] }] });
    expect(out).not.toContain('- estilos:');
    expect(out).not.toContain('- ajuste pendente:');
    expect(out).not.toContain('- texto:');
  });

  it('RequestsMarkdown_MultiLayout_IncluiLayout', () => {
    const out = core.requestsMarkdown({ ...base, layouts: 3, requests: [r1, { ...r3, layoutId: 'Tela principal' }] });
    expect(lines(out)[1]).toBe('<!-- Layers 0.25 · 17/10/2026 14:32 · mock layers/mock.html · 3 layouts -->');
    expect(out).toContain('### R1 · .studies-toolbar (L3) · layout: main\n');
    expect(out).toContain('### R3 · .chip.studies-toolbar-chip (L5) ×4 · layout: Tela principal\n');
  });

  it('RequestsMarkdown_Confirm_MarcaAlvoAConfirmar', () => {
    const out = core.requestsMarkdown({ ...base, confirm: true, requests: [r1, r3] });
    const ls = lines(out);
    ls.forEach((l, i) => {
      if (l.startsWith('### ')) expect(ls[i + 1]).toBe('- status: alvo a confirmar');
    });
    expect(out.match(/- status: alvo a confirmar/g)).toHaveLength(2);
    expect(core.requestsMarkdown({ ...base, requests: [r1] })).not.toContain('status:');
  });

  it('RequestsMarkdown_Lista_Vazia_String_Vazia', () => {
    expect(core.requestsMarkdown({ ...base, requests: [] })).toBe('');
    expect(core.requestsMarkdown({ ...base })).toBe('');
  });
});
