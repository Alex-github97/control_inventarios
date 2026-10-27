# Spec Delta

## Purpose

Permite que quien todavía no es cliente pida contacto desde la página pública, guarda esas solicitudes aparte de los clientes registrados y las pone en la cola de soporte de la consola para que alguien las atienda.

## ADDED Requirements

### Requirement: Formulario de contacto en la landing
La sección de contacto de la landing SHALL ofrecer un formulario con nombre, correo, empresa, teléfono y mensaje. Nombre, correo y mensaje son obligatorios. El formulario SHALL confirmar al visitante cuando su solicitud quedó registrada y mostrarle un error comprensible si no.

#### Scenario: Envío correcto
- **WHEN** un visitante completa nombre, correo válido y mensaje, y envía el formulario
- **THEN** la solicitud queda registrada como prospecto en estado Nuevo
- **AND** el visitante ve una confirmación sin salir de la página

#### Scenario: Campos faltantes
- **WHEN** el visitante envía el formulario sin correo válido o sin mensaje
- **THEN** la solicitud no se registra y el visitante ve qué falta

#### Scenario: Cliente con sesión
- **WHEN** quien escribe ya es cliente y tiene sesión en la aplicación
- **THEN** la landing le ofrece entrar al portal, donde abre tickets de su empresa por el flujo de soporte existente

### Requirement: Registro público sin sesión
El sistema SHALL aceptar solicitudes de contacto sin autenticación y SHALL guardarlas en un registro de prospectos que no se relaciona con los clientes registrados ni con los tickets de soporte.

#### Scenario: Prospecto aislado de clientes
- **WHEN** se registra una solicitud de contacto
- **THEN** no se crea ni modifica ningún cliente de plataforma ni ningún ticket de soporte

### Requirement: Protección contra envíos abusivos
El endpoint público SHALL rechazar envíos automatizados o abusivos: los que llenan el campo trampa, los que superan el límite de envíos por IP en una ventana de tiempo, y los que exceden la longitud máxima de cada campo.

#### Scenario: Campo trampa lleno
- **WHEN** un envío trae el campo oculto relleno
- **THEN** el sistema responde como si hubiera aceptado, pero no guarda nada

#### Scenario: Demasiados envíos desde una IP
- **WHEN** una misma IP supera el límite de envíos en la ventana de tiempo
- **THEN** el sistema responde con estado 429 y no guarda la solicitud

#### Scenario: Texto demasiado largo
- **WHEN** un campo supera su longitud máxima
- **THEN** el sistema rechaza el envío con estado 400

### Requirement: Vista de prospectos en la consola de soporte
La consola de administración SHALL mostrar los prospectos en una vista "Prospectos" dentro de soporte, ordenados del más reciente al más antiguo y filtrables por estado. Verla SHALL requerir el permiso `soporte.ver`.

#### Scenario: Miembro con permiso
- **WHEN** un miembro con `soporte.ver` abre la vista Prospectos
- **THEN** ve nombre, correo, empresa, teléfono, mensaje, fecha y estado de cada solicitud

#### Scenario: Sin permiso
- **WHEN** alguien sin `soporte.ver` pide la lista de prospectos
- **THEN** el sistema responde con estado 403

### Requirement: Seguimiento del estado de un prospecto
Un miembro con el permiso `soporte.atender` SHALL poder cambiar el estado de un prospecto entre Nuevo, Contactado y Descartado. El sistema SHALL registrar quién hizo el cambio y cuándo.

#### Scenario: Marcar como contactado
- **WHEN** un miembro con `soporte.atender` marca un prospecto como Contactado
- **THEN** el prospecto queda en ese estado con el usuario y la fecha del cambio

#### Scenario: Estado inválido o sin permiso
- **WHEN** se pide un estado fuera de Nuevo, Contactado o Descartado, o quien lo pide no tiene `soporte.atender`
- **THEN** el sistema rechaza el cambio (400 o 403) y el prospecto no cambia
