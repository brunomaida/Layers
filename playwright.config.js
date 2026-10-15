import { defineConfig } from '@playwright/test';

// S5.7: suite on Chromium; compat spec on every engine; write path also on installed Chrome/Edge
const COMPAT = /browser-compat\.spec\.js$/;
const WRITE = /(browser-compat|apply-flow)\.spec\.js$/;

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  // same path an unnamed project resolved to: screenshot baselines must not move when projects get names
  snapshotPathTemplate: '{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-snapshotSuffix}{ext}',
  use: {
    baseURL: 'http://localhost:5180',
    viewport: { width: 1280, height: 760 },
  },
  projects: [
    // full Chromium (new headless, GPU compositing); the default headless shell rasterizes 3D in software
    { name: 'chromium', use: { browserName: 'chromium', channel: 'chromium' } },
    { name: 'chrome', testMatch: WRITE, use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'msedge', testMatch: WRITE, use: { browserName: 'chromium', channel: 'msedge' } },
    { name: 'firefox', testMatch: COMPAT, use: { browserName: 'firefox' } },
    // Playwright WebKit on Windows: a Safari proxy, not Safari (see the evidence report)
    { name: 'webkit', testMatch: COMPAT, use: { browserName: 'webkit' } },
  ],
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
