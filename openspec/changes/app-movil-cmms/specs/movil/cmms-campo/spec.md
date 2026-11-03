# Spec Delta

## Purpose

Que el técnico y el operador hagan desde el teléfono, donde está el equipo, el trabajo diario del CMMS: atender órdenes, ejecutar checklists, registrar medidores y combustible y consultar la ficha de un activo.

## ADDED Requirements

### Requirement: Torre de control móvil
Al abrir la app, el usuario SHALL ver su día: sus órdenes de trabajo por estado y prioridad, las vencidas, los checklists que le tocan, los activos detenidos de su alcance y los avisos que piden atención. Cada indicador SHALL llevar a la lista correspondiente.

#### Scenario: Inicio del turno
- **WHEN** un técnico abre la app al empezar el turno
- **THEN** ve primero las órdenes asignadas a él para hoy, con las urgentes y vencidas arriba

### Requirement: Ficha del activo
La app SHALL mostrar la ficha de un activo: datos, estado, medidores actuales, órdenes abiertas, historial de mantenimiento reciente, esquema de llantas si aplica y documentos. Se SHALL poder llegar a ella por búsqueda, por lista o escaneando su código QR.

#### Scenario: Consultar el historial
- **WHEN** el técnico abre la ficha de un tractocamión
- **THEN** ve sus órdenes abiertas, las últimas intervenciones con su fecha y el odómetro actual

### Requirement: Crear órdenes de trabajo
El usuario SHALL poder, según su perfil, crear una orden con activo, tipo, prioridad, descripción y fotos.

#### Scenario: Reportar una falla desde la vía
- **WHEN** un conductor con perfil de reporte crea una orden con dos fotos de una fuga
- **THEN** la orden queda pendiente con las fotos y le aparece al supervisor para asignarla

### Requirement: Atender una orden asignada
En una orden asignada, el usuario SHALL poder iniciarla, pausarla con motivo, registrar horas y repuestos, agregar notas y fotos, registrar falla, causa y solución, capturar la firma de quien recibe y cerrarla con el medidor. La app MUST aplicar las reglas del portal al cerrar.

#### Scenario: Cerrar una orden en el taller
- **WHEN** el técnico termina el cambio de frenos, registra 2,5 horas, dos pastillas del inventario, la causa, el odómetro y la firma del conductor
- **THEN** la orden queda cerrada con sus costos y los repuestos descontados, igual que si se hubiera cerrado en el portal

#### Scenario: Odómetro menor que el anterior
- **WHEN** el técnico registra un odómetro menor que el último registrado del vehículo
- **THEN** la app no deja cerrar y explica cuál fue el último odómetro y cuándo se tomó

### Requirement: Checklists
El usuario SHALL poder ejecutar los checklists que le corresponden: responder cada ítem con su tipo (sí/no, número, opción, texto o foto), marcar los no conformes con foto y observación, y cerrarlos. Un ítem no conforme que el checklist define como crítico SHALL generar el aviso o la orden que define el portal.

#### Scenario: Preoperacional con hallazgo crítico
- **WHEN** el conductor marca «frenos» como no conforme en el preoperacional y adjunta una foto
- **THEN** el checklist se cierra con el hallazgo y se genera el aviso o la orden que el portal tiene configurado

### Requirement: Medidores y combustible
El usuario SHALL poder registrar lecturas de odómetro u horómetro y tanqueos (litros, valor, estación, odómetro) con las validaciones del portal.

#### Scenario: Tanqueo
- **WHEN** el conductor registra un tanqueo de 220 litros con el odómetro
- **THEN** queda registrado con su rendimiento calculado y actualiza el medidor del vehículo
