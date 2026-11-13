/** Parámetros de Remote Config usados por la app y su valor por defecto. */
export const FLAG_DEFAULTS = {
  /** Activa/desactiva toda la funcionalidad de categorías (filtros, asignación y gestión). */
  categories_enabled: true,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type FlagSource = 'default' | 'remote' | 'override';
export type FlagValues = Partial<Record<FlagKey, boolean>>;

const FLAG_KEYS = Object.keys(FLAG_DEFAULTS) as FlagKey[];

/** Valor efectivo de un flag: override local > Remote Config > valor por defecto. */
export function resolveFlag(key: FlagKey, overrides: FlagValues, remote: FlagValues): boolean {
  return overrides[key] ?? remote[key] ?? FLAG_DEFAULTS[key];
}

export function resolveFlagSource(
  key: FlagKey,
  overrides: FlagValues,
  remote: FlagValues,
): FlagSource {
  if (overrides[key] !== undefined) return 'override';
  if (remote[key] !== undefined) return 'remote';
  return 'default';
}

/** Fija (`true`/`false`) o quita (`null`) el override de un flag sin mutar el original. */
export function withOverride(
  overrides: FlagValues,
  key: FlagKey,
  value: boolean | null,
): FlagValues {
  const next = { ...overrides };
  if (value === null) delete next[key];
  else next[key] = value;
  return next;
}

/** Extrae los flags conocidos de los valores en crudo de Remote Config; ignora los que no se entienden. */
export function parseFlagValues(raw: Record<string, unknown> | null | undefined): FlagValues {
  const values: FlagValues = {};
  for (const key of FLAG_KEYS) {
    const parsed = parseBoolean(raw?.[key]);
    if (parsed !== undefined) values[key] = parsed;
  }
  return values;
}

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
