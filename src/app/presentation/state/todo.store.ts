import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, forkJoin, map, tap } from 'rxjs';

import {
  Category,
  CategoryChanges,
  isCategoryNameTaken,
  nextCategoryColor,
} from '../../domain/entities/category';
import { createAppError } from '../../domain/entities/app-error';
import { ErrorReporter } from '../../domain/ports/error-reporter';
import { createId } from '../../domain/rules/id';
import {
  Task,
  TaskChanges,
  buildDemoTasks,
  insertByCreationDate,
  toggleCompleted,
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
import { AddCategoryUseCase } from '../../domain/usecases/add-category.usecase';
import { AddTaskUseCase } from '../../domain/usecases/add-task.usecase';
import { RemoveCategoryUseCase } from '../../domain/usecases/remove-category.usecase';
import { UpdateCategoryUseCase } from '../../domain/usecases/update-category.usecase';
import { UpdateTaskUseCase } from '../../domain/usecases/update-task.usecase';

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
  private readonly errors = inject(ErrorReporter);

  private readonly addTaskUseCase = new AddTaskUseCase(this.taskRepository);
  private readonly updateTaskUseCase = new UpdateTaskUseCase(this.taskRepository);
  private readonly addCategoryUseCase = new AddCategoryUseCase(this.categoryRepository);
  private readonly updateCategoryUseCase = new UpdateCategoryUseCase(this.categoryRepository);
  private readonly removeCategoryUseCase = new RemoveCategoryUseCase(
    this.categoryRepository,
    this.taskRepository,
  );

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
  load(): Observable<void> {
    return forkJoin([this.taskRepository.getAll(), this.categoryRepository.getAll()]).pipe(
      tap(([tasks, categories]) => {
        this._tasks.set(tasks);
        this._categories.set(categories);
      }),
      map(() => undefined),
    );
  }

  // ---------- Tareas ----------

  /**
   * Crea una tarea. La categoría se descarta si no existe o si las categorías están
   * desactivadas por feature flag (política en `AddTaskUseCase`).
   */
  addTask(title: string, categoryId: string | null = null): Task | null {
    const { task, saved } = this.addTaskUseCase.execute({
      title,
      categoryId,
      categories: this._categories(),
      categoriesEnabled: this.flags.categoriesEnabled(),
    });
    if (!task) {
      return null;
    }
    // Las tareas nuevas van primero: así la lista ya está ordenada y no hay que ordenar en cada render.
    this._tasks.update((tasks) => [task, ...tasks]);
    this.persist(saved);
    return task;
  }

  /** Con las categorías desactivadas por feature flag, la categoría no se modifica (`UpdateTaskUseCase`). */
  updateTask(id: string, changes: TaskChanges): void {
    const { tasks, saved } = this.updateTaskUseCase.execute({
      tasks: this._tasks(),
      id,
      changes,
      categoriesEnabled: this.flags.categoriesEnabled(),
    });
    this._tasks.set(tasks);
    this.persist(saved);
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
    const { category, saved } = this.addCategoryUseCase.execute({
      name,
      color,
      categories: this._categories(),
    });
    if (!category) {
      return null;
    }
    this._categories.update((list) => [...list, category]);
    this.persist(saved);
    return category;
  }

  /** Devuelve `false` si el cambio se rechazó (nombre vacío o repetido). */
  updateCategory(id: string, changes: CategoryChanges): boolean {
    const { accepted, categories, saved } = this.updateCategoryUseCase.execute({
      categories: this._categories(),
      id,
      changes,
    });
    if (!accepted) {
      return false;
    }
    this._categories.set(categories);
    this.persist(saved);
    return true;
  }

  /** Elimina la categoría; sus tareas no se borran, quedan "Sin categoría". */
  removeCategory(id: string): void {
    const { tasks, saved } = this.removeCategoryUseCase.execute({ id, tasks: this._tasks() });
    this._categories.update((list) => list.filter((c) => c.id !== id));
    this._tasks.set(tasks);
    this.persist(saved);
  }

  categoryNameExists(name: string, ignoreId?: string): boolean {
    return isCategoryNameTaken(this._categories(), name, ignoreId);
  }

  /** Aplica `change` a la tarea con ese id y guarda el resultado. */
  private replaceTask(id: string, change: (task: Task) => Task): void {
    this._tasks.update((tasks) => tasks.map((t) => (t.id === id ? change(t) : t)));
    const updated = this._tasks().find((t) => t.id === id);
    if (updated) {
      this.persist(this.taskRepository.update(updated));
    }
  }

  /** La UI ya está actualizada: un fallo al guardar se registra pero no revierte el estado. */
  private persist(operation: Observable<void>): void {
    operation.subscribe({
      error: (err) =>
        this.errors.report(createAppError('repository', 'No se pudo guardar el cambio', err)),
    });
  }
}
