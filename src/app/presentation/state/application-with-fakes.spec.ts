import { Observable, defer, firstValueFrom, of, throwError } from 'rxjs';
import { AppError } from '../../domain/entities/app-error';
import { ErrorReporter } from '../../domain/ports/error-reporter';
import { TestBed } from '@angular/core/testing';

import { FeatureFlagsService } from './feature-flags.service';
import { Category, defaultCategories } from '../../domain/entities/category';
import { Task, insertByCreationDate } from '../../domain/entities/task';
import { RemoteConfigGateway } from '../../domain/ports/remote-config.gateway';
import { FlagValues } from '../../domain/entities/feature-flags';
import { FlagOverridesRepository } from '../../domain/repositories/flag-overrides.repository';
import { CategoryRepository } from '../../domain/repositories/category.repository';
import { TaskRepository } from '../../domain/repositories/task.repository';
import { TodoStore } from './todo.store';

/** Repositorio de tareas en memoria: sustituye a la persistencia sin tocar el store. */
class InMemoryTaskRepository extends TaskRepository {
  tasks: readonly Task[] = [];
  getAll() {
    return defer(() => of(this.tasks));
  }
  add(task: Task) {
    return defer(() => {
      this.tasks = [task, ...this.tasks];
      return of(undefined);
    });
  }
  addMany(tasks: readonly Task[]) {
    return defer(() => {
      this.tasks = [...tasks, ...this.tasks];
      return of(undefined);
    });
  }
  restore(task: Task) {
    return defer(() => {
      this.tasks = insertByCreationDate(this.tasks, task);
      return of(undefined);
    });
  }
  update(task: Task) {
    return defer(() => {
      this.tasks = this.tasks.map((t) => (t.id === task.id ? task : t));
      return of(undefined);
    });
  }
  remove(id: string) {
    return defer(() => {
      this.tasks = this.tasks.filter((t) => t.id !== id);
      return of(undefined);
    });
  }
  removeCompleted() {
    return defer(() => {
      this.tasks = this.tasks.filter((t) => !t.completed);
      return of(undefined);
    });
  }
  clear() {
    return defer(() => {
      this.tasks = [];
      return of(undefined);
    });
  }
  replaceAll(tasks: readonly Task[]) {
    return defer(() => {
      this.tasks = tasks;
      return of(undefined);
    });
  }
}

class InMemoryFlagOverridesRepository extends FlagOverridesRepository {
  overrides: FlagValues = {};
  get() {
    return defer(() => of(this.overrides));
  }
  save(overrides: FlagValues) {
    return defer(() => {
      this.overrides = overrides;
      return of(undefined);
    });
  }
}

class InMemoryCategoryRepository extends CategoryRepository {
  categories: readonly Category[] = defaultCategories();
  getAll() {
    return defer(() => of(this.categories));
  }
  add(category: Category) {
    return defer(() => {
      this.categories = [...this.categories, category];
      return of(undefined);
    });
  }
  update(category: Category) {
    return defer(() => {
      this.categories = this.categories.map((c) => (c.id === category.id ? category : c));
      return of(undefined);
    });
  }
  remove(id: string) {
    return defer(() => {
      this.categories = this.categories.filter((c) => c.id !== id);
      return of(undefined);
    });
  }
}

class RecordingErrorReporter extends ErrorReporter {
  readonly reported: AppError[] = [];
  report(error: AppError): void {
    this.reported.push(error);
  }
}

class FakeRemoteConfig extends RemoteConfigGateway {
  available = true;
  values: FlagValues = {};
  fetchError: unknown = null;
  readonly fetches: boolean[] = [];
  private resume?: () => void;

  whenReady(): Observable<void> {
    return of(undefined);
  }
  isAvailable(): boolean {
    return this.available;
  }
  configure(): Observable<void> {
    return of(undefined);
  }
  fetchAndActivate(force: boolean): Observable<void> {
    this.fetches.push(force);
    return this.fetchError ? throwError(() => this.fetchError) : of(undefined);
  }
  getActiveValues(): Observable<FlagValues> {
    return of(this.values);
  }
  onResume(callback: () => void): void {
    this.resume = callback;
  }
  triggerResume(): void {
    this.resume?.();
  }
}

describe('Capa de aplicación con puertos falsos', () => {
  let overridesRepo: InMemoryFlagOverridesRepository;
  let remote: FakeRemoteConfig;
  let errors: RecordingErrorReporter;
  let taskRepo: InMemoryTaskRepository;
  let categoryRepo: InMemoryCategoryRepository;

  beforeEach(() => {
    overridesRepo = new InMemoryFlagOverridesRepository();
    remote = new FakeRemoteConfig();
    errors = new RecordingErrorReporter();
    taskRepo = new InMemoryTaskRepository();
    categoryRepo = new InMemoryCategoryRepository();
    TestBed.configureTestingModule({
      providers: [
        { provide: FlagOverridesRepository, useValue: overridesRepo },
        { provide: RemoteConfigGateway, useValue: remote },
        { provide: ErrorReporter, useValue: errors },
        { provide: TaskRepository, useValue: taskRepo },
        { provide: CategoryRepository, useValue: categoryRepo },
      ],
    });
  });

  describe('FeatureFlagsService', () => {
    it('aplica los valores remotos', async () => {
      remote.values = { categories_enabled: false };
      const flags = TestBed.inject(FeatureFlagsService);
      await firstValueFrom(flags.init());

      await firstValueFrom(flags.refresh());

      expect(flags.categoriesEnabled()).toBe(false);
      expect(flags.status()).toBe('ready');
    });

    it('vuelve a consultar los valores remotos al reanudar la app', async () => {
      remote.values = { categories_enabled: false };
      const flags = TestBed.inject(FeatureFlagsService);
      await firstValueFrom(flags.init());
      await firstValueFrom(flags.refresh());
      remote.values = { categories_enabled: true };

      remote.triggerResume();
      await firstValueFrom(flags.refresh());

      expect(flags.categoriesEnabled()).toBe(true);
    });

    it('carga los overrides guardados', async () => {
      overridesRepo.overrides = { categories_enabled: false };
      const flags = TestBed.inject(FeatureFlagsService);

      await firstValueFrom(flags.loadOverrides());

      expect(flags.categoriesEnabled()).toBe(false);
      expect(flags.source('categories_enabled')).toBe('override');
    });

    it('refresh(true) fuerza la descarga ignorando la caché', async () => {
      const flags = TestBed.inject(FeatureFlagsService);

      await firstValueFrom(flags.refresh(true));

      expect(remote.fetches).toEqual([true]);
    });

    it('si la descarga falla conserva los valores y expone el error', async () => {
      remote.fetchError = 'sin red';
      const flags = TestBed.inject(FeatureFlagsService);

      await firstValueFrom(flags.refresh());

      expect(flags.status()).toBe('error');
      expect(flags.lastError()).toBe('sin red');
      expect(errors.reported).toEqual([
        expect.objectContaining({ source: 'remote-config', severity: 'warning', cause: 'sin red' }),
      ]);
      expect(flags.categoriesEnabled()).toBe(true);
    });

    it('sin proveedor remoto queda "unavailable" y refresh no hace nada', async () => {
      remote.available = false;
      const flags = TestBed.inject(FeatureFlagsService);
      await firstValueFrom(flags.init());

      await firstValueFrom(flags.refresh());

      expect(flags.status()).toBe('unavailable');
      expect(remote.fetches).toEqual([]);
    });

    it('los overrides se guardan de inmediato a través del repositorio', () => {
      const flags = TestBed.inject(FeatureFlagsService);

      flags.setOverride('categories_enabled', false);

      expect(overridesRepo.overrides).toEqual({ categories_enabled: false });
    });
  });

  describe('TodoStore', () => {
    it('guarda los cambios a través de los repositorios', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());

      const task = store.addTask('Persistida')!;
      store.toggleTask(task.id);
      store.addCategory('Estudio');
      await Promise.resolve();

      expect(taskRepo.tasks[0]).toMatchObject({ title: 'Persistida', completed: true });
      expect(categoryRepo.categories.map((c) => c.name)).toContain('Estudio');
    });

    it('carga el estado inicial desde los repositorios', async () => {
      await firstValueFrom(
        taskRepo.add({
          id: 't',
          title: 'Guardada',
          completed: false,
          categoryId: null,
          createdAt: 1,
        }),
      );
      const store = TestBed.inject(TodoStore);

      await firstValueFrom(store.load());

      expect(store.tasks().map((t) => t.title)).toEqual(['Guardada']);
      expect(store.categories()).toHaveLength(3);
    });

    it('al eliminar una categoría guarda sus tareas sin categoría', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());
      store.addTask('A', 'trabajo');

      store.removeCategory('trabajo');
      await Promise.resolve();

      expect(taskRepo.tasks[0].categoryId).toBeNull();
      expect(categoryRepo.categories.some((c) => c.id === 'trabajo')).toBe(false);
    });

    it('con las categorías desactivadas, las tareas nuevas se crean sin categoría', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());
      TestBed.inject(FeatureFlagsService).setOverride('categories_enabled', false);

      const task = store.addTask('A', 'trabajo')!;

      expect(task.categoryId).toBeNull();
    });

    it('con las categorías desactivadas, editar no cambia la categoría de la tarea', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());
      const task = store.addTask('A', 'compras')!;
      TestBed.inject(FeatureFlagsService).setOverride('categories_enabled', false);

      store.updateTask(task.id, { title: 'B', categoryId: 'trabajo' });

      expect(store.tasks()[0]).toMatchObject({ title: 'B', categoryId: 'compras' });
    });

    it('con las categorías activas, editar sí cambia la categoría', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());
      const task = store.addTask('A', 'compras')!;

      store.updateTask(task.id, { categoryId: null });

      expect(store.tasks()[0].categoryId).toBeNull();
    });

    it('propone el siguiente color de la paleta para una categoría nueva', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());
      const proposed = store.nextCategoryColor();

      const category = store.addCategory('Estudio')!;

      expect(category.color).toBe(proposed);
      expect(store.nextCategoryColor()).not.toBe(proposed);
    });

    it('si se elimina la categoría filtrada, el filtro vuelve a "Todas"', async () => {
      const store = TestBed.inject(TodoStore);
      await firstValueFrom(store.load());
      store.categoryFilter.set('trabajo');

      store.removeCategory('trabajo');
      TestBed.tick();

      expect(store.categoryFilter()).toBe('all');
    });
  });
});
