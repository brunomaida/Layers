// Converts `vitest bench --outputJson` into the *.bench.json schema read by ~/.claude bench-report.
export function toBenchJson(raw, meta) {
  const benchmarks = [];
  for (const file of raw.files || []) {
    for (const group of file.groups || []) {
      const groupName = group.fullName.split(' > ').pop();
      for (const b of group.benchmarks || []) {
        const benchId = `${groupName}/${b.name}`;
        const extra = { throughputOpsSec: b.hz };
        if (meta.alloc && meta.alloc[benchId] !== undefined) extra.allocBytesPerOp = meta.alloc[benchId];
        benchmarks.push({ benchId, unit: 'ns', value: b.mean * 1e6, stddev: b.sd * 1e6, extra });
      }
    }
  }
  if (benchmarks.length === 0) throw new Error('no benchmarks found in raw output');
  return {
    schemaVersion: 1,
    suite: meta.suite,
    tag: meta.tag,
    timestampUtc: new Date().toISOString(),
    env: meta.env,
    git: meta.git,
    benchmarks,
  };
}
