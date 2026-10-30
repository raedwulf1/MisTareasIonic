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

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true, runCoalescing: true }),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    // useSetInputAPI: los modales reciben sus datos como signal inputs (componentRef.setInput).
    provideIonicAngular({ useSetInputAPI: true }),
    // Las páginas se cargan bajo demanda; tras el primer render se precargan en segundo plano.
    provideRouter(routes, withPreloading(PreloadAllModules)),
  ],
};
