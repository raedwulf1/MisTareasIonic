import { Task } from '../../domain/entities/task';
import { CategoryMapper } from './category.mapper';
import { FlagOverridesMapper } from './flag-overrides.mapper';
import { TaskMapper } from './task.mapper';

const task: Task = { id: 'a', title: 'A', completed: true, categoryId: 'x', createdAt: 5 };

describe('TaskMapper', () => {
  it('toDto y toDomain son inversas', () => {
    expect(TaskMapper.toDomain(TaskMapper.toDto(task))).toEqual(task);
  });

  it('toDto no arrastra campos ajenos al formato persistido', () => {
    const dto = TaskMapper.toDto({ ...task, extra: 1 } as Task);

    expect(Object.keys(dto).sort()).toEqual([
      'categoryId',
      'completed',
      'createdAt',
      'id',
      'title',
    ]);
  });

  it('completa los campos opcionales que faltan', () => {
    const result = TaskMapper.toDomain({ id: 'a', title: 'A', createdAt: 1 });

    expect(result).toEqual({
      id: 'a',
      title: 'A',
      completed: false,
      categoryId: null,
      createdAt: 1,
    });
  });

  it.each([null, 'x', 7, {}, { id: 'a' }, { id: 'a', title: 'A', createdAt: 'hoy' }])(
    'descarta el registro dañado %j',
    (raw) => {
      expect(TaskMapper.toDomain(raw)).toBeNull();
    },
  );

  it('toDomainList ignora los registros dañados y tolera que no sea una lista', () => {
    expect(TaskMapper.toDomainList([TaskMapper.toDto(task), null, { id: 1 }])).toEqual([task]);
    expect(TaskMapper.toDomainList({})).toEqual([]);
  });
});

describe('CategoryMapper', () => {
  it('toDto y toDomain son inversas', () => {
    const category = { id: 'c', name: 'Casa', color: '#123456' };

    expect(CategoryMapper.toDomain(CategoryMapper.toDto(category))).toEqual(category);
  });

  it('usa un color por defecto si falta', () => {
    expect(CategoryMapper.toDomain({ id: 'c', name: 'Casa' })?.color).toBe('#5f6b7a');
  });

  it('toDomainList devuelve null si no es una lista y [] si la lista está vacía', () => {
    expect(CategoryMapper.toDomainList('basura')).toBeNull();
    expect(CategoryMapper.toDomainList([])).toEqual([]);
    expect(
      CategoryMapper.toDomainList([{ id: 1 }, { id: 'c', name: 'Casa', color: '#fff' }]),
    ).toEqual([{ id: 'c', name: 'Casa', color: '#fff' }]);
  });
});

describe('FlagOverridesMapper', () => {
  it('conserva solo los flags conocidos con valor booleano', () => {
    const result = FlagOverridesMapper.toDomain({ categories_enabled: false, otro: true });

    expect(result).toEqual({ categories_enabled: false });
    expect(FlagOverridesMapper.toDomain({ categories_enabled: 'no' })).toEqual({});
    expect(FlagOverridesMapper.toDomain(null)).toEqual({});
  });

  it('toDto omite los flags sin valor', () => {
    expect(FlagOverridesMapper.toDto({})).toEqual({});
    expect(FlagOverridesMapper.toDto({ categories_enabled: true })).toEqual({
      categories_enabled: true,
    });
  });
});
