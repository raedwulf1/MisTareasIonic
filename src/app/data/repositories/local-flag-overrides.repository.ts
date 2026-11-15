import { Injectable, inject } from '@angular/core';
import { Observable, defer, of } from 'rxjs';

import { FlagValues } from '../../domain/entities/feature-flags';
import { KeyValueStore } from '../../domain/ports/key-value-store';
import { FlagOverridesRepository } from '../../domain/repositories/flag-overrides.repository';

/** Clave del formato persistido (no cambiar: rompería los datos guardados). */
export const FLAG_OVERRIDES_KEY = 'todo.flagOverrides.v1';

/**
 * Repositorio de overrides de flags sobre `KeyValueStore`.
 *
 * A diferencia de tareas y categorías, la escritura es inmediata (`write`) y no agrupada:
 * es un valor pequeño que cambia solo por una acción explícita del usuario en Ajustes.
 */
@Injectable({ providedIn: 'root' })
export class LocalFlagOverridesRepository implements FlagOverridesRepository {
  private readonly storage = inject(KeyValueStore);

  get(): Observable<FlagValues> {
    return defer(() => of(this.storage.read<FlagValues>(FLAG_OVERRIDES_KEY, {})));
  }

  save(overrides: FlagValues): Observable<void> {
    return defer(() => {
      this.storage.write(FLAG_OVERRIDES_KEY, overrides);
      return of(undefined);
    });
  }
}
