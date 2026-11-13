import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular/platform';

import { FeatureFlagsService } from './feature-flags.service';
import { LocalStorageKeyValueStore } from '../infrastructure/local-storage.key-value-store';
import { TodoStore } from './todo.store';
import { provideInfrastructure } from '../infrastructure/provide-infrastructure';

describe('TodoStore', () => {
  let store: TodoStore;
  let flags: FeatureFlagsService;

  function seedFilterScenario(): void {
    store.addTask('Café con Ana', 'personal');
    const work = store.addTask('Informe', 'trabajo')!;
    store.addTask('Sin categoría');
    store.toggleTask(work.id);
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideInfrastructure(),
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
    store = TestBed.inject(TodoStore);
    flags = TestBed.inject(FeatureFlagsService);
  });

  it('crea categorías por defecto', () => {
    const names = store.categories().map((c) => c.name);

    expect(names).toEqual(['Personal', 'Trabajo', 'Compras']);
  });

  describe('tareas', () => {
    it('agrega una tarea recortando el título', () => {
      const task = store.addTask('  Comprar pan  ', 'compras')!;

      expect(task.title).toBe('Comprar pan');
      expect(store.tasks()).toHaveLength(1);
    });

    it('completa una tarea y actualiza los contadores', () => {
      const task = store.addTask('Comprar pan', 'compras')!;

      store.toggleTask(task.id);

      expect(store.tasks()[0].completed).toBe(true);
      expect(store.counts().completed).toBe(1);
    });

    it('elimina una tarea', () => {
      const task = store.addTask('Comprar pan', 'compras')!;

      store.removeTask(task.id);

      expect(store.tasks()).toHaveLength(0);
    });

    it('ignora títulos vacíos', () => {
      const task = store.addTask('   ');

      expect(task).toBeNull();
    });

    it('ignora categorías inexistentes', () => {
      const task = store.addTask('Tarea', 'no-existe')!;

      expect(task.categoryId).toBeNull();
    });
  });

  describe('filtros', () => {
    it('filtra por categoría', () => {
      seedFilterScenario();

      store.categoryFilter.set('personal');

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['Café con Ana']);
    });

    it('filtra por "sin categoría"', () => {
      seedFilterScenario();

      store.categoryFilter.set('none');

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['Sin categoría']);
    });

    it('filtra por estado', () => {
      seedFilterScenario();

      store.statusFilter.set('completed');

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['Informe']);
    });

    it('busca sin distinguir tildes', () => {
      seedFilterScenario();

      store.search.set('cafe');

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['Café con Ana']);
    });

    it('ignora el filtro de categoría cuando el feature flag está apagado', () => {
      store.addTask('A', 'personal');
      store.addTask('B', 'trabajo');
      store.categoryFilter.set('personal');

      flags.setOverride('categories_enabled', false);

      expect(store.visibleTasks()).toHaveLength(2);
    });
  });

  describe('categorías', () => {
    it('al eliminar una categoría sus tareas quedan sin categoría', () => {
      store.addTask('Informe', 'trabajo');

      store.removeCategory('trabajo');

      expect(store.categories().some((c) => c.id === 'trabajo')).toBe(false);
      expect(store.tasks()[0].categoryId).toBeNull();
    });

    it('no permite crear categorías con nombre duplicado (sin distinguir mayúsculas)', () => {
      const category = store.addCategory('personal');

      expect(category).toBeNull();
    });

    it('no permite renombrar a un nombre ya existente', () => {
      const study = store.addCategory('Estudio')!;

      const updated = store.updateCategory(study.id, { name: 'TRABAJO' });

      expect(updated).toBe(false);
    });

    it('permite renombrar a un nombre libre', () => {
      const study = store.addCategory('Estudio')!;

      const updated = store.updateCategory(study.id, { name: 'Universidad' });

      expect(updated).toBe(true);
    });
  });

  it('persiste el estado en localStorage', () => {
    store.addTask('Persistida');

    TestBed.tick();
    TestBed.inject(LocalStorageKeyValueStore).flush();

    const saved = JSON.parse(localStorage.getItem('todo.tasks.v1')!);
    expect(saved[0].title).toBe('Persistida');
  });

  it('maneja 10.000 tareas con rapidez', () => {
    const start = performance.now();

    store.generateDemoTasks(10_000);
    store.categoryFilter.set('trabajo');
    store.search.set('999');
    const visible = store.visibleTasks();
    const elapsed = performance.now() - start;

    expect(store.counts().all).toBe(10_000);
    expect(visible.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(500);
  });
});
