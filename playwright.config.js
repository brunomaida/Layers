import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5180',
    viewport: { width: 1280, height: 760 },
    browserName: 'chromium',
    // full Chromium (new headless, GPU compositing); the default headless shell rasterizes 3D in software
    channel: 'chromium',
  },
  webServer: {
    command: 'npm run dev -- --strictPort',
    url: 'http://localhost:5180',
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
