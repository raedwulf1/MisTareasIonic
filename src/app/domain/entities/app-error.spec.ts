import { createAppError, describeCause } from './app-error';

describe('createAppError', () => {
  it('crea un error con severidad "error" y la hora dada por defecto', () => {
    const cause = new Error('boom');

    const error = createAppError('repository', 'No se pudo guardar', cause, undefined, 123);

    expect(error).toEqual({
      source: 'repository',
      severity: 'error',
      message: 'No se pudo guardar',
      cause,
      occurredAt: 123,
    });
  });

  it('permite marcarlo como advertencia', () => {
    expect(createAppError('remote-config', 'x', null, 'warning').severity).toBe('warning');
  });
});

describe('describeCause', () => {
  it('devuelve el mensaje de un Error', () => {
    expect(describeCause(new Error('sin red'))).toBe('sin red');
  });

  it('devuelve los strings tal cual', () => {
    expect(describeCause('sin red')).toBe('sin red');
  });

  it('serializa objetos y tolera referencias circulares', () => {
    expect(describeCause({ code: 7 })).toBe('{"code":7}');
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(describeCause(circular)).toBe('[object Object]');
  });
});
