/** Parte de la app donde se originó el error. */
export type ErrorSource = 'storage' | 'repository' | 'remote-config' | 'unexpected';

/** `warning`: la app sigue funcionando con degradación; `error`: se perdió una operación. */
export type ErrorSeverity = 'warning' | 'error';

/** Error de la app normalizado: mismo formato sin importar quién lo produjo. */
export interface AppError {
  readonly source: ErrorSource;
  readonly severity: ErrorSeverity;
  /** Qué se estaba intentando hacer, en lenguaje claro (no el mensaje técnico). */
  readonly message: string;
  /** Error original tal como lo lanzó la librería o el plugin. */
  readonly cause: unknown;
  readonly occurredAt: number;
}

export function createAppError(
  source: ErrorSource,
  message: string,
  cause: unknown,
  severity: ErrorSeverity = 'error',
  occurredAt: number = Date.now(),
): AppError {
  return { source, severity, message, cause, occurredAt };
}

/** Texto legible de una causa desconocida (los plugins de Cordova rechazan con strings u objetos). */
export function describeCause(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === 'string') {
    return cause;
  }
  try {
    return JSON.stringify(cause) ?? String(cause);
  } catch {
    return String(cause);
  }
}
