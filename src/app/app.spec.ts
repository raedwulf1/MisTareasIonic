import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Platform } from '@ionic/angular/platform';

import { App } from './app';
import { FeatureFlagsService } from './application/feature-flags.service';
import { TodoStore } from './application/todo.store';
import { provideInfrastructure } from './infrastructure/provide-infrastructure';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let el: HTMLElement;
  let store: TodoStore;
  let flags: FeatureFlagsService;

  const items = () => Array.from(el.querySelectorAll('ion-item'));
  const labels = () => items().map((i) => i.querySelector('ion-label')?.textContent?.trim());

  async function render(): Promise<void> {
    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    el = fixture.nativeElement;
  }

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideInfrastructure(),
        provideRouter([]),
        {
          provide: Platform,
          useValue: {
            ready: () => Promise.resolve('dom'),
            resume: { subscribe: vi.fn() },
            backButton: { subscribeWithPriority: vi.fn() },
            is: () => false,
          },
        },
      ],
    });
    store = TestBed.inject(TodoStore);
    flags = TestBed.inject(FeatureFlagsService);
  });

  it('muestra el título del menú y el pie', async () => {
    await render();
    expect(el.querySelector('ion-menu ion-title')?.textContent).toContain('Mis tareas');
    expect(el.querySelector('.app-menu__footer')?.textContent).toContain(
      'Ionic + Angular + Cordova',
    );
  });

  it('el menú tiene Tareas, Categorías y Ajustes con sus enlaces', async () => {
    await render();
    expect(labels()).toEqual(['Tareas', 'Categorías', 'Ajustes y feature flags']);
    expect(
      items().map((i) => i.getAttribute('ng-reflect-router-link') ?? i.getAttribute('href')),
    ).toEqual(['/tasks', '/categories', '/settings']);
  });

  it('las insignias muestran tareas pendientes y número de categorías', async () => {
    const done = store.addTask('A')!;
    store.addTask('B');
    store.toggleTask(done.id);
    await render();
    const badges = Array.from(el.querySelectorAll('ion-badge')).map((b) => b.textContent?.trim());
    expect(badges).toEqual(['1', '3']);
  });

  it('las insignias se actualizan al cambiar el estado', async () => {
    await render();
    store.addTask('A');
    fixture.detectChanges();
    expect(el.querySelector('ion-badge')?.textContent?.trim()).toBe('1');
  });

  it('oculta la entrada Categorías cuando el feature flag está apagado', async () => {
    flags.setOverride('categories_enabled', false);
    await render();
    expect(labels()).toEqual(['Tareas', 'Ajustes y feature flags']);
  });

  it('inicializa Remote Config tras el primer render', async () => {
    const init = vi.spyOn(flags, 'init').mockResolvedValue();
    await render();
    expect(init).toHaveBeenCalledTimes(1);
  });

  it('contiene el router outlet principal', async () => {
    await render();
    expect(el.querySelector('ion-router-outlet#main-content')).not.toBeNull();
  });
});
