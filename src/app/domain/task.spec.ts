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
  it('createTask recorta el título y crea la tarea pendiente', () => {
    expect(createTask({ id: '1', title: '  Pan ', categoryId: 'c', createdAt: 5 })).toEqual({
      id: '1',
      title: 'Pan',
      completed: false,
      categoryId: 'c',
      createdAt: 5,
    });
  });

  it('createTask rechaza títulos vacíos', () => {
    expect(createTask({ id: '1', title: '   ', categoryId: null, createdAt: 5 })).toBeNull();
  });

  it('applyTaskChanges recorta el título y conserva el anterior si queda vacío', () => {
    const t = task('a', 1);
    expect(applyTaskChanges(t, { title: '  Nuevo ' }).title).toBe('Nuevo');
    expect(applyTaskChanges(t, { title: '  ' }).title).toBe('a');
    expect(applyTaskChanges(t, { categoryId: 'x' })).toMatchObject({ title: 'a', categoryId: 'x' });
  });

  it('toggleCompleted no muta la tarea original', () => {
    const t = task('a', 1);
    expect(toggleCompleted(t).completed).toBe(true);
    expect(t.completed).toBe(false);
  });

  it('insertByCreationDate respeta el orden de más nueva a más antigua', () => {
    const list = [task('c', 30), task('a', 10)];
    expect(insertByCreationDate(list, task('b', 20)).map((t) => t.id)).toEqual(['c', 'b', 'a']);
    expect(insertByCreationDate(list, task('z', 1)).map((t) => t.id)).toEqual(['c', 'a', 'z']);
  });

  it('unassignCategory deja sin categoría solo las tareas afectadas', () => {
    const list = [task('a', 2, 'x'), task('b', 1, 'y')];
    expect(unassignCategory(list, 'x').map((t) => t.categoryId)).toEqual([null, 'y']);
  });

  it('unassignCategory devuelve la misma lista si nada cambia', () => {
    const list = [task('a', 1, 'y')];
    expect(unassignCategory(list, 'x')).toBe(list);
  });

  it('buildDemoTasks reparte categorías, completa una de cada tres y ordena por fecha', () => {
    const categories: Category[] = [
      { id: 'p', name: 'P', color: '#000000' },
      { id: 'q', name: 'Q', color: '#ffffff' },
    ];
    const demo = buildDemoTasks(5, categories, 100, () => 'id');
    expect(demo.map((t) => t.title)).toEqual([
      'Tarea de prueba #1',
      'Tarea de prueba #2',
      'Tarea de prueba #3',
      'Tarea de prueba #4',
      'Tarea de prueba #5',
    ]);
    expect(demo.map((t) => t.categoryId)).toEqual([null, 'q', 'p', 'q', null]);
    expect(demo.map((t) => t.completed)).toEqual([true, false, false, true, false]);
    expect(demo.map((t) => t.createdAt)).toEqual([100, 99, 98, 97, 96]);
    expect(new Set(demo.map((t) => t.id)).size).toBe(5);
  });

  it('buildDemoTasks sin categorías crea tareas sin categoría', () => {
    expect(buildDemoTasks(3, [], 0, () => 'id').every((t) => t.categoryId === null)).toBe(true);
  });
});
