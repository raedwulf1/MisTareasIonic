import { TestBed } from '@angular/core/testing';
import { Platform } from '@ionic/angular/platform';
import { Subject } from 'rxjs';

import { FeatureFlagsService } from './feature-flags.service';
import { provideInfrastructure } from '../infrastructure/provide-infrastructure';

/** Simula `window.FirebasexConfig` con los valores publicados en Remote Config. */
function mockRemoteConfig(remote: Record<string, string>) {
  window.FirebasexConfig = {
    setConfigSettings: (_t, _i, ok) => ok(),
    setDefaults: (_d, ok) => ok(),
    fetch: (_s, ok) => ok(),
    activateFetched: (ok) => ok(true),
    fetchAndActivate: (ok) => ok(true),
    getAll: (ok) => ok(remote),
  };
}

describe('FeatureFlagsService', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.FirebasexConfig;
    TestBed.configureTestingModule({
      providers: [
        provideInfrastructure(),
        {
          provide: Platform,
          useValue: { ready: () => Promise.resolve('cordova'), resume: new Subject<void>() },
        },
      ],
    });
  });

  it('usa el valor por defecto si no hay plugin nativo', async () => {
    const flags = TestBed.inject(FeatureFlagsService);
    await flags.init();
    expect(flags.status()).toBe('unavailable');
    expect(flags.categoriesEnabled()).toBe(true);
    expect(flags.source('categories_enabled')).toBe('default');
  });

  it('aplica el valor de Remote Config', async () => {
    mockRemoteConfig({ categories_enabled: 'false' });
    const flags = TestBed.inject(FeatureFlagsService);
    await flags.init();
    await flags.refresh();
    expect(flags.categoriesEnabled()).toBe(false);
    expect(flags.source('categories_enabled')).toBe('remote');
    expect(flags.status()).toBe('ready');
  });

  it('el override local tiene prioridad sobre Remote Config', async () => {
    mockRemoteConfig({ categories_enabled: 'false' });
    const flags = TestBed.inject(FeatureFlagsService);
    await flags.init();
    flags.setOverride('categories_enabled', true);
    expect(flags.categoriesEnabled()).toBe(true);
    flags.setOverride('categories_enabled', null);
    expect(flags.categoriesEnabled()).toBe(false);
  });
});
