# Spec Delta

## Purpose

Que cada punto de inspección de la planta deje una decisión explícita y justificada sobre la carcasa, y que ninguna llanta rechazada o retenida vuelva al flujo normal.

## ADDED Requirements

### Requirement: Decisión en cada punto de inspección
Las etapas de inspección inicial, posterior al raspado, posterior a vulcanización e inspección final SHALL terminar con una decisión: aprobada, condicional o rechazada. La inspección final SHALL admitir además retenida y corrección autorizada.

#### Scenario: Inspección inicial aprobada
- **WHEN** el inspector termina la inspección inicial sin defectos y elige «aprobada»
- **THEN** la carcasa pasa a la etapa siguiente de su ruta

#### Scenario: Rechazo después del raspado
- **WHEN** una carcasa aprobada en la inspección inicial muestra cables expuestos tras el raspado y el inspector la rechaza
- **THEN** la orden se cierra como rechazada en «inspección posterior al raspado», con su motivo, y la carcasa pasa a disposición

### Requirement: Defectos por zona y motivos de rechazo
Toda inspección SHALL poder registrar defectos de un catálogo organizado por zona (banda, hombros, costados, talones, interior) con su ubicación y tamaño. Un rechazo MUST tener al menos un motivo del catálogo de motivos de rechazo. Los catálogos SHALL sembrarse con los defectos y motivos usuales y SHALL ser ampliables por la empresa.

#### Scenario: Rechazo sin motivo
- **WHEN** el inspector elige «rechazada» sin marcar motivo
- **THEN** el sistema no guarda la decisión hasta que se elija al menos un motivo

### Requirement: Inspecciones especiales
Una inspección SHALL poder registrar el resultado de pruebas especiales (detector eléctrico, shearografía, rayos X, prueba de inflado, alta presión) con el equipo usado, el resultado y un archivo adjunto opcional.

#### Scenario: Shearografía con separación
- **WHEN** la shearografía detecta una separación en el cinturón y se adjunta la imagen
- **THEN** la imagen queda en la historia de la carcasa junto con el defecto «separación de cinturones»

### Requirement: Dictamen de condicionales
Una carcasa condicional SHALL quedar detenida en una cola de evaluación técnica hasta que un usuario con rol técnico dicte aprobar o rechazar, con su justificación.

#### Scenario: Dictamen
- **WHEN** el técnico revisa una carcasa condicional por un corte en el hombro y la aprueba con reparación
- **THEN** la carcasa sale de la cola, sigue su ruta y el dictamen queda firmado con su usuario y fecha

#### Scenario: Operario intenta avanzar una condicional
- **WHEN** un operario escanea una carcasa condicional en la siguiente estación
- **THEN** la estación rechaza el registro e indica que espera dictamen técnico

### Requirement: Retención
Una carcasa SHALL poder retenerse en cualquier etapa, por una persona o por el sistema (por ejemplo, por un ciclo de vulcanización con desviación). Una carcasa retenida MUST NOT avanzar ni despacharse hasta que se libere con justificación.

#### Scenario: Liberar una retención
- **WHEN** el jefe de calidad libera una carcasa retenida indicando que la desviación del ciclo estuvo dentro de la tolerancia del fabricante
- **THEN** la carcasa vuelve a su cola y la retención queda cerrada con su justificación

### Requirement: Rechazo definitivo no vuelve al flujo
Una carcasa rechazada MUST NOT volver a ninguna etapa de producción ni al despacho de producto terminado. Solo SHALL poder pasar a disposición.

#### Scenario: Intentar reabrir una rechazada
- **WHEN** alguien intenta abrir una nueva orden de reencauche sobre una carcasa rechazada en esta visita
- **THEN** el sistema lo impide y solo ofrece las opciones de disposición

### Requirement: Disposición de rechazos
Cada carcasa rechazada SHALL tener una disposición: devolución al cliente (sale en la siguiente entrega a ese cliente con su motivo) o entrega a un gestor autorizado de residuos (con el número de certificado o acta). Las carcasas de la planta SHALL poder además venderse como carcasa no apta para otros usos, si la empresa lo habilita.

#### Scenario: Entrega a gestor
- **WHEN** se entregan 25 carcasas rechazadas a un gestor autorizado con el acta 2026-114
- **THEN** las 25 quedan con disposición «gestor», el acta registrada y salen del inventario de la planta
