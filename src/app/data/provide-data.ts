import { Provider } from '@angular/core';

import { KeyValueStore } from '../domain/ports/key-value-store';
import { RemoteConfigGateway } from '../domain/ports/remote-config.gateway';
import { CategoryRepository } from '../domain/repositories/category.repository';
import { TaskRepository } from '../domain/repositories/task.repository';
import { FirebasexRemoteConfigGateway } from './remote-config/firebasex-remote-config.gateway';
import { LocalCategoryRepository } from './repositories/local-category.repository';
import { LocalTaskRepository } from './repositories/local-task.repository';
import { LocalStorageKeyValueStore } from './storage/local-storage.key-value-store';

/**
 * Enlaza los puertos y repositorios del dominio con sus implementaciones concretas.
 * `useExisting` reutiliza la instancia raíz del adaptador (una sola cola de escrituras).
 */
export function provideData(): Provider[] {
  return [
    { provide: KeyValueStore, useExisting: LocalStorageKeyValueStore },
    { provide: RemoteConfigGateway, useExisting: FirebasexRemoteConfigGateway },
    { provide: TaskRepository, useExisting: LocalTaskRepository },
    { provide: CategoryRepository, useExisting: LocalCategoryRepository },
  ];
}
