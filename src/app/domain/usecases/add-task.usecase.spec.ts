import { defer, firstValueFrom, of, throwError } from 'rxjs';

import { Category } from '../entities/category';
import { Task } from '../entities/task';
import { TaskRepository } from '../repositories/task.repository';
import { AddTaskUseCase } from './add-task.usecase';

class FakeTaskRepository extends TaskRepository {
  readonly added: Task[] = [];
  add(task: Task) {
    return defer(() => {
      this.added.push(task);
      return of(undefined);
    });
  }
  getAll = vi.fn();
  addMany = vi.fn();
  restore = vi.fn();
  update = vi.fn();
  remove = vi.fn();
  removeCompleted = vi.fn();
  clear = vi.fn();
  replaceAll = vi.fn();
}

const categories: Category[] = [{ id: 'trabajo', name: 'Trabajo', color: '#000000' }];

describe('AddTaskUseCase', async () => {
  let repo: FakeTaskRepository;
  let useCase: AddTaskUseCase;

  beforeEach(() => {
    repo = new FakeTaskRepository();
    useCase = new AddTaskUseCase(repo);
  });

  it('crea y guarda la tarea recortando el título', async () => {
    const { task, saved } = useCase.execute({
      title: '  Informe  ',
      categoryId: 'trabajo',
      categories,
      categoriesEnabled: true,
    });
    await firstValueFrom(saved);

    expect(task).toMatchObject({ title: 'Informe', categoryId: 'trabajo', completed: false });
    expect(repo.added).toEqual([task]);
  });

  it('con título vacío no crea ni guarda nada', async () => {
    const { task, saved } = useCase.execute({
      title: '   ',
      categoryId: null,
      categories,
      categoriesEnabled: true,
    });
    await firstValueFrom(saved);

    expect(task).toBeNull();
    expect(repo.added).toEqual([]);
  });

  it('con las categorías desactivadas crea la tarea sin categoría', async () => {
    const { task, saved } = useCase.execute({
      title: 'A',
      categoryId: 'trabajo',
      categories,
      categoriesEnabled: false,
    });
    await firstValueFrom(saved);

    expect(task?.categoryId).toBeNull();
  });

  it('descarta una categoría que no existe', async () => {
    const { task, saved } = useCase.execute({
      title: 'A',
      categoryId: 'borrada',
      categories,
      categoriesEnabled: true,
    });
    await firstValueFrom(saved);

    expect(task?.categoryId).toBeNull();
  });

  it('propaga el fallo de persistencia', async () => {
    repo.add = () => throwError(() => new Error('sin espacio'));

    await expect(
      firstValueFrom(
        useCase.execute({
          title: 'A',
          categoryId: null,
          categories,
          categoriesEnabled: true,
        }).saved,
      ),
    ).rejects.toThrow('sin espacio');
  });
});
