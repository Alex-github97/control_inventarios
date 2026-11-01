# Spec Delta

## Purpose

Que todo lo físico de la planta (carcasas, insumos y llantas terminadas) exista en el inventario del WMS, con su dueño, su ubicación y su lote, sin llevar dos inventarios paralelos.

## ADDED Requirements

### Requirement: La planta es un almacén del WMS
La planta SHALL operar sobre un almacén del WMS con zonas para recepción de carcasas, producción, insumos, producto terminado y rechazos. Cada estación SHALL tener una ubicación de la zona de producción de donde consume sus insumos.

#### Scenario: Configuración inicial
- **WHEN** el administrador activa el módulo y elige el almacén de la planta
- **THEN** el sistema crea las zonas y ubicaciones que falten y asigna una ubicación a cada estación

### Requirement: Carcasas en el inventario de su dueño
Al registrar una carcasa en recepción, SHALL entrar al inventario del WMS como unidad serializada (su código) del depositante dueño, en la zona de recepción. Las carcasas de clientes MUST NOT afectar la contabilidad; las de la planta SHALL entrar valorizadas.

#### Scenario: Carcasa de cliente
- **WHEN** se registran 38 carcasas de «Transportes del Norte»
- **THEN** el WMS muestra 38 unidades de ese depositante en la zona de recepción y el cuadre contable del inventario no cambia

### Requirement: Movimiento con la producción
Al aprobar la inspección inicial, la carcasa SHALL pasar en el WMS de recepción a producción; al rechazarse en cualquier etapa, a la zona de rechazos; al aprobarse la inspección final y terminarse los acabados, SHALL salir como carcasa y entrar como llanta reencauchada (medida y banda) del mismo dueño en producto terminado, con la misma serie.

#### Scenario: Llanta terminada
- **WHEN** la carcasa RT-004512 de un cliente termina acabados y marcación
- **THEN** el WMS registra la salida de la carcasa de producción y la entrada de «Reencauchada 295/80 R22.5 · BDR-HT» serie RT-004512 en producto terminado

### Requirement: Insumos con lote desde el WMS
Banda, cojín, cemento, parches y demás insumos SHALL ser productos del WMS de la planta, recibidos por el flujo de recepción del WMS con su lote. Los consumos de producción SHALL descontarse de la ubicación de la estación, con su lote, como salida por consumo de producción valorizada al costo promedio.

#### Scenario: Consumo valorizado
- **WHEN** se consumen 3,12 m de banda cuyo costo promedio es $38.500 por metro
- **THEN** el WMS registra la salida por consumo de producción con ese costo y la orden de reencauche acumula $120.120 de banda

### Requirement: Despacho por el flujo del WMS
Las llantas terminadas y las rechazadas que se devuelven SHALL despacharse con una orden de salida del WMS por cliente, con alistamiento por serie. El despacho MUST NOT incluir llantas retenidas, rechazadas sin disposición de devolución o de otro cliente.

#### Scenario: Orden de entrega
- **WHEN** se crea la entrega para «Transportes del Norte»
- **THEN** la orden de salida propone sus 31 llantas terminadas y sus 4 rechazadas para devolución, y no deja agregar una llanta retenida

### Requirement: Existencias de insumos para la planta
El sistema SHALL mostrar las existencias de cada insumo frente al consumo de las carcasas en cola, para saber si alcanza la banda pedida.

#### Scenario: Banda que no alcanza
- **WHEN** hay 60 carcasas en cola pidiendo banda «BDR-HT 230» que suman 190 m y en inventario hay 120 m
- **THEN** el tablero muestra el faltante de 70 m para esa banda
