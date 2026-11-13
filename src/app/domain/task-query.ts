import { Task } from './task';
import { normalizeText } from './text';

/** Filtro de categoría: todas, sin categoría, o el id de una categoría concreta. */
export type CategoryFilter = 'all' | 'none' | string;

export type StatusFilter = 'all' | 'pending' | 'completed';

export interface TaskQuery {
  category: CategoryFilter;
  status: StatusFilter;
  search: string;
}

export interface TaskCounts {
  all: number;
  pending: number;
  completed: number;
  uncategorized: number;
  byCategory: ReadonlyMap<string, number>;
}

/** `true` si el filtro apunta a una categoría concreta (no "todas" ni "sin categoría"). */
export function isSpecificCategory(filter: CategoryFilter): boolean {
  return filter !== 'all' && filter !== 'none';
}

/**
 * Tareas que cumplen el filtro de categoría, de estado y la búsqueda (sin distinguir
 * mayúsculas ni tildes). Sin filtros devuelve la misma referencia para evitar trabajo.
 */
export function filterTasks(tasks: readonly Task[], query: TaskQuery): readonly Task[] {
  const { category, status } = query;
  const term = normalizeText(query.search.trim());

  if (category === 'all' && status === 'all' && !term) return tasks;

  return tasks.filter(
    (t) =>
      (category === 'all' ||
        (category === 'none' ? t.categoryId === null : t.categoryId === category)) &&
      (status === 'all' || (status === 'completed') === t.completed) &&
      (!term || normalizeText(t.title).includes(term)),
  );
}

/** Contadores calculados en una sola pasada sobre las tareas. */
export function countTasks(tasks: readonly Task[]): TaskCounts {
  const byCategory = new Map<string, number>();
  let completed = 0;
  let uncategorized = 0;
  for (const t of tasks) {
    if (t.completed) completed++;
    if (t.categoryId === null) uncategorized++;
    else byCategory.set(t.categoryId, (byCategory.get(t.categoryId) ?? 0) + 1);
  }
  return {
    all: tasks.length,
    completed,
    pending: tasks.length - completed,
    uncategorized,
    byCategory,
  };
}
