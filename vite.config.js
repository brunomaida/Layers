// Vite aqui e so dev server (ver CLAUDE.md): o app nao e buildado.
//
// Sem esta config o modo fixture le JavaScript em vez de CSS. Vite trata todo .css
// como modulo e responde /fixtures/**/*.css com text/javascript envolvendo o CSS num
// wrapper de HMR — entao readText() recebia o wrapper, o parser achava 2 regras num
// arquivo de 21 KB e nenhuma variavel do projeto aplicava. As fixtures nao sao fonte
// do app: sao dados de teste que precisam chegar ao loader byte a byte, como chegariam
// pela File System Access API numa pasta conectada.
import fs from 'node:fs';
import path from 'node:path';

const MIME = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.js': 'text/plain',      // fixture, nao modulo: nunca executado pelo editor
  '.ts': 'text/plain',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
};

function serveFixturesRaw() {
  return {
    name: 'layers-fixtures-raw',
    configureServer(server) {
      // registrado direto (nao dentro de um return) para rodar antes do pipeline do Vite
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith('/fixtures/')) return next();
        const file = path.join(server.config.root, decodeURIComponent(url));
        const root = path.join(server.config.root, 'fixtures');
        if (!path.resolve(file).startsWith(path.resolve(root))) return next();
        let data;
        // 404 explicito: cair no next() faria o fallback de SPA do Vite devolver o index.html
        // do proprio editor, e o loader parsearia o LAYERS como se fosse o mock do projeto.
        try { data = fs.readFileSync(file); }
        catch { res.statusCode = 404; res.end('not found: ' + url); return; }
        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(data);
      });
    },
  };
}

// ?project=<pasta> (aberto pelo Atlas): serve a pasta do projeto crua, same-origin, sem cache. So pasta com
// layers.json na raiz; caminho validado por LayersCore.projectRequest (safePath) e contido na pasta; 404 explicito
// (o fallback de SPA devolveria o index.html do editor). Nenhuma escrita: o modo fixture ja recusa gravar.
function serveProjectRaw() {
  return {
    name: 'layers-project-raw',
    async configureServer(server) {
      await import('./lib/layers-core.js'); // script classico: publica globalThis.LayersCore (csstree so e lido sob demanda)
      const core = globalThis.LayersCore;
      server.middlewares.use((req, res, next) => {
        const url = (req.url || '').split('?')[0];
        if (!url.startsWith('/@project/')) return next();
        const deny = (why) => { res.statusCode = 404; res.end('not found: ' + why); };
        const r = core.projectRequest(url);
        if (!r) return deny(url);
        const root = path.resolve(r.dir);
        if (!fs.existsSync(path.join(root, 'layers.json'))) return deny('sem layers.json em ' + root);
        const file = path.resolve(root, r.rel);
        if (!file.startsWith(root + path.sep)) return deny(url);
        let data;
        try { data = fs.readFileSync(file); } catch { return deny(url); }
        res.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.end(data);
      });
    },
  };
}

// makeDraft grava <arquivo>.design-draft.<ext> na raiz servida e approve grava .design-history/,
// .bak e .tmp: sem ignorar, o Vite recarrega o editor no meio da edicao (o rascunho de um alvo
// .html cai na raiz). O plugin so e lido no start do Vite: reinicie o dev server ao mudar isto.
export default {
  plugins: [serveFixturesRaw(), serveProjectRaw()],
  server: { watch: { ignored: ['**/.design-history/**', '**/*.bak', '**/*.tmp', '**/*.design-draft.*'] } },
};
