import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:3000',
    viewport: { width: 390, height: 844 },
    isMobile: false,
    hasTouch: true,
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'mobile-chromium',
      use: { browserName: 'chromium' },
    },
  ],
})