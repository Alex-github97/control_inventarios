# Spec Delta

## Purpose

Generar sugerencias de mantenimiento de llantas a partir de la última inspección, con reglas que la empresa configura y que podrán cargarse de los documentos técnicos que entregue el cliente.

## ADDED Requirements

### Requirement: Reglas configurables
Cada empresa SHALL tener un catálogo de reglas de sugerencia en Configuración de llantas. Cada regla tiene:
- nombre y tipo (rotación, reencauche, retiro, presión, alineación u otro);
- prioridad;
- condición;
- texto de la sugerencia, con datos de la llanta como la posición o la profundidad;
- un indicador de si está activa.

La empresa SHALL poder crear, editar, activar y desactivar reglas sin cambios de programación.

#### Scenario: Crear una regla
- **WHEN** el administrador crea la regla «Reencauchar» de tipo reencauche, con la condición «profundidad mínima ≤ 4 mm y vida menor que R3» y el texto «Programar reencauche de la posición {posicion} ({profundidad} mm)»
- **THEN** las llantas que cumplen la condición en su última inspección reciben esa sugerencia con su posición y su profundidad

### Requirement: Condiciones sobre datos de la inspección
Una condición SHALL combinar con «y» comparaciones sobre:
- profundidad mínima, promedio y diferencia entre hombros;
- presión frente a la recomendada;
- diferencia de profundidad con su par dual o con las demás llantas del eje;
- vida y número de reencauches;
- tipo de uso de la posición;
- estado visual;
- km desde la última rotación.

#### Scenario: Regla sobre el par dual
- **WHEN** una regla pide «diferencia con el par dual > 3 mm»
- **THEN** se cumple solo para las llantas duales cuyo par difiere más de 3 mm en la última inspección

### Requirement: Reglas iniciales
Una empresa SHALL arrancar con reglas sembradas equivalentes a las alertas actuales: profundidad bajo el mínimo (retiro o reencauche), presión fuera de rango (ajustar presión) y desalineación entre duales (revisar alineación o rotar). Las reglas sembradas SHALL poder editarse y desactivarse como cualquier otra.

#### Scenario: Empresa nueva
- **WHEN** una empresa abre por primera vez las reglas de sugerencia
- **THEN** encuentra las tres reglas iniciales activas

### Requirement: Dónde se ven las sugerencias
Las sugerencias SHALL verse en el informe de flota y en la vista de cada vehículo en la pestaña de llantas por vehículo, ordenadas por prioridad. Una regla desactivada MUST NOT generar sugerencias.

#### Scenario: Desactivar una regla
- **WHEN** el administrador desactiva la regla de presión
- **THEN** ni la vista del vehículo ni los informes generados después muestran sugerencias de presión

### Requirement: Sugerencias trazables a su regla
Cada sugerencia SHALL indicar qué regla la generó y con qué valores de la inspección se cumplió la condición.

#### Scenario: Por qué se sugirió
- **WHEN** el usuario pasa el cursor sobre una sugerencia en la vista del vehículo
- **THEN** ve el nombre de la regla y los valores que la dispararon, por ejemplo «profundidad mínima 3,2 mm ≤ 4 mm»
