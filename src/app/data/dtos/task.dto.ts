/**
 * Forma de una tarea tal como se guarda en `localStorage` (clave `todo.tasks.v1`).
 *
 * Es un contrato aparte de la entidad `Task`: si el dominio cambia, el formato guardado
 * no se rompe; el cambio se absorbe en `TaskMapper`.
 */
export interface TaskDto {
  id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  createdAt: number;
}
