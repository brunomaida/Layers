import { describe, it, expect } from 'vitest';
import { toBenchJson } from '../bench/to-bench-json.js';

const raw = {
  files: [{
    filepath: 'bench/core.bench.js',
    groups: [{
      fullName: 'bench/core.bench.js > parseSheet',
      benchmarks: [{ name: 'plain-admin/materialdesignicons', mean: 2.5, sd: 0.1, hz: 400 }],
    }],
  }],
};
const meta = {
  suite: 'layers-core',
  tag: 'micro',
  env: { cpu: 'x' },
  git: { sha: 'abc', dirty: false },
  alloc: { 'parseSheet/plain-admin/materialdesignicons': 1024 },
};

describe('toBenchJson', () => {
  it('Convert_MeanMs_BecomesNs', () => {
    const out = toBenchJson(raw, meta);
    expect(out.schemaVersion).toBe(1);
    expect(out.benchmarks).toEqual([{
      benchId: 'parseSheet/plain-admin/materialdesignicons',
      unit: 'ns',
      value: 2500000,
      stddev: 100000,
      extra: { throughputOpsSec: 400, allocBytesPerOp: 1024 },
    }]);
  });

  it('Convert_NoAlloc_OmitsAllocField', () => {
    const out = toBenchJson(raw, { ...meta, alloc: {} });
    expect(out.benchmarks[0].extra).toEqual({ throughputOpsSec: 400 });
  });

  it('Convert_EmptyRaw_Throws', () => {
    expect(() => toBenchJson({ files: [] }, meta)).toThrow(/no benchmarks/);
  });
});
