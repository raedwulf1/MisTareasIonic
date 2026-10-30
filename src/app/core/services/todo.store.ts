import { Injectable, computed, effect, inject, signal } from '@angular/core';

import {
  CATEGORY_COLORS,
  Category,
  CategoryFilter,
  StatusFilter,
  Task,
  createId,
} from '../models/todo.models';
import { FeatureFlagsService } from './feature-flags.service';
import { StorageService } from './storage.service';

const TASKS_KEY = 'todo.tasks.v1';
const CATEGORIES_KEY = 'todo.categories.v1';

export interface TaskCounts {
  all: number;
  pending: number;
  completed: number;
  uncategorized: number;
  byCategory: ReadonlyMap<string, number>;
}

/**
 * Estado de la app (tareas, categorías y filtros) basado en signals.
 *
 * - El estado es inmutable: cada cambio crea un array nuevo, lo que permite usar
 *   `OnPush` en todos los componentes.
 * - Lo derivado (lista filtrada, contadores, índice de categorías) se calcula con
 *   `computed`, que memoriza el resultado y solo se recalcula cuando cambia una dependencia.
 * - La persistencia se hace con un `effect` que delega en `StorageService` (escrituras agrupadas).
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly storage = inject(StorageService);
  private readonly flags = inject(FeatureFlagsService);

  private readonly _tasks = signal<readonly Task[]>(this.storage.read<Task[]>(TASKS_KEY, []));
  private readonly _categories = signal<readonly Category[]>(
    this.storage.read<Category[]>(CATEGORIES_KEY, defaultCategories()),
  );

  readonly tasks = this._tasks.asReadonly();
  readonly categories = this._categories.asReadonly();

  readonly categoryFilter = signal<CategoryFilter>('all');
  readonly statusFilter = signal<StatusFilter>('all');
  readonly search = signal('');

  /** Índice id → categoría para resolver la categoría de cada fila en O(1). */
  readonly categoryById = computed(
    () => new Map(this._categories().map((c) => [c.id, c] as const)),
  );

  /** Contadores calculados en una sola pasada sobre las tareas. */
  readonly counts = computed<TaskCounts>(() => {
    const byCategory = new Map<string, number>();
    let completed = 0;
    let uncategorized = 0;
    const tasks = this._tasks();
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
  });

  /** Filtro de categoría efectivo: si el feature flag apaga las categorías, no se filtra por ellas. */
  readonly effectiveCategoryFilter = computed<CategoryFilter>(() =>
    this.flags.categoriesEnabled() ? this.categoryFilter() : 'all',
  );

  readonly visibleTasks = computed(() => {
    const category = this.effectiveCategoryFilter();
    const status = this.statusFilter();
    const term = normalize(this.search().trim());
    const tasks = this._tasks();

    if (category === 'all' && status === 'all' && !term) return tasks;

    return tasks.filter(
      (t) =>
        (category === 'all' ||
          (category === 'none' ? t.categoryId === null : t.categoryId === category)) &&
        (status === 'all' || (status === 'completed') === t.completed) &&
        (!term || normalize(t.title).includes(term)),
    );
  });

  constructor() {
    effect(() => {
      // Leer el signal registra la dependencia; la serialización ocurre más tarde, agrupada.
      this._tasks();
      this.storage.scheduleWrite(TASKS_KEY, () => this._tasks());
    });
    effect(() => {
      this._categories();
      this.storage.scheduleWrite(CATEGORIES_KEY, () => this._categories());
    });
    effect(() => {
      // Si se elimina la categoría filtrada, volver a "Todas".
      const filter = this.categoryFilter();
      if (filter !== 'all' && filter !== 'none' && !this.categoryById().has(filter)) {
        this.categoryFilter.set('all');
      }
    });
  }

  // ---------- Tareas ----------

  addTask(title: string, categoryId: string | null = null): Task | null {
    const clean = title.trim();
    if (!clean) return null;
    const task: Task = {
      id: createId(),
      title: clean,
      completed: false,
      categoryId: categoryId && this.categoryById().has(categoryId) ? categoryId : null,
      createdAt: Date.now(),
    };
    // Las tareas nuevas van primero: así la lista ya está ordenada y no hay que ordenar en cada render.
    this._tasks.update((tasks) => [task, ...tasks]);
    return task;
  }

  updateTask(id: string, changes: Partial<Pick<Task, 'title' | 'categoryId' | 'completed'>>): void {
    this._tasks.update((tasks) =>
      tasks.map((t) =>
        t.id === id ? { ...t, ...changes, title: (changes.title ?? t.title).trim() || t.title } : t,
      ),
    );
  }

  toggleTask(id: string): void {
    this._tasks.update((tasks) =>
      tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)),
    );
  }

  removeTask(id: string): Task | undefined {
    const removed = this._tasks().find((t) => t.id === id);
    if (removed) this._tasks.update((tasks) => tasks.filter((t) => t.id !== id));
    return removed;
  }

  /** Reinsertar una tarea eliminada (para "Deshacer"). */
  restoreTask(task: Task): void {
    this._tasks.update((tasks) => {
      const next = [...tasks];
      const index = next.findIndex((t) => t.createdAt < task.createdAt);
      next.splice(index === -1 ? next.length : index, 0, task);
      return next;
    });
  }

  clearCompleted(): number {
    const before = this._tasks().length;
    this._tasks.update((tasks) => tasks.filter((t) => !t.completed));
    return before - this._tasks().length;
  }

  /** Genera tareas de prueba para demostrar el rendimiento con listas grandes. */
  generateDemoTasks(amount: number): void {
    const categories = this._categories();
    const now = Date.now();
    const generated: Task[] = Array.from({ length: amount }, (_, i) => ({
      id: createId() + i,
      title: `Tarea de prueba #${i + 1}`,
      completed: i % 3 === 0,
      categoryId: categories.length && i % 4 !== 0 ? categories[i % categories.length].id : null,
      createdAt: now - i,
    }));
    this._tasks.update((tasks) => [...generated, ...tasks]);
  }

  removeAllTasks(): void {
    this._tasks.set([]);
  }

  // ---------- Categorías ----------

  addCategory(name: string, color?: string): Category | null {
    const clean = name.trim();
    if (!clean || this.categoryNameExists(clean)) return null;
    const category: Category = {
      id: createId(),
      name: clean,
      color: color ?? CATEGORY_COLORS[this._categories().length % CATEGORY_COLORS.length],
    };
    this._categories.update((list) => [...list, category]);
    return category;
  }

  updateCategory(id: string, changes: Partial<Pick<Category, 'name' | 'color'>>): boolean {
    const name = changes.name?.trim();
    if (name !== undefined && (!name || this.categoryNameExists(name, id))) return false;
    this._categories.update((list) =>
      list.map((c) => (c.id === id ? { ...c, ...changes, ...(name ? { name } : {}) } : c)),
    );
    return true;
  }

  /** Elimina la categoría; sus tareas no se borran, quedan "Sin categoría". */
  removeCategory(id: string): void {
    this._categories.update((list) => list.filter((c) => c.id !== id));
    if (this._tasks().some((t) => t.categoryId === id)) {
      this._tasks.update((tasks) =>
        tasks.map((t) => (t.categoryId === id ? { ...t, categoryId: null } : t)),
      );
    }
  }

  categoryNameExists(name: string, ignoreId?: string): boolean {
    const target = normalize(name.trim());
    return this._categories().some((c) => c.id !== ignoreId && normalize(c.name) === target);
  }
}

function normalize(value: string): string {
  // Búsqueda sin distinguir mayúsculas ni tildes ("cafe" encuentra "Café").
  return value.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function defaultCategories(): Category[] {
  return [
    { id: 'personal', name: 'Personal', color: CATEGORY_COLORS[0] },
    { id: 'trabajo', name: 'Trabajo', color: CATEGORY_COLORS[1] },
    { id: 'compras', name: 'Compras', color: CATEGORY_COLORS[2] },
  ];
}
