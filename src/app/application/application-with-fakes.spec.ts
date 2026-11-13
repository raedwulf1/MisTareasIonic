import { TestBed } from '@angular/core/testing';

import { FeatureFlagsService } from './feature-flags.service';
import { KeyValueStore } from './ports/key-value-store';
import { RemoteConfigGateway } from './ports/remote-config.gateway';
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

  beforeEach(() => {
    storage = new InMemoryKeyValueStore();
    remote = new FakeRemoteConfig();
    TestBed.configureTestingModule({
      providers: [
        { provide: KeyValueStore, useValue: storage },
        { provide: RemoteConfigGateway, useValue: remote },
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
    it('persiste a través del puerto con el formato esperado', () => {
      const store = TestBed.inject(TodoStore);
      store.addTask('Persistida');

      TestBed.tick();
      storage.flush();

      expect((storage.data.get('todo.tasks.v1') as { title: string }[])[0].title).toBe(
        'Persistida',
      );
    });

    it('con las categorías desactivadas, las tareas nuevas se crean sin categoría', () => {
      const store = TestBed.inject(TodoStore);
      TestBed.inject(FeatureFlagsService).setOverride('categories_enabled', false);

      const task = store.addTask('A', 'trabajo')!;

      expect(task.categoryId).toBeNull();
    });

    it('con las categorías desactivadas, editar no cambia la categoría de la tarea', () => {
      const store = TestBed.inject(TodoStore);
      const task = store.addTask('A', 'compras')!;
      TestBed.inject(FeatureFlagsService).setOverride('categories_enabled', false);

      store.updateTask(task.id, { title: 'B', categoryId: 'trabajo' });

      expect(store.tasks()[0]).toMatchObject({ title: 'B', categoryId: 'compras' });
    });

    it('con las categorías activas, editar sí cambia la categoría', () => {
      const store = TestBed.inject(TodoStore);
      const task = store.addTask('A', 'compras')!;

      store.updateTask(task.id, { categoryId: null });

      expect(store.tasks()[0].categoryId).toBeNull();
    });

    it('propone el siguiente color de la paleta para una categoría nueva', () => {
      const store = TestBed.inject(TodoStore);
      const proposed = store.nextCategoryColor();

      const category = store.addCategory('Estudio')!;

      expect(category.color).toBe(proposed);
      expect(store.nextCategoryColor()).not.toBe(proposed);
    });

    it('si se elimina la categoría filtrada, el filtro vuelve a "Todas"', () => {
      const store = TestBed.inject(TodoStore);
      store.categoryFilter.set('trabajo');

      store.removeCategory('trabajo');
      TestBed.tick();

      expect(store.categoryFilter()).toBe('all');
    });
  });
});
