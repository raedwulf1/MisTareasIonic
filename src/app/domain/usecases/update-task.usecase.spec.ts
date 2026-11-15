import { defer, firstValueFrom, of } from 'rxjs';

import { Task } from '../entities/task';
import { TaskRepository } from '../repositories/task.repository';
import { UpdateTaskUseCase } from './update-task.usecase';

class FakeTaskRepository extends TaskRepository {
  readonly updated: Task[] = [];
  update(task: Task) {
    return defer(() => {
      this.updated.push(task);
      return of(undefined);
    });
  }
  getAll = vi.fn();
  add = vi.fn();
  addMany = vi.fn();
  restore = vi.fn();
  remove = vi.fn();
  removeCompleted = vi.fn();
  clear = vi.fn();
  replaceAll = vi.fn();
}

const base: Task = { id: 'a', title: 'A', completed: false, categoryId: 'compras', createdAt: 1 };
const other: Task = { id: 'b', title: 'B', completed: false, categoryId: null, createdAt: 2 };

describe('UpdateTaskUseCase', async () => {
  let repo: FakeTaskRepository;
  let useCase: UpdateTaskUseCase;

  beforeEach(() => {
    repo = new FakeTaskRepository();
    useCase = new UpdateTaskUseCase(repo);
  });

  it('con las categorías activas aplica título y categoría y lo guarda', async () => {
    const { tasks, task, saved } = useCase.execute({
      tasks: [base, other],
      id: 'a',
      changes: { title: ' Nuevo ', categoryId: 'trabajo' },
      categoriesEnabled: true,
    });
    await firstValueFrom(saved);

    expect(task).toMatchObject({ title: 'Nuevo', categoryId: 'trabajo' });
    expect(tasks[0]).toBe(task);
    expect(tasks[1]).toBe(other);
    expect(repo.updated).toEqual([task]);
  });

  it('con las categorías desactivadas conserva la categoría y cambia el resto', async () => {
    const { task, saved } = useCase.execute({
      tasks: [base],
      id: 'a',
      changes: { title: 'B', categoryId: 'trabajo' },
      categoriesEnabled: false,
    });
    await firstValueFrom(saved);

    expect(task).toMatchObject({ title: 'B', categoryId: 'compras' });
  });

  it('con las categorías desactivadas no permite quitar la categoría', async () => {
    const { task, saved } = useCase.execute({
      tasks: [base],
      id: 'a',
      changes: { categoryId: null },
      categoriesEnabled: false,
    });
    await firstValueFrom(saved);

    expect(task?.categoryId).toBe('compras');
  });

  it('con un id inexistente no cambia ni guarda nada', async () => {
    const { tasks, task, saved } = useCase.execute({
      tasks: [base],
      id: 'nope',
      changes: { title: 'X' },
      categoriesEnabled: true,
    });
    await firstValueFrom(saved);

    expect(task).toBeUndefined();
    expect(tasks).toEqual([base]);
    expect(repo.updated).toEqual([]);
  });

  it('no muta la lista original', async () => {
    const input = [base];

    await firstValueFrom(
      useCase.execute({ tasks: input, id: 'a', changes: { title: 'Z' }, categoriesEnabled: true })
        .saved,
    );

    expect(input[0].title).toBe('A');
  });
});
