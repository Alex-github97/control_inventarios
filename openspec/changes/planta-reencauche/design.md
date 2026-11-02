# Design

## Context

Ver `proposal.md` (Why) y las especificaciones en `specs/reencauche/`. Lo que hay hoy y condiciona el enfoque:

- **MES** (`models/mes.py`, `endpoints/mes*.py`): planta, línea, equipo, operario, turno, órdenes con cantidad y `mes_avance_estacion`, que **suma unidades** por orden y estación. Tiene un esquema gráfico de la línea (`mes_flujo_nodo`/`mes_flujo_conexion`) y una terminal de planta. No hay noción de unidad individual ni de propietario.
- **WMS**: todo movimiento de existencias pasa por `core/wms_inventario.mover` (sin autoflush, costo promedio, estados por fila). La existencia se lleva por producto, ubicación, lote y contenedor. `wms_series` existe y `wms_movimientos_inventario.serie_id` también, pero `mover` no lo llena y la existencia no se parte por serie. Cada producto pertenece a un depositante (`WMSDepositante`, con `propio`); `wms_contable` solo contabiliza la mercancía propia. `wms_maquila` ya transforma componentes en producto.
- **TMS**: `TMSViaje` con `TMSParada` (ORIGEN, PARADA_INTERMEDIA, DESTINO, CROSS_DOCK) y POD. El flujo de entrega desde el WMS ya existe: `TMSSolicitudTransporte` → `TMSCargue` → viaje con `TMSViajeDespacho`. No existe la recogida en sede del cliente.
- **CMMS**: `eam_reencauche_lote`/`eam_reencauche_detalle` ven el reencauche desde la flota que envía llantas; `eam_banda_reencauche` es un catálogo de bandas de la flota.
- **Plataforma**: módulos contratables en `core/modulos.py` (la API hace cumplir los prefijos); los perfiles de usuario hoy solo ocultan interfaz (memoria `permisos-dos-capas`). Producción corre 4 procesos de uvicorn: toda migración va dentro del advisory lock de `main._migrar_esquema`. Listas por trozos con `core/paginacion.py` y agregados en SQL (`consultas-con-volumen`).

## Goals / Non-Goals

**Goals:**
- La carcasa como unidad de trabajo, con su historia inalterable de punta a punta.
- Un único inventario físico: el WMS. El módulo de reencauche guarda el **proceso**, el WMS guarda las **existencias**.
- Reutilizar los flujos de salida y de transporte que ya existen en lugar de copiarlos.
- Que la terminal de estación funcione con un escáner y pocos toques.

**Non-Goals:**
- Lectura automática de controladores de autoclave (PLC/OPC-UA): se deja el punto de entrada para recibir variables, pero la primera versión las registra el operario.
- Planeación con capacidad finita de la planta (APS): la cola por estación es por prioridad y antigüedad.
- Seguridad industrial y gestión ambiental generales (están en SST y GRC).
- Portal de autoservicio del cliente para consultar sus llantas (se puede montar después sobre la trazabilidad y el portal del WMS).

## Decisions

### 1. Módulo propio con tablas `rtm_*`, no extender el MES
El MES modela cantidades; forzarlo a unidades individuales cambiaría `mes_avance_estacion` y todas sus pantallas para los clientes que ya lo usan. Se crea `models/reencauche.py` y `endpoints/reencauche*.py` bajo `/reencauche`, como módulo `reencauche` en `core/modulos.py`. Se **copian los patrones** del MES (terminal de planta, esquema gráfico, turnos) y no sus tablas.
*Alternativa descartada:* reutilizar `mes_equipo`/`mes_operario`. Obligaría a contratar MES para usar la planta y mezclaría catálogos de plantas distintas.

### 2. Modelo de datos
- `rtm_planta_config`: fila única con el almacén del WMS, la ubicación por zona y los parámetros (consecutivo de códigos, cargo de inspección por rechazo).
- `rtm_equipo`: raspadoras, extrusoras, embandadoras, autoclaves y demás, con tipo, capacidad (llantas por ciclo), ubicación del WMS de la estación y `eam_activo_id` opcional para el mantenimiento en el CMMS.
- `rtm_etapa`: catálogo (código, nombre, tipo: `PROCESO`/`INSPECCION`/`VULCANIZACION`, si es punto de decisión, mediciones que pide en JSON con nombre, unidad y si se compara con la especificación).
- `rtm_ruta` y `rtm_ruta_etapa`: ruta (la de frío sembrada; la planta puede crear variantes, p. ej. sin destalonado) con sus etapas en orden, obligatoria u opcional, y los tipos de equipo admitidos.
- `rtm_recepcion`: propietario (depositante del WMS), remisión, cantidad declarada, viaje y parada de origen opcionales, estado.
- `rtm_carcasa`: código único, depositante dueño, marca, medida, modelo, DOT, serie, reencauches previos, estado actual, etapa actual, `wms_serie_id`, `eam_neumatico_id` opcional.
- `rtm_orden`: una por visita de la carcasa (recepción, ruta, banda pedida, prioridad, estado `ABIERTA`/`TERMINADA`/`RECHAZADA`, etapa actual, decisión pendiente, precio congelado, costo acumulado). Restricción única parcial: una orden abierta por carcasa.
- `rtm_paso`: una fila por etapa ejecutada (orden, etapa, equipo, operario, inicio, fin, mediciones JSON con su resultado frente a la especificación, decisión, observaciones, `anula_id`). No se edita: corregir es insertar un paso que anula al anterior (`trazabilidad-carcasa`).
- `rtm_defecto_catalogo` (con zona), `rtm_motivo_rechazo`, `rtm_paso_defecto` (paso, defecto, ubicación, tamaño), `rtm_paso_prueba` (prueba especial, resultado y adjunto, con el mecanismo de adjuntos del CMMS).
- `rtm_reparacion`: daño, ubicación, tamaño, profundidad, tipo de reparación, material, autorizado por.
- `rtm_limite_reparacion`: tamaño máximo por ubicación y tipo de daño, configurable.
- `rtm_especificacion`: por medida y banda: diámetro, ancho y perfil de raspado con tolerancias, longitud de banda y cojín, cemento estándar.
- `rtm_consumo`: paso, producto del WMS, lote, cantidad, costo, `wms_movimiento_id`.
- `rtm_receta` y `rtm_ciclo` (equipo, receta, operario, inicio, fin, variables reales JSON con su conformidad, estado) y `rtm_ciclo_carcasa`.
- `rtm_retencion` (orden, origen `MANUAL`/`CICLO`, motivo, liberada por, justificación) y `rtm_dictamen` para las condicionales.
- `rtm_disposicion`: carcasa rechazada → `DEVOLUCION`/`GESTOR`/`VENTA`, con acta o certificado.
- `rtm_solicitud_recogida`: cliente, sede, fecha, cantidad estimada, estado y viaje.
- `rtm_tarifa` (general o por cliente; medida, banda, reparación o cargo), `rtm_liquidacion` y `rtm_liquidacion_linea`.
- `rtm_reclamo`: carcasa, orden, falla, km, condiciones, fotos, estado, dictamen, causa y compensación.

Las decisiones de la orden se guardan como estado explícito (`etapa_actual_id`, `decision_pendiente`) y no se infieren recorriendo los pasos en cada consulta: las colas por estación y el tablero filtran por índice.

### 3. Una máquina de estados central
Toda escritura sobre una orden pasa por un servicio `core/reencauche_flujo.py` (`iniciar_paso`, `terminar_paso`, `decidir`, `retener`, `liberar`, `dictaminar`, `rechazar`) que valida el orden de la ruta, las decisiones pendientes, las retenciones y los límites, y mueve el WMS en la misma transacción. Es el mismo principio que `wms_inventario.mover`: una sola puerta, y por eso las reglas se cumplen igual desde la terminal, la pantalla o una importación.

### 4. Carcasas en el WMS: producto por dueño y medida, serie por llanta
Como la existencia del WMS no se parte por serie, cada carcasa entra como **1 unidad** del producto «Carcasa ‹medida›» del depositante dueño (creado al vuelo), con su `WMSSerie` (número = código de la carcasa) y el `serie_id` en el movimiento. La ubicación exacta de cada llanta la manda `rtm_carcasa`; el WMS cuadra cantidades por dueño y zona. Se agrega a `mover` el parámetro opcional `serie_id` (solo se graba en el movimiento y actualiza el estado de la serie), sin tocar el resto de las llamadas.
Al terminar, la transformación es **salida de la carcasa + entrada de «Reencauchada ‹medida› · ‹banda›»** con la misma serie, igual que la maquila. Para las carcasas propias la entrada se valoriza con costo de carcasa más los consumos de la orden; para las de clientes no se valoriza (depositante no propio, `wms_contable` no la toca).
*Alternativa descartada:* llevar la existencia de carcasas solo en `rtm_carcasa`. Dejaría dos inventarios y el WMS no podría despacharlas ni contarlas.

### 5. Insumos por el WMS normal
Bandas, cojines, cementos y parches son productos propios del WMS de la planta con lote, recibidos con el flujo de recepción del WMS. Las bandas se manejan en metros. El consumo es `mover(tipo="CONSUMO_PRODUCCION", origen=ubicación de la estación, lote_id=…)`, valorizado al costo promedio; el costo se acumula en la orden. El abastecimiento de las estaciones es un traslado del WMS.

### 6. Transporte: recogida nueva y entrega existente
- **Recogida**: `rtm_solicitud_recogida` aparece en la planificación del TMS; programarla crea un `TMSViaje` (servicio `PRIMERA_MILLA`) con una `TMSParada` por sede y la planta como `DESTINO`. Completar la parada pide cantidad y remisión (campos que se agregan a la parada como datos de recogida). Al llegar, cada parada ofrece abrir la `rtm_recepcion` con esa cantidad como declarada.
- **Entrega**: orden de salida del WMS por cliente con alistamiento por serie → solicitud de transporte → cargue → viaje, sin código nuevo en el TMS. El POD de la parada marca las llantas como entregadas mediante un enganche en el cierre de parada que busca los despachos con documento de reencauche.

### 7. Facturación
La liquidación aprobada genera la factura con el mismo servicio de facturación del ERP que usa el POS (`pos_servicio` → ERP), con el tercero del depositante (`WMSDepositante.tercero_id`). Las llantas propias se venden por la orden de salida o por el POS.

### 8. Interfaz
Espacio «Reencauche» en `WorkspacePanel`/`Sidebar` (aparece solo en la barra de módulos). Páginas: Tablero, Recepción, Carcasas (hoja de vida), Terminal de estación, Evaluación técnica y retenciones, Vulcanización, Despachos y recogidas, Liquidación, Garantías, Indicadores y Configuración (rutas, etapas, especificaciones, límites, recetas, defectos, motivos, tarifas, equipos). La terminal se abre con el código de la estación: escanear la carcasa muestra su etapa, el botón iniciar/terminar, las mediciones que pide la etapa con su rango y los insumos a escanear. Todas las listas son paginadas en el servidor desde el principio.

### 9. Indicadores
Se calculan con SQL agregado sobre `rtm_paso`, `rtm_orden`, `rtm_ciclo`, `rtm_consumo` y `rtm_reclamo`, con índices por fecha, etapa y equipo, y el cálculo restante en `to_thread`, siguiendo `consultas-con-volumen`. Sin tablas de totales precalculados en la primera versión; si una consulta anual pasa de unos segundos con el generador masivo, se agrega una tabla diaria como `mes_kpi_diario`.

### 10. Semilla y datos de demostración
Al activar el módulo en una empresa se siembra la ruta en frío, las etapas, los defectos y motivos de rechazo usuales y los límites de reparación como plantilla editable, **sin recetas** (las define la planta). Un generador `tools/sembrar_reencauche.py`, por API como `demoflota`, crea un año de operación con varias decenas de miles de carcasas para la empresa de demostración y para medir los indicadores.

## Risks / Trade-offs

- [La existencia del WMS no lleva serie] → la llanta exacta se ubica por `rtm_carcasa` y el WMS solo cuadra cantidades por dueño y zona. Una conciliación diaria compara ambos y reporta diferencias.
- [Productos de carcasa creados al vuelo por dueño y medida] → pueden ser muchos con muchos clientes. Se marcan con una categoría propia para filtrarlos de los listados generales del WMS.
- [La terminal en planta sin red estable] → la primera versión es en línea; si la planta lo requiere, se estudia una cola local como la del grabador de reuniones.
- [Recetas mal digitadas producen falsas desviaciones o las ocultan] → las recetas tienen versión y solo un rol de calidad las aprueba; los ciclos guardan la versión con que corrieron.
- [El enganche del POD del TMS acopla dos módulos] → se hace con el `documento_tipo` del despacho y no cambia el comportamiento del TMS para los demás despachos.
- [Las reglas de paso se saltan desde otra ruta de la API] → todas las escrituras pasan por el servicio central y las pruebas cubren cada regla de la especificación.

## Migration Plan

Tablas nuevas, creadas en `_migrar_esquema` dentro del advisory lock, con sus índices. El único cambio sobre código existente es el parámetro opcional `serie_id` de `wms_inventario.mover` y los campos de recogida en `TMSParada`, ambos compatibles hacia atrás. El módulo nace apagado: nadie lo ve hasta que se contrata. Para revertir basta con quitar el módulo de las empresas; las tablas quedan sin uso.

## Open Questions

- Formato de la etiqueta de la carcasa (código de barras 1D o QR, tamaño de impresora): se define con la planta antes de la fase de recepción, sin cambiar el modelo.
- Si alguna planta ya tiene autoclaves con controlador exportable, el formato del archivo o protocolo para leer sus variables.
- Qué marcación exige la norma colombiana vigente y el reglamento técnico sobre la llanta reencauchada, para completar los campos de la etiqueta final.
