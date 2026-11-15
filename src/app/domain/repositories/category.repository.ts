import { Observable } from 'rxjs';

import { Category } from '../entities/category';

/**
 * Contrato de acceso a las categorías.
 *
 * Si no hay nada guardado, `getAll()` devuelve las categorías por defecto.
 * Las operaciones son observables fríos (nada ocurre hasta suscribirse) y emiten un error si la persistencia falla.
 */
export abstract class CategoryRepository {
  abstract getAll(): Observable<readonly Category[]>;

  /** Guarda una categoría nueva al final de la lista. */
  abstract add(category: Category): Observable<void>;

  /** Reemplaza la categoría con el mismo `id`. No hace nada si no existe. */
  abstract update(category: Category): Observable<void>;

  abstract remove(id: string): Observable<void>;
}
