import { Observable } from 'rxjs';

/**
 * Puerto hacia el proveedor de configuración remota (Firebase Remote Config en Cordova).
 *
 * Las operaciones asíncronas son observables fríos que emiten una vez y completan; si fallan,
 * emiten el error original del proveedor.
 */
export abstract class RemoteConfigGateway {
  /** Resuelve cuando la plataforma nativa está lista para usarse. */
  abstract whenReady(): Observable<void>;

  /** `false` cuando no hay proveedor (p. ej. en el navegador con `ng serve`). */
  abstract isAvailable(): boolean;

  /** Aplica los ajustes de descarga y registra los valores por defecto. */
  abstract configure(defaults: Readonly<Record<string, unknown>>): Observable<void>;

  /** Descarga y activa la configuración. `force` ignora el intervalo mínimo de caché. */
  abstract fetchAndActivate(force: boolean): Observable<void>;

  /** Valores activos en crudo, tal como los devuelve el proveedor. */
  abstract getActiveValues(): Observable<Record<string, unknown>>;

  /** Registra un callback para cuando la app vuelve del segundo plano. */
  abstract onResume(callback: () => void): void;
}
