import { Injectable, computed, inject, signal } from '@angular/core';
import { Platform } from '@ionic/angular/platform';

import { environment } from '../../../environments/environment';

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

/** Parámetros de Remote Config usados por la app y su valor por defecto. */
export const FLAG_DEFAULTS = {
  /** Activa/desactiva toda la funcionalidad de categorías (filtros, asignación y gestión). */
  categories_enabled: true,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type FlagSource = 'default' | 'remote' | 'override';
export type RemoteConfigStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

const OVERRIDES_KEY = 'todo.flagOverrides.v1';

/**
 * Feature flags respaldados por Firebase Remote Config.
 *
 * Flujo:
 * 1. La app arranca con los valores por defecto (no bloquea el primer render).
 * 2. Cuando Cordova está listo, se aplican los valores activos (los descargados en
 *    la sesión anterior) y luego se hace `fetchAndActivate` en segundo plano.
 * 3. Al volver del segundo plano (`resume`) se vuelve a consultar Remote Config,
 *    así que un cambio en la consola de Firebase se refleja sin reinstalar la app.
 *
 * En el navegador (`ng serve`) no hay plugin nativo: se usan los valores por defecto
 * y se pueden forzar valores locales desde la pantalla de Ajustes para la demo.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly platform = inject(Platform);

  private readonly remoteValues = signal<Partial<Record<FlagKey, boolean>>>({});
  private readonly overrides = signal<Partial<Record<FlagKey, boolean>>>(readOverrides());

  readonly status = signal<RemoteConfigStatus>('idle');
  readonly lastFetch = signal<Date | null>(null);
  readonly lastError = signal<string | null>(null);

  readonly categoriesEnabled = computed(() => this.value('categories_enabled'));

  private initialized = false;

  /** Valor efectivo de un flag: override local > Remote Config > valor por defecto. */
  value(key: FlagKey): boolean {
    return this.overrides()[key] ?? this.remoteValues()[key] ?? FLAG_DEFAULTS[key];
  }

  source(key: FlagKey): FlagSource {
    if (this.overrides()[key] !== undefined) return 'override';
    if (this.remoteValues()[key] !== undefined) return 'remote';
    return 'default';
  }

  remoteValue(key: FlagKey): boolean | undefined {
    return this.remoteValues()[key];
  }

  setOverride(key: FlagKey, value: boolean | null): void {
    this.overrides.update((current) => {
      const next = { ...current };
      if (value === null) delete next[key];
      else next[key] = value;
      try {
        localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      } catch {
        /* sin almacenamiento disponible: el override vive solo en memoria */
      }
      return next;
    });
  }

  /** Se llama una vez desde el componente raíz, después del primer render. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await this.platform.ready();
    const api = window.FirebasexConfig;
    if (!api) {
      this.status.set('unavailable');
      return;
    }

    try {
      await call<void>((ok, err) =>
        api.setConfigSettings(
          environment.remoteConfig.fetchTimeoutSec,
          environment.remoteConfig.minimumFetchIntervalSec,
          ok,
          err,
        ),
      );
      await call<void>((ok, err) => api.setDefaults({ ...FLAG_DEFAULTS }, ok, err));
      // Valores activados en una sesión anterior: disponibles al instante, sin red.
      await this.readActiveValues(api);
    } catch (e) {
      this.fail(e);
    }

    void this.refresh();
    this.platform.resume.subscribe(() => void this.refresh());
  }

  /** Descarga y activa la configuración remota. `force` ignora el intervalo mínimo de caché. */
  async refresh(force = false): Promise<void> {
    const api = window.FirebasexConfig;
    if (!api) return;
    this.status.set('loading');
    try {
      if (force) {
        await call<void>((ok, err) => api.fetch(0, ok, err));
        await call<boolean>((ok, err) => api.activateFetched(ok, err));
      } else {
        await call<boolean>((ok, err) => api.fetchAndActivate(ok, err));
      }
      await this.readActiveValues(api);
      this.lastFetch.set(new Date());
      this.lastError.set(null);
      this.status.set('ready');
    } catch (e) {
      this.fail(e);
    }
  }

  private async readActiveValues(api: FirebasexConfigApi): Promise<void> {
    const all = await call<Record<string, unknown>>((ok, err) => api.getAll(ok, err));
    const values: Partial<Record<FlagKey, boolean>> = {};
    for (const key of Object.keys(FLAG_DEFAULTS) as FlagKey[]) {
      const parsed = parseBoolean(all?.[key]);
      if (parsed !== undefined) values[key] = parsed;
    }
    this.remoteValues.set(values);
  }

  private fail(e: unknown): void {
    // Sin red o sin configuración de Firebase: la app sigue funcionando con los valores por defecto.
    console.warn('[remote-config]', e);
    this.lastError.set(typeof e === 'string' ? e : JSON.stringify(e));
    this.status.set('error');
  }
}

function call<T>(fn: (ok: (value: T) => void, err: (e: unknown) => void) => void): Promise<T> {
  return new Promise<T>((resolve, reject) => fn(resolve, reject));
}

function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return parseBoolean((value as { value: unknown }).value);
  }
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
  }
  return undefined;
}

function readOverrides(): Partial<Record<FlagKey, boolean>> {
  try {
    return JSON.parse(localStorage.getItem(OVERRIDES_KEY) ?? '{}');
  } catch {
    return {};
  }
}
