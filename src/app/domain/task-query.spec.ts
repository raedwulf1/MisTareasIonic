import { Task } from './task';
import { countTasks, filterTasks, isSpecificCategory } from './task-query';

const TASKS: Task[] = [
  { id: '1', title: 'Café con Ana', completed: false, categoryId: 'personal', createdAt: 3 },
  { id: '2', title: 'Informe', completed: true, categoryId: 'trabajo', createdAt: 2 },
  { id: '3', title: 'Sin categoría', completed: false, categoryId: null, createdAt: 1 },
];

const titles = (tasks: readonly Task[]) => tasks.map((t) => t.title);

describe('domain/task-query', () => {
  describe('filterTasks', () => {
    it('sin filtros devuelve la misma referencia', () => {
      const query = { category: 'all', status: 'all', search: '  ' } as const;

      const result = filterTasks(TASKS, query);

      expect(result).toBe(TASKS);
    });

    it('filtra por categoría concreta', () => {
      const query = { category: 'trabajo', status: 'all', search: '' } as const;

      const result = filterTasks(TASKS, query);

      expect(titles(result)).toEqual(['Informe']);
    });

    it('filtra por "sin categoría"', () => {
      const query = { category: 'none', status: 'all', search: '' } as const;

      const result = filterTasks(TASKS, query);

      expect(titles(result)).toEqual(['Sin categoría']);
    });

    it('filtra por estado pendiente', () => {
      const query = { category: 'all', status: 'pending', search: '' } as const;

      const result = filterTasks(TASKS, query);

      expect(titles(result)).toEqual(['Café con Ana', 'Sin categoría']);
    });

    it('filtra por estado completada', () => {
      const query = { category: 'all', status: 'completed', search: '' } as const;

      const result = filterTasks(TASKS, query);

      expect(titles(result)).toEqual(['Informe']);
    });

    it('busca sin distinguir mayúsculas ni tildes', () => {
      const query = { category: 'all', status: 'all', search: 'CAFE' } as const;

      const result = filterTasks(TASKS, query);

      expect(titles(result)).toEqual(['Café con Ana']);
    });

    it('combina filtros y puede devolver una lista vacía', () => {
      const query = { category: 'trabajo', status: 'all', search: 'cafe' } as const;

      const result = filterTasks(TASKS, query);

      expect(result).toEqual([]);
    });
  });

  describe('countTasks', () => {
    it('cuenta tareas en una sola pasada', () => {
      const counts = countTasks(TASKS);

      expect(counts).toMatchObject({ all: 3, completed: 1, pending: 2, uncategorized: 1 });
      expect(counts.byCategory.get('personal')).toBe(1);
      expect(counts.byCategory.get('trabajo')).toBe(1);
    });
  });

  describe('isSpecificCategory', () => {
    it.each([
      ['all', false],
      ['none', false],
      ['trabajo', true],
    ])('"%s" → %s', (filter, expected) => {
      const result = isSpecificCategory(filter);

      expect(result).toBe(expected);
    });
  });
});
