import { ErrorHandler, Injectable, inject } from '@angular/core';

import { createAppError } from '../../domain/entities/app-error';
import { ErrorReporter } from '../../domain/ports/error-reporter';

/**
 * Sustituye al `ErrorHandler` de Angular: los errores no capturados (de componentes,
 * promesas sin atender o eventos globales) también terminan en el `ErrorReporter`.
 */
@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  private readonly reporter = inject(ErrorReporter);

  handleError(error: unknown): void {
    this.reporter.report(createAppError('unexpected', 'Error no controlado', error));
  }
}
