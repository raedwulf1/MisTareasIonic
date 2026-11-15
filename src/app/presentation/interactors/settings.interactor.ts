import { Injectable, computed, inject } from '@angular/core';

import { FlagKey, FlagSource } from '../../domain/entities/feature-flags';
import { FeatureFlagsService } from '../state/feature-flags.service';
import { TodoStore } from '../state/todo.store';

/**
 * Fachada de Ajustes: estado de Remote Config, overrides de feature flags y datos de
 * demostración.
 */
@Injectable({ providedIn: 'root' })
export class SettingsInteractor {
  private readonly flags = inject(FeatureFlagsService);
  private readonly store = inject(TodoStore);

  readonly status = this.flags.status;
  readonly lastFetch = this.flags.lastFetch;
  readonly lastError = this.flags.lastError;
  readonly categoriesEnabled = this.flags.categoriesEnabled;
  readonly totalTasks = computed(() => this.store.counts().all);

  source(key: FlagKey): FlagSource {
    return this.flags.source(key);
  }

  /** Valor publicado en Remote Config, o `undefined` si no hay ninguno. */
  remoteValue(key: FlagKey): boolean | undefined {
    return this.flags.remoteValue(key);
  }

  /** Fija (`true`/`false`) o quita (`null`) un valor forzado en este dispositivo. */
  setOverride(key: FlagKey, value: boolean | null): void {
    this.flags.setOverride(key, value);
  }

  /** Fuerza una descarga de Remote Config (ignora el intervalo mínimo de caché). */
  refreshRemoteConfig(): void {
    this.flags.refresh(true).subscribe();
  }

  generateDemoTasks(amount: number): void {
    this.store.generateDemoTasks(amount);
  }

  removeAllTasks(): void {
    this.store.removeAllTasks();
  }
}
