import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular/platform';
import { of } from 'rxjs';

import { provideData } from '../../data/provide-data';
import { FeatureFlagsService } from '../state/feature-flags.service';
import { TodoStore } from '../state/todo.store';
import { AppShellInteractor } from './app-shell.interactor';
import { CategoriesInteractor } from './categories.interactor';
import { SettingsInteractor } from './settings.interactor';
import { TasksInteractor } from './tasks.interactor';

describe('Interactors (fachadas para la UI)', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideData(),
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
    TestBed.inject(TodoStore).load().subscribe();
  });

  describe('TasksInteractor', () => {
    it('crea, filtra y elimina tareas con "Deshacer"', () => {
      const tasks = TestBed.inject(TasksInteractor);

      const a = tasks.addTask('Comprar pan', 'compras')!;
      tasks.addTask('Informe', 'trabajo');
      tasks.setCategoryFilter('compras');
      expect(tasks.visibleTasks().map((t) => t.title)).toEqual(['Comprar pan']);
      expect(tasks.categoryOf(a)?.name).toBe('Compras');

      const removed = tasks.removeTask(a.id)!;
      expect(tasks.counts().all).toBe(1);
      tasks.restoreTask(removed);
      expect(tasks.counts().all).toBe(2);
    });

    it('las señales expuestas son de solo lectura y cambian con los comandos', () => {
      const tasks = TestBed.inject(TasksInteractor);

      tasks.setSearch('pan');
      tasks.setStatusFilter('completed');

      expect(tasks.search()).toBe('pan');
      expect(tasks.statusFilter()).toBe('completed');
      expect('set' in tasks.search).toBe(false);
    });

    it('rechaza un título vacío', () => {
      expect(TestBed.inject(TasksInteractor).addTask('   ')).toBeNull();
    });
  });

  describe('CategoriesInteractor', () => {
    it('gestiona categorías y cuenta sus tareas', () => {
      const categories = TestBed.inject(CategoriesInteractor);
      const tasks = TestBed.inject(TasksInteractor);

      const created = categories.add('Estudio')!;
      tasks.addTask('Leer', created.id);

      expect(categories.nameExists('estudio')).toBe(true);
      expect(categories.add('ESTUDIO')).toBeNull();
      expect(categories.taskCount(created.id)).toBe(1);
      expect(categories.update(created.id, { name: 'Estudios' })).toBe(true);

      categories.remove(created.id);
      expect(tasks.visibleTasks()[0].categoryId).toBeNull();
    });

    it('showTasksOf filtra la lista de tareas por la categoría', () => {
      TestBed.inject(CategoriesInteractor).showTasksOf('trabajo');

      expect(TestBed.inject(TasksInteractor).categoryFilter()).toBe('trabajo');
    });
  });

  describe('SettingsInteractor', () => {
    it('genera y elimina tareas de prueba', () => {
      const settings = TestBed.inject(SettingsInteractor);

      settings.generateDemoTasks(10);
      expect(settings.totalTasks()).toBe(10);
      settings.removeAllTasks();
      expect(settings.totalTasks()).toBe(0);
    });

    it('fija y quita el override de un flag', () => {
      const settings = TestBed.inject(SettingsInteractor);

      settings.setOverride('categories_enabled', false);
      expect(settings.categoriesEnabled()).toBe(false);
      expect(settings.source('categories_enabled')).toBe('override');

      settings.setOverride('categories_enabled', null);
      expect(settings.categoriesEnabled()).toBe(true);
    });

    it('refreshRemoteConfig fuerza la descarga', () => {
      const refresh = vi
        .spyOn(TestBed.inject(FeatureFlagsService), 'refresh')
        .mockReturnValue(of(undefined));

      TestBed.inject(SettingsInteractor).refreshRemoteConfig();

      expect(refresh).toHaveBeenCalledWith(true);
    });
  });

  describe('AppShellInteractor', () => {
    it('expone las insignias del menú', () => {
      const shell = TestBed.inject(AppShellInteractor);
      TestBed.inject(TasksInteractor).addTask('Una');

      expect(shell.pendingTasks()).toBe(1);
      expect(shell.categoryCount()).toBe(3);
    });

    it('start inicializa Remote Config', () => {
      const init = vi
        .spyOn(TestBed.inject(FeatureFlagsService), 'init')
        .mockReturnValue(of(undefined));

      TestBed.inject(AppShellInteractor).start();

      expect(init).toHaveBeenCalledOnce();
    });
  });
});
