# Spec Delta

## Purpose

Programar en el TMS la recogida de carcasas en las sedes de los clientes y la entrega de las llantas terminadas, y cuadrar lo recogido con lo que llega a la planta.

## ADDED Requirements

### Requirement: Solicitud de recogida
La planta SHALL poder registrar solicitudes de recogida con cliente, sede, fecha requerida y cantidad estimada de llantas. Las solicitudes pendientes SHALL aparecer en el TMS para programarlas en un viaje.

#### Scenario: Cliente pide recogida
- **WHEN** «Transportes del Norte» pide recoger 40 llantas en su sede de Barranquilla el jueves
- **THEN** la solicitud queda pendiente en la planificación del TMS con esa sede y fecha

### Requirement: Viaje de recogida
Programar una o varias solicitudes de recogida SHALL crear un viaje del TMS con una parada por sede y la planta como destino. En cada parada el conductor SHALL registrar la cantidad recogida y la remisión del cliente.

#### Scenario: Ruta con dos clientes
- **WHEN** se programan en un mismo viaje las recogidas de dos clientes
- **THEN** el viaje tiene dos paradas de recogida y la planta como destino, y cada parada pide cantidad y remisión al completarse

### Requirement: Recepción desde el viaje
Al llegar un viaje de recogida a la planta, el sistema SHALL ofrecer abrir una recepción por cada parada, con el cliente, la remisión y la cantidad que registró el conductor como cantidad declarada.

#### Scenario: Faltante entre recogida y recepción
- **WHEN** el conductor registró 40 llantas recogidas y en planta se cuentan 39
- **THEN** la recepción cierra con diferencia de −1 contra lo recogido y la novedad queda enlazada al viaje

### Requirement: Entrega por el flujo de transporte existente
Las entregas a clientes SHALL viajar por el flujo de transporte del WMS y el TMS (solicitud de transporte, cargue y viaje). Al registrarse la prueba de entrega de una parada, las llantas de esa entrega SHALL quedar como entregadas, con la fecha y quien recibió.

#### Scenario: Prueba de entrega
- **WHEN** el conductor registra la entrega con firma del cliente en la parada de «Transportes del Norte»
- **THEN** las 35 llantas de esa entrega quedan en estado «entregada» con la fecha y el nombre de quien recibió, visibles en su hoja de vida

### Requirement: Cliente que trae o recoge sus llantas
Las recepciones y entregas SHALL poder hacerse sin viaje del TMS cuando el cliente trae o recoge las llantas por su cuenta, dejando registrada la placa y el nombre de quien entrega o recibe.

#### Scenario: Entrega en mostrador
- **WHEN** el cliente recoge sus llantas en la planta con su propio vehículo
- **THEN** el despacho se cierra sin viaje, con la placa y el nombre de quien recibió
