import { Observable } from 'rxjs';

import { FlagValues } from '../entities/feature-flags';

/**
 * Contrato de acceso a los valores de feature flags forzados en este dispositivo
 * (los "overrides" de la pantalla de Ajustes). Tienen prioridad sobre Remote Config.
 *
 * Es un único conjunto de valores, no una colección: se lee y se guarda completo.
 * Las operaciones son observables fríos (nada ocurre hasta suscribirse) y emiten un error si la persistencia falla.
 */
export abstract class FlagOverridesRepository {
  /** Overrides guardados, o `{}` si no hay ninguno. */
  abstract get(): Observable<FlagValues>;

  /** Sustituye el conjunto completo de overrides. */
  abstract save(overrides: FlagValues): Observable<void>;
}
