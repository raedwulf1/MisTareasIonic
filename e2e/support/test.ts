import { test as base, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { basename, join } from 'node:path';

export { expect };

const SCREENSHOTS_DIR = join(__dirname, '..', 'screenshots');

/** "Agrega una tarea (con Enter)" → "agrega-una-tarea-con-enter" */
function slug(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

/**
 * `test` con una fixture automática: al terminar cada test que pasa, guarda una captura
 * del estado final en `e2e/screenshots/<spec>/<test>.png` y la adjunta al informe HTML.
 * Los tests que fallan ya reciben su captura por `screenshot: 'only-on-failure'`.
 */
export const test = base.extend<{ endStateScreenshot: void }>({
  endStateScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();
      if (testInfo.status !== 'passed' || page.isClosed()) return;

      // Esperar a que terminen las transiciones de Ionic (modal, alert, toast) y a las fuentes.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(
        () =>
          !document.querySelector(
            'ion-modal:not(.overlay-hidden)[class*="show-modal"]:not(.modal-ready), ion-alert.overlay-hidden',
          ),
      );
      await page.waitForTimeout(350);

      const spec = basename(testInfo.file).replace(/\.e2e\.ts$/, '');
      const dir = join(SCREENSHOTS_DIR, spec);
      mkdirSync(dir, { recursive: true });
      const path = join(dir, `${slug(testInfo.titlePath.slice(1).join(' '))}.png`);

      await page.screenshot({
        path,
        animations: 'disabled',
        caret: 'hide',
        // Contenido que cambia en cada ejecución.
        mask: [page.getByText(/Última generación|Última actualización/)],
      });
      await testInfo.attach('estado-final', { path, contentType: 'image/png' });
    },
    { auto: true },
  ],
});
