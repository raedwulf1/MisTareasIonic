/** Genera ids cortos y únicos sin depender de `crypto.randomUUID` (no disponible en WebViews antiguos). */
export function createId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
