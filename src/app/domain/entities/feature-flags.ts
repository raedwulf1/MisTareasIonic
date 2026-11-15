/** Parámetros de Remote Config usados por la app y su valor por defecto. */
export const FLAG_DEFAULTS = {
  /** Activa/desactiva toda la funcionalidad de categorías (filtros, asignación y gestión). */
  categories_enabled: true,
} as const;

export type FlagKey = keyof typeof FLAG_DEFAULTS;
export type FlagSource = 'default' | 'remote' | 'override';
export type FlagValues = Partial<Record<FlagKey, boolean>>;

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
