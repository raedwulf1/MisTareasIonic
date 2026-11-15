import { defer, firstValueFrom, of, throwError } from 'rxjs';

import { Task } from '../entities/task';
import { CategoryRepository } from '../repositories/category.repository';
import { TaskRepository } from '../repositories/task.repository';
import { RemoveCategoryUseCase } from './remove-category.usecase';

class FakeCategoryRepository extends CategoryRepository {
  readonly removed: string[] = [];
  remove(id: string) {
    return defer(() => {
      this.removed.push(id);
      return of(undefined);
    });
  }
  getAll = vi.fn();
  add = vi.fn();
  update = vi.fn();
}

class FakeTaskRepository extends TaskRepository {
  readonly replaced: (readonly Task[])[] = [];
  replaceAll(tasks: readonly Task[]) {
    return defer(() => {
      this.replaced.push(tasks);
      return of(undefined);
    });
  }
  getAll = vi.fn();
  add = vi.fn();
  addMany = vi.fn();
  restore = vi.fn();
  update = vi.fn();
  remove = vi.fn();
  removeCompleted = vi.fn();
  clear = vi.fn();
}

const task = (id: string, categoryId: string | null): Task => ({
  id,
  title: id,
  completed: false,
  categoryId,
  createdAt: 1,
});

describe('RemoveCategoryUseCase', async () => {
  let categories: FakeCategoryRepository;
  let tasks: FakeTaskRepository;
  let useCase: RemoveCategoryUseCase;

  beforeEach(() => {
    categories = new FakeCategoryRepository();
    tasks = new FakeTaskRepository();
    useCase = new RemoveCategoryUseCase(categories, tasks);
  });

  it('elimina la categoría y deja sus tareas sin categoría, sin borrarlas', async () => {
    const a = task('a', 'trabajo');
    const b = task('b', 'compras');

    const result = useCase.execute({ id: 'trabajo', tasks: [a, b] });
    await firstValueFrom(result.saved);

    expect(result.tasks).toEqual([{ ...a, categoryId: null }, b]);
    expect(result.tasks[1]).toBe(b);
    expect(categories.removed).toEqual(['trabajo']);
    expect(tasks.replaced).toEqual([result.tasks]);
  });

  it('si ninguna tarea la usa, no reescribe las tareas', async () => {
    const list = [task('a', 'compras')];

    const result = useCase.execute({ id: 'trabajo', tasks: list });
    await firstValueFrom(result.saved);

    expect(result.tasks).toBe(list);
    expect(categories.removed).toEqual(['trabajo']);
    expect(tasks.replaced).toEqual([]);
  });

  it('propaga el fallo de cualquiera de los dos repositorios', async () => {
    tasks.replaceAll = () => throwError(() => new Error('fallo'));

    await expect(
      firstValueFrom(useCase.execute({ id: 'trabajo', tasks: [task('a', 'trabajo')] }).saved),
    ).rejects.toThrow('fallo');
  });
});
