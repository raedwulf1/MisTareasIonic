import { Injectable, inject } from '@angular/core';

import { Category, CategoryChanges } from '../../domain/entities/category';
import { FeatureFlagsService } from '../state/feature-flags.service';
import { TodoStore } from '../state/todo.store';

/**
 * Fachada de la gestión de categorías: única API que usa la UI para listar, crear,
 * editar y eliminar categorías.
 */
@Injectable({ providedIn: 'root' })
export class CategoriesInteractor {
  private readonly store = inject(TodoStore);
  private readonly flags = inject(FeatureFlagsService);

  readonly categories = this.store.categories;
  /** Color que se propone para la próxima categoría. */
  readonly nextColor = this.store.nextCategoryColor;
  readonly categoriesEnabled = this.flags.categoriesEnabled;

  /** Cuántas tareas tiene asignadas una categoría. */
  taskCount(categoryId: string): number {
    return this.store.counts().byCategory.get(categoryId) ?? 0;
  }

  nameExists(name: string, ignoreId?: string): boolean {
    return this.store.categoryNameExists(name, ignoreId);
  }

  /** Devuelve la categoría creada, o `null` si el nombre está vacío o repetido. */
  add(name: string, color?: string): Category | null {
    return this.store.addCategory(name, color);
  }

  /** Devuelve `false` si el cambio se rechazó (nombre vacío o repetido). */
  update(id: string, changes: CategoryChanges): boolean {
    return this.store.updateCategory(id, changes);
  }

  /** Sus tareas no se borran: quedan "Sin categoría". */
  remove(id: string): void {
    this.store.removeCategory(id);
  }

  /** Deja la lista de tareas filtrada por esta categoría. */
  showTasksOf(categoryId: string): void {
    this.store.categoryFilter.set(categoryId);
  }
}
