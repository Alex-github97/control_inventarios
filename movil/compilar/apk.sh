#!/usr/bin/env bash
# Compila y firma el APK de la app dentro de la imagen tw-android.
#
#   docker build -t tw-android movil/compilar          (una vez)
#   bash movil/compilar/apk.sh                         (desde la raíz del repo)
#
# El código se copia a un volumen de trabajo (tw_android_ws) para que los GB de
# la compilación no pasen por la carpeta sincronizada; las cachés de Gradle y
# del SDK quedan en sus volúmenes y la segunda compilación tarda mucho menos.
# Sale en movil/compilar/salida/TittanWare-<versión>.apk, firmado con la llave
# de movil/firma/ (se crea la primera vez; GUÁRDELA: sin ella no se puede
# publicar una actualización que se instale sobre la anterior).
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
mkdir -p "$RAIZ/movil/firma" "$RAIZ/movil/compilar/salida"

MSYS_NO_PATHCONV=1 docker run --rm \
  -v "$RAIZ/movil:/src/movil:ro" -v "$RAIZ/frontend/compartido:/src/frontend/compartido:ro" \
  -v "$RAIZ/movil/firma:/firma" -v "$RAIZ/movil/compilar/salida:/salida" \
  -v tw_android_ws:/ws -v ci_movil_nm:/ws/movil/node_modules \
  -v tw_android_sdk:/opt/android-extra -v tw_gradle:/cache/gradle \
  -e ARQUITECTURAS="${ARQUITECTURAS:-arm64-v8a}" -e EN_CI="${CI:-}" \
  tw-android bash -euo pipefail -c '
    # El SDK base viene en la imagen; lo que Gradle baja (NDK, CMake, plataformas) va al volumen.
    for d in ndk cmake platforms build-tools; do
      mkdir -p /opt/android-extra/$d
      [ -e /opt/android/$d ] || ln -s /opt/android-extra/$d /opt/android/$d
    done
    mkdir -p /ws/movil /ws/frontend
    rm -rf /ws/frontend/compartido && cp -r /src/frontend/compartido /ws/frontend/
    cd /src/movil && find . -mindepth 1 -maxdepth 1 ! -name node_modules ! -name android ! -name dist ! -name firma ! -name .expo \
      -exec cp -r {} /ws/movil/ \;
    cd /ws/movil
    [ -d node_modules/expo ] || npm ci --no-audit --no-fund
    VERSION=$(node -p "require(\"./app.json\").expo.version")

    npx expo prebuild --platform android --no-install --clean >/dev/null
    echo >> android/gradle.properties   # el archivo generado no termina en salto de línea
    cat >> android/gradle.properties <<EOF
org.gradle.jvmargs=-Xmx6g -XX:MaxMetaspaceSize=1g
org.gradle.parallel=true
reactNativeArchitectures=$ARQUITECTURAS
EOF
    (cd android && ./gradlew --no-daemon -q assembleRelease)

    # Firma con la llave propia (la plantilla firma el release con la de depuración).
    if [ ! -f /firma/tittanware.jks ] && [ -n "${EN_CI:-}" ]; then
      echo "Falta la llave de firma (secretos MOVIL_FIRMA_JKS y MOVIL_FIRMA_CLAVE)."; exit 1
    fi
    if [ ! -f /firma/tittanware.jks ]; then
      head -c 24 /dev/urandom | base64 | tr -dc A-Za-z0-9 > /firma/clave.txt
      keytool -genkeypair -v -keystore /firma/tittanware.jks -alias tittanware -keyalg RSA -keysize 4096 -validity 10000 \
        -storepass "$(cat /firma/clave.txt)" -keypass "$(cat /firma/clave.txt)" \
        -dname "CN=TittanWare, O=TittanWare, C=CO" >/dev/null 2>&1
      echo "Llave nueva en movil/firma/: respáldela."
    fi
    APKSIGNER=$(ls -d /opt/android/build-tools/*/ | sort -V | tail -1)apksigner
    $APKSIGNER sign --ks /firma/tittanware.jks --ks-key-alias tittanware --ks-pass file:/firma/clave.txt \
      --out /salida/TittanWare-$VERSION.apk android/app/build/outputs/apk/release/app-release.apk
    $APKSIGNER verify --print-certs /salida/TittanWare-$VERSION.apk | head -3
    ls -la /salida/TittanWare-$VERSION.apk
  '
