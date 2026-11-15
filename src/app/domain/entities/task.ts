import { Category } from './category';

/** Una tarea de la lista. `categoryId` es `null` cuando no tiene categoría. */
export interface Task {
  readonly id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  /** Epoch en milisegundos; se usa para ordenar sin parsear fechas. */
  createdAt: number;
}

export type TaskChanges = Partial<Pick<Task, 'title' | 'categoryId' | 'completed'>>;

export interface NewTask {
  id: string;
  title: string;
  categoryId: string | null;
  createdAt: number;
}

/** Crea una tarea pendiente con el título recortado; devuelve `null` si el título queda vacío. */
export function createTask({ id, title, categoryId, createdAt }: NewTask): Task | null {
  const clean = title.trim();
  if (!clean) return null;
  return { id, title: clean, completed: false, categoryId, createdAt };
}

/** Aplica cambios recortando el título; un título vacío conserva el anterior. */
export function applyTaskChanges(task: Task, changes: TaskChanges): Task {
  return { ...task, ...changes, title: (changes.title ?? task.title).trim() || task.title };
}

export function toggleCompleted(task: Task): Task {
  return { ...task, completed: !task.completed };
}

/**
 * Inserta una tarea respetando el orden de la lista (más nuevas primero), por ejemplo
 * al deshacer un borrado.
 */
export function insertByCreationDate(tasks: readonly Task[], task: Task): Task[] {
  const next = [...tasks];
  const index = next.findIndex((t) => t.createdAt < task.createdAt);
  next.splice(index === -1 ? next.length : index, 0, task);
  return next;
}

/** Quita la categoría de las tareas que la tenían asignada (sin borrar las tareas). */
export function unassignCategory(tasks: readonly Task[], categoryId: string): readonly Task[] {
  if (!tasks.some((t) => t.categoryId === categoryId)) return tasks;
  return tasks.map((t) => (t.categoryId === categoryId ? { ...t, categoryId: null } : t));
}

/** Genera tareas de prueba (ordenadas de más nueva a más antigua) repartidas entre las categorías. */
export function buildDemoTasks(
  amount: number,
  categories: readonly Category[],
  now: number,
  newId: () => string,
): Task[] {
  return Array.from({ length: amount }, (_, i) => ({
    id: newId() + i,
    title: `Tarea de prueba #${i + 1}`,
    completed: i % 3 === 0,
    categoryId: categories.length && i % 4 !== 0 ? categories[i % categories.length].id : null,
    createdAt: now - i,
  }));
}
