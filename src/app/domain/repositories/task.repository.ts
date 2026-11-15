import { Observable } from 'rxjs';

import { Task } from '../entities/task';

/**
 * Contrato de acceso a las tareas.
 *
 * El dominio define qué necesita; la capa `data` decide cómo y dónde se guardan
 * (`localStorage` hoy, una API o IndexedDB mañana). Todas las operaciones son asíncronas
 * (observables fríos: no hacen nada hasta que alguien se suscribe) y emiten un error si la persistencia falla.
 */
export abstract class TaskRepository {
  /** Todas las tareas guardadas, en el orden en que se persistieron. */
  abstract getAll(): Observable<readonly Task[]>;

  /** Guarda una tarea nueva al principio de la lista (las nuevas van primero). */
  abstract add(task: Task): Observable<void>;

  /** Guarda varias tareas nuevas al principio de la lista, en una sola escritura. */
  abstract addMany(tasks: readonly Task[]): Observable<void>;

  /** Reinserta una tarea respetando el orden por fecha de creación (para "Deshacer"). */
  abstract restore(task: Task): Observable<void>;

  /** Reemplaza la tarea con el mismo `id`. No hace nada si no existe. */
  abstract update(task: Task): Observable<void>;

  abstract remove(id: string): Observable<void>;

  abstract removeCompleted(): Observable<void>;

  /** Elimina todas las tareas. */
  abstract clear(): Observable<void>;

  /** Sustituye la lista completa (p. ej. tras desasignar una categoría de varias tareas). */
  abstract replaceAll(tasks: readonly Task[]): Observable<void>;
}
