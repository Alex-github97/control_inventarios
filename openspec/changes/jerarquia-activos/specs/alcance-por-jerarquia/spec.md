# Spec Delta

## Purpose

Limita lo que cada usuario ve y modifica en el CMMS a las ramas de la jerarquía que tiene asignadas, para que un proveedor de flotas pueda dar acceso a cada cliente solo a su flota.

## ADDED Requirements

### Requirement: Asignar nodos a un usuario
El sistema SHALL permitir a un administrador asignar uno o varios nodos a un usuario desde la gestión de usuarios. Un usuario sin nodos asignados MUST ver toda la empresa, como hoy. El rol ADMINISTRADOR MUST ver toda la empresa aunque tenga nodos asignados.

#### Scenario: Usuario del cliente
- **WHEN** al usuario «abc_jefe» se le asigna «Transportes ABC»
- **THEN** desde su siguiente petición solo ve los activos de «Transportes ABC» y sus subniveles

#### Scenario: Usuario sin nodos
- **WHEN** un usuario no tiene nodos asignados
- **THEN** ve todos los activos de la empresa

### Requirement: Alcance sobre activos y todo lo que cuelga de ellos
Para un usuario restringido, el sistema SHALL mostrar solo los activos de sus ramas, y solo los registros ligados a esos activos: llantas, inspecciones, movimientos, OT, tanqueos, checklists, compartimentos, muestras, documentos, garantías e inspecciones de TittanLite. Los activos sin nodo MUST quedar fuera de su alcance.

#### Scenario: Llantas de otra flota
- **WHEN** un usuario de «Transportes ABC» abre el inventario de llantas
- **THEN** no aparece ninguna llanta montada en un vehículo de «Logística XYZ»

#### Scenario: Acceso directo por identificador
- **WHEN** ese usuario pide por la API la OT 5521, que pertenece a un vehículo de «Logística XYZ»
- **THEN** el sistema responde 404, igual que si la OT no existiera

### Requirement: Indicadores y totales dentro del alcance
Los tableros, totales, promedios, rankings y analítica SHALL calcularse solo con los registros dentro del alcance del usuario.

#### Scenario: Costo por kilómetro
- **WHEN** un usuario restringido abre el tablero del CMMS
- **THEN** el costo por kilómetro, el número de OT y la disponibilidad corresponden solo a su flota

### Requirement: Escrituras dentro del alcance
Un usuario restringido MUST NOT poder crear, modificar ni borrar registros ligados a activos fuera de su alcance, ni asignar un activo a un nodo fuera de sus ramas.

#### Scenario: Tanqueo a un vehículo ajeno
- **WHEN** un usuario de «Transportes ABC» registra un tanqueo para un vehículo de «Logística XYZ»
- **THEN** el sistema responde 404 y no guarda el tanqueo

#### Scenario: Activo nuevo
- **WHEN** ese usuario crea un activo
- **THEN** el sistema exige un nodo dentro de sus ramas

### Requirement: Recursos de la empresa sin activo
Los catálogos (marcas, referencias, repuestos, planes, plantillas de checklist, productos de lubricación), las bodegas y el inventario de repuestos SHALL seguir visibles para los usuarios restringidos según su perfil.

#### Scenario: Catálogo de marcas
- **WHEN** un usuario restringido abre el catálogo de marcas de llanta
- **THEN** ve el catálogo completo de la empresa

### Requirement: La llanta conserva la rama de su último vehículo
Una llanta SHALL pertenecer a la rama del vehículo donde está montada y, una vez desmontada (bodega, reencauche, desecho), MUST conservar la rama del último vehículo donde estuvo. Al crearla se le puede asignar una rama. Una llanta sin rama (nunca montada ni asignada) MUST ser visible para todos los usuarios con permiso de llantas.

#### Scenario: Pila de desecho de un cliente
- **WHEN** se desecha una llanta que estuvo montada en un vehículo de «Transportes ABC»
- **THEN** aparece en la pila de desecho de «Transportes ABC» y no en la de «Logística XYZ»

#### Scenario: Llanta nueva sin rama
- **WHEN** se registra una llanta nueva en bodega sin rama
- **THEN** todos los usuarios con permiso de llantas la ven y pueden montarla en un vehículo de su alcance

### Requirement: Exportes, PDF y apps con el mismo alcance
Los Excel, los PDF, los informes programados y las respuestas a las apps móviles TittanWare y TittanLite SHALL contener solo datos dentro del alcance de quien los pide.

#### Scenario: Excel masivo de inspecciones
- **WHEN** un usuario restringido exporta todas las inspecciones de TittanLite
- **THEN** el archivo trae solo las inspecciones de vehículos de sus ramas

#### Scenario: App móvil
- **WHEN** ese usuario busca una placa ajena en la app TittanWare
- **THEN** la búsqueda no la encuentra

### Requirement: Asistentes de IA con el mismo alcance
Lubr-IA y TittanBot SHALL responder solo con datos dentro del alcance del usuario, tanto en consultas como en acciones que confirma.

#### Scenario: Pregunta por la flota
- **WHEN** un usuario restringido pregunta a TittanBot «¿cuántas OT abiertas hay?»
- **THEN** la cifra corresponde solo a sus ramas

### Requirement: Mensajería por rama
Un destinatario de Telegram o WhatsApp SHALL poder limitarse a un nodo. En ese caso, los informes y alertas que reciba MUST contener solo datos de esa rama.

#### Scenario: Grupo del cliente
- **WHEN** el grupo de Telegram de «Transportes ABC» está limitado a ese nodo y se envía el informe semanal de llantas
- **THEN** el grupo recibe un informe que solo incluye vehículos de «Transportes ABC»

### Requirement: Cambios de alcance inmediatos
Un cambio en los nodos asignados a un usuario, o en el nodo de un activo, SHALL aplicarse desde la siguiente petición, sin volver a iniciar sesión.

#### Scenario: Quitar una rama
- **WHEN** a un usuario se le quita «Flota Medellín»
- **THEN** su siguiente petición ya no incluye los activos de «Flota Medellín»
