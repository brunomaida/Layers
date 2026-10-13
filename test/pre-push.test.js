import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const hook = path.join(root, '.githooks', 'pre-push');

// The hook is POSIX sh; on Windows use the sh that ships with Git for Windows. Skip when none runs.
const SH = [process.env.SH, 'sh', 'C:/Program Files/Git/usr/bin/sh.exe', 'C:/Program Files/Git/bin/sh.exe']
  .filter(Boolean)
  .find((c) => spawnSync(c, ['-c', 'exit 0']).status === 0);

// An empty global config keeps the hook from delegating to the machine's own global pre-push.
const emptyGlobal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'prepush-')), 'gitconfig');
fs.writeFileSync(emptyGlobal, '');

function run(stdin) {
  const r = spawnSync(SH, [hook, 'origin', 'https://example.invalid/repo.git'], {
    cwd: root,
    input: stdin,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_GLOBAL: emptyGlobal, GIT_CONFIG_SYSTEM: emptyGlobal },
  });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const SHA = '1'.repeat(40);
const ZERO = '0'.repeat(40);

describe.skipIf(!SH)('pre-push destination ref', () => {
  it('Push_FeatureToDevelopRef_Refused', () => {
    const r = run(`refs/heads/feature/x ${SHA} refs/heads/develop ${SHA}\n`);
    expect(r.code).toBe(1);
    expect(r.out).toMatch(/refusing to push to 'develop'/);
  });

  it('Push_FeatureToMasterRef_Refused', () => {
    const r = run(`refs/heads/feature/x ${SHA} refs/heads/master ${SHA}\n`);
    expect(r.code).toBe(1);
  });

  it('Push_FeatureToFeatureRef_Allowed', () => {
    const r = run(`refs/heads/feature/x ${SHA} refs/heads/feature/x ${ZERO}\n`);
    expect(r.code).toBe(0);
  });

  it('Push_DeleteFeatureRef_Allowed', () => {
    const r = run(`(delete) ${ZERO} refs/heads/feature/x ${SHA}\n`);
    expect(r.code).toBe(0);
  });

  it('Push_DeleteDevelopRef_Refused', () => {
    const r = run(`(delete) ${ZERO} refs/heads/develop ${SHA}\n`);
    expect(r.code).toBe(1);
  });
});
