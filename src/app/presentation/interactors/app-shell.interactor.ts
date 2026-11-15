import { Injectable, computed, inject } from '@angular/core';

import { FeatureFlagsService } from '../state/feature-flags.service';
import { TodoStore } from '../state/todo.store';

/** Fachada del componente raíz: menú lateral (insignias y entradas) y arranque de Remote Config. */
@Injectable({ providedIn: 'root' })
export class AppShellInteractor {
  private readonly store = inject(TodoStore);
  private readonly flags = inject(FeatureFlagsService);

  readonly pendingTasks = computed(() => this.store.counts().pending);
  readonly categoryCount = computed(() => this.store.categories().length);
  readonly categoriesEnabled = this.flags.categoriesEnabled;

  /** Consulta Remote Config; se llama después del primer render para no retrasar la carga inicial. */
  start(): void {
    this.flags.init().subscribe();
  }
}
