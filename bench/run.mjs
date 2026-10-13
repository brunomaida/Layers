import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { toBenchJson } from './to-bench-json.js';

// shell:true only for `npx` on Windows (a .cmd shim); node.exe lives under "Program Files" and must not go through a shell.
function sh(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: 'utf8', shell: cmd === 'npx' && process.platform === 'win32', maxBuffer: 64 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`${cmd} ${args.join(' ')} exited ${r.status}\n${r.stderr}`);
  return r.stdout;
}

fs.mkdirSync('bench/results', { recursive: true });
sh('npx', ['vitest', 'bench', '--run', '--config', 'vitest.bench.config.js', '--outputJson', 'bench/results/raw.json']);
const raw = JSON.parse(fs.readFileSync('bench/results/raw.json', 'utf8'));
const alloc = JSON.parse(sh(process.execPath, ['--expose-gc', 'bench/alloc.mjs']));

const sha = sh('git', ['rev-parse', 'HEAD']).trim();
const dirty = sh('git', ['status', '--porcelain']).trim().length > 0;
const out = toBenchJson(raw, {
  suite: 'layers-core',
  tag: 'micro',
  env: {
    cpu: os.cpus()[0].model,
    cores: os.cpus().length,
    os: `${os.platform()} ${os.release()}`,
    runtime: `node ${process.version}`,
    gc: 'V8',
    tool: 'vitest-bench/tinybench',
  },
  git: { sha, dirty },
  alloc,
});
const file = `bench/results/${out.timestampUtc.replace(/[:.]/g, '-')}-layers-core.bench.json`;
fs.writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
console.log(`wrote ${file} (${out.benchmarks.length} benchmarks)`);
