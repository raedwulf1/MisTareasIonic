import { defineConfig, devices } from '@playwright/test';

/**
 * Tests end-to-end (caja negra) de la app en el navegador.
 *
 * Levantan `ng serve` en un puerto propio para no chocar con un `npm start` abierto.
 */
const PORT = 4321;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  // Imágenes de referencia de la regresión visual (se versionan; ver e2e/support/test.ts).
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{platform}/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      // Viewport y user agent de móvil: es como se usa la app (Ionic en modo Material Design).
      name: 'mobile-chrome',
      use: { ...devices['Pixel 7'] },
    },
  ],
  webServer: {
    command: `npx ng serve --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env['CI'],
    timeout: 180_000,
  },
});
