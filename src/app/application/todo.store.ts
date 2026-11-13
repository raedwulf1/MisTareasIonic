import { Injectable, computed, effect, inject, signal } from '@angular/core';

import {
  Category,
  CategoryChanges,
  applyCategoryChanges,
  defaultCategories,
  isCategoryNameTaken,
  nextCategoryColor,
} from '../domain/category';
import { createId } from '../domain/id';
import {
  Task,
  TaskChanges,
  applyTaskChanges,
  buildDemoTasks,
  createTask,
  insertByCreationDate,
  toggleCompleted,
  unassignCategory,
} from '../domain/task';
import {
  CategoryFilter,
  StatusFilter,
  TaskCounts,
  countTasks,
  filterTasks,
  isSpecificCategory,
} from '../domain/task-query';
import { FeatureFlagsService } from './feature-flags.service';
import { KeyValueStore } from './ports/key-value-store';

/** Claves del formato persistido (no cambiar: romperían los datos guardados). */
const TASKS_KEY = 'todo.tasks.v1';
const CATEGORIES_KEY = 'todo.categories.v1';

/**
 * Estado de la app (tareas, categorías y filtros) y sus casos de uso, basado en signals.
 *
 * - Las reglas de negocio viven en `domain/` como funciones puras; este store las orquesta,
 *   mantiene el estado y aplica las políticas que dependen de los feature flags.
 * - El estado es inmutable: cada cambio crea un array nuevo, lo que permite usar
 *   `OnPush` en todos los componentes.
 * - Lo derivado (lista filtrada, contadores, índice de categorías) se calcula con
 *   `computed`, que memoriza el resultado y solo se recalcula cuando cambia una dependencia.
 * - La persistencia se hace con un `effect` que delega en el puerto `KeyValueStore`
 *   (escrituras agrupadas).
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly storage = inject(KeyValueStore);
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

  readonly counts = computed<TaskCounts>(() => countTasks(this._tasks()));

  /** Color que se propone para la próxima categoría. */
  readonly nextCategoryColor = computed(() => nextCategoryColor(this._categories()));

  /** Filtro de categoría efectivo: si el feature flag apaga las categorías, no se filtra por ellas. */
  readonly effectiveCategoryFilter = computed<CategoryFilter>(() =>
    this.flags.categoriesEnabled() ? this.categoryFilter() : 'all',
  );

  readonly visibleTasks = computed(() =>
    filterTasks(this._tasks(), {
      category: this.effectiveCategoryFilter(),
      status: this.statusFilter(),
      search: this.search(),
    }),
  );

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
      if (isSpecificCategory(filter) && !this.categoryById().has(filter)) {
        this.categoryFilter.set('all');
      }
    });
  }

  // ---------- Tareas ----------

  /**
   * Crea una tarea. La categoría se descarta si no existe o si las categorías están
   * desactivadas por feature flag.
   */
  addTask(title: string, categoryId: string | null = null): Task | null {
    const task = createTask({
      id: createId(),
      title,
      categoryId: this.assignableCategoryId(categoryId),
      createdAt: Date.now(),
    });
    if (!task) return null;
    // Las tareas nuevas van primero: así la lista ya está ordenada y no hay que ordenar en cada render.
    this._tasks.update((tasks) => [task, ...tasks]);
    return task;
  }

  /** Con las categorías desactivadas por feature flag, la categoría de la tarea no se modifica. */
  updateTask(id: string, changes: TaskChanges): void {
    const allowed = this.flags.categoriesEnabled() ? changes : withoutCategory(changes);
    this._tasks.update((tasks) =>
      tasks.map((t) => (t.id === id ? applyTaskChanges(t, allowed) : t)),
    );
  }

  toggleTask(id: string): void {
    this._tasks.update((tasks) => tasks.map((t) => (t.id === id ? toggleCompleted(t) : t)));
  }

  removeTask(id: string): Task | undefined {
    const removed = this._tasks().find((t) => t.id === id);
    if (removed) this._tasks.update((tasks) => tasks.filter((t) => t.id !== id));
    return removed;
  }

  /** Reinsertar una tarea eliminada (para "Deshacer"). */
  restoreTask(task: Task): void {
    this._tasks.update((tasks) => insertByCreationDate(tasks, task));
  }

  clearCompleted(): number {
    const before = this._tasks().length;
    this._tasks.update((tasks) => tasks.filter((t) => !t.completed));
    return before - this._tasks().length;
  }

  /** Genera tareas de prueba para demostrar el rendimiento con listas grandes. */
  generateDemoTasks(amount: number): void {
    const generated = buildDemoTasks(amount, this._categories(), Date.now(), createId);
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
      color: color ?? this.nextCategoryColor(),
    };
    this._categories.update((list) => [...list, category]);
    return category;
  }

  updateCategory(id: string, changes: CategoryChanges): boolean {
    const name = changes.name?.trim();
    if (name !== undefined && (!name || this.categoryNameExists(name, id))) return false;
    this._categories.update((list) =>
      list.map((c) => (c.id === id ? applyCategoryChanges(c, changes) : c)),
    );
    return true;
  }

  /** Elimina la categoría; sus tareas no se borran, quedan "Sin categoría". */
  removeCategory(id: string): void {
    this._categories.update((list) => list.filter((c) => c.id !== id));
    this._tasks.update((tasks) => unassignCategory(tasks, id));
  }

  categoryNameExists(name: string, ignoreId?: string): boolean {
    return isCategoryNameTaken(this._categories(), name, ignoreId);
  }

  private assignableCategoryId(categoryId: string | null): string | null {
    if (!this.flags.categoriesEnabled() || !categoryId) return null;
    return this.categoryById().has(categoryId) ? categoryId : null;
  }
}

function withoutCategory({ categoryId: _ignored, ...rest }: TaskChanges): TaskChanges {
  return rest;
}
