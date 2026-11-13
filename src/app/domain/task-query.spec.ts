import { Task } from './task';
import { countTasks, filterTasks, isSpecificCategory } from './task-query';

const TASKS: Task[] = [
  { id: '1', title: 'Café con Ana', completed: false, categoryId: 'personal', createdAt: 3 },
  { id: '2', title: 'Informe', completed: true, categoryId: 'trabajo', createdAt: 2 },
  { id: '3', title: 'Sin categoría', completed: false, categoryId: null, createdAt: 1 },
];

const titles = (tasks: readonly Task[]) => tasks.map((t) => t.title);

describe('domain/task-query', () => {
  it('sin filtros devuelve la misma referencia', () => {
    expect(filterTasks(TASKS, { category: 'all', status: 'all', search: '  ' })).toBe(TASKS);
  });

  it('filtra por categoría concreta y por "sin categoría"', () => {
    expect(titles(filterTasks(TASKS, { category: 'trabajo', status: 'all', search: '' }))).toEqual([
      'Informe',
    ]);
    expect(titles(filterTasks(TASKS, { category: 'none', status: 'all', search: '' }))).toEqual([
      'Sin categoría',
    ]);
  });

  it('filtra por estado', () => {
    expect(titles(filterTasks(TASKS, { category: 'all', status: 'pending', search: '' }))).toEqual([
      'Café con Ana',
      'Sin categoría',
    ]);
    expect(
      titles(filterTasks(TASKS, { category: 'all', status: 'completed', search: '' })),
    ).toEqual(['Informe']);
  });

  it('busca sin distinguir mayúsculas ni tildes y combina filtros', () => {
    expect(titles(filterTasks(TASKS, { category: 'all', status: 'all', search: 'CAFE' }))).toEqual([
      'Café con Ana',
    ]);
    expect(filterTasks(TASKS, { category: 'trabajo', status: 'all', search: 'cafe' })).toEqual([]);
  });

  it('cuenta tareas en una sola pasada', () => {
    const counts = countTasks(TASKS);
    expect(counts).toMatchObject({ all: 3, completed: 1, pending: 2, uncategorized: 1 });
    expect(counts.byCategory.get('personal')).toBe(1);
    expect(counts.byCategory.get('trabajo')).toBe(1);
  });

  it('isSpecificCategory distingue ids de los filtros especiales', () => {
    expect(isSpecificCategory('all')).toBe(false);
    expect(isSpecificCategory('none')).toBe(false);
    expect(isSpecificCategory('trabajo')).toBe(true);
  });
});
