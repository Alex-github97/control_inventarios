# Spec Delta

## Purpose

Registra las reuniones comerciales en el CRM y obtiene su audio, presencial o virtual, con consentimiento y retención controlados, sin atar el CRM a un proveedor de captura.

## ADDED Requirements

### Requirement: Reunión ligada al cliente
El sistema SHALL permitir crear una reunión ligada a un cliente del CRM. También podrá ligarse a una oportunidad y a contactos del cliente como participantes. Cada reunión SHALL tener origen (PRESENCIAL o VIRTUAL), fecha y un estado visible. Los estados son PROGRAMADA, EN_CURSO, PROCESANDO, POR_REVISAR, CERRADA y FALLIDA.

#### Scenario: Crear una reunión presencial
- **WHEN** un usuario con permiso `crm` crea una reunión presencial para un cliente y elige dos de sus contactos
- **THEN** la reunión queda en estado PROGRAMADA, ligada al cliente y con esos dos contactos como participantes

#### Scenario: Cliente de otra empresa
- **WHEN** se intenta crear una reunión con un cliente que no pertenece a la empresa del usuario
- **THEN** el sistema la rechaza y no crea nada

#### Scenario: Sin el módulo contratado
- **WHEN** un usuario de una empresa que no tiene contratado el módulo `crm` intenta crear una reunión
- **THEN** el sistema la rechaza

### Requirement: Constancia de consentimiento antes de grabar
El sistema MUST NOT empezar a grabar ni enviar un bot sin registrar antes la constancia del aviso de grabación. La constancia guarda quién la confirmó, cuándo y el texto del aviso mostrado.

#### Scenario: Grabar sin confirmar el aviso
- **WHEN** el ejecutivo intenta iniciar la grabación sin haber confirmado que avisó a los asistentes
- **THEN** la grabación no comienza y el sistema le pide la confirmación

#### Scenario: Constancia guardada
- **WHEN** el ejecutivo confirma el aviso e inicia la grabación
- **THEN** la reunión guarda el usuario, la fecha y hora y el texto del aviso, y pasa a EN_CURSO

### Requirement: Grabación presencial desde la aplicación
El sistema SHALL permitir grabar una reunión presencial desde el navegador del celular o del computador, con el micrófono del dispositivo. Al detener, el audio completo SHALL quedar ligado a la reunión. Un corte de red durante la grabación MUST NOT hacer perder lo ya grabado.

#### Scenario: Grabación completa
- **WHEN** el ejecutivo graba 40 minutos y detiene la grabación
- **THEN** el audio de los 40 minutos queda ligado a la reunión y esta pasa a PROCESANDO

#### Scenario: Corte de red a mitad de la reunión
- **WHEN** la conexión se pierde durante la grabación y vuelve antes de detenerla
- **THEN** el audio grabado durante el corte se envía al volver la conexión, y la grabación final no tiene huecos

#### Scenario: Sin permiso de micrófono
- **WHEN** el navegador niega el acceso al micrófono
- **THEN** el sistema informa que no puede grabar y la reunión sigue en PROGRAMADA

### Requirement: Carga de una grabación existente
El sistema SHALL aceptar que se suba un archivo de audio o video de una reunión ya grabada, en los formatos mp3, mp4, m4a, wav o webm. Ese archivo se procesa igual que una grabación hecha en la aplicación.

#### Scenario: Subir una grabación
- **WHEN** el ejecutivo sube un archivo m4a de 70 minutos a una reunión programada
- **THEN** la reunión pasa a PROCESANDO con ese audio

#### Scenario: Formato no admitido
- **WHEN** se sube un archivo que no es de audio ni video
- **THEN** el sistema lo rechaza indicando los formatos admitidos

### Requirement: Bot en reuniones virtuales
Para una reunión virtual, el sistema SHALL enviar un bot que entra con el enlace de la reunión y graba. El bot SHALL presentarse con un nombre que anuncie la grabación y SHALL salir cuando la reunión termine. Las plataformas admitidas son Google Meet y Microsoft Teams, y Zoom cuando haya autorización de Zoom.

#### Scenario: El bot entra y graba
- **WHEN** el ejecutivo pide el bot para una reunión de Google Meet y la persona anfitriona lo admite
- **THEN** el bot entra con el nombre «Asistente TittanWare — grabando», la reunión pasa a EN_CURSO, y al terminar la reunión pasa a PROCESANDO con el audio

#### Scenario: Nadie admite al bot
- **WHEN** el bot espera en la sala de espera más del tiempo límite sin ser admitido
- **THEN** el bot se retira y la reunión pasa a FALLIDA con el motivo «no fue admitido»

#### Scenario: Plataforma no admitida
- **WHEN** el enlace de la reunión no es de una plataforma admitida
- **THEN** el sistema rechaza la solicitud del bot e indica las plataformas admitidas

### Requirement: Zoom solo con autorización vigente
El sistema MUST NOT intentar que el bot entre a una reunión de Zoom de otra cuenta sin la autorización que Zoom exige. Esa autorización es la de un usuario de la plataforma que conectó su cuenta de Zoom y está presente en la reunión.

#### Scenario: Sin cuenta de Zoom conectada
- **WHEN** se pide el bot para una reunión de Zoom y ningún participante de la plataforma ha conectado su cuenta de Zoom
- **THEN** el sistema no envía el bot y explica que hace falta conectar una cuenta de Zoom

### Requirement: Captura independiente del proveedor
El CRM SHALL recibir de cualquier medio de captura el mismo resultado: el audio, la lista de participantes con su nombre visible y, si existen, los tramos de habla por participante. El comportamiento del CRM MUST NOT depender de qué bot o servicio produjo la captura.

#### Scenario: Cambio de proveedor de captura
- **WHEN** la empresa cambia el medio de captura virtual por otro proveedor
- **THEN** las reuniones capturadas con el nuevo proveedor se transcriben, extraen y revisan igual que antes, sin cambios en las pantallas del CRM

### Requirement: Retención del audio
El sistema SHALL borrar el audio de cada reunión al vencer el plazo de retención de la empresa, que por defecto es de 90 días. La transcripción y los compromisos SHALL conservarse. La reunión SHALL indicar que su audio fue borrado y en qué fecha.

#### Scenario: Vence el plazo
- **WHEN** pasan 90 días desde una reunión de una empresa con el plazo por defecto
- **THEN** el audio se borra, la transcripción y los compromisos siguen disponibles, y la reunión muestra «audio borrado» con la fecha

#### Scenario: Borrado a solicitud
- **WHEN** un administrador de la empresa borra el audio de una reunión antes del plazo
- **THEN** el audio se borra de inmediato y queda registro de quién lo borró
