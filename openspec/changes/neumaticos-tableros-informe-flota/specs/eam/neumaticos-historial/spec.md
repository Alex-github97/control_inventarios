# Spec Delta

## Purpose

Que el histórico de cada llanta diga de un vistazo cuánta atención ha recibido: cuántas inspecciones y cuántas rotaciones se le han hecho.

## ADDED Requirements

### Requirement: Conteo de inspecciones y rotaciones
El histórico de una llanta SHALL mostrar cuántas inspecciones y cuántas rotaciones se le han registrado en toda su historia y en la vida actual, con la fecha de la última de cada una.

#### Scenario: Llanta con historia
- **WHEN** se abre el histórico de una llanta con 14 inspecciones y 3 rotaciones, de las cuales 5 inspecciones y 1 rotación son de su vida actual
- **THEN** el encabezado del histórico muestra «14 inspecciones (5 en esta vida)» y «3 rotaciones (1 en esta vida)», con la fecha de la última de cada una

#### Scenario: Llanta nueva sin movimientos
- **WHEN** se abre el histórico de una llanta recién registrada
- **THEN** muestra 0 inspecciones y 0 rotaciones, sin fecha de la última

### Requirement: Qué cuenta como rotación
Las rotaciones SHALL contar los movimientos de rotación (cambio de posición) y los de volteo (cambio de orientación), y el histórico SHALL mostrar cuántos hay de cada uno. Montajes, desmontajes, envíos a reencauche, cambios de zona y bajas MUST NOT contarse como rotaciones.

#### Scenario: Rotaciones y volteos
- **WHEN** una llanta tiene 2 rotaciones de posición y 1 volteo
- **THEN** el histórico muestra «3 rotaciones (2 de posición, 1 volteo)»

#### Scenario: Desmontaje y montaje
- **WHEN** una llanta se desmonta a bodega y luego se monta en otro vehículo
- **THEN** el conteo de rotaciones no cambia

### Requirement: Del conteo al detalle
Al pulsar el conteo de inspecciones o de rotaciones, el histórico SHALL mostrar solo esos registros, en orden cronológico.

#### Scenario: Ver las rotaciones
- **WHEN** se pulsa «3 rotaciones»
- **THEN** el histórico lista las tres rotaciones con fecha, vehículo, posición de origen, posición de destino y técnico
