# Spec Delta

## Purpose

Garantiza que cada viaje siga un flujo de estados coherente y que todo lo que le pasa quede registrado con quién, cuándo y desde dónde.

## ADDED Requirements

### Requirement: Historial del viaje
El TMS SHALL registrar en el historial de cada viaje su creación, los cambios de estado, las asignaciones, las ediciones (con valor anterior y nuevo), las paradas, los documentos, el POD, los costos, el in-full y la liquidación, con usuario, fecha y origen (pantalla, evento, POD, cargue, WMS o sistema).

#### Scenario: Cambio de estado desde la pantalla
- **WHEN** un usuario pasa un viaje de ASIGNADO a EN_TRANSITO
- **THEN** el historial muestra el cambio con estado anterior, estado nuevo, el usuario y la hora

#### Scenario: Entrega automática
- **WHEN** se completa la última parada de un viaje
- **THEN** el viaje queda entregado y el historial registra el cambio con origen «última parada»

### Requirement: Un solo camino para cambiar el estado
Todo cambio de estado de un viaje SHALL pasar por la misma validación de transiciones, venga de la pantalla, de un evento, de una parada, del POD, de la planeación o del WMS. La edición general de un viaje MUST NOT cambiar su estado, sus fechas reales ni su OTIF, y un viaje cerrado o cancelado MUST NOT editarse.

#### Scenario: Salida sin conductor
- **WHEN** se intenta poner en tránsito un viaje sin conductor
- **THEN** se rechaza con un mensaje claro y el estado no cambia

#### Scenario: Editar un viaje cerrado
- **WHEN** se edita un viaje entregado y cerrado
- **THEN** se rechaza con 409

#### Scenario: Paradas fuera de orden
- **WHEN** se intenta completar la tercera parada antes de la segunda
- **THEN** se rechaza con 409

### Requirement: Cancelación consistente
Al cancelar un viaje con carga del WMS, los consolidados SHALL volver a carga pendiente, el cargue a cancelado, la solicitud de transporte SHALL recalcularse y los despachos en tránsito SHALL volver a LISTO, con su registro en el historial del WMS. El vehículo SHALL pasar a EN_VIAJE al salir y volver a DISPONIBLE al terminar o cancelar.

#### Scenario: Cancelar un viaje cargado
- **WHEN** se cancela un viaje que nació de un cargue con dos consolidados
- **THEN** los dos consolidados quedan pendientes de carga y sus despachos vuelven a LISTO

### Requirement: POD por parada
Cada parada de entrega SHALL poder tener su propio POD, y MUST NOT haber dos POD para la misma parada de un viaje.

#### Scenario: Viaje con tres entregas
- **WHEN** un viaje tiene tres paradas de entrega
- **THEN** se registra un POD en cada una y completar el último entrega el viaje

### Requirement: Liquidación con aprobación
Las liquidaciones de conductor SHALL seguir el flujo borrador → aprobada → pagada (rechazada vuelve a borrador), tomar flete y conductor del viaje y aplicar solo a viajes entregados. Aprobar, rechazar y pagar MUST exigir el permiso «tms_liquidaciones», y las aprobadas o pagadas MUST NOT editarse.

#### Scenario: Pagar sin permiso
- **WHEN** un usuario sin el permiso «tms_liquidaciones» intenta pagar una liquidación aprobada
- **THEN** se rechaza con 403

#### Scenario: Liquidar un viaje en tránsito
- **WHEN** se intenta liquidar un viaje que no ha sido entregado
- **THEN** se rechaza
