import { Injectable, inject } from '@angular/core';
import { Observable, defer, of } from 'rxjs';

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

  getAll(): Observable<readonly Category[]> {
    return defer(() => of(this.current()));
  }

  add(category: Category): Observable<void> {
    return this.mutate(() => [...this.current(), category]);
  }

  update(category: Category): Observable<void> {
    return this.mutate(() => this.current().map((c) => (c.id === category.id ? category : c)));
  }

  remove(id: string): Observable<void> {
    return this.mutate(() => this.current().filter((c) => c.id !== id));
  }

  private current(): readonly Category[] {
    return (this.cache ??= this.storage.read<Category[]>(CATEGORIES_KEY, defaultCategories()));
  }

  /** Observable frío: el cambio se calcula y se aplica al suscribirse, no al llamar al método. */
  private mutate(next: () => readonly Category[]): Observable<void> {
    return defer(() => {
      this.commit(next());
      return of(undefined);
    });
  }

  private commit(next: readonly Category[]): void {
    this.cache = next;
    this.storage.scheduleWrite(CATEGORIES_KEY, () => this.cache);
  }
}
