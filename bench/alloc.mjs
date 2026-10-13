// Per-op allocation probe. Run with `node --expose-gc bench/alloc.mjs`; prints { benchId: bytesPerOp }.
// Node has no [MemoryDiagnoser]: this is a heapUsed delta over N calls after a forced GC, comparable
// only on the same machine and Node version.
import { core } from '../test/setup.js';
import { loadWorkloads } from './workloads.js';

if (typeof global.gc !== 'function') throw new Error('run with node --expose-gc');
const w = loadWorkloads();
const N = 10;
const ROUNDS = 7;

// Median of ROUNDS rounds: a single heapUsed delta swings 2x run to run (young-gen scavenges).
function probe(fn) {
  fn();
  const samples = [];
  for (let r = 0; r < ROUNDS; r++) {
    global.gc();
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < N; i++) fn();
    const after = process.memoryUsage().heapUsed;
    samples.push(Math.max(0, Math.round((after - before) / N)));
  }
  samples.sort((a, b) => a - b);
  return samples[Math.floor(ROUNDS / 2)];
}

const out = {};
for (const c of w.css) {
  out[`parseSheet/${c.id}`] = probe(() => core.parseSheet(c.file, c.text, 0));
  out[`scopeAst/${c.id}`] = probe(() => core.scopeAst(c.text));
}
out['buildIndex/traval/4-sheets'] = probe(() => core.buildIndex(w.travalSheets));
out['mapDcTemplate/dc-template/index'] = probe(() => core.mapDcTemplate(w.dcText));
process.stdout.write(JSON.stringify(out));
