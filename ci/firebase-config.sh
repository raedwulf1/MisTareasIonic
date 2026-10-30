#!/usr/bin/env bash
# Escribe los archivos de configuración de Firebase en la raíz del proyecto.
# Usa los secrets del repositorio (en base64) si existen; si no, copia los
# placeholders para que la compilación funcione (Remote Config usará los valores por defecto).
set -euo pipefail

write_config() {
  local secret_value="$1" target="$2" placeholder="$3"
  if [ -n "$secret_value" ]; then
    echo "$secret_value" | base64 --decode > "$target"
    echo "✔ $target creado desde el secret del repositorio"
  elif [ ! -f "$target" ]; then
    cp "$placeholder" "$target"
    echo "::warning::$target no está configurado; se usa un placeholder (Remote Config no podrá conectarse)."
  fi
}

write_config "${GOOGLE_SERVICES_JSON_BASE64:-}" google-services.json ci/google-services.placeholder.json
write_config "${GOOGLE_SERVICE_INFO_PLIST_BASE64:-}" GoogleService-Info.plist ci/GoogleService-Info.placeholder.plist
