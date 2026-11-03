# Spec Delta

## Purpose

Que el inspector recorra un vehículo llanta por llanta desde el teléfono, sobre un dibujo de su esquema, y que cada medición quede validada y con sus novedades al instante.

## ADDED Requirements

### Requirement: Inspección sobre el esquema del vehículo
Al elegir un vehículo (por lista, búsqueda o QR), la app SHALL mostrar su esquema de ejes con cada posición y la llanta montada, coloreada por el rango de profundidad configurado (crítica, moderada, buen estado). El inspector SHALL poder recorrer las posiciones en orden y registrar en cada una la profundidad por surco, la presión, el estado visual, observaciones y fotos.

#### Scenario: Recorrer un tractocamión
- **WHEN** el inspector abre un tractocamión de 10 posiciones más repuesto
- **THEN** ve el dibujo del vehículo con cada llanta en su color de estado y avanza de una posición a la siguiente con un toque

### Requirement: Validaciones de la inspección
La app SHALL aplicar las reglas de llantas del portal: la profundidad no sube respecto de la inspección anterior, comparada surco por surco y con la tolerancia configurada, salvo reencauche o reesculturado; el odómetro no retrocede. Un valor fuera de regla SHALL explicarse en el campo antes de guardar.

#### Scenario: Profundidad que sube
- **WHEN** el inspector registra en un surco 2 mm más que la inspección anterior, sin reencauche de por medio
- **THEN** la app marca el campo, muestra el valor anterior y no guarda hasta corregirlo

### Requirement: Novedades y sugerencias en el momento
Al terminar cada posición, la app SHALL mostrar las novedades (cerca del mínimo, bajo el mínimo, presión fuera de rango, desgaste irregular, desalineación) y las sugerencias de las reglas configuradas, con los mismos umbrales del portal.

#### Scenario: Desgaste irregular
- **WHEN** la diferencia entre hombros de una llanta supera el umbral configurado
- **THEN** la app muestra la novedad «desgaste irregular» y la sugerencia que defina la regla, por ejemplo programar alineación

### Requirement: Movimientos de llantas
El inspector o técnico autorizado SHALL poder registrar montaje, desmontaje, rotación y envío a reencauche de una llanta, con las validaciones del portal y el odómetro del vehículo.

#### Scenario: Rotar dos llantas
- **WHEN** el técnico intercambia las llantas de las posiciones 3 y 4 con el odómetro actual
- **THEN** el esquema del vehículo queda actualizado y cada llanta conserva su kilometraje recorrido
