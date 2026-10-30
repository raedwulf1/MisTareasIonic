import { Injectable } from '@angular/core';

/**
 * Persistencia local sobre `localStorage` (disponible en el WebView de Cordova sin plugins).
 *
 * Las escrituras se agrupan (debounce) para que marcar 50 tareas seguidas produzca
 * una sola serialización en lugar de 50. Antes de que la app pase a segundo plano
 * (evento `pause` de Cordova) o se cierre la pestaña, se vuelcan las escrituras pendientes.
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private static readonly WRITE_DELAY_MS = 250;

  private readonly pending = new Map<string, () => unknown>();
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    const flush = () => this.flush();
    document.addEventListener('pause', flush, false);
    window.addEventListener('pagehide', flush);
  }

  read<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  /**
   * Programa una escritura. Recibe una función para que la serialización se haga
   * una única vez y con el estado más reciente cuando vence el debounce.
   */
  scheduleWrite(key: string, snapshot: () => unknown): void {
    this.pending.set(key, snapshot);
    if (this.timer === null) {
      this.timer = setTimeout(() => this.flush(), StorageService.WRITE_DELAY_MS);
    }
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    for (const [key, snapshot] of this.pending) {
      try {
        localStorage.setItem(key, JSON.stringify(snapshot()));
      } catch (err) {
        console.error(`[storage] No se pudo guardar "${key}"`, err);
      }
    }
    this.pending.clear();
  }
}
