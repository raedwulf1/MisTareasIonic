import {
  CATEGORY_COLORS,
  Category,
  applyCategoryChanges,
  defaultCategories,
  isCategoryNameTaken,
  nextCategoryColor,
} from './category';

describe('domain/category', () => {
  const categories = defaultCategories();

  it('las categorías por defecto son Personal, Trabajo y Compras', () => {
    expect(categories.map((c) => c.id)).toEqual(['personal', 'trabajo', 'compras']);
  });

  it('nextCategoryColor recorre la paleta y vuelve a empezar', () => {
    expect(nextCategoryColor(categories)).toBe(CATEGORY_COLORS[3]);
    const full: Category[] = CATEGORY_COLORS.map((color, i) => ({
      id: `${i}`,
      name: `${i}`,
      color,
    }));
    expect(nextCategoryColor(full)).toBe(CATEGORY_COLORS[0]);
  });

  it('isCategoryNameTaken ignora mayúsculas, tildes y espacios', () => {
    expect(isCategoryNameTaken(categories, '  TRABAJO ')).toBe(true);
    expect(isCategoryNameTaken([{ id: 'x', name: 'Música', color: '#000' }], 'musica')).toBe(true);
    expect(isCategoryNameTaken(categories, 'Estudio')).toBe(false);
  });

  it('isCategoryNameTaken excluye la propia categoría al editar', () => {
    expect(isCategoryNameTaken(categories, 'Trabajo', 'trabajo')).toBe(false);
  });

  it('applyCategoryChanges recorta el nombre y cambia el color', () => {
    const updated = applyCategoryChanges(categories[0], { name: ' Casa ', color: '#111111' });
    expect(updated).toEqual({ id: 'personal', name: 'Casa', color: '#111111' });
  });
});
