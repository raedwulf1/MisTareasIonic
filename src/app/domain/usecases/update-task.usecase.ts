import { Observable, of } from 'rxjs';

import { Task, TaskChanges, applyTaskChanges } from '../entities/task';
import { TaskRepository } from '../repositories/task.repository';

export interface UpdateTaskInput {
  /** Lista actual de tareas. */
  tasks: readonly Task[];
  id: string;
  changes: TaskChanges;
  /** Feature flag: con `false` la categoría de la tarea no se modifica. */
  categoriesEnabled: boolean;
}

export interface UpdateTaskResult {
  /** Lista resultante (la misma si no existe la tarea). */
  tasks: readonly Task[];
  /** La tarea ya modificada, o `undefined` si no existe. */
  task: Task | undefined;
  saved: Observable<void>;
}

/** Edita una tarea; con las categorías desactivadas ignora el cambio de categoría. */
export class UpdateTaskUseCase {
  constructor(private readonly tasks: TaskRepository) {}

  execute({ tasks, id, changes, categoriesEnabled }: UpdateTaskInput): UpdateTaskResult {
    const allowed = categoriesEnabled ? changes : withoutCategory(changes);
    let updated: Task | undefined;
    const next = tasks.map((t) => {
      if (t.id !== id) return t;
      updated = applyTaskChanges(t, allowed);
      return updated;
    });
    return {
      tasks: next,
      task: updated,
      saved: updated ? this.tasks.update(updated) : of(undefined),
    };
  }
}

function withoutCategory({ categoryId: _ignored, ...rest }: TaskChanges): TaskChanges {
  return rest;
}
