import { FLAG_DEFAULTS, FlagKey, FlagValues } from '../../domain/entities/feature-flags';
import { FlagOverridesDto } from '../dtos/flag-overrides.dto';

const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

/** Convierte entre los overrides del dominio y su formato persistido. */
export const FlagOverridesMapper = {
  toDto(overrides: FlagValues): FlagOverridesDto {
    const dto: FlagOverridesDto = {};
    for (const key of FLAG_KEYS) {
      const value = overrides[key];
      if (value !== undefined) {
        dto[key] = value;
      }
    }
    return dto;
  },

  /** Conserva solo los flags conocidos con valor booleano; lo demás se ignora. */
  toDomain(raw: unknown): FlagValues {
    const values: FlagValues = {};
    if (typeof raw !== 'object' || raw === null) {
      return values;
    }
    const r = raw as Record<string, unknown>;
    for (const key of FLAG_KEYS) {
      if (typeof r[key] === 'boolean') {
        values[key] = r[key];
      }
    }
    return values;
  },
};
