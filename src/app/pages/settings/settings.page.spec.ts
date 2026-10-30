import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular/alert-controller';
import { Platform } from '@ionic/angular/platform';
import { ToastController } from '@ionic/angular/toast-controller';

import { FeatureFlagsService } from '../../core/services/feature-flags.service';
import { TodoStore } from '../../core/services/todo.store';
import { SettingsPage } from './settings.page';

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
        { provide: AlertController, useValue: alerts },
        { provide: ToastController, useValue: toasts },
        { provide: Platform, useValue: { ready: () => Promise.resolve('dom') } },
      ],
    });
    store = TestBed.inject(TodoStore);
    flags = TestBed.inject(FeatureFlagsService);
  });

  it('muestra el título y las secciones', async () => {
    await render();
    expect(el.querySelector('ion-title')?.textContent).toContain('Ajustes');
    expect(text()).toContain('Feature flags (Remote Config)');
    expect(text()).toContain('Prueba de rendimiento');
  });

  it('muestra el estado de Remote Config según el servicio', async () => {
    await render();
    expect(text()).toContain('Inicializando');
    flags.status.set('unavailable');
    fixture.detectChanges();
    expect(text()).toContain('No disponible en el navegador');
    flags.status.set('ready');
    fixture.detectChanges();
    expect(text()).toContain('Conectado a Firebase');
    flags.status.set('error');
    flags.lastError.set('timeout');
    fixture.detectChanges();
    expect(text()).toContain('Sin conexión con Firebase (timeout)');
  });

  it('muestra un spinner en lugar del botón Actualizar mientras carga', async () => {
    await render();
    expect(el.querySelector('ion-spinner')).toBeNull();
    flags.status.set('loading');
    fixture.detectChanges();
    expect(el.querySelector('ion-spinner')).not.toBeNull();
    expect(text()).toContain('Descargando configuración');
  });

  it('deshabilita Actualizar si Remote Config no está disponible y lo habilita si no', async () => {
    await render();
    const refresh = () =>
      Array.from(el.querySelectorAll('ion-button')).find((b) =>
        b.textContent?.includes('Actualizar'),
      ) as HTMLElement & { disabled: boolean };
    flags.status.set('unavailable');
    fixture.detectChanges();
    expect(refresh().disabled).toBe(true);
    flags.status.set('ready');
    fixture.detectChanges();
    expect(refresh().disabled).toBe(false);
  });

  it('Actualizar fuerza una descarga de Remote Config', async () => {
    const refresh = vi.spyOn(flags, 'refresh').mockResolvedValue();
    await render();
    flags.status.set('ready');
    fixture.detectChanges();
    (
      Array.from(el.querySelectorAll('ion-button')).find((b) =>
        b.textContent?.includes('Actualizar'),
      ) as HTMLElement
    ).click();
    expect(refresh).toHaveBeenCalledWith(true);
  });

  it('muestra la fecha de la última actualización cuando existe', async () => {
    await render();
    expect(text()).not.toContain('Última actualización');
    flags.lastFetch.set(new Date());
    fixture.detectChanges();
    expect(text()).toContain('Última actualización');
  });

  it('muestra el estado ON/OFF del flag y su origen', async () => {
    await render();
    const badge = () => el.querySelector('ion-badge')?.textContent?.trim();
    expect(badge()).toBe('ON');
    expect(text()).toContain('Origen: ');
    flags.setOverride('categories_enabled', false);
    fixture.detectChanges();
    expect(badge()).toBe('OFF');
  });

  it('el selector Remoto/ON/OFF aplica y quita el override local', async () => {
    await render();
    const segment = el.querySelector('ion-segment') as HTMLElement & { value: string };
    const choose = (value: string) =>
      segment.dispatchEvent(new CustomEvent('ionChange', { detail: { value } }));

    choose('off');
    expect(flags.categoriesEnabled()).toBe(false);
    expect(flags.source('categories_enabled')).toBe('override');
    choose('on');
    expect(flags.categoriesEnabled()).toBe(true);
    choose('remote');
    expect(flags.source('categories_enabled')).toBe('default');
  });

  it('muestra el número de tareas almacenadas', async () => {
    store.addTask('A');
    store.addTask('B');
    await render();
    expect(item('Tareas almacenadas')?.textContent).toContain('2 en total');
  });

  it('genera 1.000 tareas y avisa con un toast', async () => {
    await render();
    item('Generar 1.000')!.click();
    await vi.waitFor(() => expect(toast.present).toHaveBeenCalled());
    expect(store.counts().all).toBe(1000);
    expect(toasts.create.mock.calls[0][0].message).toContain('1');
    fixture.detectChanges();
    expect(text()).toContain('Última generación');
  });

  it('genera 10.000 tareas', async () => {
    await render();
    item('Generar 10.000')!.click();
    await vi.waitFor(() => expect(toast.present).toHaveBeenCalled());
    expect(store.counts().all).toBe(10000);
  });

  it('"Eliminar todas" está deshabilitado sin tareas y habilitado con tareas', async () => {
    await render();
    expect((item('Eliminar todas') as HTMLElement & { disabled: boolean }).disabled).toBe(true);
    store.addTask('A');
    fixture.detectChanges();
    expect((item('Eliminar todas') as HTMLElement & { disabled: boolean }).disabled).toBe(false);
  });

  it('eliminar todas pide confirmación y vacía la lista al aceptar', async () => {
    store.addTask('A');
    await render();
    item('Eliminar todas')!.click();
    await vi.waitFor(() => expect(alert.present).toHaveBeenCalled());
    const { buttons } = alerts.create.mock.calls[0][0];
    expect(store.counts().all).toBe(1);
    buttons[1].handler();
    expect(store.counts().all).toBe(0);
  });
});
