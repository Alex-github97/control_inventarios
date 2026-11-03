# Spec Delta

## Purpose

Que el usuario de una empresa con CMMS consiga la app desde el portal sin pasar por una tienda, y que siempre tenga una versión compatible con el servidor.

## ADDED Requirements

### Requirement: Botón de descarga en el portal
El portal SHALL mostrar un acceso «App móvil» al usuario autenticado de una empresa con el CMMS contratado. El acceso SHALL ofrecer la descarga del APK de la última versión, un código QR para abrir la descarga desde el teléfono y las instrucciones para permitir la instalación. La descarga MUST exigir una sesión válida del portal.

#### Scenario: Usuario con CMMS
- **WHEN** un técnico de una empresa con CMMS abre el acceso «App móvil» en el portal
- **THEN** ve la versión vigente, el botón de descarga, el QR y los pasos de instalación

#### Scenario: Empresa sin CMMS
- **WHEN** el usuario pertenece a una empresa sin el CMMS contratado
- **THEN** el portal no muestra el acceso a la app

#### Scenario: Enlace sin sesión
- **WHEN** alguien abre el enlace de descarga sin haber iniciado sesión en el portal
- **THEN** el servidor no entrega el APK

### Requirement: APK firmado y versionado
Cada versión de la app SHALL publicarse como un APK firmado siempre con la misma llave, con número de versión, fecha y notas de la versión. Una versión nueva SHALL instalarse sobre la anterior sin perder la sesión ni los registros pendientes.

#### Scenario: Instalar la nueva versión
- **WHEN** el técnico instala la versión nueva encima de la que tenía, con 3 registros sin enviar
- **THEN** conserva su sesión y los 3 registros siguen en la cola

### Requirement: Actualizaciones sin reinstalar
Los cambios de pantallas y lógica que no requieren capacidades nativas nuevas SHALL llegar a la app por actualización en el aire, descargada en segundo plano y aplicada al siguiente arranque.

#### Scenario: Corrección de una pantalla
- **WHEN** se publica una corrección en la pantalla de checklists
- **THEN** los teléfonos la reciben al abrir la app, sin descargar un APK nuevo

### Requirement: Versión mínima compatible
El servidor SHALL declarar la versión mínima de la app que acepta. Una app por debajo de esa versión SHALL pedir la actualización antes de enviar datos, sin borrar lo pendiente, y SHALL llevar al usuario a la descarga.

#### Scenario: Cambio incompatible en el servidor
- **WHEN** el servidor sube la versión mínima y un teléfono abre la app con una versión anterior
- **THEN** la app retiene los envíos, muestra que hay que actualizar y abre la descarga
