import { TestBed } from '@angular/core/testing';

import { FeatureFlagsService } from './feature-flags.service';
import { KeyValueStore } from '../../domain/ports/key-value-store';
import { Category, defaultCategories } from '../../domain/entities/category';
import { Task, insertByCreationDate } from '../../domain/entities/task';
import { RemoteConfigGateway } from '../../domain/ports/remote-config.gateway';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TodoStore } from './todo.store';

/** Persistencia en memoria: sustituye a `localStorage` sin tocar el código de aplicación. */
class InMemoryKeyValueStore extends KeyValueStore {
  readonly data = new Map<string, unknown>();
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
    for (const [key, snapshot] of this.pending) this.data.set(key, snapshot());
    this.pending.clear();
  }
}

/** Repositorio de tareas en memoria: sustituye a la persistencia sin tocar el store. */
class InMemoryTaskRepository extends TaskRepository {
  tasks: readonly Task[] = [];
  async getAll() {
    return this.tasks;
  }
  async add(task: Task) {
    this.tasks = [task, ...this.tasks];
  }
  async addMany(tasks: readonly Task[]) {
    this.tasks = [...tasks, ...this.tasks];
  }
  async restore(task: Task) {
    this.tasks = insertByCreationDate(this.tasks, task);
  }
  async update(task: Task) {
    this.tasks = this.tasks.map((t) => (t.id === task.id ? task : t));
  }
  async remove(id: string) {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }
  async removeCompleted() {
    this.tasks = this.tasks.filter((t) => !t.completed);
  }
  async clear() {
    this.tasks = [];
  }
  async replaceAll(tasks: readonly Task[]) {
    this.tasks = tasks;
  }
}

class InMemoryCategoryRepository extends CategoryRepository {
  categories: readonly Category[] = defaultCategories();
  async getAll() {
    return this.categories;
  }
  async add(category: Category) {
    this.categories = [...this.categories, category];
  }
  async update(category: Category) {
    this.categories = this.categories.map((c) => (c.id === category.id ? category : c));
  }
  async remove(id: string) {
    this.categories = this.categories.filter((c) => c.id !== id);
  }
}

class FakeRemoteConfig extends RemoteConfigGateway {
  available = true;
  values: Record<string, unknown> = {};
  fetchError: unknown = null;
  readonly fetches: boolean[] = [];
  private resume?: () => void;

  whenReady(): Promise<void> {
    return Promise.resolve();
  }
  isAvailable(): boolean {
    return this.available;
  }
  configure(): Promise<void> {
    return Promise.resolve();
  }
  fetchAndActivate(force: boolean): Promise<void> {
    this.fetches.push(force);
    return this.fetchError ? Promise.reject(this.fetchError) : Promise.resolve();
  }
  getActiveValues(): Promise<Record<string, unknown>> {
    return Promise.resolve(this.values);
  }
  onResume(callback: () => void): void {
    this.resume = callback;
  }
  triggerResume(): void {
    this.resume?.();
  }
}

describe('Capa de aplicación con puertos falsos', () => {
  let storage: InMemoryKeyValueStore;
  let remote: FakeRemoteConfig;
  let taskRepo: InMemoryTaskRepository;
  let categoryRepo: InMemoryCategoryRepository;

  beforeEach(() => {
    storage = new InMemoryKeyValueStore();
    remote = new FakeRemoteConfig();
    taskRepo = new InMemoryTaskRepository();
    categoryRepo = new InMemoryCategoryRepository();
    TestBed.configureTestingModule({
      providers: [
        { provide: KeyValueStore, useValue: storage },
        { provide: RemoteConfigGateway, useValue: remote },
        { provide: TaskRepository, useValue: taskRepo },
        { provide: CategoryRepository, useValue: categoryRepo },
      ],
    });
  });

  describe('FeatureFlagsService', () => {
    it('aplica los valores remotos', async () => {
      remote.values = { categories_enabled: 'false' };
      const flags = TestBed.inject(FeatureFlagsService);
      await flags.init();

      await flags.refresh();

      expect(flags.categoriesEnabled()).toBe(false);
      expect(flags.status()).toBe('ready');
    });

    it('vuelve a consultar los valores remotos al reanudar la app', async () => {
      remote.values = { categories_enabled: 'false' };
      const flags = TestBed.inject(FeatureFlagsService);
      await flags.init();
      await flags.refresh();
      remote.values = { categories_enabled: 'true' };

      remote.triggerResume();
      await flags.refresh();

      expect(flags.categoriesEnabled()).toBe(true);
    });

    it('refresh(true) fuerza la descarga ignorando la caché', async () => {
      const flags = TestBed.inject(FeatureFlagsService);

      await flags.refresh(true);

      expect(remote.fetches).toEqual([true]);
    });

    it('si la descarga falla conserva los valores y expone el error', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      remote.fetchError = 'sin red';
      const flags = TestBed.inject(FeatureFlagsService);

      await flags.refresh();

      expect(flags.status()).toBe('error');
      expect(flags.lastError()).toBe('sin red');
      expect(flags.categoriesEnabled()).toBe(true);
    });

    it('sin proveedor remoto queda "unavailable" y refresh no hace nada', async () => {
      remote.available = false;
      const flags = TestBed.inject(FeatureFlagsService);
      await flags.init();

      await flags.refresh();

      expect(flags.status()).toBe('unavailable');
      expect(remote.fetches).toEqual([]);
    });

    it('los overrides se persisten de inmediato a través del puerto', () => {
      const flags = TestBed.inject(FeatureFlagsService);

      flags.setOverride('categories_enabled', false);

      expect(storage.data.get('todo.flagOverrides.v1')).toEqual({ categories_enabled: false });
    });
  });

  describe('TodoStore', () => {
    it('guarda los cambios a través de los repositorios', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();

      const task = store.addTask('Persistida')!;
      store.toggleTask(task.id);
      store.addCategory('Estudio');
      await Promise.resolve();

      expect(taskRepo.tasks[0]).toMatchObject({ title: 'Persistida', completed: true });
      expect(categoryRepo.categories.map((c) => c.name)).toContain('Estudio');
    });

    it('carga el estado inicial desde los repositorios', async () => {
      await taskRepo.add({
        id: 't',
        title: 'Guardada',
        completed: false,
        categoryId: null,
        createdAt: 1,
      });
      const store = TestBed.inject(TodoStore);

      await store.load();

      expect(store.tasks().map((t) => t.title)).toEqual(['Guardada']);
      expect(store.categories()).toHaveLength(3);
    });

    it('al eliminar una categoría guarda sus tareas sin categoría', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();
      store.addTask('A', 'trabajo');

      store.removeCategory('trabajo');
      await Promise.resolve();

      expect(taskRepo.tasks[0].categoryId).toBeNull();
      expect(categoryRepo.categories.some((c) => c.id === 'trabajo')).toBe(false);
    });

    it('con las categorías desactivadas, las tareas nuevas se crean sin categoría', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();
      TestBed.inject(FeatureFlagsService).setOverride('categories_enabled', false);

      const task = store.addTask('A', 'trabajo')!;

      expect(task.categoryId).toBeNull();
    });

    it('con las categorías desactivadas, editar no cambia la categoría de la tarea', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();
      const task = store.addTask('A', 'compras')!;
      TestBed.inject(FeatureFlagsService).setOverride('categories_enabled', false);

      store.updateTask(task.id, { title: 'B', categoryId: 'trabajo' });

      expect(store.tasks()[0]).toMatchObject({ title: 'B', categoryId: 'compras' });
    });

    it('con las categorías activas, editar sí cambia la categoría', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();
      const task = store.addTask('A', 'compras')!;

      store.updateTask(task.id, { categoryId: null });

      expect(store.tasks()[0].categoryId).toBeNull();
    });

    it('propone el siguiente color de la paleta para una categoría nueva', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();
      const proposed = store.nextCategoryColor();

      const category = store.addCategory('Estudio')!;

      expect(category.color).toBe(proposed);
      expect(store.nextCategoryColor()).not.toBe(proposed);
    });

    it('si se elimina la categoría filtrada, el filtro vuelve a "Todas"', async () => {
      const store = TestBed.inject(TodoStore);
      await store.load();
      store.categoryFilter.set('trabajo');

      store.removeCategory('trabajo');
      TestBed.tick();

      expect(store.categoryFilter()).toBe('all');
    });
  });
});
