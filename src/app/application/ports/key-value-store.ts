/**
 * Puerto de persistencia local clave → valor (JSON).
 *
 * La capa de aplicación depende de esta abstracción; la implementación concreta
 * (`localStorage`) se registra en la raíz de composición (`app.config.ts`).
 */
export abstract class KeyValueStore {
  /** Valor guardado, o `fallback` si no existe o no se puede leer. */
  abstract read<T>(key: string, fallback: T): T;

  /** Escritura inmediata. Si el almacenamiento no está disponible, el valor solo vive en memoria. */
  abstract write(key: string, value: unknown): void;

  /**
   * Escritura diferida y agrupada: `snapshot` se evalúa una sola vez, con el estado
   * más reciente, cuando se vuelcan las escrituras pendientes.
   */
  abstract scheduleWrite(key: string, snapshot: () => unknown): void;
}
