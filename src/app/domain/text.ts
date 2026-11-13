/** Normaliza texto para comparar sin distinguir mayúsculas ni tildes ("cafe" encuentra "Café"). */
export function normalizeText(value: string): string {
  return value.toLocaleLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}
