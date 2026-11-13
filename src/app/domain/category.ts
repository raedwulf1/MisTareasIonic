import { normalizeText } from './text';

export interface Category {
  readonly id: string;
  name: string;
  /** Color en formato hex (#rrggbb) usado en chips y marcadores. */
  color: string;
}

export type CategoryChanges = Partial<Pick<Category, 'name' | 'color'>>;

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

/** Categorías con las que arranca la app la primera vez. */
export function defaultCategories(): Category[] {
  return [
    { id: 'personal', name: 'Personal', color: CATEGORY_COLORS[0] },
    { id: 'trabajo', name: 'Trabajo', color: CATEGORY_COLORS[1] },
    { id: 'compras', name: 'Compras', color: CATEGORY_COLORS[2] },
  ];
}

/** Color propuesto para una categoría nueva: recorre la paleta en orden. */
export function nextCategoryColor(existing: readonly Category[]): string {
  return CATEGORY_COLORS[existing.length % CATEGORY_COLORS.length];
}

/** Los nombres son únicos sin distinguir mayúsculas ni tildes; `ignoreId` excluye la propia categoría al editar. */
export function isCategoryNameTaken(
  categories: readonly Category[],
  name: string,
  ignoreId?: string,
): boolean {
  const target = normalizeText(name.trim());
  return categories.some((c) => c.id !== ignoreId && normalizeText(c.name) === target);
}

/** Aplica cambios recortando el nombre; un nombre vacío no sobrescribe el actual. */
export function applyCategoryChanges(category: Category, changes: CategoryChanges): Category {
  const name = changes.name?.trim();
  return { ...category, ...changes, ...(name ? { name } : {}) };
}
