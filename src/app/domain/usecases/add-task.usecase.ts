import { Observable, of } from 'rxjs';

import { Category } from '../entities/category';
import { Task, createTask } from '../entities/task';
import { createId } from '../rules/id';
import { TaskRepository } from '../repositories/task.repository';

export interface AddTaskInput {
  title: string;
  categoryId: string | null;
  /** Categorías existentes, para descartar una categoría que ya no existe. */
  categories: readonly Category[];
  /** Feature flag: con `false` las tareas nuevas se crean sin categoría. */
  categoriesEnabled: boolean;
}

export interface AddTaskResult {
  /** La tarea creada, o `null` si el título quedó vacío (no se guarda nada). */
  task: Task | null;
  /** Observable frío: guarda la tarea al suscribirse; emite un error si la persistencia falla. */
  saved: Observable<void>;
}

/**
 * Crea una tarea aplicando la política de categorías: la categoría se descarta si el flag
 * las desactiva o si no existe. Las tareas nuevas van primero en la lista.
 */
export class AddTaskUseCase {
  constructor(private readonly tasks: TaskRepository) {}

  execute({ title, categoryId, categories, categoriesEnabled }: AddTaskInput): AddTaskResult {
    const assignable =
      categoriesEnabled && categoryId && categories.some((c) => c.id === categoryId)
        ? categoryId
        : null;
    const task = createTask({
      id: createId(),
      title,
      categoryId: assignable,
      createdAt: Date.now(),
    });
    return { task, saved: task ? this.tasks.add(task) : of(undefined) };
  }
}
