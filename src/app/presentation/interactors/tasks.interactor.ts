import { Injectable, inject } from '@angular/core';

import { Category } from '../../domain/entities/category';
import { Task, TaskChanges } from '../../domain/entities/task';
import { CategoryFilter, StatusFilter } from '../../domain/rules/task-query';
import { FeatureFlagsService } from '../state/feature-flags.service';
import { TodoStore } from '../state/todo.store';

/**
 * Fachada (facade) de la pantalla de tareas: única API que usa la UI para listar, filtrar
 * y modificar tareas. Oculta el store y los feature flags detrás de lectura de estado
 * (signals de solo lectura) y de comandos con nombre de negocio.
 */
@Injectable({ providedIn: 'root' })
export class TasksInteractor {
  private readonly store = inject(TodoStore);
  private readonly flags = inject(FeatureFlagsService);

  // ---------- Estado (solo lectura) ----------
  readonly visibleTasks = this.store.visibleTasks;
  readonly counts = this.store.counts;
  readonly categories = this.store.categories;
  readonly categoryById = this.store.categoryById;
  readonly categoryFilter = this.store.categoryFilter.asReadonly();
  readonly statusFilter = this.store.statusFilter.asReadonly();
  readonly search = this.store.search.asReadonly();
  readonly categoriesEnabled = this.flags.categoriesEnabled;

  // ---------- Filtros ----------
  setCategoryFilter(filter: CategoryFilter): void {
    this.store.categoryFilter.set(filter);
  }

  setStatusFilter(filter: StatusFilter): void {
    this.store.statusFilter.set(filter);
  }

  setSearch(text: string): void {
    this.store.search.set(text);
  }

  // ---------- Comandos ----------
  /** Devuelve la tarea creada, o `null` si el título quedó vacío. */
  addTask(title: string, categoryId: string | null = null): Task | null {
    return this.store.addTask(title, categoryId);
  }

  updateTask(id: string, changes: TaskChanges): void {
    this.store.updateTask(id, changes);
  }

  toggleTask(id: string): void {
    this.store.toggleTask(id);
  }

  /** Devuelve la tarea eliminada (para ofrecer "Deshacer") o `undefined` si no existía. */
  removeTask(id: string): Task | undefined {
    return this.store.removeTask(id);
  }

  restoreTask(task: Task): void {
    this.store.restoreTask(task);
  }

  /** Devuelve cuántas tareas se eliminaron. */
  clearCompleted(): number {
    return this.store.clearCompleted();
  }

  categoryOf(task: Task): Category | undefined {
    return task.categoryId ? this.store.categoryById().get(task.categoryId) : undefined;
  }
}
