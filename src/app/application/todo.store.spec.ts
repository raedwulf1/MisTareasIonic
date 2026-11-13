import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular/platform';

import { FeatureFlagsService } from './feature-flags.service';
import { LocalStorageKeyValueStore } from '../infrastructure/local-storage.key-value-store';
import { TodoStore } from './todo.store';
import { provideInfrastructure } from '../infrastructure/provide-infrastructure';

describe('TodoStore', () => {
  let store: TodoStore;
  let flags: FeatureFlagsService;

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
    expect(store.categories().map((c) => c.name)).toEqual(['Personal', 'Trabajo', 'Compras']);
  });

  it('agrega, completa y elimina tareas', () => {
    const task = store.addTask('  Comprar pan  ', 'compras')!;
    expect(task.title).toBe('Comprar pan');
    expect(store.tasks()).toHaveLength(1);

    store.toggleTask(task.id);
    expect(store.tasks()[0].completed).toBe(true);
    expect(store.counts().completed).toBe(1);

    store.removeTask(task.id);
    expect(store.tasks()).toHaveLength(0);
  });

  it('ignora títulos vacíos y categorías inexistentes', () => {
    expect(store.addTask('   ')).toBeNull();
    expect(store.addTask('Tarea', 'no-existe')!.categoryId).toBeNull();
  });

  it('filtra por categoría, estado y búsqueda sin tildes', () => {
    store.addTask('Café con Ana', 'personal');
    const work = store.addTask('Informe', 'trabajo')!;
    store.addTask('Sin categoría');
    store.toggleTask(work.id);

    store.categoryFilter.set('personal');
    expect(store.visibleTasks().map((t) => t.title)).toEqual(['Café con Ana']);

    store.categoryFilter.set('none');
    expect(store.visibleTasks().map((t) => t.title)).toEqual(['Sin categoría']);

    store.categoryFilter.set('all');
    store.statusFilter.set('completed');
    expect(store.visibleTasks().map((t) => t.title)).toEqual(['Informe']);

    store.statusFilter.set('all');
    store.search.set('cafe');
    expect(store.visibleTasks().map((t) => t.title)).toEqual(['Café con Ana']);
  });

  it('al eliminar una categoría sus tareas quedan sin categoría', () => {
    store.addTask('Informe', 'trabajo');
    store.removeCategory('trabajo');
    expect(store.categories().some((c) => c.id === 'trabajo')).toBe(false);
    expect(store.tasks()[0].categoryId).toBeNull();
  });

  it('no permite categorías con nombre duplicado (sin distinguir mayúsculas)', () => {
    expect(store.addCategory('personal')).toBeNull();
    const study = store.addCategory('Estudio')!;
    expect(store.updateCategory(study.id, { name: 'TRABAJO' })).toBe(false);
    expect(store.updateCategory(study.id, { name: 'Universidad' })).toBe(true);
  });

  it('ignora el filtro de categoría cuando el feature flag está apagado', () => {
    store.addTask('A', 'personal');
    store.addTask('B', 'trabajo');
    store.categoryFilter.set('personal');
    expect(store.visibleTasks()).toHaveLength(1);

    flags.setOverride('categories_enabled', false);
    expect(store.visibleTasks()).toHaveLength(2);
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
    expect(store.counts().all).toBe(10_000);
    expect(visible.length).toBeGreaterThan(0);
    expect(performance.now() - start).toBeLessThan(500);
  });
});
