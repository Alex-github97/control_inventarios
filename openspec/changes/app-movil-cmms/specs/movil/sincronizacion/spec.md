# Spec Delta

## Purpose

Que el usuario trabaje igual con o sin señal: lo que necesita está en el teléfono y lo que registra llega al servidor una sola vez, con las mismas reglas que si lo hubiera hecho en el portal.

## ADDED Requirements

### Requirement: Datos del usuario en el teléfono
La app SHALL guardar en el teléfono lo que el usuario necesita para trabajar sin señal: sus órdenes de trabajo abiertas, los activos de su alcance con su esquema de llantas, las plantillas de checklist, los catálogos (repuestos, daños, motivos, causas) y sus pendientes de aprobación. La app MUST NOT descargar datos de otros usuarios o activos fuera de su alcance más allá de lo que el portal le muestra.

#### Scenario: Abrir una orden sin señal
- **WHEN** el técnico abre sin señal una orden que se le asignó ayer
- **THEN** ve la orden completa con su activo, tareas, repuestos planeados e historial reciente

### Requirement: Descarga por cambios
La app SHALL actualizar sus datos locales pidiendo al servidor solo lo que cambió desde su última sincronización, incluidas las bajas. Una sincronización SHALL poder interrumpirse y retomarse sin descargar todo de nuevo.

#### Scenario: Nueva orden asignada
- **WHEN** el supervisor asigna una orden al técnico y el teléfono tiene señal
- **THEN** la orden aparece en el teléfono en la siguiente sincronización, sin descargar de nuevo las demás

#### Scenario: Activo dado de baja
- **WHEN** un activo se da de baja en el portal
- **THEN** desaparece de la app en la siguiente sincronización

### Requirement: Cola de envíos sin duplicados
Todo lo que el usuario registra SHALL guardarse primero en el teléfono y enviarse en orden al servidor. Cada envío SHALL llevar una clave única; el servidor MUST aplicar una sola vez un envío repetido y devolver el mismo resultado.

#### Scenario: Se corta la señal al enviar
- **WHEN** el cierre de una orden llega al servidor pero la respuesta no llega al teléfono y la app lo reintenta
- **THEN** la orden queda cerrada una sola vez y el repuesto se descuenta una sola vez

### Requirement: Las reglas del servidor mandan
Un envío pendiente SHALL validarse en el servidor con las mismas reglas que el portal. Si el servidor lo rechaza (por ejemplo, la orden ya la cerró otra persona o la profundidad de una llanta sube sin justificación), la app SHALL mostrar el motivo, conservar lo que el usuario registró y permitirle corregirlo o descartarlo. La app MUST NOT descartar en silencio un registro del usuario.

#### Scenario: Orden cerrada por otro
- **WHEN** el técnico cierra sin señal una orden que el supervisor ya cerró desde el portal
- **THEN** al sincronizar la app le avisa que la orden ya estaba cerrada y le deja copiar sus notas y fotos a una nueva orden o descartarlas

### Requirement: Estado de sincronización visible
La app SHALL mostrar siempre si hay señal, cuántos registros esperan envío, la hora de la última sincronización y los registros rechazados que piden atención. El usuario SHALL poder forzar una sincronización.

#### Scenario: Pendientes antes de cerrar sesión
- **WHEN** el usuario intenta cerrar sesión con registros sin enviar
- **THEN** la app le avisa cuántos son y no los borra sin su confirmación explícita

### Requirement: Fotos y firmas pesadas
Las fotos y firmas SHALL comprimirse en el teléfono y enviarse después de los datos a los que pertenecen, reintentando hasta lograrlo, sin bloquear el resto de la cola.

#### Scenario: Diez fotos con señal débil
- **WHEN** el técnico adjunta diez fotos a una orden con señal débil
- **THEN** la orden se sincroniza primero y las fotos llegan después, una a una, sin perderse
