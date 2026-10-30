export const environment = {
  production: true,
  remoteConfig: {
    /** Tiempo máximo de espera de una descarga de Remote Config. */
    fetchTimeoutSec: 10,
    /**
     * Intervalo mínimo entre descargas. Firebase recomienda 12 h en producción;
     * para la demo del feature flag se usa 60 s para ver los cambios rápidamente.
     */
    minimumFetchIntervalSec: 60,
  },
};
