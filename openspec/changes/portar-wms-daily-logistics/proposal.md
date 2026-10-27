# Proposal

## Why

Daily Logistics nació el 8 de octubre de 2026 como copia de los módulos WMS, TMS y POS de esta plataforma. Desde entonces su WMS ganó funciones que aquí no existen:

- tareas dirigidas, frentes de picking, reabastecimiento con aprobación y estrategia de picking configurable;
- consolidación de pedidos, compras con cotización a proveedores, códigos de barras y constructor de bodega;
- canales de venta y mejoras de rendimiento probadas con unos 490.000 registros.

Además endureció la seguridad. Esta plataforma sigue con `python-jose 3.3.0`, que tiene vulnerabilidades publicadas (CVE-2024-33663 y CVE-2024-33664), y con contraseñas en bcrypt sin política ni cierre de sesión por inactividad. Ninguno de esos cambios ha llegado aquí: ni la historia de git ni los archivos lo muestran.

## What Changes

- **Seguridad de sesión y credenciales** (primero, por las vulnerabilidades):
  - PyJWT en lugar de python-jose, con algoritmo fijo al validar.
  - Contraseñas en Argon2id, con migración automática desde bcrypt al iniciar sesión.
  - Política de contraseñas.
  - Sesiones registradas en el servidor, con cierre tras 10 minutos sin actividad real y tope de 12 horas.
  - Cierre de sesión en el servidor.
  - Freno de intentos de inicio de sesión por usuario y por IP.
  - **BREAKING:** las sesiones abiertas se invalidan al desplegar, las contraseñas nuevas deben cumplir la política y una `SECRET_KEY` débil impide arrancar en producción.
- **WMS, operación:** tareas dirigidas con ciclo de fondo, frentes de picking con capacidad (m³ y kg) y tipos de posición, reabastecimiento con aprobación, estrategia de picking por bodega (SINGLE y WAVE operativas; BATCH, ZONE y CLUSTER configurables) y una sola asignación de picking por orden.
- **WMS, productos y recepción:**
  - Subfamilias con código, SKU numérico, marca, referencia e imágenes de producto.
  - Clasificación de productos y códigos de barras con lectura por cámara.
  - Estados de la orden de compra y de cada línea.
  - Distribución de lo recibido a estantería o cross docking.
- **WMS, compras:** solicitudes de cotización por proveedor (PDF y correo), adjudicación y orden de compra resultante. Se conservan los precios en la orden de compra, como hoy en esta plataforma.
- **WMS, bodega física:** constructor de bodega (contorno, muros, áreas, posiciones y textos), ocupación y espacio, mapa enriquecido y vista 3D.
- **WMS, canales y consolidación:**
  - Conectores de canales de venta en línea, con recepción de pedidos.
  - Consolidación por destino de los pedidos de canal.
  - Solicitud de transporte al TMS.
- **TMS (extras de Daily, pedidos por el usuario):**
  - capacidad por tipo de vehículo (peso, volumen y medidas de la caja) y sugerencia de vehículo para la carga;
  - cargue de vehículos desde las solicitudes de transporte (clic o escáner), que crea los despachos del WMS y el viaje con sus paradas;
  - plan de carga en 3D con centro de gravedad, peso por eje y veredicto;
  - alta de conductor en un solo paso sobre las tablas de Gestión humana;
  - trazabilidad completa del viaje (historial), un solo camino para cambiar estados, cancelación consistente, POD por parada y liquidación con aprobación.
- **Rendimiento:** índices en llaves de detalle, listas sin una consulta por fila, inventario paginado en el servidor y exportación a Excel, CSV y PDF.
- **Restricción:** Daily Logistics es un proyecto aparte y se usa solo como fuente de lectura. Ningún archivo, contenedor, volumen ni base de datos de Daily Logistics se modifica, se mueve ni se borra.
- **Fuera de alcance,** cada uno como cambio propio si se decide traerlo:
  - asistente de IA «Daily»;
  - analítica y S&OP;
  - entrenamiento (aquí existe el LMS);
  - personal y WFM (aquí existe Gestión humana);
  - página pública de Daily.
- **No se traen nunca:**
  - los ajustes propios del cliente Daily: ocultar POS, cotizaciones o vistas 3D, renombrar la orden de compra a «Remisión de ingresos» y quitar precios;
  - los commits de Daily que retiran módulos de la plataforma.

## Capabilities

### New Capabilities
- `seguridad/sesiones`: sesiones del lado del servidor, inactividad, cierre de sesión y freno de intentos de inicio de sesión.
- `seguridad/credenciales`: almacenamiento y política de contraseñas, y emisión y validación de tokens.
- `wms/tareas-picking`: tareas dirigidas, frentes de picking, reabastecimiento y estrategia de picking por bodega.
- `wms/productos-recepcion`: datos maestros enriquecidos de producto, códigos de barras, estados de la orden de compra y de sus líneas, y distribución de lo recibido.
- `wms/compras-cotizacion`: solicitudes de cotización a proveedores, adjudicación y generación de la orden de compra.
- `wms/bodega-fisica`: modelo físico de la bodega (contorno, áreas, posiciones), su ocupación y su visualización.
- `wms/canales-consolidacion`: pedidos de canales de venta en línea y su consolidación por destino con solicitud de transporte.
- `tms/cargue-plan-carga`: capacidad de vehículos, cargue desde solicitudes de transporte, plan de carga en 3D y alta de conductores.
- `tms/trazabilidad-viaje`: historial del viaje, flujo de estados único, cancelación consistente, POD por parada y liquidación con aprobación.

### Modified Capabilities
<!-- No hay especificaciones del WMS ni de seguridad en openspec/specs: se crean nuevas. -->

## Impact

- **Backend:**
  - **Seguridad:** `core/security.py`, `core/config.py`, `core/auth_global.py`, nuevo `core/sesiones.py`, `endpoints/auth.py` y `endpoints/usuarios.py`.
  - **WMS:**
    - endpoints nuevos: `wms_operacion_tareas`, `wms_codigos`, `wms_cotizaciones`, `wms_distribucion`, `wms_documentos`, `wms_estados_oc`, `wms_layout`, `wms_consolidacion` y `canales`;
    - lógica nueva en `core/wms_*`, más `core/correo.py`, `core/documentos_pdf.py` y `core/marketplace/`;
    - archivos existentes modificados: `wms.py`, `wms_mapa.py`, `wms_trazable.py`, `wms_traslados.py`, `wms_cubicaje.py` y `wms_inventario.py`.
  - **TMS:** endpoints nuevos `tms_cargue`, `tms_plan_carga`, `tms_conductores` y `capacidad_carga`; lógica nueva en `core/tms_capacidad.py` y `core/tms_plan_carga.py`; `endpoints/tms.py` reescrito en su flujo de estados (con `cambiar_estado` e historial).
  - **Modelos:** 12 tablas nuevas en `models/wms.py`, más `models/compras.py` y `models/marketplace.py`; en `models/tms.py`, `TMSTipoVehiculoCapacidad`, `TMSSolicitudTransporte`, `TMSCargue`, `TMSViajeDespacho` y `TMSViajeHistorial`, medidas de caja en el vehículo y POD por parada (deja de ser uno por viaje).
  - **Migraciones:** columnas e índices nuevos.
- **Dependencias Python:** se agregan `PyJWT` y `argon2-cffi`; se retiran `python-jose` y `passlib`. Redis pasa a ser obligatorio para las sesiones.
- **Frontend:**
  - siete pantallas WMS nuevas y trece componentes nuevos;
  - TMS: pantallas nuevas `TMSAsignacionCarga` y `TMSPlanCarga`, componentes `PlanCarga3D`, `ConductorForm` y `SugerenciaVehiculo`, pestaña «Historial» en la ficha del viaje y cambios en Viajes, Tracking, Configuración, Conductores, Vehículos, Rutas y Planeación;
  - cambios en Recepción, Picking, Tareas, Inventario, Mapa, Traslados, Configuración y Tablero;
  - nuevo `utils/inactividad.tsx` y ajustes en el cliente de API, el login y la consola maestra.
- **Permisos:** nuevo permiso `tms_liquidaciones` (administrador y supervisor logístico).
- **Operación:**
  - nuevas variables de configuración (sesión, correo SMTP y conectores de canales);
  - Redis disponible en producción;
  - las sesiones abiertas se invalidan en el despliegue.
- **Daily Logistics:** ningún impacto. Solo se lee su repositorio.
