import { Injectable, inject } from '@angular/core';
import { Observable, defer, of } from 'rxjs';

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

  getAll(): Observable<readonly Task[]> {
    return defer(() => of(this.current()));
  }

  add(task: Task): Observable<void> {
    return this.mutate(() => [task, ...this.current()]);
  }

  addMany(tasks: readonly Task[]): Observable<void> {
    return this.mutate(() => [...tasks, ...this.current()]);
  }

  restore(task: Task): Observable<void> {
    return this.mutate(() => insertByCreationDate(this.current(), task));
  }

  update(task: Task): Observable<void> {
    return this.mutate(() => this.current().map((t) => (t.id === task.id ? task : t)));
  }

  remove(id: string): Observable<void> {
    return this.mutate(() => this.current().filter((t) => t.id !== id));
  }

  removeCompleted(): Observable<void> {
    return this.mutate(() => this.current().filter((t) => !t.completed));
  }

  clear(): Observable<void> {
    return this.mutate(() => []);
  }

  replaceAll(tasks: readonly Task[]): Observable<void> {
    return this.mutate(() => tasks);
  }

  private current(): readonly Task[] {
    return (this.cache ??= this.storage.read<Task[]>(TASKS_KEY, []));
  }

  /** Observable frío: el cambio se calcula y se aplica al suscribirse, no al llamar al método. */
  private mutate(next: () => readonly Task[]): Observable<void> {
    return defer(() => {
      this.commit(next());
      return of(undefined);
    });
  }

  private commit(next: readonly Task[]): void {
    this.cache = next;
    this.storage.scheduleWrite(TASKS_KEY, () => this.cache);
  }
}
