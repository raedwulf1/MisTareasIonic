import { resolveFlag, resolveFlagSource, withOverride } from './feature-flags';

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
});
