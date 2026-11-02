# Tasks

Las pruebas de humo de cada grupo van en `backend/tests/humo_reencauche.py` (mismo estilo que `humo_wms.py`), corren contra una empresa de prueba local y crecen grupo a grupo. Las pruebas de navegador van en `frontend/tools/probar_reencauche_*.cjs` con `ci-auditor`.

## 1. Base del módulo

- [x] 1.1 Registrar el módulo `reencauche` con el prefijo `/reencauche` en `core/modulos.py` y el router vacío en `api/v1/router.py`; verificar que una empresa sin el módulo recibe 403 en `/reencauche/...` y una con el módulo, 200.
- [x] 1.2 Crear `infrastructure/models/reencauche.py` con las tablas del diseño (decisión 2) y su migración e índices en `main._migrar_esquema` dentro del advisory lock; verificar arrancando el backend dos veces contra una base limpia y contra la empresa `demo`, sin errores ni tablas duplicadas.
- [x] 1.3 Siembra al activar el módulo: ruta en frío, etapas con sus mediciones, defectos por zona, motivos de rechazo y límites de reparación de plantilla, sin recetas; verificar en `humo_reencauche.py` que una empresa nueva queda con la ruta en frío y que la siembra no se repite al reiniciar.
- [x] 1.4 Configuración de planta: elegir el almacén del WMS y crear las zonas y ubicaciones que falten (recepción, producción, insumos, terminado, rechazos), y equipos con tipo, capacidad, ubicación de estación y `eam_activo_id` opcional; verificar por API que las zonas aparecen en el WMS y que un equipo sin ubicación no se puede usar en la terminal.
- [x] 1.5 Espacio «Reencauche» en `WorkspacePanel` y `Sidebar` con sus páginas vacías y la de Configuración (rutas, etapas, especificaciones, límites, defectos, motivos y equipos), sin errores de `tsc`; verificar con `probar_barra_modulos.cjs` que el módulo aparece en la barra y despliega sus submódulos.

## 2. Recepción y carcasas en el WMS

- [x] 2.1 Agregar el parámetro opcional `serie_id` a `wms_inventario.mover` (graba el movimiento y actualiza el estado de la serie); verificar con `humo_wms.py` que las llamadas existentes no cambian y con una prueba nueva que el movimiento queda con su serie.
- [x] 2.2 Recepción: crear, registrar carcasas (código consecutivo o escrito, único), cerrar con la diferencia contra la remisión; cada carcasa entra al WMS como 1 unidad de «Carcasa ‹medida›» del depositante dueño con su serie; verificar los escenarios de `recepcion-carcasas` y `integracion-wms` («Carcasa de cliente») en `humo_reencauche.py`, incluido que el cuadre contable no cambia.
- [x] 2.3 Reconocer una llanta que vuelve por código, DOT o serie y sumar su reencauche; carcasas propias valorizadas a su costo; verificar los escenarios «Segundo reencauche» y «Carcasa comprada por la planta».
- [x] 2.4 Pantallas de Recepción y Carcasas (lista paginada en el servidor con búsqueda por código, DOT y cliente) e impresión de etiqueta; verificar en navegador registrando una recepción de 5 llantas e imprimiendo una etiqueta.

## 3. Flujo de producción y terminal

- [x] 3.1 Servicio central `core/reencauche_flujo.py` (iniciar, terminar, decidir, retener, liberar, dictaminar, rechazar) con la validación del orden de la ruta, las etapas opcionales y la orden abierta única por carcasa; verificar en `humo_reencauche.py` «Saltarse una etapa obligatoria», «Etapa opcional» y «Escanear un código desconocido en una estación».
- [x] 3.2 Mediciones contra `rtm_especificacion` por medida y banda, con la decisión obligatoria cuando hay medidas fuera de tolerancia; verificar «Raspado fuera de diámetro».
- [x] 3.3 Reparaciones con límites por ubicación y autorización técnica; verificar «Daño fuera de límite».
- [x] 3.4 Consumo de insumos por lote desde la ubicación de la estación con `mover(tipo="CONSUMO_PRODUCCION")`, con costo acumulado en la orden; verificar «Corte de banda», «Insumo sin existencia» y «Consumo valorizado».
- [x] 3.5 Movimientos del WMS con el flujo: recepción → producción al aprobar la inicial, → rechazos al rechazar, y transformación carcasa → reencauchada con la misma serie al terminar; verificar «Llanta terminada» y que las cantidades por zona del WMS cuadran con las carcasas por etapa.
- [x] 3.6 Cola por estación (prioridad y antigüedad) y Terminal de estación por escaneo: etapa actual, iniciar/terminar, mediciones con su rango, insumos a escanear; verificar con `probar_reencauche_terminal.cjs` que una carcasa recorre la ruta en frío completa desde la terminal.

## 4. Control de calidad

- [x] 4.1 Decisiones en los puntos de inspección con defectos por zona y motivo obligatorio en el rechazo; verificar «Inspección inicial aprobada», «Rechazo después del raspado» y «Rechazo sin motivo».
- [x] 4.2 Pruebas especiales con adjunto (mecanismo de adjuntos del CMMS); verificar «Shearografía con separación».
- [x] 4.3 Cola de evaluación técnica y dictamen solo por rol técnico, comprobado en la API y no solo en la interfaz; verificar «Dictamen» y «Operario intenta avanzar una condicional», incluido el 403 a un usuario sin el rol.
- [x] 4.4 Retenciones manuales y liberación con justificación; rechazo definitivo que no vuelve al flujo; verificar «Liberar una retención» e «Intentar reabrir una rechazada».
- [x] 4.5 Disposición de rechazos (devolución, gestor con acta, venta si está habilitada) con salida del WMS cuando corresponde; verificar «Entrega a gestor».
- [x] 4.6 Pantalla de Evaluación técnica y retenciones; verificar en navegador dictaminar una condicional y liberar una retención.

## 5. Vulcanización

- [x] 5.1 Recetas con versión, aprobadas por rol de calidad, por tecnología, banda o compuesto, cojín y equipo; verificar «Banda sin receta».
- [x] 5.2 Ciclos: carga por escaneo con receta única, tope de capacidad y encamisado conforme previo; verificar «Mezclar recetas», «Capacidad excedida» y «Fuga de vacío».
- [x] 5.3 Cierre del ciclo con variables reales, conformidad por variable y retención automática de todo el ciclo si hay desviación; verificar «Registro manual» y «Tiempo corto».
- [x] 5.4 Tablero de vulcanización con el estado de los autoclaves y la utilización; verificar en navegador con dos ciclos en curso.

## 6. Trazabilidad

- [x] 6.1 Hoja de vida por código, DOT o serie, con las visitas separadas; verificar «Consulta de una llanta entregada» y «Varias visitas».
- [x] 6.2 Trazabilidad hacia atrás por lote de insumo, por ciclo y por equipo y periodo, paginadas; verificar «Lote de cojín defectuoso» y «Autoclave descalibrado».
- [x] 6.3 Ubicación actual y tablero por cliente; corrección por anulación sin editar ni borrar pasos cerrados; verificar «El cliente pregunta por sus llantas» y «Corregir una medición», y que un `PUT`/`DELETE` sobre un paso cerrado responde error.
- [x] 6.4 Conciliación diaria entre `rtm_carcasa` y las existencias del WMS por dueño y zona; verificar forzando una diferencia y viéndola en el reporte.

## 7. Transporte y despacho

- [x] 7.1 Campos de recogida (cantidad y remisión) en la parada del TMS, compatibles con las paradas existentes; verificar que las pruebas de viajes del TMS siguen pasando.
- [x] 7.2 Solicitudes de recogida visibles en la planificación del TMS y programación en un viaje con una parada por sede y la planta como destino; verificar «Cliente pide recogida» y «Ruta con dos clientes».
- [x] 7.3 Recepción desde la parada al llegar el viaje, con lo recogido como cantidad declarada; verificar «Faltante entre recogida y recepción».
- [x] 7.4 Entrega: orden de salida del WMS por cliente con alistamiento por serie que excluye retenidas y ajenas, por el flujo solicitud → cargue → viaje; el POD marca las llantas como entregadas; verificar «Orden de entrega» y «Prueba de entrega».
- [x] 7.5 Entrega y recepción sin viaje (placa y nombre); verificar «Entrega en mostrador».
- [x] 7.6 Pantalla de Despachos y recogidas; verificar en navegador una recogida de punta a punta: solicitud, viaje, recepción, producción, entrega.

## 8. Liquidación, garantías y CMMS

- [x] 8.1 Tarifas generales y por cliente, con el precio congelado al aprobar la inspección final; verificar «Tarifa especial» y «Cambio de tarifa con llantas en proceso».
- [x] 8.2 Liquidación por entrega y factura por la facturación del ERP con el tercero del depositante; verificar «Liquidar una entrega» contra una empresa con ERP configurado.
- [x] 8.3 Venta de reencauchadas propias por la orden de salida y por el POS; verificar «Venta en punto de venta».
- [x] 8.4 Reclamos de garantía con su ciclo, dictamen, causa y compensación; verificar «Garantía procedente» y «Reclamo de una llanta desconocida».
- [x] 8.5 Enlace con el CMMS de la misma empresa: un lote enviado a «planta propia» crea la recepción, y el resultado vuelve al detalle del lote; verificar «Flota con planta propia».
- [x] 8.6 Pantallas de Liquidación y Garantías; verificar en navegador liquidar una entrega y registrar un reclamo.

## 9. Indicadores y datos masivos

- [ ] 9.1 Generador `tools/sembrar_reencauche.py`, por API, con un año de operación (decenas de miles de carcasas, varios clientes, rechazos en todas las etapas, ciclos con desviaciones, reclamos); verificar que corre de cero contra una empresa local y que la conciliación del WMS sale sin diferencias.
- [x] 9.2 Indicadores agregados en SQL con filtros por periodo, cliente, medida, marca, banda, equipo y operario; verificar cada escenario de `indicadores` en `humo_reencauche.py` con datos construidos a mano de resultado conocido (82 %, 15 %, 0,7 por cada 100).
- [ ] 9.3 Tablero e Indicadores en el frontend (embudo por etapa, FPY, tiempos y espera por etapa, autoclaves, consumos, garantías, costo por llanta); verificar con el set masivo que el tablero anual responde en pocos segundos sin reinicios de procesos.

## 10. Integración

- [ ] 10.1 Medir todas las rutas GET de `/reencauche` contra el set masivo con el método de `consultas-con-volumen`; verificar que ninguna pasa de 5 s ni devuelve listas sin tope.
- [x] 10.2 Prueba de navegador de punta a punta en la empresa de demostración: recogida, recepción, ruta en frío completa, un rechazo, un ciclo con desviación liberado, entrega, liquidación y reclamo; verificar con `probar_reencauche_completo.cjs` sin errores de página ni de API.

## Workflow follow-up

- Desplegar con la aprobación de GitHub y sembrar la empresa de demostración en producción.
- Archivar el cambio cuando se haya revisado con el usuario.
