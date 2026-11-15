import { Injectable, inject } from '@angular/core';

import { Category, defaultCategories } from '../../domain/entities/category';
import { KeyValueStore } from '../../domain/ports/key-value-store';
import { CategoryRepository } from '../../domain/repositories/category.repository';

/** Clave del formato persistido (no cambiar: rompería los datos guardados). */
export const CATEGORIES_KEY = 'todo.categories.v1';

/**
 * Repositorio de categorías sobre `KeyValueStore`.
 *
 * Igual que `LocalTaskRepository`: lista en memoria y escritura agrupada. Si no hay nada
 * guardado, arranca con las categorías por defecto.
 */
@Injectable({ providedIn: 'root' })
export class LocalCategoryRepository implements CategoryRepository {
  private readonly storage = inject(KeyValueStore);
  private cache: readonly Category[] | null = null;

  async getAll(): Promise<readonly Category[]> {
    return this.current();
  }

  async add(category: Category): Promise<void> {
    this.commit([...this.current(), category]);
  }

  async update(category: Category): Promise<void> {
    this.commit(this.current().map((c) => (c.id === category.id ? category : c)));
  }

  async remove(id: string): Promise<void> {
    this.commit(this.current().filter((c) => c.id !== id));
  }

  private current(): readonly Category[] {
    return (this.cache ??= this.storage.read<Category[]>(CATEGORIES_KEY, defaultCategories()));
  }

  private commit(next: readonly Category[]): void {
    this.cache = next;
    this.storage.scheduleWrite(CATEGORIES_KEY, () => this.cache);
  }
}
