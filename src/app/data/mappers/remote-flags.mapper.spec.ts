import { RemoteFlagsMapper, parseBoolean } from './remote-flags.mapper';

describe('remote-flags.mapper', () => {
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

  describe('RemoteFlagsMapper.toDomain', () => {
    it('solo conserva los flags conocidos', () => {
      const raw = { categories_enabled: 'false', other: 'true' };

      const result = RemoteFlagsMapper.toDomain(raw);

      expect(result).toEqual({ categories_enabled: false });
    });

    it('descarta valores no válidos', () => {
      const result = RemoteFlagsMapper.toDomain({ categories_enabled: '???' });

      expect(result).toEqual({});
    });

    it('devuelve un objeto vacío con null', () => {
      const result = RemoteFlagsMapper.toDomain(null);

      expect(result).toEqual({});
    });
  });
});
