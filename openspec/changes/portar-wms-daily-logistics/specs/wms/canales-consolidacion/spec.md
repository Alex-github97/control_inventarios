# Spec Delta

## Purpose

Recibe los pedidos de los canales de venta en línea de cada empresa y los consolida por destino para despacharlos con una sola solicitud de transporte.

## ADDED Requirements

### Requirement: Conectores de canales de venta
Cada empresa SHALL poder configurar conectores a sus canales de venta en línea. Los pedidos que llegan por un canal SHALL registrarse una sola vez, aunque el canal los envíe repetidos, y en el esquema de la empresa dueña del conector.

#### Scenario: Pedido repetido
- **WHEN** el canal envía dos veces el mismo pedido
- **THEN** queda registrado un solo pedido

#### Scenario: Pedido de otra empresa
- **WHEN** llega un pedido con el token del conector de la empresa A
- **THEN** se registra solo en la empresa A, sin importar qué otras empresas existan

### Requirement: Consolidación por destino
El WMS SHALL agrupar los pedidos de canal pendientes por destino en consolidados, y un pedido MUST NOT pertenecer a más de un consolidado activo.

#### Scenario: Tres pedidos al mismo destino
- **WHEN** hay tres pedidos pendientes para la misma ciudad
- **THEN** se proponen en un solo consolidado

### Requirement: Solicitud de transporte desde el consolidado
Un consolidado SHALL poder generar una solicitud de transporte para el TMS con su peso, volumen, origen y destino.

#### Scenario: Solicitar transporte
- **WHEN** se solicita transporte para un consolidado
- **THEN** se crea la solicitud en el TMS y el consolidado queda «con transporte solicitado»
