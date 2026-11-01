# Spec Delta

## Purpose

Cobrar a cada cliente lo que la planta hizo sobre sus llantas y atender las garantías, devolviendo a calidad y producción lo que pasa con las llantas en servicio.

## ADDED Requirements

### Requirement: Tarifas de reencauche
La planta SHALL mantener tarifas por medida y banda, por tipo de reparación y un cargo por inspección de carcasa rechazada, con tarifa general y tarifas especiales por cliente. El precio SHALL congelarse en la orden cuando la llanta se aprueba en la inspección final.

#### Scenario: Tarifa especial
- **WHEN** «Transportes del Norte» tiene tarifa especial para 295/80 R22.5 con banda BDR-HT
- **THEN** sus llantas de esa medida y banda se liquidan con la tarifa especial y las demás con la general

#### Scenario: Cambio de tarifa con llantas en proceso
- **WHEN** la tarifa general sube después de que una llanta pasó la inspección final
- **THEN** esa llanta conserva el precio anterior y las aprobadas después usan el nuevo

### Requirement: Liquidación por entrega
Cada entrega a un cliente SHALL generar una liquidación con una línea por llanta (reencauche, reparaciones, cargos) y las rechazadas con su cargo de inspección si aplica. La liquidación aprobada SHALL facturarse por la facturación del ERP de la empresa.

#### Scenario: Liquidar una entrega
- **WHEN** se aprueba la liquidación de 31 llantas reencauchadas y 4 rechazadas
- **THEN** se genera la factura en el ERP con 31 líneas de reencauche, sus reparaciones y 4 cargos de inspección

### Requirement: Venta de llantas de la planta
Las llantas reencauchadas sobre carcasas de la planta SHALL venderse como producto, por la orden de salida del WMS o por el punto de venta, y no por liquidación de servicio.

#### Scenario: Venta en punto de venta
- **WHEN** se vende en el POS una reencauchada de la planta escaneando su código
- **THEN** la llanta sale del inventario de producto terminado y su hoja de vida registra la venta

### Requirement: Reclamos de garantía
Un reclamo SHALL registrarse sobre una llanta entregada, por su código, con la falla (desprendimiento, separación, desgaste irregular, falla prematura, daño de carcasa), el kilometraje, las condiciones de operación y fotos. SHALL seguir el ciclo recibido → en análisis → dictaminado (procede, no procede, procede parcial) → cerrado, con la causa probable y la compensación.

#### Scenario: Garantía procedente
- **WHEN** se dictamina procedente un desprendimiento de banda a 18.000 km por defecto de unión
- **THEN** el reclamo queda con causa «defecto de unión», la compensación registrada, y la hoja de vida de la llanta muestra el reclamo junto al ciclo y al lote de cojín usados

#### Scenario: Reclamo de una llanta desconocida
- **WHEN** se intenta registrar un reclamo con un código que la planta no entregó
- **THEN** el reclamo se rechaza indicando que la llanta no tiene entrega registrada

### Requirement: Reencauche desde el CMMS de la misma empresa
Cuando la empresa tiene a la vez CMMS y planta, un lote de reencauche del CMMS enviado a la planta propia SHALL crear la recepción con sus llantas, y el resultado de cada llanta (reencauchada con su banda y profundidad nueva, o rechazada con su motivo) SHALL volver al detalle del lote del CMMS.

#### Scenario: Flota con planta propia
- **WHEN** el CMMS envía un lote de 20 llantas con proveedor «planta propia»
- **THEN** la planta recibe una recepción con esas 20 llantas identificadas por su código del CMMS, y al entregarlas el lote del CMMS queda con el resultado de cada una
