import { Task } from '../../domain/entities/task';
import { TaskDto } from '../dtos/task.dto';

/** Convierte entre la tarea del dominio y su formato persistido. */
export const TaskMapper = {
  toDto(task: Task): TaskDto {
    return {
      id: task.id,
      title: task.title,
      completed: task.completed,
      categoryId: task.categoryId,
      createdAt: task.createdAt,
    };
  },

  /** `null` si el registro guardado está dañado (sin `id`, título o fecha válidos). */
  toDomain(raw: unknown): Task | null {
    if (typeof raw !== 'object' || raw === null) {
      return null;
    }
    const r = raw as Record<string, unknown>;
    if (typeof r['id'] !== 'string' || typeof r['title'] !== 'string') {
      return null;
    }
    if (typeof r['createdAt'] !== 'number' || !Number.isFinite(r['createdAt'])) {
      return null;
    }
    return {
      id: r['id'],
      title: r['title'],
      completed: r['completed'] === true,
      categoryId: typeof r['categoryId'] === 'string' ? r['categoryId'] : null,
      createdAt: r['createdAt'],
    };
  },

  /** Lista persistida → tareas; descarta los registros dañados y devuelve `[]` si no es una lista. */
  toDomainList(raw: unknown): Task[] {
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.flatMap((item) => TaskMapper.toDomain(item) ?? []);
  },

  toDtoList(tasks: readonly Task[]): TaskDto[] {
    return tasks.map(TaskMapper.toDto);
  },
};
