# Proposal

## Why

El trabajo del CMMS ocurre donde está el equipo: en el patio, el taller, la vía o la bodega. Hoy el técnico o el inspector lo anota en papel o en una hoja y alguien lo transcribe al portal horas después: datos tardíos, errores de digitación y nada de fotos ni firma en el momento. El portal en el navegador del celular no sirve en ese entorno: es lento con señal mala, no funciona sin señal y no está pensado para una mano con guantes.

## What Changes

- **App móvil Android «TittanWare»**, construida con React Native y Expo en TypeScript —el mismo lenguaje del portal—, con un sistema de diseño propio de alto nivel: tipografía, color y movimiento cuidados, modo claro y oscuro, objetivos táctiles grandes, respuesta háptica y transiciones fluidas a 60 cuadros por segundo.
- **Todo el CMMS en el bolsillo**, en dos fases:
  - Fase 1 (operación de campo): torre de control, activos con su ficha y lectura de código QR, órdenes de trabajo completas (iniciar, pausar, repuestos, horas, fotos, firma y cierre), checklists, medidores y combustible, inspección de llantas posición por posición con novedades y sugerencias, y tablero y aprobaciones para supervisores.
  - Fase 2 (resto de módulos): lubricación (muestras y rutas), inventario de repuestos (consulta, salidas y conteos), garantías, planes de mantenimiento, confiabilidad, IA predictiva e informes en modo consulta, y notificaciones push.
  - La configuración del CMMS sigue solo en el portal: es trabajo administrativo de escritorio.
- **Funciona sin señal**: lo que el usuario necesita (sus órdenes, activos, plantillas de checklist, catálogos) queda en el teléfono; lo que registra se guarda y se envía solo al recuperar la conexión, sin duplicarse y respetando las mismas reglas del servidor.
- **Sesión de dispositivo**: el teléfono queda vinculado al usuario con una sesión propia, revocable desde el portal, desbloqueable con huella o rostro, que no se cae a mitad de un turno sin señal.
- **Fácil de mantener al día con el portal**: un paquete compartido con los tipos generados de la API del servidor, el cliente de la API, los textos y la marca; el despliegue falla si un cambio del servidor rompe lo que usa la app. Las actualizaciones de pantallas llegan por OTA sin reinstalar; las de fondo, con un aviso de nueva versión.
- **Descarga desde el portal**: un botón «App móvil» en el portal, visible para el usuario autenticado de una empresa con CMMS, descarga el APK firmado de la última versión y muestra cómo instalarlo.
- En el servidor: renovación de sesión para dispositivos, claves de idempotencia en las escrituras que la app reintenta, endpoints de sincronización por cambios y el canal de publicación del APK.

## Capabilities

### New Capabilities
- `movil/acceso-dispositivo`: ingreso desde la app, sesión de dispositivo renovable y revocable, desbloqueo biométrico y cierre remoto.
- `movil/sincronizacion`: datos locales del usuario, descarga por cambios, cola de envíos con idempotencia, conflictos y estado de sincronización visible.
- `movil/experiencia-diseno`: sistema de diseño, nivel de calidad visual y de rendimiento, accesibilidad y uso en campo.
- `movil/distribucion`: botón de descarga en el portal, APK firmado y versionado, actualizaciones OTA y aviso de versión obligatoria.
- `movil/contrato-portal`: paquete compartido con tipos generados de la API, verificación en el despliegue y reglas para que un cambio del portal llegue a la app.
- `movil/cmms-campo`: torre de control, activos y QR, órdenes de trabajo, checklists, medidores y combustible.
- `movil/cmms-llantas`: inspección de llantas por vehículo y posición, novedades y sugerencias.
- `movil/cmms-supervision`: tablero de indicadores, aprobaciones y alertas para supervisores.
- `movil/cmms-complementarios`: lubricación, inventario, garantías, planes, confiabilidad, IA e informes (fase 2) y notificaciones push.

### Modified Capabilities
(ninguna: `openspec/specs/` no tiene capacidades publicadas todavía)

## Impact

- **Nuevo código**: `movil/` (app Expo) y `compartido/` (paquete TypeScript de tipos de la API, cliente, textos y marca), consumido por la app y, gradualmente, por el portal.
- **Backend**: endpoints `/movil/*` (sesión de dispositivo, sincronización por cambios, versión de la app y descarga del APK); middleware de idempotencia para las escrituras de la app; tabla de dispositivos y de claves de idempotencia. Los endpoints del CMMS existentes no cambian de contrato: la app los usa y la cola los reintenta con su clave.
- **Portal**: botón «App móvil» con instrucciones de instalación; en Usuarios, los dispositivos vinculados de cada usuario con la opción de revocarlos.
- **Despliegue**: GitHub Actions genera los tipos desde `/api/openapi.json`, compila la app y verifica el contrato; un flujo aparte construye y firma el APK y lo publica en el servidor. La llave de firma vive en los secretos del repositorio, nunca en el código.
- **Cuentas externas** (del usuario): Expo (gratis) para compilar y publicar OTA; Firebase Cloud Messaging para notificaciones push en la fase 2. Google Play queda fuera de esta propuesta y se puede añadir después sin cambiar la app.
- **Dependencias**: Expo SDK, React Native, Reanimated, expo-sqlite, expo-camera, expo-local-authentication, expo-secure-store, expo-updates, TanStack Query.
