import { defer, firstValueFrom, of, throwError } from 'rxjs';

import { Category } from '../entities/category';
import { CategoryRepository } from '../repositories/category.repository';
import { AddCategoryUseCase } from './add-category.usecase';

class FakeCategoryRepository extends CategoryRepository {
  readonly added: Category[] = [];
  add(category: Category) {
    return defer(() => {
      this.added.push(category);
      return of(undefined);
    });
  }
  getAll = vi.fn();
  update = vi.fn();
  remove = vi.fn();
}

const categories: Category[] = [
  { id: 'personal', name: 'Personal', color: '#3880ff' },
  { id: 'trabajo', name: 'Trabajo', color: '#2dd36f' },
];

describe('AddCategoryUseCase', async () => {
  let repo: FakeCategoryRepository;
  let useCase: AddCategoryUseCase;

  beforeEach(() => {
    repo = new FakeCategoryRepository();
    useCase = new AddCategoryUseCase(repo);
  });

  it('crea y guarda la categoría con el nombre recortado y el color indicado', async () => {
    const { category, saved } = useCase.execute({
      name: '  Estudio ',
      color: '#123456',
      categories,
    });
    await firstValueFrom(saved);

    expect(category).toMatchObject({ name: 'Estudio', color: '#123456' });
    expect(repo.added).toEqual([category]);
  });

  it('sin color propone el siguiente de la paleta', async () => {
    const { category, saved } = useCase.execute({ name: 'Estudio', categories });
    await firstValueFrom(saved);

    expect(category?.color).toBe('#ffc409');
  });

  it('rechaza un nombre vacío', async () => {
    const { category, saved } = useCase.execute({ name: '   ', categories });
    await firstValueFrom(saved);

    expect(category).toBeNull();
    expect(repo.added).toEqual([]);
  });

  it('rechaza un nombre repetido sin distinguir mayúsculas ni tildes', async () => {
    const { category, saved } = useCase.execute({ name: ' TRABÁJO ', categories });
    await firstValueFrom(saved);

    expect(category).toBeNull();
    expect(repo.added).toEqual([]);
  });

  it('propaga el fallo de persistencia', async () => {
    repo.add = () => throwError(() => new Error('sin espacio'));

    await expect(
      firstValueFrom(useCase.execute({ name: 'Estudio', categories }).saved),
    ).rejects.toThrow('sin espacio');
  });
});
