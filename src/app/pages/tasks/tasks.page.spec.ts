import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AlertController } from '@ionic/angular/alert-controller';
import { ModalController } from '@ionic/angular/modal-controller';
import { Platform } from '@ionic/angular/platform';
import { ToastController } from '@ionic/angular/toast-controller';

import { FeatureFlagsService } from '../../application/feature-flags.service';
import { TodoStore } from '../../application/todo.store';
import { TasksPage } from './tasks.page';
import { provideInfrastructure } from '../../infrastructure/provide-infrastructure';

describe('TasksPage', () => {
  let fixture: ComponentFixture<TasksPage>;
  let el: HTMLElement;
  let store: TodoStore;
  let flags: FeatureFlagsService;

  const alert = { present: vi.fn() };
  const alerts = { create: vi.fn() };
  const toast = { present: vi.fn() };
  const toasts = { create: vi.fn() };
  const modal = { present: vi.fn(), onWillDismiss: vi.fn() };
  const modals = { create: vi.fn() };

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(TasksPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const chips = () => Array.from(el.querySelectorAll('ion-chip'));
  const chip = (label: string) =>
    chips().find((c) => c.textContent?.includes(label)) as HTMLElement;
  const addButton = () =>
    el.querySelector('ion-fab-button[type="submit"]') as HTMLElement & {
      disabled: boolean;
    };

  async function type(value: string): Promise<void> {
    const input = el.querySelector('ion-input[name="title"]') as HTMLElement & { value: string };
    input.value = value;
    input.dispatchEvent(new CustomEvent('ionInput', { detail: { value } }));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    alerts.create.mockResolvedValue(alert);
    toasts.create.mockResolvedValue(toast);
    modals.create.mockResolvedValue(modal);
    TestBed.configureTestingModule({
      providers: [
        provideInfrastructure(),
        provideRouter([]),
        { provide: AlertController, useValue: alerts },
        { provide: ToastController, useValue: toasts },
        { provide: ModalController, useValue: modals },
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
    store = TestBed.inject(TodoStore);
    flags = TestBed.inject(FeatureFlagsService);
  });

  const progressBar = () => el.querySelector('ion-progress-bar') as HTMLElement & { value: number };
  const clearCompletedButton = () =>
    el.querySelector('ion-buttons[slot="end"] ion-button') as HTMLElement & {
      disabled: boolean;
    };
  const emptyMessage = () => el.querySelector('.tasks-page__empty')?.textContent;
  const segmentChange = (value: string) =>
    el
      .querySelector('ion-segment')!
      .dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));

  describe('encabezado', () => {
    it('muestra el título y los contadores de pendientes y hechas', async () => {
      const done = store.addTask('A')!;
      store.addTask('B');
      store.addTask('C');
      store.toggleTask(done.id);

      await render();

      expect(el.querySelector('ion-title')?.textContent).toContain('Tareas');
      expect(el.querySelector('.tasks-page__subtitle')?.textContent).toContain('2 pendientes');
      expect(el.querySelector('.tasks-page__subtitle')?.textContent).toContain('1 hechas');
    });

    it('la barra de progreso refleja la proporción de tareas completadas', async () => {
      const a = store.addTask('A')!;
      store.addTask('B');
      store.toggleTask(a.id);

      await render();

      expect(progressBar().value).toBe(0.5);
    });

    it('el progreso es 0 sin tareas', async () => {
      await render();

      expect(progressBar().value).toBe(0);
    });

    it('el botón de borrar completadas está deshabilitado si no hay ninguna', async () => {
      store.addTask('A');

      await render();

      expect(clearCompletedButton().disabled).toBe(true);
    });

    it('borrar completadas pide confirmación con el número de tareas', async () => {
      const a = store.addTask('A')!;
      store.addTask('B');
      store.toggleTask(a.id);
      await render();

      clearCompletedButton().click();
      await vi.waitFor(() => expect(alert.present).toHaveBeenCalled());

      expect(alerts.create.mock.calls[0][0].message).toContain('1 tarea(s)');
    });

    it('al confirmar, borrar completadas elimina solo las hechas', async () => {
      const a = store.addTask('A')!;
      store.addTask('B');
      store.toggleTask(a.id);
      await render();
      clearCompletedButton().click();
      await vi.waitFor(() => expect(alert.present).toHaveBeenCalled());
      const config = alerts.create.mock.calls[0][0];

      config.buttons[1].handler();

      expect(store.tasks().map((t) => t.title)).toEqual(['B']);
    });

    it('la búsqueda actualiza el filtro de texto del store', async () => {
      await render();

      el.querySelector('ion-searchbar')!.dispatchEvent(
        new CustomEvent('ionInput', { detail: { value: 'pan' } }),
      );

      expect(store.search()).toBe('pan');
    });
  });

  describe('filtros', () => {
    it('muestra chips: Todas, cada categoría, Sin categoría y el acceso a gestionar', async () => {
      await render();

      const labels = chips().map((c) => c.querySelector('ion-label')?.textContent?.trim());
      expect(labels).toEqual([
        'Todas',
        'Personal',
        'Trabajo',
        'Compras',
        'Sin categoría',
        'Categoría',
      ]);
    });

    it('cada chip muestra el número de tareas', async () => {
      store.addTask('A', 'trabajo');
      store.addTask('B');

      await render();

      expect(chip('Todas').querySelector('ion-badge')?.textContent).toBe('2');
      expect(chip('Trabajo').querySelector('ion-badge')?.textContent).toBe('1');
      expect(chip('Sin categoría').querySelector('ion-badge')?.textContent).toBe('1');
    });

    it('tocar un chip filtra por esa categoría', async () => {
      await render();

      chip('Trabajo').click();

      expect(store.categoryFilter()).toBe('trabajo');
    });

    it('la categoría filtrada se usa para la nueva tarea', async () => {
      await render();
      chip('Trabajo').click();
      await type('Informe');

      addButton().click();

      expect(store.tasks()[0].categoryId).toBe('trabajo');
    });

    it('"Sin categoría" filtra las tareas sin categoría', async () => {
      store.addTask('A', 'trabajo');
      store.addTask('B');
      await render();

      chip('Sin categoría').click();

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['B']);
    });

    it('"Todas" restablece el filtro', async () => {
      await render();
      chip('Trabajo').click();

      chip('Todas').click();

      expect(store.categoryFilter()).toBe('all');
    });

    it('el segmento Hechas muestra solo las tareas completadas', async () => {
      const a = store.addTask('A')!;
      store.addTask('B');
      store.toggleTask(a.id);
      await render();

      segmentChange('completed');

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['A']);
    });

    it('el segmento Pendientes muestra solo las tareas sin completar', async () => {
      const a = store.addTask('A')!;
      store.addTask('B');
      store.toggleTask(a.id);
      await render();

      segmentChange('pending');

      expect(store.visibleTasks().map((t) => t.title)).toEqual(['B']);
    });

    it('oculta chips y selector de categoría cuando el feature flag está apagado', async () => {
      flags.setOverride('categories_enabled', false);

      await render();

      expect(el.querySelector('.tasks-page__chips-toolbar')).toBeNull();
      expect(el.querySelector('ion-select')).toBeNull();
    });
  });

  describe('lista', () => {
    it('muestra el mensaje de lista vacía sin tareas', async () => {
      await render();

      expect(emptyMessage()).toContain('Aún no tienes tareas');
    });

    it('muestra el mensaje de búsqueda sin resultados', async () => {
      store.addTask('A');
      store.search.set('zzz');

      await render();

      expect(emptyMessage()).toContain('Ninguna tarea coincide');
    });

    it('muestra el mensaje de filtro sin resultados', async () => {
      store.addTask('A');
      store.categoryFilter.set('trabajo');

      await render();

      expect(emptyMessage()).toContain('No hay tareas con este filtro');
    });

    it('usa el viewport virtual cuando hay tareas', async () => {
      store.addTask('A');

      await render();

      expect(el.querySelector('cdk-virtual-scroll-viewport')).not.toBeNull();
      expect(el.querySelector('.tasks-page__empty')).toBeNull();
    });
  });

  describe('nueva tarea', () => {
    it('deshabilita el botón de agregar con el título vacío', async () => {
      await render();

      expect(addButton().disabled).toBe(true);
    });

    it('deshabilita el botón de agregar con un título de solo espacios', async () => {
      await render();

      await type('   ');

      expect(addButton().disabled).toBe(true);
    });

    it('habilita el botón de agregar con un título válido', async () => {
      await render();

      await type('Algo');

      expect(addButton().disabled).toBe(false);
    });

    it('agrega la tarea al enviar el formulario', async () => {
      await render();
      await type('Comprar pan');

      el.querySelector('form')!.dispatchEvent(new Event('submit'));

      expect(store.tasks().map((t) => t.title)).toEqual(['Comprar pan']);
    });

    it('limpia el campo tras agregar la tarea', async () => {
      await render();
      await type('Comprar pan');

      el.querySelector('form')!.dispatchEvent(new Event('submit'));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(
        (el.querySelector('ion-input[name="title"]') as HTMLElement & { value: string }).value,
      ).toBe('');
    });

    it('agrega la tarea con Enter', async () => {
      await render();
      await type('Con enter');

      el.querySelector('ion-input[name="title"]')!.dispatchEvent(
        new KeyboardEvent('keyup', { key: 'Enter' }),
      );

      expect(store.tasks()[0].title).toBe('Con enter');
    });

    it('el selector asigna la categoría elegida a la nueva tarea', async () => {
      await render();
      el.querySelector('ion-select')!.dispatchEvent(
        new CustomEvent('ionChange', { detail: { value: 'compras' } }),
      );
      await type('Leche');

      addButton().click();

      expect(store.tasks()[0].categoryId).toBe('compras');
    });

    it('el selector ofrece "Sin categoría" y todas las categorías', async () => {
      await render();

      const options = Array.from(el.querySelectorAll('ion-select-option')).map((o) =>
        o.textContent?.trim(),
      );
      expect(options).toEqual(['Sin categoría', 'Personal', 'Trabajo', 'Compras']);
    });
  });

  describe('acciones sobre una tarea', () => {
    it('eliminar quita la tarea y avisa en un toast', async () => {
      const task = store.addTask('A')!;
      await render();

      await (fixture.componentInstance as any).removeTask(task.id);

      expect(store.tasks()).toHaveLength(0);
      expect(toasts.create.mock.calls[0][0].message).toContain('A');
      expect(toast.present).toHaveBeenCalled();
    });

    it('Deshacer en el toast restaura la tarea eliminada', async () => {
      const task = store.addTask('A')!;
      await render();
      await (fixture.componentInstance as any).removeTask(task.id);
      const config = toasts.create.mock.calls[0][0];

      config.buttons[0].handler();

      expect(store.tasks().map((t) => t.id)).toEqual([task.id]);
    });

    it('editar abre el modal con el selector de categorías', async () => {
      const task = store.addTask('A')!;
      modal.onWillDismiss.mockResolvedValue({ role: 'cancel', data: null });
      await render();

      await (fixture.componentInstance as any).editTask(task);

      expect(modals.create.mock.calls[0][0].componentProps.showCategories).toBe(true);
    });

    it('editar aplica el título y la categoría guardados', async () => {
      const task = store.addTask('A')!;
      modal.onWillDismiss.mockResolvedValue({
        role: 'save',
        data: { title: 'A editada', categoryId: 'trabajo' },
      });
      await render();

      await (fixture.componentInstance as any).editTask(task);

      expect(store.tasks()[0]).toMatchObject({ title: 'A editada', categoryId: 'trabajo' });
    });

    it('editar con el flag apagado solo cambia el título', async () => {
      const task = store.addTask('A', 'compras')!;
      flags.setOverride('categories_enabled', false);
      modal.onWillDismiss.mockResolvedValue({
        role: 'save',
        data: { title: 'B', categoryId: 'trabajo' },
      });
      await render();

      await (fixture.componentInstance as any).editTask(task);

      expect(store.tasks()[0]).toMatchObject({ title: 'B', categoryId: 'compras' });
    });

    it('cancelar la edición no modifica la tarea', async () => {
      const task = store.addTask('A')!;
      modal.onWillDismiss.mockResolvedValue({ role: 'cancel', data: null });
      await render();

      await (fixture.componentInstance as any).editTask(task);

      expect(store.tasks()[0].title).toBe('A');
    });
  });
});
