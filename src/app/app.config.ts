import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withPreloading,
} from '@angular/router';
import { IonicRouteStrategy } from '@ionic/angular/ionic-route-strategy';
import { provideIonicAngular } from '@ionic/angular/provide';

import { routes } from './app.routes';
import { provideData } from './data/provide-data';
import { TodoStore } from './presentation/state/todo.store';

export const appConfig: ApplicationConfig = {
  providers: [
    // Implementaciones concretas de los puertos y repositorios del dominio.
    provideData(),
    // Carga tareas y categorías antes del primer render.
    provideAppInitializer(() => inject(TodoStore).load()),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // useSetInputAPI: los modales reciben sus datos como signal inputs (componentRef.setInput).
    provideIonicAngular({ useSetInputAPI: true }),
    // Las páginas se cargan bajo demanda; tras el primer render se precargan en segundo plano.
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
