# Spec Delta

## Purpose

Lleva la compra desde la solicitud de cotización a varios proveedores hasta la orden de compra adjudicada, con registro de precios para comparar.

## ADDED Requirements

### Requirement: Solicitud de cotización por proveedor
El WMS SHALL permitir crear una solicitud de cotización con productos y cantidades, enviarla a uno o varios proveedores como PDF por correo y registrar la respuesta de cada uno con sus precios.

#### Scenario: Envío a tres proveedores
- **WHEN** se envía una solicitud a tres proveedores
- **THEN** cada uno recibe un correo con el PDF de su solicitud y la solicitud queda «enviada» para cada uno

#### Scenario: Correo no configurado
- **WHEN** la empresa no tiene configurado el envío de correo
- **THEN** la solicitud se puede descargar en PDF y el sistema indica que el envío por correo no está disponible

### Requirement: Adjudicación y orden de compra
Al adjudicar una cotización, el WMS SHALL generar la orden de compra con el proveedor, los productos, las cantidades y los precios adjudicados. La orden de compra MUST conservar precios y totales.

#### Scenario: Adjudicar
- **WHEN** se adjudica la cotización del proveedor B
- **THEN** se crea una orden de compra al proveedor B con sus precios, y las demás cotizaciones quedan «no adjudicadas»
