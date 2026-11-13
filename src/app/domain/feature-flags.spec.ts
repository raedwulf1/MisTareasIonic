import {
  parseBoolean,
  parseFlagValues,
  resolveFlag,
  resolveFlagSource,
  withOverride,
} from './feature-flags';

describe('domain/feature-flags', () => {
  it('prioridad: override local > remoto > valor por defecto', () => {
    expect(resolveFlag('categories_enabled', {}, {})).toBe(true);
    expect(resolveFlag('categories_enabled', {}, { categories_enabled: false })).toBe(false);
    expect(
      resolveFlag(
        'categories_enabled',
        { categories_enabled: true },
        { categories_enabled: false },
      ),
    ).toBe(true);
  });

  it('informa del origen del valor efectivo', () => {
    expect(resolveFlagSource('categories_enabled', {}, {})).toBe('default');
    expect(resolveFlagSource('categories_enabled', {}, { categories_enabled: true })).toBe(
      'remote',
    );
    expect(resolveFlagSource('categories_enabled', { categories_enabled: false }, {})).toBe(
      'override',
    );
  });

  it('withOverride fija y quita overrides sin mutar el original', () => {
    const original = {};
    const set = withOverride(original, 'categories_enabled', false);
    expect(set).toEqual({ categories_enabled: false });
    expect(original).toEqual({});
    expect(withOverride(set, 'categories_enabled', null)).toEqual({});
  });

  it('parseBoolean entiende booleanos, cadenas habituales y objetos { value }', () => {
    expect(parseBoolean(true)).toBe(true);
    expect(parseBoolean(' Yes ')).toBe(true);
    expect(parseBoolean('1')).toBe(true);
    expect(parseBoolean('off')).toBe(false);
    expect(parseBoolean({ value: 'false' })).toBe(false);
    expect(parseBoolean('quizás')).toBeUndefined();
    expect(parseBoolean(1)).toBeUndefined();
    expect(parseBoolean(null)).toBeUndefined();
  });

  it('parseFlagValues solo conserva los flags conocidos y válidos', () => {
    expect(parseFlagValues({ categories_enabled: 'false', other: 'true' })).toEqual({
      categories_enabled: false,
    });
    expect(parseFlagValues({ categories_enabled: '???' })).toEqual({});
    expect(parseFlagValues(null)).toEqual({});
  });
});
