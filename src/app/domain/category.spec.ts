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
    const expectedIds = ['personal', 'trabajo', 'compras'];

    const ids = categories.map((c) => c.id);

    expect(ids).toEqual(expectedIds);
  });

  it('nextCategoryColor devuelve el siguiente color de la paleta', () => {
    const color = nextCategoryColor(categories);

    expect(color).toBe(CATEGORY_COLORS[3]);
  });

  it('nextCategoryColor vuelve a empezar cuando se agota la paleta', () => {
    const full: Category[] = CATEGORY_COLORS.map((color, i) => ({
      id: `${i}`,
      name: `${i}`,
      color,
    }));

    const color = nextCategoryColor(full);

    expect(color).toBe(CATEGORY_COLORS[0]);
  });

  it('isCategoryNameTaken ignora mayúsculas y espacios', () => {
    const taken = isCategoryNameTaken(categories, '  TRABAJO ');

    expect(taken).toBe(true);
  });

  it('isCategoryNameTaken ignora tildes', () => {
    const music: Category[] = [{ id: 'x', name: 'Música', color: '#000' }];

    const taken = isCategoryNameTaken(music, 'musica');

    expect(taken).toBe(true);
  });

  it('isCategoryNameTaken acepta un nombre que no existe', () => {
    const taken = isCategoryNameTaken(categories, 'Estudio');

    expect(taken).toBe(false);
  });

  it('isCategoryNameTaken excluye la propia categoría al editar', () => {
    const taken = isCategoryNameTaken(categories, 'Trabajo', 'trabajo');

    expect(taken).toBe(false);
  });

  it('applyCategoryChanges recorta el nombre y cambia el color', () => {
    const changes = { name: ' Casa ', color: '#111111' };

    const updated = applyCategoryChanges(categories[0], changes);

    expect(updated).toEqual({ id: 'personal', name: 'Casa', color: '#111111' });
  });
});
