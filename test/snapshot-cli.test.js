import { describe, it, expect } from 'vitest';
import { checkSnapshotUrl, parseSnapshotArgs } from '../tools/layers-snapshot-cli.mjs';

describe('CheckSnapshotUrl', () => {
  it('LocalhostHttpComPorta_Aceita', () => {
    expect(checkSnapshotUrl('http://localhost:5173/')).toEqual({ ok: true, url: 'http://localhost:5173/' });
    expect(checkSnapshotUrl('http://127.0.0.1:4173/app')).toEqual({ ok: true, url: 'http://127.0.0.1:4173/app' });
    expect(checkSnapshotUrl('http://[::1]:3000/').ok).toBe(true);
  });

  it('HostExternoOuHttps_Recusa', () => {
    expect(checkSnapshotUrl('http://example.com/').ok).toBe(false);
    expect(checkSnapshotUrl('https://localhost:5173/').ok).toBe(false);
    expect(checkSnapshotUrl('http://localhost.evil.com:5173/').ok).toBe(false);
    expect(checkSnapshotUrl('file:///C:/x.html').ok).toBe(false);
  });

  it('UserinfoPontoFinalEPortaComZero_NaoBurlam', () => {
    expect(checkSnapshotUrl('http://localhost@evil.com/').ok).toBe(false);
    expect(checkSnapshotUrl('http://localhost.:3000/').ok).toBe(false);
    expect(checkSnapshotUrl('http://localhost:05180/').ok).toBe(false);
  });

  it('PortaDoEditor5180_Recusa', () => {
    const r = checkSnapshotUrl('http://localhost:5180/');
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/5180/);
  });

  it('UrlInvalidaOuVazia_Recusa', () => {
    expect(checkSnapshotUrl('').ok).toBe(false);
    expect(checkSnapshotUrl('nao e url').ok).toBe(false);
    expect(checkSnapshotUrl(undefined).ok).toBe(false);
  });
});

describe('ParseSnapshotArgs', () => {
  it('UrlESaida_UsaViewportPadrao', () => {
    const a = parseSnapshotArgs(['http://localhost:5173/', 'C:/p/layers/mock.html']);
    expect(a).toMatchObject({ url: 'http://localhost:5173/', out: 'C:/p/layers/mock.html', width: 1280, height: 760, waitMs: 2500 });
  });

  it('ViewportEEspera_Opcionais', () => {
    const a = parseSnapshotArgs(['http://localhost:5173/', 'o.html', '--viewport', '1440x900', '--wait', '4000']);
    expect(a).toMatchObject({ width: 1440, height: 900, waitMs: 4000 });
  });

  it('FaltaSaida_DevolveErro', () => {
    expect(parseSnapshotArgs(['http://localhost:5173/']).error).toMatch(/uso/i);
  });

  it('ViewportMalFormado_DevolveErro', () => {
    expect(parseSnapshotArgs(['http://localhost:5173/', 'o.html', '--viewport', 'grande']).error).toMatch(/viewport/i);
  });

  it('SaidaQueNaoEHtml_DevolveErro', () => {
    expect(parseSnapshotArgs(['http://localhost:5173/', 'saida.txt']).error).toMatch(/\.html/);
  });
});
