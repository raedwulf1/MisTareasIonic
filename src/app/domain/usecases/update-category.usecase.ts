import { Observable, of } from 'rxjs';

import {
  Category,
  CategoryChanges,
  applyCategoryChanges,
  isCategoryNameTaken,
} from '../entities/category';
import { CategoryRepository } from '../repositories/category.repository';

export interface UpdateCategoryInput {
  /** Lista actual de categorías. */
  categories: readonly Category[];
  id: string;
  changes: CategoryChanges;
}

export interface UpdateCategoryResult {
  /** `false` si el cambio se rechazó por un nombre vacío o repetido. */
  accepted: boolean;
  /** Lista resultante (la misma si se rechazó el cambio o no existe la categoría). */
  categories: readonly Category[];
  /** La categoría ya modificada, o `undefined` si se rechazó o no existe. */
  category: Category | undefined;
  saved: Observable<void>;
}

/** Edita una categoría rechazando nombres vacíos o repetidos (ignorando la propia categoría). */
export class UpdateCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  execute({ categories, id, changes }: UpdateCategoryInput): UpdateCategoryResult {
    const name = changes.name?.trim();
    if (name !== undefined && (!name || isCategoryNameTaken(categories, name, id))) {
      return { accepted: false, categories, category: undefined, saved: of(undefined) };
    }
    let updated: Category | undefined;
    const next = categories.map((c) => {
      if (c.id !== id) return c;
      updated = applyCategoryChanges(c, changes);
      return updated;
    });
    return {
      accepted: true,
      categories: next,
      category: updated,
      saved: updated ? this.repository.update(updated) : of(undefined),
    };
  }
}
