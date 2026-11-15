import { Injectable } from '@angular/core';

import { AppError } from '../../domain/entities/app-error';
import { ErrorReporter } from '../../domain/ports/error-reporter';

/** Reporta los errores en la consola con el formato `[origen] mensaje`. */
@Injectable({ providedIn: 'root' })
export class ConsoleErrorReporter implements ErrorReporter {
  report({ source, severity, message, cause }: AppError): void {
    const log = severity === 'warning' ? console.warn : console.error;
    log(`[${source}] ${message}`, cause);
  }
}
