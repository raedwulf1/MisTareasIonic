import { Provider } from '@angular/core';

import { KeyValueStore } from '../application/ports/key-value-store';
import { RemoteConfigGateway } from '../application/ports/remote-config.gateway';
import { FirebasexRemoteConfigGateway } from './firebasex-remote-config.gateway';
import { LocalStorageKeyValueStore } from './local-storage.key-value-store';

/**
 * Enlaza los puertos de la capa de aplicación con sus implementaciones concretas.
 * `useExisting` reutiliza la instancia raíz del adaptador (una sola cola de escrituras).
 */
export function provideInfrastructure(): Provider[] {
  return [
    { provide: KeyValueStore, useExisting: LocalStorageKeyValueStore },
    { provide: RemoteConfigGateway, useExisting: FirebasexRemoteConfigGateway },
  ];
}
