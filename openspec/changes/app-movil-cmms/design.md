# Design

## Context

Ver `proposal.md` (Why) y las especificaciones en `specs/movil/`. Lo que hay hoy y condiciona el enfoque:

- **Portal**: React 18 + TypeScript + MUI + TanStack Query + axios + zustand (`frontend/`). Textos en `frontend/src/i18n/locales/{es,en}.json`; marca en `frontend/src/config/marca.ts`. No hay paquete compartido ni monorepo.
- **API**: FastAPI con OpenAPI en `/api/openapi.json`. Multiempresa por esquema; el token lleva `cli` (empresa) y `esq`, y la sesión vive en Redis con vencimiento por inactividad (`SESION_INACTIVIDAD_MIN`). **No existe endpoint de renovación**: el portal renueva la sesión con el uso. Los módulos contratados los hace cumplir `ModulosMiddleware`; los perfiles de usuario hoy solo ocultan interfaz (memoria `permisos-dos-capas`).
- **CMMS**: endpoints bajo `/eam`, `/eam/chk`, `/eam/lube`, `/eam/neumaticos`, combustible e inventario. La orden de trabajo guarda el técnico como texto (`tecnico_asignado`), no como usuario. Los adjuntos de OT van por `eam_adjuntos`; los checklists tienen su flujo de ejecución con fotos.
- **Escrituras**: ninguna admite clave de idempotencia; un reintento duplica.
- **Infraestructura**: sin Node local (todo se compila en Docker, memoria `frontend-typecheck-docker`); despliegue por GitHub Actions con aprobación y una llave SSH restringida a `deploy/actualizar.sh` (memoria `migracion-aws`); el servidor tiene 2 vCPU y procesos que mueren si una respuesta los ocupa más de 5 s (memoria `workers-mueren-produccion`).

## Goals / Non-Goals

**Goals:**
- Una app nativa Android de alta calidad visual sobre la misma API, sin endpoints duplicados del CMMS.
- Que un cambio del servidor que rompa la app se detecte en el despliegue, no en el teléfono de un técnico.
- Que el trabajo sin señal llegue al servidor una vez y con las reglas del servidor.

**Non-Goals:**
- iOS (Expo lo permite después sin rehacer la app), Google Play y tiendas.
- La configuración del CMMS y los demás módulos de la plataforma (WMS, TMS, reencauche…) en esta propuesta; la arquitectura queda lista para sumarlos.
- Reemplazar el portal en el teléfono: el portal web sigue disponible.

## Decisions

### 1. React Native con Expo, en dos carpetas nuevas del repositorio
- `movil/`: la app (Expo SDK reciente, TypeScript estricto, `expo-router` para navegación por archivos).
- `frontend/compartido/` (dentro de `frontend/` porque las compilaciones del portal —local, CI y producción— usan esa carpeta como contexto; así no cambian): paquete TypeScript sin dependencias de React DOM ni de React Native: tipos generados de la API, cliente tipado, textos (`i18n/`), marca (`marca.ts`) y reglas de presentación comunes (vida de llanta, estados de OT, rangos de profundidad). El portal lo importa con un alias de ruta (`@compartido`) y migra sus copias poco a poco: primero marca y textos, luego tipos.
*Alternativas descartadas:* Capacitor sobre el portal (rápido de mantener, pero no alcanza el nivel visual ni el modo sin señal pedidos); Kotlin nativo (duplica todo en otro lenguaje).

### 2. Sistema de diseño propio, no MUI
`movil/src/diseno/`: tokens (color derivado de `compartido/marca.ts`, tipografía Inter con escala modular, espaciado de 4 pt, radios, elevaciones, duraciones de animación) y componentes base (Botón, Tarjeta, Fila, Lista con `@shopify/flash-list`, Campo numérico grande, Hoja inferior, Chip de estado, Indicador, Gráficos sobre `react-native-svg`, Esqueleto). Movimiento con Reanimated y gestos con Gesture Handler; respuesta háptica con `expo-haptics`; íconos `lucide-react-native`. Modo claro y oscuro definidos como dos juegos de tokens. Cada pantalla usa solo componentes y tokens del sistema (regla de lint: sin colores literales fuera de `diseno/`).
Antes de construir pantallas se hace una **pantalla de muestra** del sistema (catálogo de componentes en claro y oscuro) para validar el nivel visual con el usuario.

### 3. Datos: SQLite local como fuente de las pantallas
`expo-sqlite` con Drizzle ORM. Las pantallas leen de la base local (rápidas y sin señal); TanStack Query se usa para lo que es solo en línea (tablero, informes, PDF). Las tablas locales reflejan los recursos que la app necesita con los campos que usa, no la base del servidor.

### 4. Descarga por cambios y conciliación de bajas
Endpoint nuevo `GET /movil/sincronizar?recurso=&desde=&limite=` por recurso (órdenes del usuario, activos, esquemas de llantas, plantillas de checklist, catálogos, pendientes de aprobación), paginado por cursor (`updated_at`, `id`) y con tope de filas por respuesta (listas por trozos, `core/paginacion.py`). Las bajas se detectan con `GET /movil/vigentes?recurso=`, que devuelve solo los ids vigentes del alcance del usuario; la app borra lo que ya no aparece. Se corre al abrir la app y cada pocas horas.
El alcance lo decide el servidor con las mismas consultas del portal. Para «mis órdenes» se agrega `tecnico_usuario_id` (nullable) a la orden de trabajo, lo llena el selector de técnico del portal y una migración lo completa cruzando `tecnico_asignado` con nombre o usuario.
*Alternativa descartada:* tabla de bajas alimentada por cada endpoint de borrado: obliga a tocar todos los endpoints y se desincroniza si uno lo olvida.

### 5. Cola de envíos que reutiliza los endpoints existentes
Cada acción del usuario se guarda como una operación (método, ruta, cuerpo, `Idempotency-Key`, dependencias) y se reproduce en orden contra **los mismos endpoints del CMMS que usa el portal**: las reglas viven en un solo lugar. Una entidad creada sin señal recibe un id local; cuando el servidor responde, la cola reescribe ese id en las operaciones que dependen de ella (fotos de una OT creada sin señal). Una respuesta 4xx deja la operación como **rechazada** con el mensaje del servidor para que el usuario la corrija; 5xx o sin red, reintento con espera creciente. Fotos y firmas van en una cola aparte, comprimidas (lado mayor 1.600 px, JPEG 0,7) y después de su entidad.

### 6. Idempotencia en el servidor
Middleware para peticiones con encabezado `Idempotency-Key`: reserva la clave en `movil_idempotencia` (esquema de la empresa: clave, usuario, ruta, hash del cuerpo, estado, código y cuerpo de la respuesta) con restricción única antes de ejecutar; si la clave ya terminó devuelve la respuesta guardada; si está en curso responde 409 para que la app reintente; si la ruta o el cuerpo no coinciden, 422. Se purgan las claves de más de 30 días. Va solo con el encabezado: el portal no cambia.

### 7. Sesión de dispositivo
`POST /movil/sesion` aplica la misma validación del login del portal (empresa, intentos, usuario activo) y además exige el módulo `eam`; crea un `movil_dispositivo` (usuario, nombre, modelo, versión de app, hash del token de renovación, última actividad, revocado) y devuelve un token de acceso corto (1 h, con su sesión en Redis como hoy) y un token de renovación rotativo. `POST /movil/renovar` rota el token de renovación y emite otro de acceso; vence tras 30 días sin uso. Revocar el dispositivo o desactivar el usuario invalida la renovación y la app, al recibir 401 «revocado», borra los datos locales. Sin señal la app no necesita el servidor para trabajar: el token solo se usa al sincronizar. El token de renovación va en `expo-secure-store`, protegido con la biometría (`expo-local-authentication`).

### 8. Distribución: compilación en Docker, llave de despliegue y versión mínima
- **Cambio al implementar (decisión del usuario: proceder sin cuenta de Expo):** el APK se compila en Docker con el SDK de Android (`movil/compilar/`), aquí o en el runner de GitHub, y se firma con una llave propia (`movil/firma/`, fuera de Git, respaldada por el usuario; en CI viaja en los secretos `MOVIL_FIRMA_JKS` y `MOVIL_FIRMA_CLAVE`). EAS Build queda como alternativa cuando exista la cuenta.
- Flujo de GitHub Actions `movil.yml` con la etiqueta `movil-v*`: compila, firma y envía el APK por la **misma llave de despliegue**, con el pedido de forma exacta `publicar-apk X.Y.Z N`; `deploy/actualizar.sh` guarda la entrada estándar antes de cualquier otra cosa y la publica con `tools/publicar_apk.py`. No hizo falta una segunda llave: el comando sigue fijo y el pedido se valida con una expresión estricta, como `reducir-carga`.
- La versión publicada vive en `uploads/movil/version.json` junto al APK (no en una tabla `movil_version`): es un solo archivo para todas las empresas y el manifiesto se escribe de forma atómica al final.
- `GET /movil/version` (pública: versión, mínima, notas) y `GET /movil/descarga` (sesión del portal y CMMS contratado, por el prefijo `/movil` del módulo `eam`).
- Actualizaciones en el aire (EAS Update) quedan para cuando exista la cuenta de Expo.
- La app envía `X-App-Version`; si es menor que la mínima, el servidor responderá 426 (pendiente).
*Alternativa descartada:* publicar el APK como adjunto de un release de GitHub: el repositorio es público y la descarga quedaría sin sesión, contra la especificación.

### 9. Contrato con el portal en el despliegue
El job `validar` agrega: volcar el OpenAPI importando `app.main` (sin levantar el servidor), generar `frontend/compartido/api/esquema.d.ts`, fallar si difiere del subido, con `openapi-typescript`, y compilar `movil/` (que incluye `frontend/compartido/`) con `tsc --noEmit`, lint y Jest en Docker (Node 22, que exige Expo 58). Un campo renombrado que la app usa rompe la compilación con el archivo y la línea. El cliente es `openapi-fetch`, así que cada llamada está tipada por ruta y método. `docs/movil/ADAPTAR.md` mapea cada pantalla del portal con su pantalla de la app.

### 10. Portal
Acceso «App móvil» en el menú del usuario (encabezado) cuando la empresa tiene `eam`: diálogo con versión, notas, botón de descarga (petición autenticada que guarda el archivo), QR hacia `/app-movil` del portal (que en el teléfono pide iniciar sesión y descarga) y pasos para permitir la instalación. En Usuarios, la pestaña «Dispositivos» con revocar.

### 11. Notificaciones push (fase 2)
`expo-notifications` con FCM a través del servicio de push de Expo. Tabla `movil_push_token`; los eventos (OT asignada, aprobación pendiente, alerta crítica, rechazo en sincronización) encolan el envío en el ciclo en segundo plano existente, sin bloquear la petición que los origina.

### 12. Pruebas
- Backend: `tests/humo_movil.py` (sesión, renovación, revocación, idempotencia con reintentos concurrentes, sincronización por cambios y vigentes, versión mínima, descarga sin sesión).
- App: Jest y Testing Library para el sistema de diseño y la cola (operaciones con ids locales, rechazos, reintentos); flujos de punta a punta con **Maestro** en un emulador Android dentro de GitHub Actions (`android-emulator-runner`), incluido el modo avión.
- Paridad: para cada indicador del tablero móvil, una prueba compara su valor con el del endpoint del portal.

## Risks / Trade-offs

- [Alcance grande: «todo el CMMS»] → dos fases con entregas usables; la fase 1 cubre el trabajo de campo diario y se publica sola.
- [`updated_at` no se actualiza en escrituras con SQL directo] → la conciliación de vigentes y una revisión de los `UPDATE` de los recursos sincronizados; los que lo omitan se corrigen en la misma fase.
- [Teléfonos de gama baja con poco espacio] → fotos comprimidas, purga de fotos ya enviadas y aviso si quedan menos de 500 MB libres.
- [Conflictos de edición sin señal] → el servidor manda; la app no pierde lo registrado y pide resolver (especificación `sincronizacion`).
- [Pérdida de la llave de firma] → la administra EAS y hay respaldo; sin ella no se podría actualizar el APK instalado.
- [Dependencia de cuentas externas (Expo, Firebase)] → la app funciona sin push; la compilación podría moverse a un runner con SDK de Android si hiciera falta.
- [Carga en el servidor de 2 vCPU por sincronizaciones] → respuestas paginadas y agregadas en SQL, sincronización incremental y espaciada.

## Migration Plan

Todo es aditivo: tablas nuevas (`movil_dispositivo`, `movil_idempotencia`, `movil_push_token`) y la columna `tecnico_usuario_id`, creadas en `_migrar_esquema` dentro del candado; el middleware de idempotencia y versión solo actúa con sus encabezados, así que el portal no cambia. El acceso «App móvil» aparece cuando exista una versión publicada. Para revertir: retirar la versión publicada y revocar los dispositivos; las tablas quedan sin uso.

## Open Questions

- Nombre visible, ícono y pantalla de bienvenida de la app: se definen con el usuario al validar la pantalla de muestra del sistema de diseño; no cambian la arquitectura.
- Versión mínima de Android (propuesta: Android 9, API 28) según los teléfonos reales de los técnicos.
