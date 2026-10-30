/** Una tarea de la lista. `categoryId` es `null` cuando no tiene categoría. */
export interface Task {
  readonly id: string;
  title: string;
  completed: boolean;
  categoryId: string | null;
  /** Epoch en milisegundos; se usa para ordenar sin parsear fechas. */
  createdAt: number;
}

export interface Category {
  readonly id: string;
  name: string;
  /** Color en formato hex (#rrggbb) usado en chips y marcadores. */
  color: string;
}

/** Filtro de categoría: todas, sin categoría, o el id de una categoría concreta. */
export type CategoryFilter = 'all' | 'none' | string;

export type StatusFilter = 'all' | 'pending' | 'completed';

export const CATEGORY_COLORS: readonly string[] = [
  '#3880ff',
  '#2dd36f',
  '#ffc409',
  '#eb445a',
  '#9b59b6',
  '#00b8d4',
  '#ff7a00',
  '#5f6b7a',
];

/** Genera ids cortos y únicos sin depender de `crypto.randomUUID` (no disponible en WebViews antiguos). */
export function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
