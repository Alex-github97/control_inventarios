# Spec Delta

## Purpose

Que un cambio en el portal o en el servidor llegue a la app con poco trabajo y que nunca la rompa en silencio.

## ADDED Requirements

### Requirement: Una sola fuente de los tipos de la API
Los tipos de datos que la app usa para hablar con el servidor SHALL generarse automáticamente de la especificación de la API del servidor, y no escribirse a mano. La app y el portal SHALL compartir el mismo cliente de la API, los textos traducidos, los colores de marca y las reglas de presentación comunes (vida de una llanta, estados de una orden, rangos de profundidad).

#### Scenario: Campo nuevo en una orden de trabajo
- **WHEN** el servidor agrega un campo a la orden de trabajo
- **THEN** el campo aparece en los tipos de la app al regenerarlos, sin escribirlo a mano

### Requirement: El despliegue detecta lo que rompe la app
El flujo de despliegue SHALL regenerar los tipos desde la API y compilar la app. Si un cambio del servidor quita o cambia algo que la app usa, el despliegue MUST fallar y señalar el archivo de la app afectado.

#### Scenario: Se renombra un campo que usa la app
- **WHEN** un cambio del servidor renombra un campo que la pantalla de órdenes de la app lee
- **THEN** la verificación del despliegue falla y dice qué pantalla de la app lo usa

### Requirement: Cambios compatibles hacia atrás
Mientras haya versiones de la app en uso, los endpoints que la app consume SHALL mantener los campos y comportamientos que esas versiones usan. Un cambio incompatible SHALL publicarse junto con una versión nueva de la app y la subida de la versión mínima.

#### Scenario: Retirar un campo
- **WHEN** hay que retirar un campo que leía la versión 1.2 de la app
- **THEN** el campo se mantiene hasta que la versión mínima aceptada sea posterior a la 1.2

### Requirement: Guía de adaptación
El repositorio SHALL incluir una guía corta que diga, para cada módulo del CMMS, qué pantallas de la app corresponden a qué pantallas del portal y qué hacer cuando cambia una de ellas.

#### Scenario: Se agrega un filtro en el portal
- **WHEN** se agrega un filtro a la lista de órdenes del portal
- **THEN** la guía indica la pantalla de la app que debe recibirlo y el componente común que lo implementa
