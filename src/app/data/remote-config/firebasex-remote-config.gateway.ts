import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular/platform';
import { Observable, defer, from, map, switchMap } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RemoteConfigGateway } from '../../domain/ports/remote-config.gateway';

/** API de `cordova-plugin-firebasex-config` (expuesta como `window.FirebasexConfig`). */
interface FirebasexConfigApi {
  setConfigSettings(
    fetchTimeout: number,
    minimumFetchInterval: number,
    ok: () => void,
    err: (e: unknown) => void,
  ): void;
  setDefaults(defaults: Record<string, unknown>, ok: () => void, err: (e: unknown) => void): void;
  fetch(cacheExpirationSeconds: number, ok: () => void, err: (e: unknown) => void): void;
  activateFetched(ok: (activated: boolean) => void, err: (e: unknown) => void): void;
  fetchAndActivate(ok: (activated: boolean) => void, err: (e: unknown) => void): void;
  getAll(ok: (values: Record<string, unknown>) => void, err: (e: unknown) => void): void;
}

declare global {
  interface Window {
    FirebasexConfig?: FirebasexConfigApi;
  }
}

/**
 * Adaptador de Firebase Remote Config vía `cordova-plugin-firebasex-config`.
 *
 * Convierte la API de callbacks del plugin en observables fríos (nada se ejecuta hasta suscribirse) y encapsula el ciclo de vida
 * de la plataforma (Ionic `Platform`) y los ajustes de descarga del `environment`.
 * El plugin se busca en cada llamada porque Cordova lo inyecta en `window` en tiempo de ejecución.
 */
@Injectable({ providedIn: 'root' })
export class FirebasexRemoteConfigGateway implements RemoteConfigGateway {
  private readonly platform = inject(Platform);

  whenReady(): Observable<void> {
    return defer(() => from(this.platform.ready())).pipe(map(() => undefined));
  }

  isAvailable(): boolean {
    return window.FirebasexConfig !== undefined;
  }

  configure(defaults: Readonly<Record<string, unknown>>): Observable<void> {
    return defer(() => {
      const api = this.api();
      const { fetchTimeoutSec, minimumFetchIntervalSec } = environment.remoteConfig;
      return call<void>((ok, err) =>
        api.setConfigSettings(fetchTimeoutSec, minimumFetchIntervalSec, ok, err),
      ).pipe(
        switchMap(() => call<void>((ok, err) => api.setDefaults({ ...defaults }, ok, err))),
        map(() => undefined),
      );
    });
  }

  fetchAndActivate(force: boolean): Observable<void> {
    return defer(() => {
      const api = this.api();
      const activated = force
        ? call<void>((ok, err) => api.fetch(0, ok, err)).pipe(
            switchMap(() => call<boolean>((ok, err) => api.activateFetched(ok, err))),
          )
        : call<boolean>((ok, err) => api.fetchAndActivate(ok, err));
      return activated.pipe(map(() => undefined));
    });
  }

  getActiveValues(): Observable<Record<string, unknown>> {
    return defer(() => {
      const api = this.api();
      return call<Record<string, unknown>>((ok, err) => api.getAll(ok, err));
    });
  }

  onResume(callback: () => void): void {
    this.platform.resume.subscribe(callback);
  }

  private api(): FirebasexConfigApi {
    const api = window.FirebasexConfig;
    if (!api) throw new Error('cordova-plugin-firebasex-config no está disponible');
    return api;
  }
}

function call<T>(fn: (ok: (value: T) => void, err: (e: unknown) => void) => void): Observable<T> {
  return new Observable<T>((subscriber) => {
    fn(
      (value) => {
        subscriber.next(value);
        subscriber.complete();
      },
      (e) => subscriber.error(e),
    );
  });
}
