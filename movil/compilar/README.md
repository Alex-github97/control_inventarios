# Compilar y publicar el APK

Sin Android Studio ni cuenta de Expo: todo corre en Docker.

## Compilar en este equipo

```bash
docker build -t tw-android movil/compilar     # una vez (o al cambiar el Dockerfile)
bash movil/compilar/apk.sh                    # desde la raíz del repositorio
```

Sale en `movil/compilar/salida/TittanWare-<versión>.apk`. La primera vez tarda
(Gradle baja NDK, CMake y dependencias, que quedan en los volúmenes
`tw_android_sdk` y `tw_gradle`); las siguientes, bastante menos. Por defecto
compila solo para `arm64-v8a`, la arquitectura de los teléfonos Android de los
últimos años; para teléfonos de 32 bits: `ARQUITECTURAS=arm64-v8a,armeabi-v7a`.

## La llave de firma

La primera compilación crea `movil/firma/tittanware.jks` y su clave en
`movil/firma/clave.txt` (fuera de Git). **Respáldelas fuera del repositorio.**
Android solo instala una actualización sobre la app existente si viene firmada
con la misma llave: perderla obliga a desinstalar la app en cada teléfono.

## Publicar una versión

1. Suba `version` y `android.versionCode` en `movil/app.json` y escriba qué
   trae en `movil/NOTAS_VERSION.txt`.
2. Una sola vez, agregue en GitHub (Settings → Secrets and variables → Actions):
   - `MOVIL_FIRMA_JKS`: `base64 -w0 movil/firma/tittanware.jks`
   - `MOVIL_FIRMA_CLAVE`: el contenido de `movil/firma/clave.txt`
3. Haga push de la etiqueta `movil-v<versión>` (por ejemplo `movil-v1.0.0`).
   El flujo «App móvil» compila, firma y manda el APK al servidor por la llave
   de despliegue; el servidor lo publica y aparece en el botón «App móvil»
   del portal. Pide la misma aprobación que el despliegue.

En el servidor el APK queda en el volumen `uploads` (`/app/uploads/movil/`,
con `version.json`). A mano, dentro del backend:
`python tools/publicar_apk.py archivo.apk --version 1.0.0 --codigo 1 --notas "…"`.
