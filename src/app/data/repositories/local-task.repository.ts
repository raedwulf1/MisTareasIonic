import { Injectable, inject } from '@angular/core';

import { Task, insertByCreationDate } from '../../domain/entities/task';
import { KeyValueStore } from '../../domain/ports/key-value-store';
import { TaskRepository } from '../../domain/repositories/task.repository';

/** Clave del formato persistido (no cambiar: rompería los datos guardados). */
export const TASKS_KEY = 'todo.tasks.v1';

/**
 * Repositorio de tareas sobre `KeyValueStore`.
 *
 * Mantiene la lista en memoria (cargada la primera vez que se usa) y tras cada cambio
 * programa una escritura agrupada: varias operaciones seguidas producen una sola
 * serialización. El formato JSON es el mismo que antes de introducir el repositorio.
 */
@Injectable({ providedIn: 'root' })
export class LocalTaskRepository implements TaskRepository {
  private readonly storage = inject(KeyValueStore);
  private cache: readonly Task[] | null = null;

  async getAll(): Promise<readonly Task[]> {
    return this.current();
  }

  async add(task: Task): Promise<void> {
    this.commit([task, ...this.current()]);
  }

  async addMany(tasks: readonly Task[]): Promise<void> {
    this.commit([...tasks, ...this.current()]);
  }

  async restore(task: Task): Promise<void> {
    this.commit(insertByCreationDate(this.current(), task));
  }

  async update(task: Task): Promise<void> {
    this.commit(this.current().map((t) => (t.id === task.id ? task : t)));
  }

  async remove(id: string): Promise<void> {
    this.commit(this.current().filter((t) => t.id !== id));
  }

  async removeCompleted(): Promise<void> {
    this.commit(this.current().filter((t) => !t.completed));
  }

  async clear(): Promise<void> {
    this.commit([]);
  }

  async replaceAll(tasks: readonly Task[]): Promise<void> {
    this.commit(tasks);
  }

  private current(): readonly Task[] {
    return (this.cache ??= this.storage.read<Task[]>(TASKS_KEY, []));
  }

  private commit(next: readonly Task[]): void {
    this.cache = next;
    this.storage.scheduleWrite(TASKS_KEY, () => this.cache);
  }
}
