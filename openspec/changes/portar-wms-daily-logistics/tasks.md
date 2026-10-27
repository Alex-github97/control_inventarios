# Tasks

## 1. Preparación y protección de Daily Logistics

- [x] 1.1 Registrar la huella de DL (`git -C <DL> rev-parse HEAD` y `git -C <DL> status --porcelain`) en `openspec/changes/portar-wms-daily-logistics/huella_dl.txt`, y escribir el script `backend/tools/huella_dl.sh` que la compara. Verificar que el script reporta «sin cambios» al correrlo dos veces seguidas.
- [x] 1.2 Generar en el scratchpad los parches por área con `git -C <DL> diff 11ab682 <commit> -- <rutas>` (seguridad; tareas y picking; productos y recepción; compras y bodega física; canales y consolidación), excluyendo los commits y trozos listados en design.md D3. Verificar que ningún parche toca archivos de módulos retirados por DL ni textos de ocultamiento de menús, y que la huella de DL no cambió.
- [x] 1.3 Agregar pruebas de humo del WMS actual de CI (listar productos, bodegas, órdenes de compra, inventario y picking con una empresa de prueba) en `backend/tests/humo_wms.py`, que incluye el TMS. Verificar que pasan antes de aplicar cualquier parche.

## 2. Seguridad de sesión y credenciales

- [ ] 2.1 Reemplazar `python-jose` y `passlib` por `PyJWT` y `argon2-cffi` en `backend/requirements.txt` y aplicar el parche de `core/security.py` y `core/config.py` (algoritmo fijo, validación de `SECRET_KEY` fuerte en producción, Argon2id con conversión desde bcrypt). Verificar con pruebas unitarias los escenarios de la spec `seguridad/credenciales` (contraseña antigua convertida, token con algoritmo «none» rechazado, clave débil impide arrancar en producción).
- [ ] 2.2 Implementar la política de contraseñas en creación, cambio y restablecimiento (`schemas/usuario.py` y `endpoints/usuarios.py`). Verificar los escenarios «Contraseña corta» y «Contraseña con el usuario».
- [ ] 2.3 Portar `core/sesiones.py` (sesión en Redis con `sid` en el token, inactividad de 10 minutos, tope de 12 horas, cierre por cambios de cuenta y falla cerrada si Redis no responde) y el ajuste de `core/auth_global.py`, usando una base lógica de Redis propia. Verificar con pruebas de integración contra Redis los escenarios de la spec `seguridad/sesiones`, incluido «Almacén de sesiones caído».
- [ ] 2.4 Portar el cierre de sesión en el servidor y el freno de intentos (5 por usuario y 20 por IP en 15 minutos, mismo mensaje y tiempo similar) en `endpoints/auth.py`. Verificar los escenarios «Fuerza bruta sobre un usuario» y «Usuario inexistente».
- [ ] 2.5 Portar el frontend de sesión: `utils/inactividad.tsx`, `X-Inactividad` en `api/client.ts`, aviso con cuenta regresiva y cierre entre pestañas en la aplicación y en la consola maestra. Verificar con una prueba de navegador que 10 minutos sin actividad cierran la sesión con aviso previo y que las consultas automáticas no la extienden.
- [ ] 2.6 Ajustar Redis de desarrollo y de `docker-compose.prod.yml` (base lógica de sesiones y política `volatile-lru`, o más memoria) y documentar el despliegue y su aviso a clientes en `deploy/` y en la memoria de despliegue. Verificar que una carga de claves de caché no expulsa sesiones vivas, y que la huella de DL no cambió.

## 3. WMS: tareas dirigidas y picking

- [ ] 3.1 Aplicar los modelos y columnas de tareas (`WMSConfigTareas`, `WMSFrentePicking`, `WMSTipoPosicion`, estrategia de picking por bodega) en `models/wms.py` y en `COLUMNAS` e `INDICES` de `core/wms_migracion.py`, conservando las columnas de TarifaX. Verificar que el arranque crea las tablas y columnas en `public` y `cli_acme` sin errores.
- [ ] 3.2 Portar `core/wms_tareas_dirigidas.py`, `core/wms_ciclo_tareas.py`, `core/wms_reabastecimiento.py`, `core/wms_espacio.py` y `endpoints/wms_operacion_tareas.py`, reemplazando las llamadas a `personal` por `operario_disponible()` (design D4). Verificar con pruebas los escenarios de la spec `wms/tareas-picking` («Recepción ubicada», «Frente bajo el mínimo», «Propuesta no aprobada»).
- [ ] 3.3 Aplicar en `endpoints/wms.py` el trozo de estrategia de picking y el de una sola asignación por orden. Verificar los escenarios «Bodega en WAVE», «Estrategia no implementada» y «Generar picking dos veces».
- [ ] 3.4 Portar las pantallas `WMSFrentes.tsx`, los cambios de `WMSTareas.tsx`, `WMSPicking.tsx` y `WMSConfig.tsx` (selector de estrategia) y los componentes `EjecutarPicking`, `TiposPosicion` y `ArmadoEnvio`, con sus rutas, permisos de menú e i18n en los 10 idiomas. Verificar con `tsc --noEmit`, con una prueba de navegador del flujo de picking y que las pruebas de humo del grupo 1 siguen pasando.

## 4. WMS: productos y recepción

- [ ] 4.1 Aplicar `WMSSubfamiliaProducto`, `WMSProductoImagen`, `WMSEstadoOC` y `DocConsecutivo` y sus columnas, con códigos de producto únicos ante altas simultáneas. Verificar con una prueba que crea productos en paralelo y obtiene códigos distintos.
- [ ] 4.2 Portar `core/wms_clasificacion.py`, `core/wms_imagenes.py`, `core/wms_estados_oc.py`, `core/wms_estados_linea.py`, `endpoints/wms_codigos.py`, `endpoints/wms_estados_oc.py`, `endpoints/wms_distribucion.py` y `endpoints/wms_documentos.py`, y los trozos de `core/wms_inventario.py` y `endpoints/wms_trazable.py`. Verificar los escenarios de la spec `wms/productos-recepcion` («Recepción parcial», «Cross docking», «Producto de alta rotación»).
- [ ] 4.3 Portar las mejoras de rendimiento del inventario: paginación en el servidor, exportación a Excel, CSV y PDF, listas sin consulta por fila y los índices de detalle. Verificar con una base de prueba de al menos 100.000 movimientos que el listado de inventario responde en menos de 2 segundos.
- [ ] 4.4 Portar `WMSProductos.tsx`, los cambios de `WMSRecepcion.tsx` (conservando precios y totales), `WMSInventario.tsx` y `WMSDistribucion.tsx`, y los componentes `ArticulosRecepcion`, `CodigoBarras`, `Escaner`, `FotoProducto`, `ClasificacionProductos` y `empaques.ts`. Verificar con `tsc` y con una prueba de navegador de recepción con lectura de código, y que la huella de DL no cambió.

## 5. WMS: compras y bodega física

- [ ] 5.1 Aplicar `models/compras.py` y portar `core/correo.py`, `core/documentos_pdf.py` y `endpoints/wms_cotizaciones.py`, con envío deshabilitado si no hay SMTP configurado. Verificar los escenarios de la spec `wms/compras-cotizacion` («Envío a tres proveedores» con un servidor SMTP de prueba, «Correo no configurado» y «Adjudicar»).
- [ ] 5.2 Aplicar `WMSLayout`, `WMSLayoutElemento` y `WMSLayoutPosicion` y portar `core/wms_zonas_base.py`, `endpoints/wms_layout.py` y los trozos de `endpoints/wms_mapa.py`. Verificar los escenarios de la spec `wms/bodega-fisica` («Guardar y reabrir», «Posición llena», «Bodega en L»).
- [ ] 5.3 Portar `WMSCotizaciones.tsx`, `WMSConstructor.tsx`, los cambios de `WMSMapa.tsx` y los componentes `ConstructorBodega`, `Bodega3D`, `OcupacionBodega` y `geometria.ts`, visibles en el menú (sin el ocultamiento de DL). Verificar con `tsc` y con una prueba de navegador que dibuja y guarda una bodega y la ve en 3D, y que la huella de DL no cambió.

## 6. WMS: canales de venta y consolidación

- [ ] 6.1 Aplicar `models/marketplace.py`, `WMSConsolidado`, `WMSConsolidadoOrden` y `TMSSolicitudTransporte` y portar `core/marketplace/` y `endpoints/canales.py`, con credenciales por empresa e identificación de la empresa por el token del conector. Verificar los escenarios «Pedido repetido» y «Pedido de otra empresa» con un conector simulado.
- [ ] 6.2 Portar `endpoints/wms_consolidacion.py` y la creación de la solicitud de transporte en el TMS. Verificar los escenarios «Tres pedidos al mismo destino» y «Solicitar transporte».
- [ ] 6.3 Portar `WMSCanalesVenta.tsx`, `WMSPedidosEnLinea.tsx` y `WMSConsolidacion.tsx` con sus rutas, permisos e i18n. Verificar con `tsc` y con una prueba de navegador de consolidación, y que la huella de DL no cambió.

## 7. TMS: capacidad, cargue y plan de carga

- [ ] 7.1 Aplicar en `models/tms.py` `TMSTipoVehiculoCapacidad`, las medidas de caja del vehículo, `TMSCargue`, `TMSViajeDespacho` y los índices de llaves del viaje, y sus columnas en la migración. Verificar que el arranque las crea en `public` y `cli_acme`.
- [ ] 7.2 Portar `core/tms_capacidad.py` y `endpoints/capacidad_carga.py`. Verificar los escenarios «Vehículo más grande que su tipo» y «Sugerencia de vehículo».
- [ ] 7.3 Portar `endpoints/tms_cargue.py`. Verificar los escenarios «Consolidado que no cabe», «Confirmar cargue» y «Consolidado en dos cargues».
- [ ] 7.4 Portar `core/tms_plan_carga.py` y `endpoints/tms_plan_carga.py`. Verificar los escenarios «Bultos que no caben» y «Carga descentrada».
- [ ] 7.5 Portar `endpoints/tms_conductores.py` sobre las tablas de Gestión humana de CI. Verificar el escenario «Documento repetido».
- [ ] 7.6 Portar `TMSAsignacionCarga.tsx`, `TMSPlanCarga.tsx`, `PlanCarga3D`, `ConductorForm`, `SugerenciaVehiculo` y los cambios de `TMSConfig`, `TMSConductores`, `TMSVehiculos` y `TMSPlaneacion`, con rutas, menú e i18n. Verificar con `tsc` y una prueba de navegador de cargue y plan 3D, y que la huella de DL no cambió.

## 8. TMS: trazabilidad y flujo del viaje

- [ ] 8.1 Aplicar `TMSViajeHistorial`, el POD por parada (quitar la unicidad por viaje, índice único viaje+parada en el arranque) y el permiso `tms_liquidaciones`. Verificar que una base con POD existentes migra sin error.
- [ ] 8.2 Portar en `endpoints/tms.py` `cambiar_estado`, el historial, las reglas de edición y borrado, las paradas en orden, la cancelación consistente, el estado del vehículo y la liquidación con aprobación, conservando lo que CI tiene y DL no; ajustar `wms.py` y `wms_traslados.py` para cambiar estados por `cambiar_estado`. Verificar todos los escenarios de la spec `tms/trazabilidad-viaje`.
- [ ] 8.3 Portar la pestaña «Historial» de `ViajeDetalle.tsx` y los cambios de `TMSViajes`, `TMSTracking`, `TMSLiquidaciones`, `api/tms.ts` y `Roles.tsx`. Verificar con `tsc` y una prueba de navegador del camino completo de un viaje, y que la huella de DL no cambió.

## 9. Verificación integral

- [ ] 9.1 Recorrer el WMS completo en CI (recepción con códigos, ubicación por tareas, reabastecimiento, picking WAVE, cotización, consolidación, cargue, viaje con POD y liquidación) con un usuario administrador y uno con perfil de operario, comprobar que la contabilización con el ERP sigue cuadrando contra la cuenta 143505 y comparar la huella final de DL con la registrada en 1.1. Verificar que no hay errores 500 en el registro y que la huella de DL coincide exactamente.

## Workflow follow-up

- Decidir con el usuario si se abren cambios aparte para traer WFM (personal), analítica y S&OP, entrenamiento o el asistente de IA de DL.
- Cuando se aplique `organizar-plataforma-modular`, mover estas funciones a `modulos/wms/` y sus migraciones a la línea base de Alembic.
- Archivar este cambio cuando las tareas estén completas y las especificaciones revisadas.
