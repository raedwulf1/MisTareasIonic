import { Category } from '../entities/category';

/**
 * Contrato de acceso a las categorías.
 *
 * Si no hay nada guardado, `getAll()` devuelve las categorías por defecto.
 * Las operaciones rechazan la promesa si la persistencia falla.
 */
export abstract class CategoryRepository {
  abstract getAll(): Promise<readonly Category[]>;

  /** Guarda una categoría nueva al final de la lista. */
  abstract add(category: Category): Promise<void>;

  /** Reemplaza la categoría con el mismo `id`. No hace nada si no existe. */
  abstract update(category: Category): Promise<void>;

  abstract remove(id: string): Promise<void>;
}
