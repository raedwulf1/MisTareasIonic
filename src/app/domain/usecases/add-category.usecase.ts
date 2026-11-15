import { Observable, of } from 'rxjs';

import { Category, isCategoryNameTaken, nextCategoryColor } from '../entities/category';
import { createId } from '../rules/id';
import { CategoryRepository } from '../repositories/category.repository';

export interface AddCategoryInput {
  name: string;
  /** Color elegido; si falta se propone el siguiente de la paleta. */
  color?: string;
  /** Categorías existentes, para comprobar que el nombre no esté repetido. */
  categories: readonly Category[];
}

export interface AddCategoryResult {
  /** La categoría creada, o `null` si el nombre está vacío o ya existe (no se guarda nada). */
  category: Category | null;
  /** Observable frío: guarda la categoría al suscribirse; emite un error si la persistencia falla. */
  saved: Observable<void>;
}

/**
 * Crea una categoría: nombre recortado, único (sin distinguir mayúsculas ni tildes)
 * y con el siguiente color de la paleta si no se indica uno.
 */
export class AddCategoryUseCase {
  constructor(private readonly repository: CategoryRepository) {}

  execute({ name, color, categories }: AddCategoryInput): AddCategoryResult {
    const clean = name.trim();
    if (!clean || isCategoryNameTaken(categories, clean)) {
      return { category: null, saved: of(undefined) };
    }
    const category: Category = {
      id: createId(),
      name: clean,
      color: color ?? nextCategoryColor(categories),
    };
    return { category, saved: this.repository.add(category) };
  }
}
