import { test as base, expect } from '@playwright/test';
import { basename } from 'node:path';

export { expect };

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
 * `test` con una fixture automática: al terminar cada test, valida el estado final de la
 * pantalla comparándolo con una imagen de referencia (regresión visual).
 *
 * - Las referencias están versionadas en `e2e/__screenshots__/<proyecto>/<plataforma>/<spec>/`.
 * - Si la interfaz cambia a propósito: `npm run test:e2e:update` y revisar el diff de las imágenes.
 * - Si falla, Playwright adjunta al informe la imagen esperada, la obtenida y la diferencia.
 */
export const test = base.extend<{ endStateScreenshot: void }>({
  endStateScreenshot: [
    async ({ page }, use, testInfo) => {
      await use();
      // Si el test ya falló, su propia captura de fallo es suficiente.
      if (testInfo.status !== 'passed' || page.isClosed()) return;

      // Esperar a que terminen las transiciones de Ionic (modal, alert, toast) y a las fuentes.
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(350);

      const spec = basename(testInfo.file).replace(/\.e2e\.ts$/, '');
      const name = slug(testInfo.titlePath.slice(1).join(' '));

      await expect(page).toHaveScreenshot([spec, `${name}.png`], {
        animations: 'disabled',
        caret: 'hide',
        // Tolera diferencias mínimas de suavizado de texto, no cambios de diseño.
        maxDiffPixelRatio: 0.002,
        // Contenido que cambia en cada ejecución.
        mask: [page.getByText(/Última generación|Última actualización/)],
      });
    },
    { auto: true },
  ],
});
