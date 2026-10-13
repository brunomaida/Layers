import { defineConfig } from 'vitest/config';

// Isolated from vite.config.js (which serves fixtures for the dev server): benchmarks only.
export default defineConfig({
  test: {
    include: [],
    benchmark: { include: ['bench/**/*.bench.js'] },
  },
});
