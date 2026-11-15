import {
  ApplicationConfig,
  ErrorHandler,
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
import { forkJoin } from 'rxjs';

import { routes } from './app.routes';
import { GlobalErrorHandler } from './data/errors/global-error-handler';
import { provideData } from './data/provide-data';
import { FeatureFlagsService } from './presentation/state/feature-flags.service';
import { TodoStore } from './presentation/state/todo.store';

export const appConfig: ApplicationConfig = {
  providers: [
    // Implementaciones concretas de los puertos y repositorios del dominio.
    provideData(),
    // Carga overrides de flags, tareas y categorías antes del primer render.
    provideAppInitializer(() =>
      forkJoin([inject(FeatureFlagsService).loadOverrides(), inject(TodoStore).load()]),
    ),
    // Todo error no capturado pasa por el ErrorReporter.
    { provide: ErrorHandler, useClass: GlobalErrorHandler },
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // useSetInputAPI: los modales reciben sus datos como signal inputs (componentRef.setInput).
    provideIonicAngular({ useSetInputAPI: true }),
    // Las páginas se cargan bajo demanda; tras el primer render se precargan en segundo plano.
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
