// lib/layers-core.js e um script classico que le a global `csstree` — no navegador ela vem de
// vendor/csstree.js, aqui do pacote. Instalar a global antes do import mantem o mesmo contrato
// nos dois ambientes, sem um caminho de carga so para teste.
import * as csstree from 'css-tree';

globalThis.csstree = csstree;

await import('../lib/layers-core.js');

export const core = globalThis.LayersCore;
