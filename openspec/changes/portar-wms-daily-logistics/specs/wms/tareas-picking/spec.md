# Spec Delta

## Purpose

Organiza el trabajo del almacén en tareas dirigidas a cada operario y define cómo se alimentan y se recogen los frentes de picking según la estrategia de cada bodega.

## ADDED Requirements

### Requirement: Tareas dirigidas
El WMS SHALL generar tareas (ubicar, reabastecer, alistar) a partir de la operación y asignarlas a los operarios disponibles. Un proceso de fondo SHALL avanzar el ciclo de tareas sin que nadie lo dispare. Cada operario SHALL ver solo sus tareas y marcarlas como iniciadas o terminadas.

#### Scenario: Recepción ubicada
- **WHEN** se confirma una recepción
- **THEN** se crean tareas de ubicación para la mercancía recibida y quedan asignadas a operarios

### Requirement: Frentes de picking con capacidad
Cada frente de picking SHALL tener producto, tipo de posición y capacidad en m³ y kg. El WMS SHALL avisar cuando un frente quede por debajo de su mínimo o cuando lo asignado supere la capacidad, y SHALL permitir cambiar el producto de un frente.

#### Scenario: Frente bajo el mínimo
- **WHEN** el stock de un frente cae por debajo de su mínimo
- **THEN** el frente aparece con aviso y se propone un reabastecimiento

### Requirement: Reabastecimiento con aprobación
Un reabastecimiento propuesto MUST quedar pendiente hasta que un supervisor lo apruebe; solo al aprobarse SHALL generar tareas y mover inventario.

#### Scenario: Propuesta no aprobada
- **WHEN** existe un reabastecimiento propuesto sin aprobar
- **THEN** no se mueve inventario ni se crean tareas por él

### Requirement: Estrategia de picking por bodega
Cada bodega SHALL tener una estrategia de picking configurable (SINGLE, WAVE, BATCH, ZONE o CLUSTER), y la generación de picking SHALL usarla por defecto. Las estrategias aún no implementadas MUST rechazarse al generar picking con un mensaje que lo diga.

#### Scenario: Bodega en WAVE
- **WHEN** se genera picking en una bodega configurada en WAVE
- **THEN** las órdenes se agrupan en ola sin que el usuario elija la estrategia

#### Scenario: Estrategia no implementada
- **WHEN** se genera picking en una bodega configurada en CLUSTER
- **THEN** se responde que esa estrategia está configurada pero aún no disponible

### Requirement: Una asignación de picking por orden
Una orden MUST NOT tener más de una asignación de picking activa, MUST NOT generar tareas vacías, y su estado SHALL avanzar al alistarse.

#### Scenario: Generar picking dos veces
- **WHEN** se intenta generar picking para una orden que ya tiene uno activo
- **THEN** no se crea una segunda asignación
