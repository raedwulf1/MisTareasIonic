import { defer, firstValueFrom, of } from 'rxjs';

import { Category } from '../entities/category';
import { CategoryRepository } from '../repositories/category.repository';
import { UpdateCategoryUseCase } from './update-category.usecase';

class FakeCategoryRepository extends CategoryRepository {
  readonly updated: Category[] = [];
  update(category: Category) {
    return defer(() => {
      this.updated.push(category);
      return of(undefined);
    });
  }
  getAll = vi.fn();
  add = vi.fn();
  remove = vi.fn();
}

const personal: Category = { id: 'personal', name: 'Personal', color: '#3880ff' };
const trabajo: Category = { id: 'trabajo', name: 'Trabajo', color: '#2dd36f' };

describe('UpdateCategoryUseCase', async () => {
  let repo: FakeCategoryRepository;
  let useCase: UpdateCategoryUseCase;

  beforeEach(() => {
    repo = new FakeCategoryRepository();
    useCase = new UpdateCategoryUseCase(repo);
  });

  it('aplica nombre y color y lo guarda', async () => {
    const result = useCase.execute({
      categories: [personal, trabajo],
      id: 'personal',
      changes: { name: ' Casa ', color: '#000000' },
    });
    await firstValueFrom(result.saved);

    expect(result.accepted).toBe(true);
    expect(result.category).toEqual({ id: 'personal', name: 'Casa', color: '#000000' });
    expect(result.categories[0]).toBe(result.category);
    expect(result.categories[1]).toBe(trabajo);
    expect(repo.updated).toEqual([result.category]);
  });

  it('permite conservar el propio nombre (cambiar solo mayúsculas)', async () => {
    const result = useCase.execute({
      categories: [personal],
      id: 'personal',
      changes: { name: 'PERSONAL' },
    });
    await firstValueFrom(result.saved);

    expect(result.accepted).toBe(true);
    expect(result.category?.name).toBe('PERSONAL');
  });

  it('rechaza un nombre vacío sin guardar', async () => {
    const list = [personal];

    const result = useCase.execute({ categories: list, id: 'personal', changes: { name: '  ' } });
    await firstValueFrom(result.saved);

    expect(result.accepted).toBe(false);
    expect(result.categories).toBe(list);
    expect(repo.updated).toEqual([]);
  });

  it('rechaza el nombre de otra categoría', async () => {
    const result = useCase.execute({
      categories: [personal, trabajo],
      id: 'personal',
      changes: { name: 'trabajo' },
    });
    await firstValueFrom(result.saved);

    expect(result.accepted).toBe(false);
    expect(repo.updated).toEqual([]);
  });

  it('cambiar solo el color no valida el nombre', async () => {
    const result = useCase.execute({
      categories: [personal],
      id: 'personal',
      changes: { color: '#ffffff' },
    });
    await firstValueFrom(result.saved);

    expect(result.accepted).toBe(true);
    expect(result.category).toEqual({ ...personal, color: '#ffffff' });
  });

  it('con un id inexistente se acepta pero no cambia ni guarda nada', async () => {
    const result = useCase.execute({
      categories: [personal],
      id: 'nope',
      changes: { color: '#fff' },
    });
    await firstValueFrom(result.saved);

    expect(result.accepted).toBe(true);
    expect(result.category).toBeUndefined();
    expect(repo.updated).toEqual([]);
  });
});
