import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/alert-controller';
import { Platform } from '@ionic/angular/platform';
import { ToastController } from '@ionic/angular/toast-controller';

import { FeatureFlagsService } from '../../application/feature-flags.service';
import { TodoStore } from '../../application/todo.store';
import { SettingsPage } from './settings.page';
import { provideInfrastructure } from '../../infrastructure/provide-infrastructure';

describe('SettingsPage', () => {
  let fixture: ComponentFixture<SettingsPage>;
  let el: HTMLElement;
  let store: TodoStore;
  let flags: FeatureFlagsService;

  const alert = { present: vi.fn() };
  const alerts = { create: vi.fn() };
  const toast = { present: vi.fn() };
  const toasts = { create: vi.fn() };

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  const text = () => el.textContent ?? '';
  const item = (label: string) =>
    Array.from(el.querySelectorAll('ion-item')).find((i) => i.textContent?.includes(label)) as
      HTMLElement | undefined;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    alerts.create.mockResolvedValue(alert);
    toasts.create.mockResolvedValue(toast);
    TestBed.configureTestingModule({
      providers: [
        provideInfrastructure(),
        { provide: AlertController, useValue: alerts },
        { provide: ToastController, useValue: toasts },
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
    store = TestBed.inject(TodoStore);
    flags = TestBed.inject(FeatureFlagsService);
  });

  const refreshButton = () =>
    Array.from(el.querySelectorAll('ion-button')).find((b) =>
      b.textContent?.includes('Actualizar'),
    ) as HTMLElement & { disabled: boolean };
  const flagBadge = () => el.querySelector('ion-badge')?.textContent?.trim();
  const chooseSegment = (value: string) =>
    el
      .querySelector('ion-segment')!
      .dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));
  const deleteAllItem = () => item('Eliminar todas') as HTMLElement & { disabled: boolean };

  it('muestra el título y las secciones', async () => {
    await render();

    expect(el.querySelector('ion-title')?.textContent).toContain('Ajustes');
    expect(text()).toContain('Feature flags (Remote Config)');
    expect(text()).toContain('Prueba de rendimiento');
  });

  describe('estado de Remote Config', () => {
    it('muestra "Inicializando" al arrancar', async () => {
      await render();

      expect(text()).toContain('Inicializando');
    });

    it('muestra que no está disponible en el navegador', async () => {
      await render();

      flags.status.set('unavailable');
      fixture.detectChanges();

      expect(text()).toContain('No disponible en el navegador');
    });

    it('muestra que está conectado a Firebase', async () => {
      await render();

      flags.status.set('ready');
      fixture.detectChanges();

      expect(text()).toContain('Conectado a Firebase');
    });

    it('muestra el error de conexión', async () => {
      await render();

      flags.status.set('error');
      flags.lastError.set('timeout');
      fixture.detectChanges();

      expect(text()).toContain('Sin conexión con Firebase (timeout)');
    });

    it('no muestra spinner si no está cargando', async () => {
      await render();

      expect(el.querySelector('ion-spinner')).toBeNull();
    });

    it('muestra un spinner en lugar del botón Actualizar mientras carga', async () => {
      await render();

      flags.status.set('loading');
      fixture.detectChanges();

      expect(el.querySelector('ion-spinner')).not.toBeNull();
      expect(text()).toContain('Descargando configuración');
    });

    it('deshabilita Actualizar si Remote Config no está disponible', async () => {
      await render();

      flags.status.set('unavailable');
      fixture.detectChanges();

      expect(refreshButton().disabled).toBe(true);
    });

    it('habilita Actualizar si Remote Config está disponible', async () => {
      await render();

      flags.status.set('ready');
      fixture.detectChanges();

      expect(refreshButton().disabled).toBe(false);
    });

    it('Actualizar fuerza una descarga de Remote Config', async () => {
      const refresh = vi.spyOn(flags, 'refresh').mockResolvedValue();
      await render();
      flags.status.set('ready');
      fixture.detectChanges();

      refreshButton().click();

      expect(refresh).toHaveBeenCalledWith(true);
    });

    it('no muestra la fecha de la última actualización si no existe', async () => {
      await render();

      expect(text()).not.toContain('Última actualización');
    });

    it('muestra la fecha de la última actualización cuando existe', async () => {
      await render();

      flags.lastFetch.set(new Date());
      fixture.detectChanges();

      expect(text()).toContain('Última actualización');
    });
  });

  describe('feature flag categories_enabled', () => {
    it('muestra ON y su origen por defecto', async () => {
      await render();

      expect(flagBadge()).toBe('ON');
      expect(text()).toContain('Origen: ');
    });

    it('muestra OFF cuando se fuerza apagado', async () => {
      await render();

      flags.setOverride('categories_enabled', false);
      fixture.detectChanges();

      expect(flagBadge()).toBe('OFF');
    });

    it('el selector "OFF" aplica un override local', async () => {
      await render();

      chooseSegment('off');

      expect(flags.categoriesEnabled()).toBe(false);
      expect(flags.source('categories_enabled')).toBe('override');
    });

    it('el selector "ON" aplica un override local', async () => {
      flags.setOverride('categories_enabled', false);
      await render();

      chooseSegment('on');

      expect(flags.categoriesEnabled()).toBe(true);
    });

    it('el selector "Remoto" quita el override local', async () => {
      flags.setOverride('categories_enabled', false);
      await render();

      chooseSegment('remote');

      expect(flags.source('categories_enabled')).toBe('default');
    });
  });

  describe('prueba de rendimiento', () => {
    it('muestra el número de tareas almacenadas', async () => {
      store.addTask('A');
      store.addTask('B');

      await render();

      expect(item('Tareas almacenadas')?.textContent).toContain('2 en total');
    });

    it('genera 1.000 tareas', async () => {
      await render();

      item('Generar 1.000')!.click();
      await vi.waitFor(() => expect(toast.present).toHaveBeenCalled());

      expect(store.counts().all).toBe(1000);
    });

    it('avisa con un toast y muestra la última generación', async () => {
      await render();

      item('Generar 1.000')!.click();
      await vi.waitFor(() => expect(toast.present).toHaveBeenCalled());
      fixture.detectChanges();

      expect(toasts.create.mock.calls[0][0].message).toContain('1');
      expect(text()).toContain('Última generación');
    });

    it('genera 10.000 tareas', async () => {
      await render();

      item('Generar 10.000')!.click();
      await vi.waitFor(() => expect(toast.present).toHaveBeenCalled());

      expect(store.counts().all).toBe(10000);
    });

    it('"Eliminar todas" está deshabilitado sin tareas', async () => {
      await render();

      expect(deleteAllItem().disabled).toBe(true);
    });

    it('"Eliminar todas" se habilita cuando hay tareas', async () => {
      await render();

      store.addTask('A');
      fixture.detectChanges();

      expect(deleteAllItem().disabled).toBe(false);
    });

    it('eliminar todas pide confirmación sin borrar nada todavía', async () => {
      store.addTask('A');
      await render();

      item('Eliminar todas')!.click();
      await vi.waitFor(() => expect(alert.present).toHaveBeenCalled());

      expect(store.counts().all).toBe(1);
    });

    it('al aceptar la confirmación se vacía la lista', async () => {
      store.addTask('A');
      await render();
      item('Eliminar todas')!.click();
      await vi.waitFor(() => expect(alert.present).toHaveBeenCalled());
      const { buttons } = alerts.create.mock.calls[0][0];

      buttons[1].handler();

      expect(store.counts().all).toBe(0);
    });
  });
});
