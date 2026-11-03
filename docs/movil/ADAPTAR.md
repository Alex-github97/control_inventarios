# Llevar a la app móvil un cambio del portal

La app (`movil/`) y el portal (`frontend/`) comparten `frontend/compartido/`:
los tipos de la API, el cliente, la marca, los textos y las reglas de
presentación. Esta guía dice qué hacer cuando cambia algo del CMMS.

## La regla: el servidor no rompe a la app

Los teléfonos no se actualizan todos el mismo día y algunos pasan horas sin
señal con operaciones en cola. Por eso un cambio en un endpoint que usa la app
debe ser **compatible hacia atrás**:

- **Se puede**: agregar un campo de respuesta, agregar un campo de entrada
  opcional, agregar un endpoint, aceptar un valor nuevo en un catálogo.
- **No se puede, sin más**: quitar o renombrar un campo, volver obligatorio un
  campo de entrada, cambiar el tipo o el sentido de un campo, cambiar una ruta.
- **Si de verdad hay que romper**: se crea el endpoint o el campo nuevo junto
  al viejo, se publica la app que usa el nuevo y, cuando ya no quedan
  versiones viejas en uso, se sube `MOVIL_VERSION_MINIMA` en el servidor (las
  apps viejas reciben 426 y piden actualizar) y se retira lo viejo.

Una regla de negocio (una validación, un cálculo) vive **en el servidor**. La
app no la repite: la recibe como rechazo y muestra el mensaje del servidor. Lo
que sí vive en `compartido/reglas/` es la presentación: nombres de estados,
colores, rangos de profundidad, etiquetas de vida.

## Pasos ante un cambio

1. **Cambió un endpoint del CMMS** (`/api/v1/eam/...`, `/auth`, `/movil`):
   ```
   MSYS_NO_PATHCONV=1 docker exec -w /app -e DEBUG=false ci_backend python tools/volcar_openapi.py /tmp/openapi.json
   docker cp ci_backend:/tmp/openapi.json frontend/compartido/api/.openapi.json
   docker exec -w /app ci_frontend npm run tipos-api
   ```
   y se sube `frontend/compartido/api/esquema.d.ts` con el cambio. Si se
   olvida, el job `validar` del despliegue se detiene en «Contrato servidor ↔
   app». Si la app usaba un campo que ya no existe, se detiene en «App móvil
   (tipos y lint)» señalando el archivo y la línea.
2. **Cambió un nombre, un color o un umbral de presentación** (estado de OT,
   rango de llanta, color de marca): se cambia una sola vez en
   `frontend/compartido/` y llega a los dos lados.
3. **Cambió un texto**: `frontend/compartido/i18n/*.json`.
4. **Pantalla nueva o cambiada en el portal**: se busca su pareja en el mapa
   de abajo. Si la tiene, se ajusta la pantalla de la app; si es de
   configuración, no se hace nada en la app.
5. **Publicar**: un cambio solo de pantallas va por actualización OTA; uno que
   agrega un módulo nativo (cámara, archivos, etc.) exige APK nuevo
   (etiqueta `movil-v*`).

## Mapa de pantallas portal ↔ app

| Módulo | Portal (`frontend/src/pages`) | App (`movil/src/app`) | Fase |
|---|---|---|---|
| Torre de control | `EAMDashboard.tsx` | `(tabs)/inicio` — «Mi día» del técnico | 1 |
| Activos y QR | `EAMActivos.tsx` | `activos/`, `activos/[id]`, `escanear` | 1 |
| Órdenes de trabajo | `EAMOrdenesTrabajo.tsx` | `(tabs)/ordenes`, `ordenes/[id]`, `ordenes/nueva` | 1 |
| Checklists | `EAMChecklists.tsx` | `checklists/`, `checklists/[id]` | 1 |
| Medidores y combustible | `EAMCombustible.tsx` (medidores en la ficha de `EAMActivos.tsx`) | `activos/[id]/medidor`, `combustible/nuevo` | 1 |
| Llantas | `EAMNeumaticos.tsx` | `llantas/[vehiculo]` — inspección por posición | 1 |
| Supervisión | `EAMDashboard.tsx` (indicadores) y aprobaciones de `EAMOrdenesTrabajo.tsx` | `(tabs)/supervision`, `aprobaciones/` | 1 |
| Lubricación | `EAMLubricacion.tsx` | `lubricacion/rutas`, `lubricacion/muestras` | 2 |
| Inventario de repuestos | `EAMInventario.tsx` | `repuestos/` (consulta, salidas, conteos) | 2 |
| Garantías | `EAMGarantias.tsx` | `garantias/` (consulta y reclamo) | 2 |
| Planes de mantenimiento | `EAMPlanesMant.tsx` | `planes/` (consulta) | 2 |
| Confiabilidad | `EAMConfiabilidad.tsx` | `confiabilidad/` (consulta) | 2 |
| IA predictiva | `EAMIA.tsx` | `predicciones/` (consulta) | 2 |
| Informes | `EAMReportes.tsx`, `EAMNeumaticosReportes.tsx`, `EAMLubricacionReportes.tsx` | `informes/` (consulta) | 2 |
| Configuración | `EAMConfig.tsx`, `EAMChecklistsConfig.tsx`, `EAMLubricacionConfig.tsx` | — solo portal | — |

Las rutas de la app de este mapa son las previstas; al construir cada una se
actualiza su fila si el nombre cambia.

## El aspecto

Las pantallas de la app no escriben colores ni tamaños: todo sale de
`movil/src/diseno/` (el lint rechaza un color literal fuera de ahí). Los
tokens de la app derivan de `frontend/compartido/marca.ts`, así que cambiar el
acento de la marca cambia el portal y la app a la vez. La pantalla
`movil/src/app/catalogo.tsx` muestra cada componente en claro y oscuro: es el
lugar para ver un cambio del sistema de diseño antes de usarlo.
