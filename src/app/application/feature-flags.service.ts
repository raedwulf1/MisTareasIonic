import { Injectable, computed, inject, signal } from '@angular/core';

import {
  FLAG_DEFAULTS,
  FlagKey,
  FlagSource,
  FlagValues,
  parseFlagValues,
  resolveFlag,
  resolveFlagSource,
  withOverride,
} from '../domain/feature-flags';
import { KeyValueStore } from './ports/key-value-store';
import { RemoteConfigGateway } from './ports/remote-config.gateway';

export type RemoteConfigStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

const OVERRIDES_KEY = 'todo.flagOverrides.v1';

/**
 * Feature flags respaldados por configuración remota (Firebase Remote Config).
 *
 * Flujo:
 * 1. La app arranca con los valores por defecto (no bloquea el primer render).
 * 2. Cuando la plataforma está lista, se aplican los valores activos (los descargados en
 *    la sesión anterior) y luego se descarga y activa la configuración en segundo plano.
 * 3. Al volver del segundo plano (`resume`) se vuelve a consultar Remote Config,
 *    así que un cambio en la consola de Firebase se refleja sin reinstalar la app.
 *
 * En el navegador (`ng serve`) no hay proveedor remoto: se usan los valores por defecto
 * y se pueden forzar valores locales desde la pantalla de Ajustes para la demo.
 */
@Injectable({ providedIn: 'root' })
export class FeatureFlagsService {
  private readonly remoteConfig = inject(RemoteConfigGateway);
  private readonly storage = inject(KeyValueStore);

  private readonly remoteValues = signal<FlagValues>({});
  private readonly overrides = signal<FlagValues>(this.storage.read<FlagValues>(OVERRIDES_KEY, {}));

  readonly status = signal<RemoteConfigStatus>('idle');
  readonly lastFetch = signal<Date | null>(null);
  readonly lastError = signal<string | null>(null);

  readonly categoriesEnabled = computed(() => this.value('categories_enabled'));

  private initialized = false;

  /** Valor efectivo de un flag: override local > Remote Config > valor por defecto. */
  value(key: FlagKey): boolean {
    return resolveFlag(key, this.overrides(), this.remoteValues());
  }

  source(key: FlagKey): FlagSource {
    return resolveFlagSource(key, this.overrides(), this.remoteValues());
  }

  remoteValue(key: FlagKey): boolean | undefined {
    return this.remoteValues()[key];
  }

  /** Fija (`true`/`false`) o quita (`null`) un valor forzado en este dispositivo. */
  setOverride(key: FlagKey, value: boolean | null): void {
    const next = withOverride(this.overrides(), key, value);
    this.storage.write(OVERRIDES_KEY, next);
    this.overrides.set(next);
  }

  /** Se llama una vez desde el componente raíz, después del primer render. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    await this.remoteConfig.whenReady();
    if (!this.remoteConfig.isAvailable()) {
      this.status.set('unavailable');
      return;
    }

    try {
      await this.remoteConfig.configure(FLAG_DEFAULTS);
      // Valores activados en una sesión anterior: disponibles al instante, sin red.
      await this.readActiveValues();
    } catch (e) {
      this.fail(e);
    }

    void this.refresh();
    this.remoteConfig.onResume(() => void this.refresh());
  }

  /** Descarga y activa la configuración remota. `force` ignora el intervalo mínimo de caché. */
  async refresh(force = false): Promise<void> {
    if (!this.remoteConfig.isAvailable()) return;
    this.status.set('loading');
    try {
      await this.remoteConfig.fetchAndActivate(force);
      await this.readActiveValues();
      this.lastFetch.set(new Date());
      this.lastError.set(null);
      this.status.set('ready');
    } catch (e) {
      this.fail(e);
    }
  }

  private async readActiveValues(): Promise<void> {
    this.remoteValues.set(parseFlagValues(await this.remoteConfig.getActiveValues()));
  }

  private fail(e: unknown): void {
    // Sin red o sin configuración de Firebase: la app sigue funcionando con los últimos valores conocidos.
    console.warn('[remote-config]', e);
    this.lastError.set(typeof e === 'string' ? e : JSON.stringify(e));
    this.status.set('error');
  }
}
