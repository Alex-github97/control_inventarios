# Spec Delta

## Purpose

Saca de la transcripción de una reunión los compromisos, acuerdos y riesgos, con la evidencia de cada uno. Los convierte en actividades y seguimiento del CRM solo después de que una persona los revisa.

## ADDED Requirements

### Requirement: Propuesta de resultados de la reunión
Al terminar la transcripción, el sistema SHALL proponer un resumen, los acuerdos, los riesgos y los compromisos de la reunión, y la reunión SHALL pasar a POR_REVISAR. Cada compromiso propuesto SHALL traer qué hay que hacer, el responsable y la fecha límite. Si no se dijo responsable o fecha, el compromiso SHALL marcarlos como no definidos.

#### Scenario: Reunión con compromisos
- **WHEN** en la transcripción el contacto del cliente dice «yo les envío el inventario de rutas el viernes»
- **THEN** se propone un compromiso «Enviar el inventario de rutas» con ese contacto como responsable y la fecha del viernes siguiente a la reunión

#### Scenario: Compromiso sin fecha
- **WHEN** alguien se compromete a algo sin decir cuándo
- **THEN** el compromiso se propone con la fecha marcada como «no definida»

#### Scenario: Reunión sin compromisos
- **WHEN** en la reunión nadie se compromete a nada
- **THEN** la propuesta trae el resumen y una lista de compromisos vacía, sin inventar ninguno

### Requirement: Evidencia de cada compromiso
Cada compromiso, acuerdo o riesgo propuesto MUST traer la cita textual de la transcripción que lo respalda y el minuto donde está. El sistema MUST descartar cualquier propuesta cuya cita no aparezca en la transcripción.

#### Scenario: Ir a la evidencia
- **WHEN** el ejecutivo abre un compromiso propuesto
- **THEN** ve la cita y el minuto, y desde ahí salta a ese tramo de la transcripción

#### Scenario: Cita inexistente
- **WHEN** la extracción devuelve un compromiso cuya cita no se encuentra en la transcripción
- **THEN** ese compromiso no se muestra en la propuesta

### Requirement: Responsable emparejado con el CRM
El sistema SHALL emparejar al responsable de cada compromiso con un participante de la reunión: un contacto del cliente o un usuario de la empresa. Así cada compromiso queda marcado como nuestro o del cliente. Si el emparejamiento no es claro, el responsable SHALL quedar por asignar.

#### Scenario: Compromiso nuestro
- **WHEN** el ejecutivo de la empresa dice «yo les mando la cotización mañana»
- **THEN** el compromiso queda como nuestro, con ese ejecutivo de responsable

#### Scenario: Responsable ambiguo
- **WHEN** la transcripción dice «lo revisamos y les contamos» sin un responsable claro
- **THEN** el compromiso queda con el responsable «por asignar»

### Requirement: Nada se crea sin revisión
El sistema MUST NOT crear actividades ni seguimientos a partir de una propuesta sin la aprobación de un usuario con permiso `crm`. Antes de aprobar cada compromiso, el usuario SHALL poder editarlo o descartarlo.

#### Scenario: Aprobar con corrección
- **WHEN** el ejecutivo cambia la fecha de un compromiso propuesto y lo aprueba
- **THEN** el compromiso queda aprobado con la fecha corregida

#### Scenario: Descartar
- **WHEN** el ejecutivo descarta un compromiso propuesto
- **THEN** no se crea nada a partir de él, y queda registrado como descartado

#### Scenario: Propuesta sin revisar
- **WHEN** nadie revisa la propuesta de una reunión
- **THEN** no existe ninguna actividad ni seguimiento creado por esa reunión

### Requirement: Compromisos aprobados en el CRM
Al aprobar un compromiso nuestro, el sistema SHALL crear una actividad del CRM con responsable, vencimiento y enlace a la reunión. Al aprobar un compromiso del cliente, SHALL quedar en seguimiento ligado al cliente. Cerrar la revisión SHALL registrar la reunión como interacción de tipo REUNION, con su resumen.

#### Scenario: Actividad creada
- **WHEN** el ejecutivo aprueba «Enviar la cotización» con vencimiento el 30 de octubre
- **THEN** aparece una actividad del CRM para el cliente con ese asunto y ese vencimiento, que enlaza a la reunión de donde salió

#### Scenario: Compromiso del cliente vencido
- **WHEN** vence la fecha de un compromiso del cliente que nadie marcó como cumplido
- **THEN** el compromiso aparece como vencido en el seguimiento del cliente

#### Scenario: Cierre de la revisión
- **WHEN** el ejecutivo termina de revisar todos los compromisos y cierra la revisión
- **THEN** la reunión pasa a CERRADA y el cliente tiene una interacción REUNION con el resumen y el enlace a la reunión

### Requirement: Extracción repetible ante fallo
Si la extracción falla, la reunión SHALL conservar la transcripción y permitir reintentar la extracción sin volver a transcribir.

#### Scenario: Reintentar la extracción
- **WHEN** la extracción falló y el ejecutivo pulsa «Reintentar extracción»
- **THEN** se genera la propuesta a partir de la transcripción ya guardada
