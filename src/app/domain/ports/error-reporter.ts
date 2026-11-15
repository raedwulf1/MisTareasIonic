import { AppError } from '../entities/app-error';

/**
 * Puerto único por el que pasan todos los errores de la app.
 *
 * Quien detecta un error lo informa aquí en lugar de decidir qué hacer con él; la
 * implementación concreta (consola hoy, un servicio de monitoreo mañana) se registra
 * en `provideData()`. `report` nunca lanza: informar un error no puede causar otro.
 */
export abstract class ErrorReporter {
  abstract report(error: AppError): void;
}
