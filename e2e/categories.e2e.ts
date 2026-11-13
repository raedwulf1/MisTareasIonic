import { expect, test } from './support/test';

import {
  categoriesPage,
  confirmAlert,
  openSlidingOptions,
  seed,
  storedTasks,
  taskRow,
  tasks,
  tasksPage,
} from './support/app';

test.describe('/categories', () => {
  test('lista las categorías por defecto con su número de tareas', async ({ page }) => {
    await seed(page, { tasks: tasks(['A', 'trabajo'], ['B', 'trabajo'], ['C', 'personal']) });

    await page.goto('/categories');

    const items = categoriesPage(page).locator('ion-item-sliding');
    await expect(items.locator('h2')).toHaveText(['Personal', 'Trabajo', 'Compras']);
    await expect(items.filter({ hasText: 'Trabajo' }).locator('p')).toHaveText('2 tarea(s)');
    await expect(items.filter({ hasText: 'Compras' }).locator('p')).toHaveText('0 tarea(s)');
  });

  test('crea una categoría nueva con color', async ({ page }) => {
    await page.goto('/categories');
    await categoriesPage(page).getByRole('button', { name: 'Nueva categoría' }).click();
    const modal = page.locator('ion-modal app-category-editor');
    await expect(modal.locator('ion-title')).toHaveText('Nueva');

    await modal.getByRole('textbox', { name: 'Nombre' }).fill('Salud');
    await modal.getByRole('radio', { name: 'Color #eb445a' }).click();
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('ion-modal')).toHaveCount(0);

    const created = categoriesPage(page).locator('ion-item-sliding', { hasText: 'Salud' });
    await expect(created).toBeVisible();
    await expect(created.locator('.categories-page__dot')).toHaveCSS(
      'background-color',
      'rgb(235, 68, 90)',
    );
    // También aparece como filtro en la lista de tareas.
    await page.goto('/tasks');
    await expect(tasksPage(page).locator('ion-chip', { hasText: 'Salud' })).toBeVisible();
  });

  test('no permite nombres duplicados (sin distinguir mayúsculas ni tildes)', async ({ page }) => {
    await page.goto('/categories');
    await categoriesPage(page).getByRole('button', { name: 'Nueva categoría' }).click();
    const modal = page.locator('ion-modal app-category-editor');

    await modal.getByRole('textbox', { name: 'Nombre' }).fill('  PERSONAL ');

    await expect(modal.getByText('Ya existe una categoría con ese nombre.')).toBeVisible();
    await expect(modal.getByRole('button', { name: 'Guardar' })).toBeDisabled();

    await modal.getByRole('button', { name: 'Cancelar' }).click();

    await expect(categoriesPage(page).locator('ion-item-sliding')).toHaveCount(3);
  });

  test('edita el nombre de una categoría', async ({ page }) => {
    await seed(page, { tasks: tasks(['Hacer la compra', 'compras']) });
    await page.goto('/categories');
    await categoriesPage(page).locator('ion-item', { hasText: 'Compras' }).locator('h2').click();
    const modal = page.locator('ion-modal app-category-editor');
    await expect(modal.locator('ion-title')).toHaveText('Editar');

    await modal.getByRole('textbox', { name: 'Nombre' }).fill('Supermercado');
    await modal.getByRole('button', { name: 'Guardar' }).click();

    await expect(categoriesPage(page).locator('h2')).toHaveText([
      'Personal',
      'Trabajo',
      'Supermercado',
    ]);
    await page.goto('/tasks');
    await expect(taskRow(page, 'Hacer la compra')).toContainText('Supermercado');
  });

  test('elimina una categoría y sus tareas quedan sin categoría', async ({ page }) => {
    await seed(page, { tasks: tasks(['Preparar demo', 'trabajo']) });
    await page.goto('/categories');
    const item = categoriesPage(page).locator('ion-item-sliding', { hasText: 'Trabajo' });

    await openSlidingOptions(item);
    await item.locator('ion-item-option[color="danger"]').click();
    await confirmAlert(page, 'Eliminar «Trabajo»');

    await expect(categoriesPage(page).locator('h2')).toHaveText(['Personal', 'Compras']);
    await expect
      .poll(async () => (await storedTasks(page)).find((t) => t.title === 'Preparar demo'))
      .toMatchObject({ categoryId: null });
    await page.goto('/tasks');
    await expect(taskRow(page, 'Preparar demo')).toContainText('Sin categoría');
  });

  test('cancelar la eliminación mantiene la categoría', async ({ page }) => {
    await page.goto('/categories');
    const item = categoriesPage(page).locator('ion-item-sliding', { hasText: 'Personal' });

    await openSlidingOptions(item);
    await item.locator('ion-item-option[color="danger"]').click();
    await confirmAlert(page, 'Eliminar «Personal»', 'Cancelar');

    await expect(categoriesPage(page).locator('ion-item-sliding')).toHaveCount(3);
  });

  test('muestra el estado vacío si no hay categorías', async ({ page }) => {
    await seed(page, { categories: [] });

    await page.goto('/categories');

    await expect(
      categoriesPage(page).getByText('No hay categorías. Crea una con el botón +.'),
    ).toBeVisible();
  });
});
