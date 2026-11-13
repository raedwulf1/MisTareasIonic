import { Injectable, inject } from '@angular/core';
import { Platform } from '@ionic/angular/platform';

import { environment } from '../../environments/environment';
import { RemoteConfigGateway } from '../application/ports/remote-config.gateway';

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
 * Convierte la API de callbacks del plugin en promesas y encapsula el ciclo de vida
 * de la plataforma (Ionic `Platform`) y los ajustes de descarga del `environment`.
 * El plugin se busca en cada llamada porque Cordova lo inyecta en `window` en tiempo de ejecución.
 */
@Injectable({ providedIn: 'root' })
export class FirebasexRemoteConfigGateway implements RemoteConfigGateway {
  private readonly platform = inject(Platform);

  async whenReady(): Promise<void> {
    await this.platform.ready();
  }

  isAvailable(): boolean {
    return window.FirebasexConfig !== undefined;
  }

  async configure(defaults: Readonly<Record<string, unknown>>): Promise<void> {
    const api = this.api();
    const { fetchTimeoutSec, minimumFetchIntervalSec } = environment.remoteConfig;
    await call<void>((ok, err) =>
      api.setConfigSettings(fetchTimeoutSec, minimumFetchIntervalSec, ok, err),
    );
    await call<void>((ok, err) => api.setDefaults({ ...defaults }, ok, err));
  }

  async fetchAndActivate(force: boolean): Promise<void> {
    const api = this.api();
    if (force) {
      await call<void>((ok, err) => api.fetch(0, ok, err));
      await call<boolean>((ok, err) => api.activateFetched(ok, err));
    } else {
      await call<boolean>((ok, err) => api.fetchAndActivate(ok, err));
    }
  }

  getActiveValues(): Promise<Record<string, unknown>> {
    const api = this.api();
    return call<Record<string, unknown>>((ok, err) => api.getAll(ok, err));
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

function call<T>(fn: (ok: (value: T) => void, err: (e: unknown) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => fn(resolve, reject));
}
