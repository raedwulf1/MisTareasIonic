import { Observable, forkJoin, map } from 'rxjs';

import { Task, unassignCategory } from '../entities/task';
import { CategoryRepository } from '../repositories/category.repository';
import { TaskRepository } from '../repositories/task.repository';

export interface RemoveCategoryInput {
  id: string;
  /** Lista actual de tareas. */
  tasks: readonly Task[];
}

export interface RemoveCategoryResult {
  /** Tareas resultantes: las de la categoría quedan "Sin categoría" (la misma lista si ninguna la usaba). */
  tasks: readonly Task[];
  saved: Observable<void>;
}

/**
 * Elimina una categoría y deja sus tareas sin categoría (no se borran). Es la única regla
 * que modifica a la vez los dos repositorios, por eso vive en un solo lugar.
 */
export class RemoveCategoryUseCase {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly tasks: TaskRepository,
  ) {}

  execute({ id, tasks }: RemoveCategoryInput): RemoveCategoryResult {
    const next = unassignCategory(tasks, id);
    const writes: Observable<void>[] = [this.categories.remove(id)];
    // `unassignCategory` devuelve el mismo array cuando no hay tareas afectadas.
    if (next !== tasks) {
      writes.push(this.tasks.replaceAll(next));
    }
    return { tasks: next, saved: forkJoin(writes).pipe(map(() => undefined)) };
  }
}
