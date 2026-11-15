import { Category } from './category';
import {
  Task,
  applyTaskChanges,
  buildDemoTasks,
  createTask,
  insertByCreationDate,
  toggleCompleted,
  unassignCategory,
} from './task';

const task = (id: string, createdAt: number, categoryId: string | null = null): Task => ({
  id,
  title: id,
  completed: false,
  categoryId,
  createdAt,
});

describe('domain/task', () => {
  describe('createTask', () => {
    it('recorta el título y crea la tarea pendiente', () => {
      const input = { id: '1', title: '  Pan ', categoryId: 'c', createdAt: 5 };

      const created = createTask(input);

      expect(created).toEqual({
        id: '1',
        title: 'Pan',
        completed: false,
        categoryId: 'c',
        createdAt: 5,
      });
    });

    it('rechaza títulos vacíos', () => {
      const input = { id: '1', title: '   ', categoryId: null, createdAt: 5 };

      const created = createTask(input);

      expect(created).toBeNull();
    });
  });

  describe('applyTaskChanges', () => {
    it('recorta el título nuevo', () => {
      const original = task('a', 1);

      const updated = applyTaskChanges(original, { title: '  Nuevo ' });

      expect(updated.title).toBe('Nuevo');
    });

    it('conserva el título anterior si el nuevo queda vacío', () => {
      const original = task('a', 1);

      const updated = applyTaskChanges(original, { title: '  ' });

      expect(updated.title).toBe('a');
    });

    it('cambia la categoría sin tocar el título', () => {
      const original = task('a', 1);

      const updated = applyTaskChanges(original, { categoryId: 'x' });

      expect(updated).toMatchObject({ title: 'a', categoryId: 'x' });
    });
  });

  describe('toggleCompleted', () => {
    it('marca como completada una tarea pendiente', () => {
      const original = task('a', 1);

      const toggled = toggleCompleted(original);

      expect(toggled.completed).toBe(true);
    });

    it('no muta la tarea original', () => {
      const original = task('a', 1);

      toggleCompleted(original);

      expect(original.completed).toBe(false);
    });
  });

  describe('insertByCreationDate', () => {
    it('inserta en medio respetando el orden de más nueva a más antigua', () => {
      const list = [task('c', 30), task('a', 10)];

      const result = insertByCreationDate(list, task('b', 20));

      expect(result.map((t) => t.id)).toEqual(['c', 'b', 'a']);
    });

    it('inserta al final si es la más antigua', () => {
      const list = [task('c', 30), task('a', 10)];

      const result = insertByCreationDate(list, task('z', 1));

      expect(result.map((t) => t.id)).toEqual(['c', 'a', 'z']);
    });
  });

  describe('unassignCategory', () => {
    it('deja sin categoría solo las tareas afectadas', () => {
      const list = [task('a', 2, 'x'), task('b', 1, 'y')];

      const result = unassignCategory(list, 'x');

      expect(result.map((t) => t.categoryId)).toEqual([null, 'y']);
    });

    it('devuelve la misma lista si nada cambia', () => {
      const list = [task('a', 1, 'y')];

      const result = unassignCategory(list, 'x');

      expect(result).toBe(list);
    });
  });

  describe('buildDemoTasks', () => {
    const categories: Category[] = [
      { id: 'p', name: 'P', color: '#000000' },
      { id: 'q', name: 'Q', color: '#ffffff' },
    ];

    it('numera los títulos', () => {
      const demo = buildDemoTasks(5, categories, 100, () => 'id');

      expect(demo.map((t) => t.title)).toEqual([
        'Tarea de prueba #1',
        'Tarea de prueba #2',
        'Tarea de prueba #3',
        'Tarea de prueba #4',
        'Tarea de prueba #5',
      ]);
    });

    it('reparte las categorías', () => {
      const demo = buildDemoTasks(5, categories, 100, () => 'id');

      expect(demo.map((t) => t.categoryId)).toEqual([null, 'q', 'p', 'q', null]);
    });

    it('completa una de cada tres', () => {
      const demo = buildDemoTasks(5, categories, 100, () => 'id');

      expect(demo.map((t) => t.completed)).toEqual([true, false, false, true, false]);
    });

    it('ordena por fecha de más nueva a más antigua', () => {
      const demo = buildDemoTasks(5, categories, 100, () => 'id');

      expect(demo.map((t) => t.createdAt)).toEqual([100, 99, 98, 97, 96]);
    });

    it('genera ids únicos', () => {
      let n = 0;

      const demo = buildDemoTasks(5, categories, 100, () => `id-${n++}`);

      expect(new Set(demo.map((t) => t.id)).size).toBe(5);
    });

    it('sin categorías crea tareas sin categoría', () => {
      const demo = buildDemoTasks(3, [], 0, () => 'id');

      expect(demo.every((t) => t.categoryId === null)).toBe(true);
    });
  });
});
