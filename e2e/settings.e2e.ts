import { expect, test } from './support/test';

import {
  KEYS,
  categoriesPage,
  confirmAlert,
  navigateWithMenu,
  seed,
  settingsPage,
  tasks,
  tasksPage,
} from './support/app';

test.describe('/settings: feature flag categories_enabled', () => {
  test('en el navegador Remote Config no está disponible y se usa el valor por defecto', async ({
    page,
  }) => {
    await page.goto('/settings');
    const settings = settingsPage(page);
    await expect(
      settings.getByText('No disponible en el navegador: se usan valores por defecto.'),
    ).toBeVisible();
    await expect(settings.getByRole('button', { name: 'Actualizar' })).toBeDisabled();
    await expect(
      settings.locator('h2', { hasText: 'categories_enabled' }).locator('ion-badge'),
    ).toHaveText('ON');
    await expect(settings.getByText('Origen: Valor por defecto')).toBeVisible();
  });

  test('forzar OFF desactiva las categorías en toda la app y se recuerda al recargar', async ({
    page,
  }) => {
    await page.goto('/settings');
    const settings = settingsPage(page);
    await settings.locator('ion-segment-button[value="off"]').click();

    await expect(
      settings.locator('h2', { hasText: 'categories_enabled' }).locator('ion-badge'),
    ).toHaveText('OFF');
    await expect(settings.getByText('Origen: Forzado localmente')).toBeVisible();
    await expect
      .poll(() => page.evaluate((key) => localStorage.getItem(key), KEYS.flagOverrides))
      .toBe('{"categories_enabled":false}');

    await navigateWithMenu(page, settings, 'Tareas');
    await expect(tasksPage(page).locator('.tasks-page__chips')).toHaveCount(0);

    await page.goto('/categories');
    await expect(page).toHaveURL(/\/tasks$/);

    await page.goto('/settings');
    await expect(settingsPage(page).locator('ion-segment-button[value="off"]')).toHaveClass(
      /segment-button-checked/,
    );
  });

  test('volver a "Remoto" quita el override', async ({ page }) => {
    await seed(page, { flagOverrides: { categories_enabled: false } });
    await page.goto('/settings');
    const settings = settingsPage(page);
    await expect(settings.getByText('Origen: Forzado localmente')).toBeVisible();

    await settings.locator('ion-segment-button[value="remote"]').click();
    await expect(settings.getByText('Origen: Valor por defecto')).toBeVisible();
    await expect(
      settings.locator('h2', { hasText: 'categories_enabled' }).locator('ion-badge'),
    ).toHaveText('ON');

    await page.goto('/categories');
    await expect(categoriesPage(page)).toBeVisible();
  });

  test('forzar OFF después de haber visitado /categories mantiene al usuario en Ajustes', async ({
    page,
  }) => {
    await page.goto('/categories');
    await navigateWithMenu(page, categoriesPage(page), 'Ajustes y feature flags');
    await settingsPage(page).locator('ion-segment-button[value="off"]').click();

    await expect(settingsPage(page).getByText('Origen: Forzado localmente')).toBeVisible();
    await expect(page).toHaveURL(/\/settings$/);
  });
});

test.describe('/settings: prueba de rendimiento', () => {
  test('genera 1.000 tareas y se muestran en la lista', async ({ page }) => {
    await page.goto('/settings');
    const settings = settingsPage(page);
    await settings.locator('ion-item', { hasText: 'Generar 1.000 tareas' }).click();

    await expect(page.locator('ion-toast')).toContainText(/Se generaron 1[.,]?000 tareas/);
    await expect(settings.getByText('1,000 en total')).toBeVisible();
    await expect(settings.getByText(/Última generación: \d+ ms/)).toBeVisible();

    await navigateWithMenu(page, settings, 'Tareas');
    await expect(
      tasksPage(page).locator('ion-chip', { hasText: 'Todas' }).locator('ion-badge'),
    ).toHaveText('1000');
    // Scroll virtual: solo se pinta una parte de las filas.
    const rendered = await tasksPage(page).locator('app-task-item').count();
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(100);
  });

  test('elimina todas las tareas tras confirmar', async ({ page }) => {
    await seed(page, { tasks: tasks(['Uno', null], ['Dos', 'personal']) });
    await page.goto('/settings');
    const settings = settingsPage(page);
    await expect(settings.getByText('2 en total')).toBeVisible();

    await settings.locator('ion-item', { hasText: 'Eliminar todas las tareas' }).click();
    await confirmAlert(page, 'Eliminar todas las tareas');

    await expect(settings.getByText('0 en total')).toBeVisible();
    await expect(
      settings.locator('ion-item', { hasText: 'Eliminar todas las tareas' }),
    ).toHaveAttribute('aria-disabled', 'true');
  });
});
