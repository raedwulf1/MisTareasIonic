import { expect, test } from './support/test';

import {
  confirmAlert,
  openSlidingOptions,
  seed,
  storedTasks,
  taskRow,
  taskRows,
  tasks,
  tasksPage,
} from './support/app';

test.describe('/tasks: alta y persistencia', () => {
  test('agrega una tarea con Enter y la guarda en localStorage', async ({ page }) => {
    await page.goto('/tasks');
    const input = tasksPage(page).getByRole('textbox', { name: 'Nueva tarea' });
    await input.fill('  Comprar pan  ');
    await input.press('Enter');

    await expect(taskRows(page)).toHaveCount(1);
    await expect(taskRow(page, 'Comprar pan')).toBeVisible();
    await expect(taskRow(page, 'Comprar pan')).toContainText('Sin categoría');
    await expect(input).toHaveValue('');
    await expect(tasksPage(page).locator('.subtitle')).toContainText('1 pendientes · 0 hechas');

    await expect
      .poll(async () => (await storedTasks(page)).map((t) => t.title))
      .toEqual(['Comprar pan']);
    await page.reload();
    await expect(taskRow(page, 'Comprar pan')).toBeVisible();
  });

  test('agrega con el botón y no permite títulos vacíos', async ({ page }) => {
    await page.goto('/tasks');
    const addButton = tasksPage(page).getByRole('button', { name: 'Agregar tarea' });
    await expect(addButton).toBeDisabled();

    await tasksPage(page).getByRole('textbox', { name: 'Nueva tarea' }).fill('   ');
    await expect(addButton).toBeDisabled();

    await tasksPage(page).getByRole('textbox', { name: 'Nueva tarea' }).fill('Llamar al banco');
    await addButton.click();
    await expect(taskRow(page, 'Llamar al banco')).toBeVisible();
  });

  test('asigna la categoría elegida en el selector', async ({ page }) => {
    await page.goto('/tasks');
    await tasksPage(page).getByRole('textbox', { name: 'Nueva tarea' }).fill('Leche');
    await tasksPage(page).locator('ion-select[name="category"]').click();
    await page.locator('ion-popover').getByRole('radio', { name: 'Compras' }).click();
    await tasksPage(page).getByRole('button', { name: 'Agregar tarea' }).click();

    await expect(taskRow(page, 'Leche')).toContainText('Compras');
  });

  test('con un filtro de categoría activo, la nueva tarea hereda esa categoría', async ({
    page,
  }) => {
    await page.goto('/tasks');
    await tasksPage(page).locator('ion-chip', { hasText: 'Trabajo' }).click();
    const input = tasksPage(page).getByRole('textbox', { name: 'Nueva tarea' });
    await input.fill('Informe');
    await input.press('Enter');

    await expect(taskRow(page, 'Informe')).toContainText('Trabajo');
  });
});

test.describe('/tasks: acciones sobre una tarea', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, { tasks: tasks(['Pagar luz', 'personal'], ['Enviar informe', 'trabajo']) });
    await page.goto('/tasks');
    await expect(taskRows(page)).toHaveCount(2);
  });

  test('marca y desmarca como completada', async ({ page }) => {
    const row = taskRow(page, 'Pagar luz');
    await row.getByRole('checkbox', { name: 'Marcar como completada' }).click();
    await expect(row.locator('ion-item')).toHaveClass(/done/);
    await expect(tasksPage(page).locator('.subtitle')).toContainText('1 pendientes · 1 hechas');

    await row.getByRole('checkbox', { name: 'Marcar como pendiente' }).click();
    await expect(row.locator('ion-item')).not.toHaveClass(/done/);
    await expect(tasksPage(page).locator('.subtitle')).toContainText('2 pendientes · 0 hechas');
  });

  test('edita título y categoría desde el modal', async ({ page }) => {
    await taskRow(page, 'Pagar luz').locator('h2.title').click();
    const modal = page.locator('ion-modal app-task-editor');
    await expect(modal.locator('ion-title')).toHaveText('Editar tarea');

    await modal.getByRole('textbox', { name: 'Título' }).fill('Pagar luz y agua');
    await modal.getByRole('radio', { name: 'Compras' }).click();
    await modal.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('ion-modal')).toHaveCount(0);

    await expect(taskRow(page, 'Pagar luz y agua')).toContainText('Compras');
  });

  test('cancelar el modal no cambia la tarea', async ({ page }) => {
    await taskRow(page, 'Pagar luz').locator('h2.title').click();
    const modal = page.locator('ion-modal app-task-editor');
    await modal.getByRole('textbox', { name: 'Título' }).fill('Otro título');
    await modal.getByRole('button', { name: 'Cancelar' }).click();
    await expect(page.locator('ion-modal')).toHaveCount(0);

    await expect(taskRow(page, 'Pagar luz')).toBeVisible();
    await expect(taskRow(page, 'Otro título')).toHaveCount(0);
  });

  test('elimina deslizando y se puede deshacer', async ({ page }) => {
    const row = taskRow(page, 'Pagar luz');
    await openSlidingOptions(row.locator('ion-item-sliding'));
    await row.locator('ion-item-option').click();
    await expect(taskRow(page, 'Pagar luz')).toHaveCount(0);

    const toast = page.locator('ion-toast');
    await expect(toast).toContainText('Tarea eliminada: «Pagar luz»');
    await toast.getByRole('button', { name: 'Deshacer' }).click();

    // Vuelve a su posición original (ordenada por fecha de creación).
    await expect(taskRows(page).locator('h2.title')).toHaveText(['Pagar luz', 'Enviar informe']);
  });
});

test.describe('/tasks: filtros y búsqueda', () => {
  test.beforeEach(async ({ page }) => {
    await seed(page, {
      tasks: tasks(
        ['Café con Ana', 'personal'],
        ['Reunión semanal', 'trabajo', true],
        ['Comprar fruta', 'compras'],
        ['Ordenar escritorio', null, true],
      ),
    });
    await page.goto('/tasks');
    await expect(taskRows(page)).toHaveCount(4);
  });

  const titles = (page: import('@playwright/test').Page) => taskRows(page).locator('h2.title');

  test('filtra por categoría y por "Sin categoría"', async ({ page }) => {
    const chips = tasksPage(page).locator('ion-chip');
    await expect(chips.filter({ hasText: 'Todas' }).locator('ion-badge')).toHaveText('4');
    await expect(chips.filter({ hasText: 'Trabajo' }).locator('ion-badge')).toHaveText('1');
    await expect(chips.filter({ hasText: 'Sin categoría' }).locator('ion-badge')).toHaveText('1');

    await chips.filter({ hasText: 'Trabajo' }).click();
    await expect(titles(page)).toHaveText(['Reunión semanal']);

    await chips.filter({ hasText: 'Sin categoría' }).click();
    await expect(titles(page)).toHaveText(['Ordenar escritorio']);

    await chips.filter({ hasText: 'Todas' }).click();
    await expect(titles(page)).toHaveCount(4);
  });

  test('filtra por estado', async ({ page }) => {
    const segment = tasksPage(page).locator('ion-segment');
    await segment.locator('ion-segment-button[value="pending"]').click();
    await expect(titles(page)).toHaveText(['Café con Ana', 'Comprar fruta']);

    await segment.locator('ion-segment-button[value="completed"]').click();
    await expect(titles(page)).toHaveText(['Reunión semanal', 'Ordenar escritorio']);

    await segment.locator('ion-segment-button[value="all"]').click();
    await expect(titles(page)).toHaveCount(4);
  });

  test('busca sin distinguir mayúsculas ni tildes', async ({ page }) => {
    const search = tasksPage(page).locator('ion-searchbar input');
    await search.fill('CAFE');
    await expect(titles(page)).toHaveText(['Café con Ana']);

    await search.fill('reunion');
    await expect(titles(page)).toHaveText(['Reunión semanal']);

    await search.fill('xyz');
    await expect(
      tasksPage(page).getByText('Ninguna tarea coincide con la búsqueda.'),
    ).toBeVisible();
  });

  test('combina filtros y muestra el mensaje de vacío', async ({ page }) => {
    await tasksPage(page).locator('ion-chip', { hasText: 'Personal' }).click();
    await tasksPage(page).locator('ion-segment-button[value="completed"]').click();
    await expect(tasksPage(page).getByText('No hay tareas con este filtro.')).toBeVisible();
  });

  test('elimina las completadas tras confirmar', async ({ page }) => {
    await tasksPage(page).getByRole('button', { name: 'Eliminar tareas completadas' }).click();
    await confirmAlert(page, 'Eliminar completadas');

    await expect(titles(page)).toHaveText(['Café con Ana', 'Comprar fruta']);
    await expect(
      tasksPage(page).getByRole('button', { name: 'Eliminar tareas completadas' }),
    ).toBeDisabled();
  });
});

test.describe('/tasks con el flag de categorías apagado', () => {
  test('oculta chips, selector y etiquetas de categoría y crea tareas sin categoría', async ({
    page,
  }) => {
    await seed(page, {
      flagOverrides: { categories_enabled: false },
      tasks: tasks(['Tarea con categoría', 'trabajo']),
    });
    await page.goto('/tasks');

    await expect(tasksPage(page).locator('.chips')).toHaveCount(0);
    await expect(tasksPage(page).locator('ion-select[name="category"]')).toHaveCount(0);
    await expect(taskRow(page, 'Tarea con categoría').locator('.category')).toHaveCount(0);

    const input = tasksPage(page).getByRole('textbox', { name: 'Nueva tarea' });
    await input.fill('Sin categoría forzada');
    await input.press('Enter');
    await expect
      .poll(async () => (await storedTasks(page)).find((t) => t.title === 'Sin categoría forzada'))
      .toMatchObject({ categoryId: null });
  });
});
