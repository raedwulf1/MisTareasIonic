import {
  ApplicationConfig,
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
import { provideInfrastructure } from './infrastructure/provide-infrastructure';

export const appConfig: ApplicationConfig = {
  providers: [
    // Implementaciones concretas de los puertos de la capa de aplicación.
    provideInfrastructure(),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // useSetInputAPI: los modales reciben sus datos como signal inputs (componentRef.setInput).
    provideIonicAngular({ useSetInputAPI: true }),
    // Las páginas se cargan bajo demanda; tras el primer render se precargan en segundo plano.
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
