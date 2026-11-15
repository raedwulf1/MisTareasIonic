import { Injectable, computed, effect, inject, signal } from '@angular/core';

import {
  Category,
  CategoryChanges,
  applyCategoryChanges,
  isCategoryNameTaken,
  nextCategoryColor,
} from '../../domain/entities/category';
import { createId } from '../../domain/rules/id';
import {
  Task,
  TaskChanges,
  applyTaskChanges,
  buildDemoTasks,
  createTask,
  insertByCreationDate,
  toggleCompleted,
  unassignCategory,
} from '../../domain/entities/task';
import {
  CategoryFilter,
  StatusFilter,
  TaskCounts,
  countTasks,
  filterTasks,
  isSpecificCategory,
} from '../../domain/rules/task-query';
import { FeatureFlagsService } from './feature-flags.service';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';

/**
 * Estado de la app (tareas, categorías y filtros) y sus casos de uso, basado en signals.
 *
 * - Las reglas de negocio viven en `domain/` como funciones puras; este store las orquesta,
 *   mantiene el estado y aplica las políticas que dependen de los feature flags.
 * - El estado es inmutable: cada cambio crea un array nuevo, lo que permite usar
 *   `OnPush` en todos los componentes.
 * - Lo derivado (lista filtrada, contadores, índice de categorías) se calcula con
 *   `computed`, que memoriza el resultado y solo se recalcula cuando cambia una dependencia.
 * - La persistencia se delega en los repositorios del dominio (`TaskRepository`,
 *   `CategoryRepository`). Los cambios se aplican primero al signal (la UI responde al
 *   instante) y después se guardan; `load()` carga el estado inicial al arrancar la app.
 */
@Injectable({ providedIn: 'root' })
export class TodoStore {
  private readonly taskRepository = inject(TaskRepository);
  private readonly categoryRepository = inject(CategoryRepository);
  private readonly flags = inject(FeatureFlagsService);

  private readonly _tasks = signal<readonly Task[]>([]);
  private readonly _categories = signal<readonly Category[]>([]);

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
      // Si se elimina la categoría filtrada, volver a "Todas".
      const filter = this.categoryFilter();
      if (isSpecificCategory(filter) && !this.categoryById().has(filter)) {
        this.categoryFilter.set('all');
      }
    });
  }

  /** Carga tareas y categorías desde los repositorios. Se llama al arrancar la app. */
  async load(): Promise<void> {
    const [tasks, categories] = await Promise.all([
      this.taskRepository.getAll(),
      this.categoryRepository.getAll(),
    ]);
    this._tasks.set(tasks);
    this._categories.set(categories);
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
    this.persist(this.taskRepository.add(task));
    return task;
  }

  /** Con las categorías desactivadas por feature flag, la categoría de la tarea no se modifica. */
  updateTask(id: string, changes: TaskChanges): void {
    const allowed = this.flags.categoriesEnabled() ? changes : withoutCategory(changes);
    this.replaceTask(id, (t) => applyTaskChanges(t, allowed));
  }

  toggleTask(id: string): void {
    this.replaceTask(id, toggleCompleted);
  }

  removeTask(id: string): Task | undefined {
    const removed = this._tasks().find((t) => t.id === id);
    if (removed) {
      this._tasks.update((tasks) => tasks.filter((t) => t.id !== id));
      this.persist(this.taskRepository.remove(id));
    }
    return removed;
  }

  /** Reinsertar una tarea eliminada (para "Deshacer"). */
  restoreTask(task: Task): void {
    this._tasks.update((tasks) => insertByCreationDate(tasks, task));
    this.persist(this.taskRepository.restore(task));
  }

  clearCompleted(): number {
    const before = this._tasks().length;
    this._tasks.update((tasks) => tasks.filter((t) => !t.completed));
    this.persist(this.taskRepository.removeCompleted());
    return before - this._tasks().length;
  }

  /** Genera tareas de prueba para demostrar el rendimiento con listas grandes. */
  generateDemoTasks(amount: number): void {
    const generated = buildDemoTasks(amount, this._categories(), Date.now(), createId);
    this._tasks.update((tasks) => [...generated, ...tasks]);
    this.persist(this.taskRepository.addMany(generated));
  }

  removeAllTasks(): void {
    this._tasks.set([]);
    this.persist(this.taskRepository.clear());
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
    this.persist(this.categoryRepository.add(category));
    return category;
  }

  updateCategory(id: string, changes: CategoryChanges): boolean {
    const name = changes.name?.trim();
    if (name !== undefined && (!name || this.categoryNameExists(name, id))) return false;
    this._categories.update((list) =>
      list.map((c) => (c.id === id ? applyCategoryChanges(c, changes) : c)),
    );
    const updated = this._categories().find((c) => c.id === id);
    if (updated) this.persist(this.categoryRepository.update(updated));
    return true;
  }

  /** Elimina la categoría; sus tareas no se borran, quedan "Sin categoría". */
  removeCategory(id: string): void {
    this._categories.update((list) => list.filter((c) => c.id !== id));
    this.persist(this.categoryRepository.remove(id));
    const before = this._tasks();
    this._tasks.update((tasks) => unassignCategory(tasks, id));
    // `unassignCategory` devuelve el mismo array si no hay nada que cambiar.
    if (this._tasks() !== before) this.persist(this.taskRepository.replaceAll(this._tasks()));
  }

  categoryNameExists(name: string, ignoreId?: string): boolean {
    return isCategoryNameTaken(this._categories(), name, ignoreId);
  }

  /** Aplica `change` a la tarea con ese id y guarda el resultado. */
  private replaceTask(id: string, change: (task: Task) => Task): void {
    this._tasks.update((tasks) => tasks.map((t) => (t.id === id ? change(t) : t)));
    const updated = this._tasks().find((t) => t.id === id);
    if (updated) this.persist(this.taskRepository.update(updated));
  }

  /** La UI ya está actualizada: un fallo al guardar se registra pero no revierte el estado. */
  private persist(operation: Promise<void>): void {
    operation.catch((err) => console.error('[repository] No se pudo guardar el cambio', err));
  }

  private assignableCategoryId(categoryId: string | null): string | null {
    if (!this.flags.categoriesEnabled() || !categoryId) return null;
    return this.categoryById().has(categoryId) ? categoryId : null;
  }
}

function withoutCategory({ categoryId: _ignored, ...rest }: TaskChanges): TaskChanges {
  return rest;
}
