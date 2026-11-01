# Proposal

## Why

Una planta de reencauche no fabrica lotes de un producto: transforma **llantas individuales, casi siempre ajenas**, que pueden salir del proceso en cualquiera de sus quince etapas. El MES actual piensa en órdenes con cantidades (`mes_orden_produccion`, `mes_avance_estacion` suma unidades por estación), así que no puede responder lo que la planta y su cliente preguntan todos los días: *¿dónde está mi llanta, quién la raspó, qué banda y qué lote le pusieron, en qué autoclave y con qué ciclo se vulcanizó, y por qué la rechazaron?* Tampoco sabe que la llanta es del cliente, que hay que recogerla y devolverla, ni que una carcasa rechazada vuelve al dueño o va a un gestor de residuos.

## What Changes

- **Módulo nuevo «Reencauche» (RTM)**, contratable aparte, con su propio espacio en la barra de módulos. Toma del MES los conceptos que sirven (planta, equipos, operarios, turnos, terminal de planta, esquema gráfico de la línea) pero con tablas propias `rtm_*`, porque la unidad de trabajo es **la carcasa**, no la cantidad.
- **Recepción de carcasas**: cada llanta recibe un código único con propietario, medida, marca, DOT, profundidad remanente, reencauches anteriores y observaciones; el conteo se compara contra la remisión del cliente.
- **Ruta de producción por carcasa**: las quince etapas (en frío) y la ruta en caliente quedan como **rutas configurables**; cada carcasa registra un paso por etapa con operario, equipo, tiempos, mediciones contra especificación y resultado. Ninguna etapa se registra si la anterior no quedó aprobada.
- **Puntos de decisión** en inspección inicial, posterior al raspado, posterior a vulcanización e inspección final: *aprobada / condicional / rechazada* (y en la final, *retenida* o *corrección autorizada*), con catálogos de defectos por zona y de motivos de rechazo. Las condicionales esperan un dictamen técnico.
- **Reparaciones** por carcasa (tipo, ubicación, tamaño, material) y **consumo de insumos** (banda por longitud cortada, cojín, cemento, parches) descontado del WMS **por lote**, para saber qué lote terminó en qué llanta.
- **Ciclos de vulcanización** (autoclave o prensa) con receta, llantas cargadas y variables reales contra programadas; un ciclo con desviación retiene todas sus llantas.
- **Disposición de rechazos**: devolución al cliente o entrega a gestor autorizado, con constancia.
- **Integración WMS**: las carcasas, los insumos y el producto terminado existen en el inventario del WMS (las carcasas de clientes como mercancía de su depositante, sin contabilizar); el despacho usa el flujo de salida del WMS.
- **Integración TMS**: solicitudes de **recogida** de carcasas en las sedes del cliente y **entrega** de las terminadas, sobre viajes y paradas del TMS; la recepción en planta cuadra contra lo recogido.
- **Liquidación al cliente** por llanta (reencauche según medida y banda, reparaciones, cargo de inspección por rechazo, configurable) y **garantías y posventa** con dictamen.
- **Indicadores** del capítulo 20: aceptación y rechazo inicial (por marca, medida y motivo), rechazo por etapa, FPY, rendimiento de carcasas, tiempos y productividad por máquina, ciclos y desviaciones, consumo de banda, garantías por cada 100 llantas y costo por llanta.

Supuestos que se registran aquí y conviene confirmar: la planta puede trabajar **las dos tecnologías** (frío y caliente) y **los dos modelos de propiedad** (servicio sobre llanta del cliente y venta de carcasa propia reencauchada). Seguridad industrial y gestión ambiental general quedan en los módulos que ya existen (SST, GRC); aquí solo se registra la disposición de la carcasa rechazada.

## Capabilities

### New Capabilities
- `reencauche/recepcion-carcasas`: identificación única, registro, cuadre contra remisión y propiedad de cada carcasa.
- `reencauche/ruta-produccion`: rutas de etapas configurables, avance de cada carcasa paso a paso, mediciones contra especificación, reparaciones y consumo de insumos.
- `reencauche/control-calidad`: inspecciones con decisión, defectos y motivos de rechazo, dictamen de condicionales, retenciones y disposición de rechazos.
- `reencauche/vulcanizacion`: recetas, ciclos de autoclave o prensa, variables registradas y retención por desviación.
- `reencauche/trazabilidad-carcasa`: historia completa de una llanta, de la recepción a la entrega y la garantía.
- `reencauche/integracion-wms`: carcasas, insumos y producto terminado en el inventario del WMS; despacho.
- `reencauche/integracion-tms`: recogida y entrega de llantas en viajes del TMS.
- `reencauche/liquidacion-posventa`: tarifas, liquidación por cliente, garantías y reclamos.
- `reencauche/indicadores`: tablero e indicadores de gestión de la planta.

### Modified Capabilities
(ninguna: `openspec/specs/` no tiene capacidades publicadas todavía)

## Impact

- **Backend**: modelos `infrastructure/models/reencauche.py`; rutas `/reencauche/*` en `api/v1/endpoints/reencauche*.py`; registro en `api/v1/router.py` y en `core/modulos.py` (módulo `reencauche`); migración e índices en `main._migrar_esquema` dentro del candado.
- **WMS**: uso de `core/wms_inventario.mover` para entradas, consumos y salidas; productos por depositante para carcasas; posible ajuste de `mover` para llevar `serie_id`.
- **TMS**: solicitudes de recogida y paradas en sede del cliente sobre `TMSViaje`/`TMSParada`; el flujo de entrega ya existente (`TMSSolicitudTransporte` → `TMSCargue` → viaje).
- **CMMS (opcional)**: los equipos de la planta se enlazan con `EAMActivo` para su mantenimiento; un lote de `eam_reencauche_lote` enviado a una planta del mismo cliente puede nacer como recepción.
- **ERP**: la liquidación se factura con la facturación existente.
- **Frontend**: espacio nuevo en `WorkspacePanel`/`Sidebar` y páginas `RTM*`; terminal de estación por escaneo del código.
- **Datos**: semilla de etapas, defectos y motivos; generador de datos masivos para la empresa de demostración.
