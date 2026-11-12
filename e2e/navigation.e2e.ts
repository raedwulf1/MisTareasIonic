import { expect, test } from './support/test';

import { categoriesPage, navigateWithMenu, seed, settingsPage, tasksPage } from './support/app';

/**
 * Rutas de app.routes.ts:
 *   ''            → redirige a /tasks
 *   /tasks        → TasksPage
 *   /categories   → CategoriesPage (protegida por el flag `categories_enabled`)
 *   /settings     → SettingsPage
 *   **            → redirige a /tasks
 */
test.describe('Rutas', () => {
  test('la raíz redirige a /tasks', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(tasksPage(page).locator('ion-title')).toContainText('Tareas');
  });

  // Un solo segmento: index.html usa `<base href="./">` (necesario para Cordova/file://),
  // así que en el navegador una URL anidada como /a/b no llegaría a cargar los scripts.
  test('una ruta desconocida redirige a /tasks', async ({ page }) => {
    await page.goto('/no-existe');
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(tasksPage(page)).toBeVisible();
  });

  test('/tasks se carga directamente', async ({ page }) => {
    await page.goto('/tasks');
    await expect(tasksPage(page)).toBeVisible();
    await expect(tasksPage(page).getByText('Aún no tienes tareas')).toBeVisible();
  });

  test('/categories se carga directamente con el flag activo', async ({ page }) => {
    await page.goto('/categories');
    await expect(page).toHaveURL(/\/categories$/);
    await expect(categoriesPage(page).locator('ion-title')).toHaveText('Categorías');
  });

  test('/settings se carga directamente', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(settingsPage(page).locator('ion-title')).toHaveText('Ajustes');
  });

  test('/categories redirige a /tasks si el flag está apagado', async ({ page }) => {
    await seed(page, { flagOverrides: { categories_enabled: false } });
    await page.goto('/categories');
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(tasksPage(page)).toBeVisible();
    await expect(categoriesPage(page)).toHaveCount(0);
  });
});

test.describe('Menú lateral', () => {
  test('navega a cada pantalla', async ({ page }) => {
    await page.goto('/tasks');

    await navigateWithMenu(page, tasksPage(page), 'Categorías');
    await expect(page).toHaveURL(/\/categories$/);
    await expect(categoriesPage(page)).toBeVisible();

    await navigateWithMenu(page, categoriesPage(page), 'Ajustes y feature flags');
    await expect(page).toHaveURL(/\/settings$/);
    await expect(settingsPage(page)).toBeVisible();

    await navigateWithMenu(page, settingsPage(page), 'Tareas');
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(tasksPage(page)).toBeVisible();
  });

  test('muestra los contadores de pendientes y de categorías', async ({ page }) => {
    await page.goto('/tasks');
    const menu = page.locator('ion-menu');
    await expect(menu.locator('ion-item', { hasText: 'Tareas' }).locator('ion-badge')).toHaveText(
      '0',
    );
    await expect(
      menu.locator('ion-item', { hasText: 'Categorías' }).locator('ion-badge'),
    ).toHaveText('3');
  });

  test('oculta "Categorías" si el flag está apagado', async ({ page }) => {
    await seed(page, { flagOverrides: { categories_enabled: false } });
    await page.goto('/tasks');
    await tasksPage(page).locator('ion-menu-button').click();
    const menu = page.locator('ion-menu');
    await expect(menu.locator('ion-item', { hasText: 'Tareas' })).toBeVisible();
    await expect(menu.locator('ion-item', { hasText: 'Ajustes y feature flags' })).toBeVisible();
    await expect(menu.locator('ion-item', { hasText: 'Categorías' })).toHaveCount(0);
  });
});

test.describe('Enlaces entre pantallas', () => {
  test('el chip "+ Categoría" de la lista lleva a /categories', async ({ page }) => {
    await page.goto('/tasks');
    await tasksPage(page).getByLabel('Gestionar categorías').click();
    await expect(page).toHaveURL(/\/categories$/);
    await expect(categoriesPage(page)).toBeVisible();
  });

  test('el embudo de una categoría lleva a /tasks filtrado por ella', async ({ page }) => {
    await page.goto('/categories');
    await categoriesPage(page)
      .locator('ion-item', { hasText: 'Trabajo' })
      .getByLabel('Ver tareas de esta categoría')
      .click();
    await expect(page).toHaveURL(/\/tasks$/);
    await expect(tasksPage(page).locator('ion-chip.active')).toContainText('Trabajo');
  });
});
