# Spec Delta

## Purpose

Convierte el audio de una reunión en una transcripción en español, en vivo y final, con marcas de tiempo y, cuando se puede, el hablante de cada tramo, para que sirva de evidencia de lo acordado.

## ADDED Requirements

### Requirement: Transcripción final de la reunión
Cuando una reunión pasa a PROCESANDO, el sistema SHALL producir su transcripción completa sin que el usuario espere en la pantalla. La transcripción SHALL quedar dividida en tramos con su minuto de inicio. Al terminar, la reunión SHALL pasar a la extracción de compromisos.

#### Scenario: Reunión procesada
- **WHEN** termina la grabación de una reunión de 40 minutos
- **THEN** el ejecutivo puede seguir trabajando, y en minutos la reunión muestra la transcripción completa por tramos con su minuto

#### Scenario: Audio largo
- **WHEN** el audio de la reunión supera el tamaño máximo que acepta el servicio de transcripción en una sola petición
- **THEN** el sistema lo transcribe por partes sin cortar frases y entrega una sola transcripción continua, con los minutos referidos al inicio de la reunión

### Requirement: Vocabulario del cliente
La transcripción SHALL usar como pistas de vocabulario el nombre del cliente, de sus contactos y de la oportunidad ligada. El idioma esperado es el español.

#### Scenario: Nombre propio difícil
- **WHEN** en la reunión se menciona al contacto «Yésica Ortíz Bermúdez», registrado en el cliente
- **THEN** la transcripción escribe ese nombre como está registrado en el CRM

### Requirement: Hablante de cada tramo
Si la captura trae tramos de habla por participante, el sistema SHALL asignar cada tramo de la transcripción a ese participante. Si no los trae, el tramo SHALL quedar sin hablante asignado y el ejecutivo SHALL poder asignarlo a mano.

#### Scenario: Reunión virtual con participantes identificados
- **WHEN** el bot entrega los tramos de habla de cada participante
- **THEN** cada tramo de la transcripción muestra el nombre del participante que habló

#### Scenario: Reunión presencial
- **WHEN** la captura es de un solo micrófono, sin tramos por participante
- **THEN** los tramos aparecen como «sin asignar», y el ejecutivo puede asignarle un participante a cada uno

### Requirement: Transcripción en vivo opcional
Durante una grabación presencial, el sistema SHALL poder mostrar al ejecutivo el texto a medida que se habla. La transcripción en vivo es solo de consulta. La transcripción final SHALL hacerse sobre el audio completo y reemplaza a la de vivo.

#### Scenario: Ver el texto mientras se graba
- **WHEN** el ejecutivo activa el texto en vivo durante la grabación
- **THEN** ve aparecer lo que se dice con pocos segundos de retraso

#### Scenario: El vivo falla
- **WHEN** el servicio de texto en vivo no responde
- **THEN** la grabación continúa sin interrupción y solo se oculta el texto en vivo

### Requirement: Fallo de transcripción recuperable
Si la transcripción falla, la reunión SHALL pasar a FALLIDA con el motivo visible y conservar el audio. Un usuario SHALL poder reintentarla sin volver a grabar.

#### Scenario: Servicio caído
- **WHEN** el servicio de transcripción no responde después de los reintentos automáticos
- **THEN** la reunión queda FALLIDA con el motivo, el audio se conserva, y aparece la opción «Reintentar»

#### Scenario: Reintento exitoso
- **WHEN** el ejecutivo pulsa «Reintentar» en una reunión fallida con el servicio ya disponible
- **THEN** la reunión vuelve a PROCESANDO y termina con su transcripción

### Requirement: Corrección de la transcripción
El ejecutivo SHALL poder corregir el texto de un tramo. El sistema SHALL guardar la corrección y conservar el texto original, para saber qué se cambió.

#### Scenario: Corregir un tramo
- **WHEN** el ejecutivo corrige una palabra mal transcrita en un tramo
- **THEN** el tramo muestra el texto corregido y el original queda disponible en su historial
