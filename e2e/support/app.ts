import { Locator, Page, expect } from '@playwright/test';

/** Mismas claves que usa la app en `localStorage` (no cambiar: son el formato persistido). */
export const KEYS = {
  tasks: 'todo.tasks.v1',
  categories: 'todo.categories.v1',
  flagOverrides: 'todo.flagOverrides.v1',
} as const;

export interface SeedTask {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  createdAt: number;
}

export interface SeedData {
  tasks?: SeedTask[];
  categories?: { id: string; name: string; color: string }[];
  flagOverrides?: Partial<Record<'categories_enabled', boolean>>;
}

/** Crea tareas de prueba con `createdAt` descendente (la app muestra primero las más nuevas). */
export function tasks(
  ...items: [title: string, categoryId: string | null, completed?: boolean][]
): SeedTask[] {
  const now = Date.now();
  return items.map(([title, categoryId, completed = false], i) => ({
    id: `seed-${i}`,
    title,
    completed,
    categoryId,
    createdAt: now - i * 1000,
  }));
}

/**
 * Precarga `localStorage` antes de que arranque la app.
 * Solo se aplica en la primera carga de la pestaña: así un `reload()` posterior
 * comprueba lo que la app guardó de verdad, no la semilla.
 */
export async function seed(page: Page, data: SeedData): Promise<void> {
  await page.addInitScript(
    ({ data, keys }) => {
      if (sessionStorage.getItem('__e2e_seeded')) return;
      sessionStorage.setItem('__e2e_seeded', '1');
      if (data.tasks) localStorage.setItem(keys.tasks, JSON.stringify(data.tasks));
      if (data.categories) localStorage.setItem(keys.categories, JSON.stringify(data.categories));
      if (data.flagOverrides)
        localStorage.setItem(keys.flagOverrides, JSON.stringify(data.flagOverrides));
    },
    { data, keys: KEYS },
  );
}

/** Página activa de Ionic (las anteriores siguen en el DOM, ocultas). */
export function tasksPage(page: Page): Locator {
  return page.locator('app-tasks');
}
export function categoriesPage(page: Page): Locator {
  return page.locator('app-categories');
}
export function settingsPage(page: Page): Locator {
  return page.locator('app-settings');
}

/** Filas de tarea renderizadas por el scroll virtual. */
export function taskRows(page: Page): Locator {
  return tasksPage(page).locator('app-task-item');
}

export function taskRow(page: Page, title: string): Locator {
  return taskRows(page).filter({ has: page.locator('h2.task-item__title', { hasText: title }) });
}

/** Abre el menú lateral desde la página visible y navega a la opción indicada. */
export async function navigateWithMenu(
  page: Page,
  from: Locator,
  option: 'Tareas' | 'Categorías' | 'Ajustes y feature flags',
): Promise<void> {
  await from.locator('ion-menu-button').click();
  const menu = page.locator('ion-menu');
  await expect(menu).toHaveClass(/show-menu/);
  await menu.locator('ion-item', { hasText: option }).click();
  await expect(menu).not.toHaveClass(/show-menu/);
}

/** Abre las opciones deslizables de un `ion-item-sliding` (equivalente a deslizar a la izquierda). */
export async function openSlidingOptions(sliding: Locator): Promise<void> {
  await sliding.evaluate((el) =>
    (el as HTMLElement & { open(side: string): Promise<void> }).open('end'),
  );
}

/** Confirma la acción destructiva del `ion-alert` visible. */
export async function confirmAlert(
  page: Page,
  header: string | RegExp,
  button = 'Eliminar',
): Promise<void> {
  const alert = page.locator('ion-alert');
  await expect(alert).toBeVisible();
  await expect(alert.locator('.alert-title')).toHaveText(header);
  await alert.getByRole('button', { name: button }).click();
  await expect(alert).toHaveCount(0);
}

/** Espera a que la app vuelque a `localStorage` (las escrituras tienen debounce de 250 ms). */
export async function storedTasks(page: Page): Promise<SeedTask[]> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? '[]'), KEYS.tasks);
}
