import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular/alert-controller';
import { ModalController } from '@ionic/angular/modal-controller';
import { Platform } from '@ionic/angular/platform';

import { FeatureFlagsService } from '../../application/feature-flags.service';
import { TodoStore } from '../../application/todo.store';
import { CategoriesPage } from './categories.page';
import { provideInfrastructure } from '../../infrastructure/provide-infrastructure';

describe('CategoriesPage', () => {
  let fixture: ComponentFixture<CategoriesPage>;
  let el: HTMLElement;
  let store: TodoStore;
  let flags: FeatureFlagsService;

  const router = { navigateByUrl: vi.fn() };
  const alert = { present: vi.fn() };
  const alerts = { create: vi.fn() };
  const modal = { present: vi.fn(), onWillDismiss: vi.fn() };
  const modals = { create: vi.fn() };

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(CategoriesPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const rows = () => Array.from(el.querySelectorAll('ion-item-sliding'));

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    alerts.create.mockResolvedValue(alert);
    modals.create.mockResolvedValue(modal);
    TestBed.configureTestingModule({
      providers: [
        provideInfrastructure(),
        { provide: Router, useValue: router },
        { provide: AlertController, useValue: alerts },
        { provide: ModalController, useValue: modals },
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
    store = TestBed.inject(TodoStore);
    flags = TestBed.inject(FeatureFlagsService);
  });

  it('muestra el título de la página', async () => {
    await render();
    expect(el.querySelector('ion-title')?.textContent).toContain('Categorías');
  });

  it('lista las categorías con su nombre y número de tareas', async () => {
    store.addTask('A', 'trabajo');
    store.addTask('B', 'trabajo');
    await render();
    expect(rows()).toHaveLength(3);
    const trabajo = rows()[1];
    expect(trabajo.querySelector('h2')?.textContent).toContain('Trabajo');
    expect(trabajo.querySelector('p')?.textContent).toContain('2 tarea(s)');
    expect(rows()[0].querySelector('p')?.textContent).toContain('0 tarea(s)');
  });

  it('muestra el mensaje vacío si no hay categorías', async () => {
    for (const c of store.categories()) store.removeCategory(c.id);
    await render();
    expect(rows()).toHaveLength(0);
    expect(el.querySelector('.empty')?.textContent).toContain('No hay categorías');
  });

  it('el botón + abre el editor y crea la categoría devuelta', async () => {
    modal.onWillDismiss.mockResolvedValue({ role: 'save', data: { name: 'Gym', color: '#fff' } });
    await render();
    (el.querySelector('ion-fab-button') as HTMLElement).click();
    await vi.waitFor(() => expect(store.categories().map((c) => c.name)).toContain('Gym'));
    expect(modal.present).toHaveBeenCalled();
  });

  it('cancelar el editor no crea ninguna categoría', async () => {
    modal.onWillDismiss.mockResolvedValue({ role: 'cancel', data: null });
    await render();
    (el.querySelector('ion-fab-button') as HTMLElement).click();
    await vi.waitFor(() => expect(modal.onWillDismiss).toHaveBeenCalled());
    expect(store.categories()).toHaveLength(3);
  });

  it('tocar una fila edita la categoría con el resultado del editor', async () => {
    modal.onWillDismiss.mockResolvedValue({
      role: 'save',
      data: { name: 'Oficina', color: '#000000' },
    });
    await render();
    (rows()[1].querySelector('ion-item') as HTMLElement).click();
    await vi.waitFor(() => expect(store.categories()[1].name).toBe('Oficina'));
    expect(store.categories()[1].color).toBe('#000000');
  });

  it('el botón de embudo filtra por esa categoría y navega a las tareas', async () => {
    await render();
    (rows()[2].querySelector('ion-item ion-button') as HTMLElement).click();
    expect(store.categoryFilter()).toBe('compras');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks');
    expect(modals.create).not.toHaveBeenCalled();
  });

  it('eliminar pide confirmación y deja las tareas sin categoría', async () => {
    store.addTask('A', 'trabajo');
    await render();
    const sliding = rows()[1] as HTMLElement & { close: () => void };
    sliding.close = vi.fn();
    (sliding.querySelectorAll('ion-item-option')[1] as HTMLElement).click();
    await vi.waitFor(() => expect(alert.present).toHaveBeenCalled());

    const config = alerts.create.mock.calls[0][0];
    expect(config.header).toContain('Trabajo');
    expect(config.message).toContain('1 tarea(s)');

    config.buttons[1].handler();
    expect(store.categories().map((c) => c.id)).not.toContain('trabajo');
    expect(store.tasks()[0].categoryId).toBeNull();
  });

  it('vuelve a /tasks si el feature flag apaga las categorías', async () => {
    await render();
    flags.setOverride('categories_enabled', false);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/tasks', { replaceUrl: true });
  });
});
