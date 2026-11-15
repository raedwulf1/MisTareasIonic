import { FLAG_DEFAULTS, FlagKey, FlagValues } from '../../domain/entities/feature-flags';

const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

/** Convierte los valores en crudo de Remote Config en los flags tipados del dominio. */
export const RemoteFlagsMapper = {
  /** Extrae los flags conocidos; ignora los que no se entienden. */
  toDomain(raw: Record<string, unknown> | null | undefined): FlagValues {
    const values: FlagValues = {};
    for (const key of FLAG_KEYS) {
      const parsed = parseBoolean(raw?.[key]);
      if (parsed !== undefined) values[key] = parsed;
    }
    return values;
  },
};

/** Acepta booleanos, cadenas habituales ("true", "1", "off"…) y objetos `{ value }` del plugin nativo. */
export function parseBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    return parseBoolean(value.value);
  }
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(v)) return true;
    if (['false', '0', 'no', 'off'].includes(v)) return false;
  }
  return undefined;
}
