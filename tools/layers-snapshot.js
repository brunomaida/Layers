// LAYERS · snapshot do DOM renderizado → layers/mock.html
// Uso: abra o app no navegador (Chrome/Edge), F12 › Console, cole este arquivo inteiro e Enter.
// Baixa "mock.html" com o <body> atual (sem scripts) + todo o CSS carregado (mesma origem) inline.
// Coloque em <projeto>/layers/mock.html e aponte layers.json › "mock" para ele.
(() => {
  const css = [];
  for (const sh of document.styleSheets) {
    try { css.push('/* ' + (sh.href || 'inline') + ' */\n' + [...sh.cssRules].map(r => r.cssText).join('\n')); }
    catch (e) { css.push('/* NÃO LIDO (cross-origin): ' + sh.href + ' — copie a folha para a pasta do projeto e liste em layers.json › styles */'); }
  }
  const body = document.body.cloneNode(true);
  body.querySelectorAll('script, noscript, template, iframe, link, style').forEach(e => e.remove());
  body.querySelectorAll('*').forEach(e => { [...e.attributes].forEach(a => { if (/^on/i.test(a.name)) e.removeAttribute(a.name); }); });
  // preserva estado de formulário (value/checked) como atributo, já que o JS não roda no mock
  body.querySelectorAll('input, textarea, select').forEach((e, i) => {
    const live = document.querySelectorAll('input, textarea, select')[i]; if (!live) return;
    if (live.type === 'checkbox' || live.type === 'radio') { if (live.checked) e.setAttribute('checked', ''); else e.removeAttribute('checked'); }
    else if (live.tagName === 'SELECT') { [...e.options].forEach((o, k) => { if (live.options[k] && live.options[k].selected) o.setAttribute('selected', ''); }); }
    else if (live.value != null) e.setAttribute('value', live.value);
  });
  // <details>, <dialog> e [hidden] mantêm o estado atual via atributos — já vem no clone
  const html = '<!doctype html>\n<!-- snapshot LAYERS · ' + location.href + ' · ' + new Date().toISOString() + ' · viewport ' + innerWidth + '×' + document.documentElement.scrollHeight + ' -->\n'
    + '<html lang="' + (document.documentElement.lang || 'pt-BR') + '"><head><meta charset="utf-8"><title>' + document.title + ' · mock LAYERS</title>\n<style>\n' + css.join('\n\n') + '\n</style></head>\n'
    + '<body' + (document.body.className ? ' class="' + document.body.className + '"' : '') + '>\n' + body.innerHTML + '\n</body></html>\n';
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = 'mock.html'; a.click();
  console.log('LAYERS snapshot: ' + html.length + ' chars · sugerido em layers.json: "viewport": {"width": ' + innerWidth + ', "height": ' + document.documentElement.scrollHeight + '}');
})();
