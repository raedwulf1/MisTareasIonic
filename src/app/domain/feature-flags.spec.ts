import {
  parseBoolean,
  parseFlagValues,
  resolveFlag,
  resolveFlagSource,
  withOverride,
} from './feature-flags';

describe('domain/feature-flags', () => {
  describe('resolveFlag (prioridad: override local > remoto > valor por defecto)', () => {
    it('usa el valor por defecto si no hay remoto ni override', () => {
      const value = resolveFlag('categories_enabled', {}, {});

      expect(value).toBe(true);
    });

    it('el valor remoto sustituye al valor por defecto', () => {
      const remote = { categories_enabled: false };

      const value = resolveFlag('categories_enabled', {}, remote);

      expect(value).toBe(false);
    });

    it('el override local sustituye al valor remoto', () => {
      const overrides = { categories_enabled: true };
      const remote = { categories_enabled: false };

      const value = resolveFlag('categories_enabled', overrides, remote);

      expect(value).toBe(true);
    });
  });

  describe('resolveFlagSource', () => {
    it('informa "default" si no hay remoto ni override', () => {
      const source = resolveFlagSource('categories_enabled', {}, {});

      expect(source).toBe('default');
    });

    it('informa "remote" si el valor viene de Remote Config', () => {
      const remote = { categories_enabled: true };

      const source = resolveFlagSource('categories_enabled', {}, remote);

      expect(source).toBe('remote');
    });

    it('informa "override" si el valor está forzado localmente', () => {
      const overrides = { categories_enabled: false };

      const source = resolveFlagSource('categories_enabled', overrides, {});

      expect(source).toBe('override');
    });
  });

  describe('withOverride', () => {
    it('fija un override sin mutar el original', () => {
      const original = {};

      const result = withOverride(original, 'categories_enabled', false);

      expect(result).toEqual({ categories_enabled: false });
      expect(original).toEqual({});
    });

    it('quita un override al recibir null', () => {
      const withFlag = withOverride({}, 'categories_enabled', false);

      const result = withOverride(withFlag, 'categories_enabled', null);

      expect(result).toEqual({});
    });
  });

  describe('parseBoolean', () => {
    it.each([
      [true, true],
      [' Yes ', true],
      ['1', true],
      ['off', false],
      [{ value: 'false' }, false],
      ['quizás', undefined],
      [1, undefined],
      [null, undefined],
    ])('interpreta %j como %s', (input, expected) => {
      const result = parseBoolean(input);

      expect(result).toBe(expected);
    });
  });

  describe('parseFlagValues', () => {
    it('solo conserva los flags conocidos', () => {
      const raw = { categories_enabled: 'false', other: 'true' };

      const result = parseFlagValues(raw);

      expect(result).toEqual({ categories_enabled: false });
    });

    it('descarta valores no válidos', () => {
      const result = parseFlagValues({ categories_enabled: '???' });

      expect(result).toEqual({});
    });

    it('devuelve un objeto vacío con null', () => {
      const result = parseFlagValues(null);

      expect(result).toEqual({});
    });
  });
});
