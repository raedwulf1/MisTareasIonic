import { firstValueFrom } from 'rxjs';

import { TestBed } from '@angular/core/testing';

import { Task } from '../../domain/entities/task';
import { KeyValueStore } from '../../domain/ports/key-value-store';
import { CATEGORIES_KEY, LocalCategoryRepository } from './local-category.repository';
import {
  FLAG_OVERRIDES_KEY,
  LocalFlagOverridesRepository,
} from './local-flag-overrides.repository';
import { LocalTaskRepository, TASKS_KEY } from './local-task.repository';

/** Almacén en memoria que cuenta cuántas veces se serializa cada clave al volcar. */
class InMemoryKeyValueStore extends KeyValueStore {
  readonly data = new Map<string, unknown>();
  readonly flushes = new Map<string, number>();
  private readonly pending = new Map<string, () => unknown>();

  read<T>(key: string, fallback: T): T {
    return this.data.has(key) ? (this.data.get(key) as T) : fallback;
  }
  write(key: string, value: unknown): void {
    this.data.set(key, value);
  }
  scheduleWrite(key: string, snapshot: () => unknown): void {
    this.pending.set(key, snapshot);
  }
  flush(): void {
    for (const [key, snapshot] of this.pending) {
      this.data.set(key, snapshot());
      this.flushes.set(key, (this.flushes.get(key) ?? 0) + 1);
    }
    this.pending.clear();
  }
}

const task = (id: string, createdAt: number, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  completed: false,
  categoryId: null,
  createdAt,
  ...extra,
});

describe('Repositorios locales', () => {
  let storage: InMemoryKeyValueStore;

  beforeEach(() => {
    storage = new InMemoryKeyValueStore();
    TestBed.configureTestingModule({ providers: [{ provide: KeyValueStore, useValue: storage }] });
  });

  describe('LocalTaskRepository', () => {
    it('devuelve las tareas guardadas con el formato existente', async () => {
      storage.data.set(TASKS_KEY, [task('a', 1)]);

      const tasks = await firstValueFrom(TestBed.inject(LocalTaskRepository).getAll());

      expect(tasks.map((t) => t.id)).toEqual(['a']);
    });

    it('sin datos guardados devuelve una lista vacía', async () => {
      expect(await firstValueFrom(TestBed.inject(LocalTaskRepository).getAll())).toEqual([]);
    });

    it('add y addMany insertan al principio', async () => {
      const repo = TestBed.inject(LocalTaskRepository);
      await firstValueFrom(repo.add(task('a', 1)));
      await firstValueFrom(repo.addMany([task('b', 3), task('c', 2)]));

      expect((await firstValueFrom(repo.getAll())).map((t) => t.id)).toEqual(['b', 'c', 'a']);
    });

    it('restore respeta el orden por fecha de creación', async () => {
      const repo = TestBed.inject(LocalTaskRepository);
      await firstValueFrom(repo.replaceAll([task('nueva', 3), task('vieja', 1)]));

      await firstValueFrom(repo.restore(task('media', 2)));

      expect((await firstValueFrom(repo.getAll())).map((t) => t.id)).toEqual([
        'nueva',
        'media',
        'vieja',
      ]);
    });

    it('update, remove, removeCompleted y clear', async () => {
      const repo = TestBed.inject(LocalTaskRepository);
      await firstValueFrom(
        repo.replaceAll([task('a', 3), task('b', 2, { completed: true }), task('c', 1)]),
      );

      await firstValueFrom(repo.update(task('a', 3, { title: 'Editada' })));
      expect((await firstValueFrom(repo.getAll()))[0].title).toBe('Editada');

      await firstValueFrom(repo.removeCompleted());
      expect((await firstValueFrom(repo.getAll())).map((t) => t.id)).toEqual(['a', 'c']);

      await firstValueFrom(repo.remove('a'));
      expect((await firstValueFrom(repo.getAll())).map((t) => t.id)).toEqual(['c']);

      await firstValueFrom(repo.clear());
      expect(await firstValueFrom(repo.getAll())).toEqual([]);
    });

    it('agrupa varias operaciones en una sola escritura en la clave original', async () => {
      const repo = TestBed.inject(LocalTaskRepository);

      await firstValueFrom(repo.add(task('a', 1)));
      await firstValueFrom(repo.add(task('b', 2)));
      await firstValueFrom(repo.update(task('a', 1, { completed: true })));
      storage.flush();

      expect(storage.flushes.get(TASKS_KEY)).toBe(1);
      expect((storage.data.get(TASKS_KEY) as Task[]).map((t) => t.id)).toEqual(['b', 'a']);
    });
  });

  describe('LocalCategoryRepository', () => {
    it('sin datos guardados devuelve las categorías por defecto', async () => {
      const categories = await firstValueFrom(TestBed.inject(LocalCategoryRepository).getAll());
      const names = categories.map((c) => c.name);

      expect(names).toEqual(['Personal', 'Trabajo', 'Compras']);
    });

    it('add, update y remove se guardan en la clave original', async () => {
      const repo = TestBed.inject(LocalCategoryRepository);

      await firstValueFrom(repo.add({ id: 'x', name: 'Estudio', color: '#123456' }));
      await firstValueFrom(repo.update({ id: 'x', name: 'Estudios', color: '#123456' }));
      await firstValueFrom(repo.remove('personal'));
      storage.flush();

      const saved = storage.data.get(CATEGORIES_KEY) as { id: string; name: string }[];
      expect(saved.map((c) => c.id)).toEqual(['trabajo', 'compras', 'x']);
      expect(saved[2].name).toBe('Estudios');
      expect(storage.flushes.get(CATEGORIES_KEY)).toBe(1);
    });
  });

  describe('LocalFlagOverridesRepository', () => {
    it('sin datos guardados devuelve {}', async () => {
      expect(await firstValueFrom(TestBed.inject(LocalFlagOverridesRepository).get())).toEqual({});
    });

    it('devuelve los overrides guardados con el formato existente', async () => {
      storage.data.set(FLAG_OVERRIDES_KEY, { categories_enabled: false });

      expect(await firstValueFrom(TestBed.inject(LocalFlagOverridesRepository).get())).toEqual({
        categories_enabled: false,
      });
    });

    it('guarda de inmediato, sin esperar al volcado agrupado', async () => {
      await firstValueFrom(
        TestBed.inject(LocalFlagOverridesRepository).save({ categories_enabled: true }),
      );

      expect(storage.data.get(FLAG_OVERRIDES_KEY)).toEqual({ categories_enabled: true });
    });
  });
});
