import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { createAppError } from '../../domain/entities/app-error';
import { ErrorReporter } from '../../domain/ports/error-reporter';
import { ConsoleErrorReporter } from './console.error-reporter';
import { GlobalErrorHandler } from './global-error-handler';

describe('ConsoleErrorReporter', () => {
  it('usa console.error para errores y console.warn para advertencias', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const reporter = new ConsoleErrorReporter();
    const cause = new Error('x');

    reporter.report(createAppError('storage', 'No se pudo guardar', cause));
    reporter.report(createAppError('remote-config', 'Sin red', cause, 'warning'));

    expect(error).toHaveBeenCalledWith('[storage] No se pudo guardar', cause);
    expect(warn).toHaveBeenCalledWith('[remote-config] Sin red', cause);
  });
});

describe('GlobalErrorHandler', () => {
  it('envía los errores no capturados al ErrorReporter como "unexpected"', () => {
    const report = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: ErrorReporter, useValue: { report } },
        { provide: ErrorHandler, useClass: GlobalErrorHandler },
      ],
    });
    const cause = new Error('boom');

    TestBed.inject(ErrorHandler).handleError(cause);

    expect(report).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'unexpected', severity: 'error', cause }),
    );
  });
});
