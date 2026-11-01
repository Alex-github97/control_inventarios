# Spec Delta

## Purpose

Responder en una sola consulta todo lo que le pasó a una llanta: de dónde vino, por dónde pasó, quién la trabajó, con qué materiales y equipos, y adónde fue.

## ADDED Requirements

### Requirement: Hoja de vida de la carcasa
Buscando por código, DOT o serie, el sistema SHALL mostrar la historia completa de la carcasa en orden cronológico: recepciones, cada etapa con operario, equipo, tiempos y mediciones, defectos y decisiones, reparaciones, insumos con su lote, ciclo de vulcanización con sus variables, inspección final, almacenamiento, despacho, entrega y reclamos.

#### Scenario: Consulta de una llanta entregada
- **WHEN** se busca la carcasa RT-004512
- **THEN** se ve que fue raspada por el operario J. Pérez en la raspadora 2, que lleva banda lote L-0915, que se vulcanizó en el ciclo AC1-0331 sin desviaciones, quién la aprobó en la inspección final y en qué viaje se entregó

#### Scenario: Varias visitas
- **WHEN** la carcasa pasó por la planta dos veces
- **THEN** la hoja de vida separa cada visita con su número de reencauche

### Requirement: Trazabilidad hacia atrás por lote de insumo
Dado un lote de un insumo, el sistema SHALL listar todas las carcasas que lo consumieron, con su cliente y su estado actual.

#### Scenario: Lote de cojín defectuoso
- **WHEN** el proveedor avisa que el lote C-0420 de cojín está defectuoso
- **THEN** la consulta devuelve las 87 carcasas que lo usaron, cuáles siguen en planta y a qué clientes se entregaron las demás

### Requirement: Trazabilidad por ciclo y por equipo
Dado un ciclo de vulcanización o un equipo y un periodo, el sistema SHALL listar las carcasas procesadas.

#### Scenario: Autoclave descalibrado
- **WHEN** mantenimiento informa que el sensor de temperatura del autoclave 1 estaba descalibrado entre el 3 y el 10 de octubre
- **THEN** la consulta devuelve las carcasas vulcanizadas en ese autoclave en esas fechas

### Requirement: Ubicación actual
Toda carcasa en planta SHALL tener una etapa y una ubicación actuales visibles: recepción, cola de una estación, en proceso en una estación, retenida, evaluación técnica, producto terminado, rechazos en espera de disposición o despachada.

#### Scenario: El cliente pregunta por sus llantas
- **WHEN** se filtra el tablero por el cliente «Transportes del Norte»
- **THEN** se ven sus 38 carcasas recibidas, cuántas hay en cada etapa y cuáles están listas para entrega

### Requirement: Registro inalterable
Los pasos, decisiones y ciclos cerrados MUST NOT editarse ni borrarse. Una corrección SHALL hacerse con un nuevo registro que anula el anterior, conservando a ambos y a sus autores.

#### Scenario: Corregir una medición
- **WHEN** un supervisor corrige el diámetro de raspado mal digitado de una etapa cerrada
- **THEN** la hoja de vida muestra el valor original anulado y el corregido, con quién y cuándo hizo cada uno
