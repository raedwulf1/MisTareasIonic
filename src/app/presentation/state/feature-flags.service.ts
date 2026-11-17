import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, defer, map, of, switchMap, tap } from 'rxjs';

import {
  FLAG_DEFAULTS,
  FlagKey,
  FlagSource,
  FlagValues,
  resolveFlag,
  resolveFlagSource,
  withOverride,
} from '../../domain/entities/feature-flags';
import { createAppError, describeCause } from '../../domain/entities/app-error';
import { ErrorReporter } from '../../domain/ports/error-reporter';
import { RemoteConfigGateway } from '../../domain/ports/remote-config.gateway';
import { FlagOverridesRepository } from '../../domain/repositories/flag-overrides.repository';

export type RemoteConfigStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

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
  private readonly errors = inject(ErrorReporter);
  private readonly overridesRepository = inject(FlagOverridesRepository);

  private readonly remoteValues = signal<FlagValues>({});
  private readonly overrides = signal<FlagValues>({});

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

  /** Carga los valores forzados guardados. Se llama al arrancar la app, antes del primer render. */
  loadOverrides(): Observable<void> {
    return this.overridesRepository.get().pipe(
      tap((overrides) => this.overrides.set(overrides)),
      map(() => undefined),
    );
  }

  /** Fija (`true`/`false`) o quita (`null`) un valor forzado en este dispositivo. */
  setOverride(key: FlagKey, value: boolean | null): void {
    const next = withOverride(this.overrides(), key, value);
    this.overrides.set(next);
    this.overridesRepository.save(next).subscribe({
      error: (err) =>
        this.errors.report(createAppError('repository', 'No se pudo guardar el override', err)),
    });
  }

  /**
   * Se llama una vez desde el componente raíz, después del primer render.
   * Observable frío que completa tras leer los valores activos; la descarga remota sigue en segundo plano.
   */
  init(): Observable<void> {
    return defer(() => {
      if (this.initialized) {
        return of(undefined);
      }
      this.initialized = true;

      return this.remoteConfig.whenReady().pipe(
        switchMap(() => {
          if (!this.remoteConfig.isAvailable()) {
            this.status.set('unavailable');
            return of(undefined);
          }
          return this.remoteConfig.configure(FLAG_DEFAULTS).pipe(
            // Valores activados en una sesión anterior: disponibles al instante, sin red.
            switchMap(() => this.readActiveValues()),
            catchError((e) => {
              this.fail(e);
              return of(undefined);
            }),
            tap(() => {
              this.refresh().subscribe();
              this.remoteConfig.onResume(() => this.refresh().subscribe());
            }),
          );
        }),
      );
    });
  }

  /**
   * Descarga y activa la configuración remota. `force` ignora el intervalo mínimo de caché.
   * Observable frío que nunca emite error: los fallos quedan en `status` y `lastError`.
   */
  refresh(force = false): Observable<void> {
    return defer(() => {
      if (!this.remoteConfig.isAvailable()) {
        return of(undefined);
      }
      this.status.set('loading');
      return this.remoteConfig.fetchAndActivate(force).pipe(
        switchMap(() => this.readActiveValues()),
        tap(() => {
          this.lastFetch.set(new Date());
          this.lastError.set(null);
          this.status.set('ready');
        }),
        catchError((e) => {
          this.fail(e);
          return of(undefined);
        }),
      );
    });
  }

  private readActiveValues(): Observable<void> {
    return this.remoteConfig.getActiveValues().pipe(
      tap((values) => this.remoteValues.set(values)),
      map(() => undefined),
    );
  }

  private fail(e: unknown): void {
    // Sin red o sin configuración de Firebase: la app sigue funcionando con los últimos valores conocidos.
    this.errors.report(
      createAppError('remote-config', 'No se pudo actualizar Remote Config', e, 'warning'),
    );
    this.lastError.set(describeCause(e));
    this.status.set('error');
  }
}
