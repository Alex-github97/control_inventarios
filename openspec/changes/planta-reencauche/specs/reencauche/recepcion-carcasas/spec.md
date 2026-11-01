# Spec Delta

## Purpose

Que cada llanta que entra a la planta quede identificada con un código único, con su dueño y su estado de llegada, antes de que cualquier etapa de producción la toque.

## ADDED Requirements

### Requirement: Recepción contra remisión
Una recepción SHALL agrupar las llantas que llegan juntas de un mismo propietario, con su remisión y la cantidad que la remisión declara. Al cerrarla, el sistema SHALL mostrar la diferencia entre lo declarado y lo contado.

#### Scenario: Llegan menos llantas de las remitidas
- **WHEN** la remisión del cliente dice 40 llantas y se registran 38 carcasas antes de cerrar la recepción
- **THEN** la recepción se cierra con una diferencia de −2 visible en la recepción y en el reporte de novedades del cliente

#### Scenario: Recepción sin remisión
- **WHEN** el cliente trae llantas sin remisión
- **THEN** la recepción se puede registrar sin número de remisión y la cantidad declarada queda igual a la contada

### Requirement: Código único por carcasa
Cada carcasa recibida SHALL tener un código interno único en la empresa, que se imprime en etiqueta y es el que se escanea en cada estación. El sistema MUST NOT dejar crear dos carcasas con el mismo código.

#### Scenario: Código generado
- **WHEN** se registra una carcasa sin escribir código
- **THEN** el sistema le asigna el siguiente consecutivo y ofrece imprimir su etiqueta

#### Scenario: Código repetido
- **WHEN** se intenta registrar una carcasa con un código que ya existe
- **THEN** el registro se rechaza indicando a qué carcasa pertenece el código

### Requirement: Datos de recepción
Cada carcasa SHALL registrar propietario, fecha de recepción, marca, medida y modelo. SHALL admitir, cuando se conozcan, DOT o serie, profundidad remanente, estado de los costados, reencauches anteriores, posición de servicio anterior y observaciones.

#### Scenario: DOT ilegible
- **WHEN** el DOT de la llanta no se puede leer
- **THEN** la carcasa se registra sin DOT y queda marcada como «DOT ilegible» para los reportes

### Requirement: La misma llanta vuelve
Cuando llega una llanta que ya pasó por la planta, identificada por su código, DOT o serie, el sistema SHALL reconocerla, conservar su historia anterior y sumar un reencauche más a su conteo de vidas.

#### Scenario: Segundo reencauche
- **WHEN** se recibe una llanta cuyo DOT coincide con una carcasa reencauchada y entregada el año anterior
- **THEN** el sistema propone usar esa misma carcasa, con su historia, en lugar de crear una nueva, y su número de reencauches pasa de 1 a 2

### Requirement: Nada entra a producción sin recepción
Una carcasa MUST NOT registrar ninguna etapa de producción si no pertenece a una recepción cerrada o en curso con su código asignado.

#### Scenario: Escanear un código desconocido en una estación
- **WHEN** un operario escanea en la raspadora un código que no está registrado
- **THEN** la estación rechaza el escaneo e indica que la llanta debe pasar primero por recepción

### Requirement: Propiedad de la carcasa
Cada carcasa SHALL tener propietario: un cliente (servicio de reencauche sobre llanta ajena) o la propia planta (carcasa comprada para vender reencauchada). La propiedad SHALL decidir si se factura servicio o producto y si la carcasa afecta la contabilidad.

#### Scenario: Carcasa comprada por la planta
- **WHEN** la planta recibe un lote de carcasas compradas a un proveedor
- **THEN** las carcasas quedan con propietario «planta», valorizadas a su costo de compra
