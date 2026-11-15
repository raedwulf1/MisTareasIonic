import { Provider } from '@angular/core';

import { ErrorReporter } from '../domain/ports/error-reporter';
import { KeyValueStore } from '../domain/ports/key-value-store';
import { RemoteConfigGateway } from '../domain/ports/remote-config.gateway';
import { CategoryRepository } from '../domain/repositories/category.repository';
import { FlagOverridesRepository } from '../domain/repositories/flag-overrides.repository';
import { TaskRepository } from '../domain/repositories/task.repository';
import { ConsoleErrorReporter } from './errors/console.error-reporter';
import { FirebasexRemoteConfigGateway } from './remote-config/firebasex-remote-config.gateway';
import { LocalCategoryRepository } from './repositories/local-category.repository';
import { LocalFlagOverridesRepository } from './repositories/local-flag-overrides.repository';
import { LocalTaskRepository } from './repositories/local-task.repository';
import { LocalStorageKeyValueStore } from './storage/local-storage.key-value-store';

/**
 * Enlaza los puertos y repositorios del dominio con sus implementaciones concretas.
 * `useExisting` reutiliza la instancia raíz del adaptador (una sola cola de escrituras).
 */
export function provideData(): Provider[] {
  return [
    { provide: ErrorReporter, useExisting: ConsoleErrorReporter },
    { provide: KeyValueStore, useExisting: LocalStorageKeyValueStore },
    { provide: RemoteConfigGateway, useExisting: FirebasexRemoteConfigGateway },
    { provide: TaskRepository, useExisting: LocalTaskRepository },
    { provide: CategoryRepository, useExisting: LocalCategoryRepository },
    { provide: FlagOverridesRepository, useExisting: LocalFlagOverridesRepository },
  ];
}
